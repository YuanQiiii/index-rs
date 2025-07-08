use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceCard {
    pub name: String,
    pub url: String,
    pub icon: String,
    pub description: String,
    pub status: ServiceStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ServiceStatus {
    Online,
    Offline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStaticInfo {
    pub os_name: String,
    pub kernel_version: String,
    pub hostname: String,
    pub cpu_cores: usize,
    pub cpu_brand: String,
    pub total_memory_gb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeData {
    pub timestamp: i64,
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub disks: Vec<DiskInfo>,
    pub network: NetworkInfo,
    pub load_average: LoadAverage,
    pub uptime_secs: u64,
    pub gpu: Option<Vec<GpuInfo>>,
    pub ports: Vec<PortInfo>,
    pub processes: Vec<ProcessInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    pub total_usage: f32,
    pub core_usage: Vec<f32>,
    pub temperature_celsius: Option<f32>,  // CPU 温度
    pub power_watts: Option<f32>,          // CPU 功耗
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    pub total_kb: u64,
    pub used_kb: u64,
    pub free_kb: u64,
    pub used_percent: f32,
    pub swap_total_kb: u64,
    pub swap_used_kb: u64,
    pub swap_free_kb: u64,
    pub swap_used_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub total_gb: f64,
    pub used_gb: f64,
    pub free_gb: f64,
    pub used_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    pub interfaces: Vec<NetworkInterface>,
    pub rx_speed_kbps: f64,
    pub tx_speed_kbps: f64,
    pub total_rx_gb: f64,
    pub total_tx_gb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterface {
    pub name: String,
    pub ipv4: Vec<String>,
    pub ipv6: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadAverage {
    pub one: f64,
    pub five: f64,
    pub fifteen: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub name: String,
    pub index: u32,
    pub memory_total_mb: u32,
    pub memory_used_mb: u32,
    pub memory_free_mb: u32,
    pub utilization_percent: u8,
    pub temperature_celsius: u8,
    pub power_draw_watts: Option<f32>,
    pub power_limit_watts: Option<f32>,
    pub fan_speed_percent: Option<u8>,
    pub graphics_clock_mhz: Option<u32>,
    pub memory_clock_mhz: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub services: ServicesConfig,
    #[serde(default)]
    pub monitoring: crate::collector_config::GlobalConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServicesConfig {
    pub ip: String,  // 所有服务共享的IP地址
    pub items: Vec<ServiceCardConfig>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServiceCardConfig {
    pub name: String,
    pub port: u16,
    pub icon: String,
    pub description: String,
    #[serde(default = "default_protocol")]
    pub protocol: String,
    #[serde(default)]
    pub health_check_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub port: u16,
    pub protocol: String,  // tcp 或 udp
    pub state: String,     // LISTEN, ESTABLISHED 等
    pub program: String,   // 程序名称
    pub pid: Option<u32>,  // 进程ID
    pub address: String,   // 监听地址
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f32,
    pub memory_percent: f32,
    pub memory_mb: f64,
    pub status: String,
    pub user: Option<String>,
    pub command: String,
    pub start_time: Option<i64>,
}

fn default_protocol() -> String {
    "http".to_string()
}