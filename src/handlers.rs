use crate::collectors::get_static_info;
use crate::config::get_services;
use crate::models::{Config, RealtimeData, ServiceCard, ServiceStatus};
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::StatusCode,
    response::{IntoResponse, Json},
};
use futures::{sink::SinkExt, stream::StreamExt};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tracing::{error, info, warn};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<RwLock<Config>>,
    pub tx: Arc<broadcast::Sender<RealtimeData>>,
}

pub async fn get_services_handler(
    State(state): State<AppState>,
) -> Result<Json<Vec<ServiceCard>>, StatusCode> {
    let config = state.config.read().await;
    let services = get_services(&config).await;
    Ok(Json(services))
}

pub async fn get_static_info_handler() -> Json<crate::models::SystemStaticInfo> {
    Json(get_static_info())
}

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state.tx))
}

async fn handle_socket(socket: WebSocket, tx: Arc<broadcast::Sender<RealtimeData>>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = tx.subscribe();

    // 任务1：从广播通道接收数据并发送到WebSocket
    let send_task = tokio::spawn(async move {
        while let Ok(data) = rx.recv().await {
            let msg = match serde_json::to_string(&data) {
                Ok(json) => Message::Text(json),
                Err(e) => {
                    error!("Failed to serialize realtime data: {}", e);
                    continue;
                }
            };

            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // 任务2：处理来自客户端的消息（保持连接活跃）
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Close(_) => {
                    info!("Client disconnected");
                    break;
                }
                Message::Ping(_) => {
                    // axum 会自动处理 ping/pong
                }
                _ => {}
            }
        }
    });

    // 等待任一任务完成
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }
}

// 服务健康检查函数
pub async fn check_service_health(url: &str) -> ServiceStatus {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap();

    match client.get(url).send().await {
        Ok(response) => {
            if response.status().is_success() || response.status().is_redirection() {
                ServiceStatus::Online
            } else {
                ServiceStatus::Offline
            }
        }
        Err(_) => ServiceStatus::Offline,
    }
}

// Docker 管理接口
#[derive(serde::Deserialize)]
pub struct ContainerActionRequest {
    pub container_id: String,
    pub action: ContainerAction,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ContainerAction {
    Start,
    Stop,
    Restart,
    Pause,
    Unpause,
}

#[derive(serde::Serialize)]
pub struct ActionResponse {
    pub success: bool,
    pub message: String,
}

pub async fn docker_action_handler(
    Json(req): Json<ContainerActionRequest>,
) -> Result<Json<ActionResponse>, StatusCode> {
    use tokio::process::Command;
    use tokio::time::{timeout, Duration};
    
    let command = match req.action {
        ContainerAction::Start => "start",
        ContainerAction::Stop => "stop",
        ContainerAction::Restart => "restart",
        ContainerAction::Pause => "pause",
        ContainerAction::Unpause => "unpause",
    };
    
    // 设置操作超时时间
    let timeout_duration = match command {
        "stop" => Duration::from_secs(30), // 停止操作可能需要更长时间
        "restart" => Duration::from_secs(45), // 重启需要停止+启动
        _ => Duration::from_secs(10),
    };
    
    info!("Executing docker {} on container {}", command, req.container_id);
    
    let docker_command = Command::new("docker")
        .arg(command)
        .arg(&req.container_id)
        .output();
    
    match timeout(timeout_duration, docker_command).await {
        Ok(Ok(output)) => {
            if output.status.success() {
                info!("Docker {} action on container {} succeeded", command, req.container_id);
                Ok(Json(ActionResponse {
                    success: true,
                    message: format!("Container {} action '{}' completed successfully", req.container_id, command),
                }))
            } else {
                let error_msg = String::from_utf8_lossy(&output.stderr);
                warn!("Docker {} action on container {} failed: {}", command, req.container_id, error_msg);
                Ok(Json(ActionResponse {
                    success: false,
                    message: format!("Failed to {} container: {}", command, error_msg.trim()),
                }))
            }
        }
        Ok(Err(e)) => {
            error!("Failed to execute docker command: {}", e);
            Ok(Json(ActionResponse {
                success: false,
                message: format!("Failed to execute docker command: {}", e),
            }))
        }
        Err(_) => {
            error!("Docker {} action on container {} timed out after {} seconds", command, req.container_id, timeout_duration.as_secs());
            Ok(Json(ActionResponse {
                success: false,
                message: format!("Operation timed out after {} seconds. The container may still be processing the command.", timeout_duration.as_secs()),
            }))
        }
    }
}

pub async fn docker_logs_handler(
    axum::extract::Path(container_id): axum::extract::Path<String>,
    axum::extract::Query(params): axum::extract::Query<LogsParams>,
) -> Result<String, StatusCode> {
    use tokio::process::Command;
    
    let tail_lines = params.tail.unwrap_or(100).to_string();
    
    match Command::new("docker")
        .arg("logs")
        .arg("--tail")
        .arg(&tail_lines)
        .arg(&container_id)
        .output()
        .await
    {
        Ok(output) => {
            let logs = String::from_utf8_lossy(&output.stdout);
            let errors = String::from_utf8_lossy(&output.stderr);
            Ok(format!("{}\n{}", logs, errors))
        }
        Err(e) => {
            error!("Failed to get container logs: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(serde::Deserialize)]
pub struct LogsParams {
    pub tail: Option<usize>,
}