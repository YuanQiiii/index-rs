use std::time::Duration;
use tokio::time::timeout;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// 数据采集结果
#[derive(Debug, Clone)]
pub struct CollectionResult<T> {
    pub data: Option<T>,
    pub error: Option<String>,
    pub cached: bool,
    pub timestamp: DateTime<Utc>,
}

impl<T> CollectionResult<T> {
    fn success(data: T) -> Self {
        Self {
            data: Some(data),
            error: None,
            cached: false,
            timestamp: Utc::now(),
        }
    }

    fn error(error: String) -> Self {
        Self {
            data: None,
            error: Some(error),
            cached: false,
            timestamp: Utc::now(),
        }
    }

    fn cached(data: T, timestamp: DateTime<Utc>) -> Self {
        Self {
            data: Some(data),
            error: None,
            cached: true,
            timestamp,
        }
    }
}

/// 数据缓存
pub struct DataCache<T: Clone> {
    data: Arc<RwLock<HashMap<String, (T, DateTime<Utc>)>>>,
    ttl: Duration,
}

impl<T: Clone> DataCache<T> {
    pub fn new(ttl: Duration) -> Self {
        Self {
            data: Arc::new(RwLock::new(HashMap::new())),
            ttl,
        }
    }

    pub async fn get(&self, key: &str) -> Option<T> {
        let cache = self.data.read().await;
        if let Some((data, timestamp)) = cache.get(key) {
            if Utc::now().signed_duration_since(*timestamp).to_std().unwrap_or(Duration::MAX) < self.ttl {
                return Some(data.clone());
            }
        }
        None
    }

    pub async fn set(&self, key: String, value: T) {
        let mut cache = self.data.write().await;
        cache.insert(key, (value, Utc::now()));
        
        // 清理过期条目
        let now = Utc::now();
        cache.retain(|_, (_, timestamp)| {
            now.signed_duration_since(*timestamp).to_std().unwrap_or(Duration::MAX) < self.ttl * 2
        });
    }
}

/// 采集器配置
#[derive(Debug, Clone)]
pub struct CollectorConfig {
    /// 命令执行超时时间
    pub command_timeout: Duration,
    /// GPU 数据缓存时间
    pub gpu_cache_ttl: Duration,
    /// CPU 传感器数据缓存时间
    pub sensors_cache_ttl: Duration,
    /// 端口扫描超时时间
    pub port_scan_timeout: Duration,
    /// 进程采集最大数量
    pub max_processes: usize,
    /// 是否启用降级模式
    pub enable_fallback: bool,
}

impl Default for CollectorConfig {
    fn default() -> Self {
        Self {
            command_timeout: Duration::from_secs(5),
            gpu_cache_ttl: Duration::from_secs(5),
            sensors_cache_ttl: Duration::from_secs(10),
            port_scan_timeout: Duration::from_secs(3),
            max_processes: 20,
            enable_fallback: true,
        }
    }
}

/// 执行命令并处理超时
pub async fn execute_command_with_timeout(
    cmd: &str,
    args: &[&str],
    timeout_duration: Duration,
) -> Result<String, String> {
    let args_owned: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    let result = timeout(
        timeout_duration,
        tokio::process::Command::new(cmd)
            .args(&args_owned)
            .output()
    ).await;

    match result {
        Ok(Ok(output)) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Command failed: {}", stderr))
            }
        }
        Ok(Err(e)) => Err(format!("Failed to execute command: {}", e)),
        Err(_) => Err(format!("Command timed out after {:?}", timeout_duration)),
    }
}

/// 安全地解析数值，带默认值
pub fn parse_with_default<T: std::str::FromStr>(s: &str, default: T) -> T {
    s.trim().parse::<T>().unwrap_or(default)
}

/// 批量执行命令并收集结果
pub async fn batch_execute_commands(
    commands: Vec<(&str, Vec<&str>)>,
    timeout_duration: Duration,
) -> Vec<Result<String, String>> {
    let mut results = Vec::new();
    
    for (cmd, args) in commands {
        results.push(execute_command_with_timeout(cmd, &args, timeout_duration).await);
    }
    
    results
}

/// 重试逻辑
pub async fn retry_async<F, T, E>(
    mut f: F,
    max_retries: usize,
    delay: Duration,
) -> Result<T, E>
where
    F: FnMut() -> futures::future::BoxFuture<'static, Result<T, E>>,
{
    let mut retries = 0;
    loop {
        match f().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                retries += 1;
                if retries >= max_retries {
                    return Err(e);
                }
                tokio::time::sleep(delay).await;
            }
        }
    }
}