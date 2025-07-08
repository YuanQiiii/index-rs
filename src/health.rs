use std::collections::HashMap;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub uptime_seconds: u64,
    pub version: String,
    pub collectors: HashMap<String, CollectorStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectorStatus {
    pub name: String,
    pub status: String,
    pub last_update: Option<DateTime<Utc>>,
    pub error_count: u32,
    pub last_error: Option<String>,
}

#[derive(Clone)]
pub struct HealthMonitor {
    start_time: DateTime<Utc>,
    collectors: Arc<RwLock<HashMap<String, CollectorStatus>>>,
}

impl HealthMonitor {
    pub fn new() -> Self {
        Self {
            start_time: Utc::now(),
            collectors: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn register_collector(&self, name: String) {
        let mut collectors = self.collectors.write().await;
        collectors.insert(name.clone(), CollectorStatus {
            name,
            status: "starting".to_string(),
            last_update: None,
            error_count: 0,
            last_error: None,
        });
    }

    pub async fn update_collector_status(
        &self,
        name: &str,
        success: bool,
        error: Option<String>,
    ) {
        let mut collectors = self.collectors.write().await;
        if let Some(collector) = collectors.get_mut(name) {
            collector.last_update = Some(Utc::now());
            if success {
                collector.status = "healthy".to_string();
            } else {
                collector.status = "error".to_string();
                collector.error_count += 1;
                collector.last_error = error;
            }
        }
    }

    pub async fn get_health_status(&self) -> HealthStatus {
        let collectors = self.collectors.read().await;
        let uptime = Utc::now().signed_duration_since(self.start_time);
        
        HealthStatus {
            status: if collectors.values().all(|c| c.status == "healthy") {
                "healthy".to_string()
            } else {
                "degraded".to_string()
            },
            timestamp: Utc::now(),
            uptime_seconds: uptime.num_seconds() as u64,
            version: env!("CARGO_PKG_VERSION").to_string(),
            collectors: collectors.clone(),
        }
    }
}