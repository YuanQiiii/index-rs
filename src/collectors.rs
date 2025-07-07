use crate::models::*;
use chrono::Utc;
use sysinfo::{System, Networks, Disks};
use tokio::sync::broadcast;
use tokio::time::{interval, Duration};
use tracing::info;

pub struct SystemCollector {
    tx: broadcast::Sender<RealtimeData>,
}

impl SystemCollector {
    pub fn new(tx: broadcast::Sender<RealtimeData>) -> Self {
        Self { tx }
    }

    pub async fn start(self) {
        let mut sys = System::new_all();
        let mut networks = Networks::new_with_refreshed_list();
        let mut disks = Disks::new_with_refreshed_list();
        let mut interval = interval(Duration::from_secs(1));
        
        // 记录上一次的网络数据
        let mut last_rx_bytes = 0u64;
        let mut last_tx_bytes = 0u64;
        let mut first_run = true;

        loop {
            interval.tick().await;
            
            // 刷新系统信息
            sys.refresh_cpu_usage();
            sys.refresh_memory();
            networks.refresh();
            disks.refresh();
            
            // 收集CPU信息
            let total_usage = sys.global_cpu_info().cpu_usage();
            let core_usage: Vec<f32> = sys.cpus().iter().map(|cpu| cpu.cpu_usage()).collect();
            
            let cpu_info = CpuInfo {
                total_usage,
                core_usage,
            };
            
            // 收集内存信息
            let memory_info = MemoryInfo {
                total_kb: sys.total_memory(),
                used_kb: sys.used_memory(),
                free_kb: sys.available_memory(),
                used_percent: (sys.used_memory() as f32 / sys.total_memory() as f32) * 100.0,
                swap_total_kb: sys.total_swap(),
                swap_used_kb: sys.used_swap(),
                swap_free_kb: sys.free_swap(),
                swap_used_percent: if sys.total_swap() > 0 {
                    (sys.used_swap() as f32 / sys.total_swap() as f32) * 100.0
                } else {
                    0.0
                },
            };
            
            // 收集磁盘信息
            let disk_list: Vec<DiskInfo> = disks
                .iter()
                .map(|disk| {
                    let total_bytes = disk.total_space();
                    let available_bytes = disk.available_space();
                    let used_bytes = total_bytes - available_bytes;
                    
                    DiskInfo {
                        name: disk.name().to_string_lossy().to_string(),
                        mount_point: disk.mount_point().to_string_lossy().to_string(),
                        file_system: disk.file_system().to_string_lossy().to_string(),
                        total_gb: total_bytes as f64 / 1024.0 / 1024.0 / 1024.0,
                        used_gb: used_bytes as f64 / 1024.0 / 1024.0 / 1024.0,
                        free_gb: available_bytes as f64 / 1024.0 / 1024.0 / 1024.0,
                        used_percent: (used_bytes as f32 / total_bytes as f32) * 100.0,
                    }
                })
                .collect();
            
            // 收集网络信息
            let mut total_rx_bytes = 0u64;
            let mut total_tx_bytes = 0u64;
            
            let interfaces: Vec<NetworkInterface> = networks
                .iter()
                .map(|(name, data)| {
                    total_rx_bytes += data.total_received();
                    total_tx_bytes += data.total_transmitted();
                    
                    NetworkInterface {
                        name: name.clone(),
                        ipv4: vec![], // sysinfo库不直接提供IP地址
                        ipv6: vec![],
                    }
                })
                .collect();
            
            // 计算网络速度（KB/s）
            let (rx_speed_kbps, tx_speed_kbps) = if first_run {
                first_run = false;
                (0.0, 0.0)
            } else {
                let rx_diff = total_rx_bytes.saturating_sub(last_rx_bytes);
                let tx_diff = total_tx_bytes.saturating_sub(last_tx_bytes);
                (rx_diff as f64 / 1024.0, tx_diff as f64 / 1024.0)
            };
            
            last_rx_bytes = total_rx_bytes;
            last_tx_bytes = total_tx_bytes;
            
            let network_info = NetworkInfo {
                interfaces,
                rx_speed_kbps,
                tx_speed_kbps,
                total_rx_gb: total_rx_bytes as f64 / 1024.0 / 1024.0 / 1024.0,
                total_tx_gb: total_tx_bytes as f64 / 1024.0 / 1024.0 / 1024.0,
            };
            
            // 获取系统负载
            let load_avg = System::load_average();
            let load_average = LoadAverage {
                one: load_avg.one,
                five: load_avg.five,
                fifteen: load_avg.fifteen,
            };
            
            // 创建实时数据
            let realtime_data = RealtimeData {
                timestamp: Utc::now().timestamp(),
                cpu: cpu_info,
                memory: memory_info,
                disks: disk_list,
                network: network_info,
                load_average,
                uptime_secs: System::uptime(),
            };
            
            // 发送数据
            if let Err(e) = self.tx.send(realtime_data) {
                info!("No receivers for realtime data: {}", e);
            }
        }
    }
}

pub fn get_static_info() -> SystemStaticInfo {
    let sys = System::new_all();
    
    SystemStaticInfo {
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        kernel_version: System::kernel_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        cpu_cores: sys.cpus().len(),
        cpu_brand: sys.cpus().first().map(|cpu| cpu.brand().to_string()).unwrap_or_else(|| "Unknown".to_string()),
        total_memory_gb: sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0,
    }
}