use crate::collector_utils::*;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// 全局配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GlobalConfig {
    pub collectors: CollectorsConfig,
    pub performance: PerformanceConfig,
}

/// 采集器配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CollectorsConfig {
    /// 数据采集间隔（秒）
    #[serde(default = "default_collect_interval")]
    pub collect_interval_secs: u64,
    
    /// 是否启用 GPU 监控
    #[serde(default = "default_true")]
    pub enable_gpu: bool,
    
    /// 是否启用端口扫描
    #[serde(default = "default_true")]
    pub enable_ports: bool,
    
    /// 是否启用进程监控
    #[serde(default = "default_true")]
    pub enable_processes: bool,
    
    /// 是否启用 CPU 传感器
    #[serde(default = "default_true")]
    pub enable_sensors: bool,
    
    /// 命令超时时间（秒）
    #[serde(default = "default_command_timeout")]
    pub command_timeout_secs: u64,
    
    /// 最大进程数
    #[serde(default = "default_max_processes")]
    pub max_processes: usize,
}

/// 性能配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PerformanceConfig {
    /// GPU 缓存 TTL（秒）
    #[serde(default = "default_gpu_cache_ttl")]
    pub gpu_cache_ttl_secs: u64,
    
    /// 传感器缓存 TTL（秒）
    #[serde(default = "default_sensors_cache_ttl")]
    pub sensors_cache_ttl_secs: u64,
    
    /// 端口扫描超时（秒）
    #[serde(default = "default_port_scan_timeout")]
    pub port_scan_timeout_secs: u64,
    
    /// 历史数据保留数量
    #[serde(default = "default_history_size")]
    pub history_size: usize,
}

// 默认值函数
fn default_collect_interval() -> u64 { 1 }
fn default_true() -> bool { true }
fn default_command_timeout() -> u64 { 5 }
fn default_max_processes() -> usize { 20 }
fn default_gpu_cache_ttl() -> u64 { 5 }
fn default_sensors_cache_ttl() -> u64 { 10 }
fn default_port_scan_timeout() -> u64 { 3 }
fn default_history_size() -> usize { 60 }

impl Default for GlobalConfig {
    fn default() -> Self {
        Self {
            collectors: CollectorsConfig::default(),
            performance: PerformanceConfig::default(),
        }
    }
}

impl Default for CollectorsConfig {
    fn default() -> Self {
        Self {
            collect_interval_secs: default_collect_interval(),
            enable_gpu: default_true(),
            enable_ports: default_true(),
            enable_processes: default_true(),
            enable_sensors: default_true(),
            command_timeout_secs: default_command_timeout(),
            max_processes: default_max_processes(),
        }
    }
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            gpu_cache_ttl_secs: default_gpu_cache_ttl(),
            sensors_cache_ttl_secs: default_sensors_cache_ttl(),
            port_scan_timeout_secs: default_port_scan_timeout(),
            history_size: default_history_size(),
        }
    }
}

impl From<GlobalConfig> for CollectorConfig {
    fn from(config: GlobalConfig) -> Self {
        CollectorConfig {
            command_timeout: Duration::from_secs(config.collectors.command_timeout_secs),
            gpu_cache_ttl: Duration::from_secs(config.performance.gpu_cache_ttl_secs),
            sensors_cache_ttl: Duration::from_secs(config.performance.sensors_cache_ttl_secs),
            port_scan_timeout: Duration::from_secs(config.performance.port_scan_timeout_secs),
            max_processes: config.collectors.max_processes,
            enable_fallback: true,
        }
    }
}