use crate::handlers::check_service_health;
use crate::models::{Config, ServiceCard, ServiceCardConfig, ServicesConfig};
use std::path::Path;
use tokio::fs;
use tracing::{error, info};

pub async fn load_config() -> Config {
    // 尝试读取 config.toml
    let toml_path = Path::new("config.toml");
    if toml_path.exists() {
        match fs::read_to_string(toml_path).await {
            Ok(content) => match toml::from_str::<Config>(&content) {
                Ok(config) => {
                    info!("Loaded configuration from config.toml");
                    return config;
                }
                Err(e) => {
                    error!("Failed to parse config.toml: {}", e);
                }
            },
            Err(e) => {
                error!("Failed to read config.toml: {}", e);
            }
        }
    }

    // 如果 config.toml 不存在或解析失败，返回默认配置
    info!("Using default configuration");
    Config {
        server: crate::models::ServerConfig {
            host: "0.0.0.0".to_string(),
            port: 9876,
        },
        services: get_default_services_config(),
    }
}

pub async fn get_services(config: &Config) -> Vec<ServiceCard> {
    let mut services = Vec::new();
    let shared_ip = &config.services.ip;
    
    for service_config in &config.services.items {
        let url = format!("{}://{}:{}", 
            service_config.protocol, 
            shared_ip, 
            service_config.port
        );
        
        let health_check_url = if let Some(path) = &service_config.health_check_path {
            format!("{}{}", url, path)
        } else {
            url.clone()
        };
        
        let status = check_service_health(&health_check_url).await;
        
        services.push(ServiceCard {
            name: service_config.name.clone(),
            url,
            icon: service_config.icon.clone(),
            description: service_config.description.clone(),
            status,
        });
    }
    
    services
}

fn get_default_services_config() -> ServicesConfig {
    ServicesConfig {
        ip: "localhost".to_string(),
        items: vec![
            ServiceCardConfig {
                name: "Gitea".to_string(),
                port: 3000,
                icon: "fab fa-git-alt".to_string(),
                description: "Git仓库管理".to_string(),
                protocol: "http".to_string(),
                health_check_path: None,
            },
            ServiceCardConfig {
                name: "Nextcloud".to_string(),
                port: 8080,
                icon: "fas fa-cloud".to_string(),
                description: "私有云存储".to_string(),
                protocol: "http".to_string(),
                health_check_path: None,
            },
            ServiceCardConfig {
                name: "Jellyfin".to_string(),
                port: 8096,
                icon: "fas fa-play-circle".to_string(),
                description: "媒体服务器".to_string(),
                protocol: "http".to_string(),
                health_check_path: None,
            },
            ServiceCardConfig {
                name: "Home Assistant".to_string(),
                port: 8123,
                icon: "fas fa-home".to_string(),
                description: "智能家居".to_string(),
                protocol: "http".to_string(),
                health_check_path: None,
            },
        ],
    }
}