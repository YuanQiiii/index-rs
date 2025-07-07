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
use tracing::{error, info};

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