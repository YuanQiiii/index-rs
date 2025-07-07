use crate::models::*;
use chrono::Utc;
use sysinfo::{System, Networks, Disks};
use tokio::sync::broadcast;
use tokio::time::{interval, Duration};
use tracing::{info, debug};
use std::process::Command;

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
            
            // 获取 CPU 温度和功耗
            let (cpu_temp, cpu_power) = get_cpu_sensors_info();
            
            let cpu_info = CpuInfo {
                total_usage,
                core_usage,
                temperature_celsius: cpu_temp,
                power_watts: cpu_power,
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
            
            // 收集 GPU 信息
            let gpu_info = get_gpu_info();
            
            // 创建实时数据
            let realtime_data = RealtimeData {
                timestamp: Utc::now().timestamp(),
                cpu: cpu_info,
                memory: memory_info,
                disks: disk_list,
                network: network_info,
                load_average,
                uptime_secs: System::uptime(),
                gpu: gpu_info,
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

fn get_gpu_info() -> Option<Vec<GpuInfo>> {
    // 检查 nvidia-smi 是否可用
    match Command::new("nvidia-smi")
        .arg("--query-gpu=gpu_name,index,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw,power.limit,fan.speed,clocks.gr,clocks.mem")
        .arg("--format=csv,noheader,nounits")
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut gpus = Vec::new();
                
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split(", ").collect();
                    if parts.len() >= 7 {
                        // 解析基础参数
                        if let (Ok(index), Ok(memory_total), Ok(memory_used), Ok(memory_free), Ok(utilization), Ok(temperature)) = (
                            parts[1].parse::<u32>(),
                            parts[2].parse::<u32>(),
                            parts[3].parse::<u32>(),
                            parts[4].parse::<u32>(),
                            parts[5].parse::<u8>(),
                            parts[6].parse::<u8>(),
                        ) {
                            // 解析可选参数
                            let power_draw = if parts.len() > 7 && parts[7] != "[N/A]" {
                                parts[7].parse::<f32>().ok()
                            } else {
                                None
                            };
                            
                            let power_limit = if parts.len() > 8 && parts[8] != "[N/A]" {
                                parts[8].parse::<f32>().ok()
                            } else {
                                None
                            };
                            
                            let fan_speed = if parts.len() > 9 && parts[9] != "[N/A]" {
                                parts[9].parse::<u8>().ok()
                            } else {
                                None
                            };
                            
                            let graphics_clock = if parts.len() > 10 && parts[10] != "[N/A]" {
                                parts[10].parse::<u32>().ok()
                            } else {
                                None
                            };
                            
                            let memory_clock = if parts.len() > 11 && parts[11] != "[N/A]" {
                                parts[11].parse::<u32>().ok()
                            } else {
                                None
                            };
                            
                            gpus.push(GpuInfo {
                                name: parts[0].to_string(),
                                index,
                                memory_total_mb: memory_total,
                                memory_used_mb: memory_used,
                                memory_free_mb: memory_free,
                                utilization_percent: utilization,
                                temperature_celsius: temperature,
                                power_draw_watts: power_draw,
                                power_limit_watts: power_limit,
                                fan_speed_percent: fan_speed,
                                graphics_clock_mhz: graphics_clock,
                                memory_clock_mhz: memory_clock,
                            });
                        }
                    }
                }
                
                if !gpus.is_empty() {
                    Some(gpus)
                } else {
                    None
                }
            } else {
                debug!("nvidia-smi command failed: {}", String::from_utf8_lossy(&output.stderr));
                None
            }
        }
        Err(e) => {
            debug!("nvidia-smi not found: {}", e);
            None
        }
    }
}

// 获取 CPU 温度和功耗信息
fn get_cpu_sensors_info() -> (Option<f32>, Option<f32>) {
    use std::process::Command;
    
    match Command::new("sensors")
        .arg("-u")  // 机器可读格式
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let mut cpu_temp: Option<f32> = None;
                let mut cpu_power: Option<f32> = None;
                
                // 解析 sensors 输出
                let lines: Vec<&str> = output_str.lines().collect();
                let mut current_adapter = "";
                
                for i in 0..lines.len() {
                    let line = lines[i].trim();
                    
                    // 检测适配器类型
                    if line.ends_with("-pci-00c3") || line.contains("k10temp") || 
                       line.contains("coretemp") || line.contains("zenpower") {
                        current_adapter = "cpu_temp";
                    } else if line.contains("Adapter:") {
                        // 重置适配器类型
                        if i > 0 && !lines[i-1].contains("k10temp") && !lines[i-1].contains("coretemp") {
                            current_adapter = "";
                        }
                    }
                    
                    // 在 CPU 温度适配器中查找温度
                    if current_adapter == "cpu_temp" {
                        // 查找 Tctl, Tdie, Package id 等温度标识
                        if line.starts_with("Tctl:") || line.starts_with("Tdie:") || 
                           line.starts_with("Package id") || line.starts_with("temp1:") {
                            // 下一行应该包含实际温度值
                            if i + 1 < lines.len() {
                                let value_line = lines[i + 1].trim();
                                if value_line.contains("_input:") {
                                    if let Some(value_str) = value_line.split(':').nth(1) {
                                        if let Ok(temp_value) = value_str.trim().parse::<f32>() {
                                            cpu_temp = Some(temp_value);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // 查找功耗信息 (在 amdgpu 或其他适配器中)
                    if line.starts_with("PPT:") || (line.contains("power") && line.contains("_label:")) {
                        // 检查下一行是否包含功耗值
                        if i + 1 < lines.len() {
                            let value_line = lines[i + 1].trim();
                            if value_line.starts_with("power") && value_line.contains("_input:") {
                                if let Some(value_str) = value_line.split(':').nth(1) {
                                    if let Ok(power_value) = value_str.trim().parse::<f32>() {
                                        // 只记录合理范围内的功耗值 (通常 CPU 功耗在 5-300W)
                                        if power_value > 5.0 && power_value < 300.0 {
                                            cpu_power = Some(power_value);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                debug!("CPU temp: {:?}, power: {:?}", cpu_temp, cpu_power);
                (cpu_temp, cpu_power)
            } else {
                debug!("sensors command failed: {}", String::from_utf8_lossy(&output.stderr));
                (None, None)
            }
        }
        Err(e) => {
            debug!("sensors not found: {}", e);
            (None, None)
        }
    }
}