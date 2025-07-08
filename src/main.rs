mod collectors;
mod collector_utils;
mod collector_config;
mod config;
mod handlers;
mod health;
mod models;

use axum::{
    routing::get,
    Router,
};
use handlers::AppState;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // 初始化日志
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "index_rs=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting index-rs server...");

    // 加载配置
    let config = config::load_config().await;
    let server_host = config.server.host.clone();
    let server_port = config.server.port;
    
    // 创建广播通道用于实时数据
    let (tx, _rx) = broadcast::channel::<models::RealtimeData>(100);
    let tx = Arc::new(tx);

    // 启动系统信息采集器
    let collector = collectors::SystemCollector::new(
        tx.as_ref().clone(),
        config.monitoring.clone()
    );
    tokio::spawn(collector.start());

    // 创建应用状态
    let app_state = AppState {
        config: Arc::new(RwLock::new(config)),
        tx: tx.clone(),
    };

    // 检查静态目录
    let static_dir = std::path::Path::new("static");
    if !static_dir.exists() {
        panic!("Static directory not found!");
    }
    info!("Static directory found at: {:?}", static_dir.canonicalize());

    // 构建应用路由
    let app = Router::new()
        // API 路由
        .route("/api/services", get(handlers::get_services_handler))
        .route("/api/system/static", get(handlers::get_static_info_handler))
        .route("/ws/realtime", get(handlers::websocket_handler))
        .with_state(app_state)
        // 静态文件服务
        .fallback_service(ServeDir::new("static"))
        // CORS 支持
        .layer(CorsLayer::permissive());

    // 绑定地址
    let addr: SocketAddr = format!("{}:{}", server_host, server_port)
        .parse()
        .expect("Invalid server address");
    info!("Server listening on http://{}", addr);

    // 启动服务器
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    info!("Server bound successfully, starting to serve...");
    axum::serve(listener, app).await.unwrap();
}