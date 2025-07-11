use crate::models::*;
use crate::collector_utils::*;
use crate::collector_config::GlobalConfig;
use crate::docker_parser::parse_docker_containers;
use chrono::Utc;
use sysinfo::{System, Networks, Disks, ProcessStatus};
use tokio::sync::broadcast;
use tokio::time::{interval, Duration};
use tracing::{info, debug, warn};

pub struct SystemCollector {
    tx: broadcast::Sender<RealtimeData>,
    config: CollectorConfig,
    global_config: GlobalConfig,
    gpu_cache: DataCache<Vec<GpuInfo>>,
    sensors_cache: DataCache<(Option<f32>, Option<f32>)>,
}

impl SystemCollector {
    pub fn new(tx: broadcast::Sender<RealtimeData>, global_config: GlobalConfig) -> Self {
        let config = CollectorConfig::from(global_config.clone());
        Self {
            tx,
            gpu_cache: DataCache::new(config.gpu_cache_ttl),
            sensors_cache: DataCache::new(config.sensors_cache_ttl),
            config,
            global_config,
        }
    }

    pub async fn start(self) {
        let mut sys = System::new_all();
        let mut networks = Networks::new_with_refreshed_list();
        let mut disks = Disks::new_with_refreshed_list();
        let mut interval = interval(Duration::from_secs(self.global_config.collectors.collect_interval_secs));
        
        // 记录上一次的网络数据
        let mut last_rx_bytes = 0u64;
        let mut last_tx_bytes = 0u64;
        let mut first_run = true;

        info!("System collector started with config: {:?}", self.config);

        loop {
            interval.tick().await;
            
            // 顺序刷新系统信息以避免借用冲突
            let refresh_start = std::time::Instant::now();
            sys.refresh_cpu_usage();
            sys.refresh_memory();
            sys.refresh_processes();
            networks.refresh();
            disks.refresh();
            debug!("System refresh took: {:?}", refresh_start.elapsed());
            
            // 收集CPU信息
            let cpu_info = self.collect_cpu_info(&sys).await;
            
            // 收集内存信息
            let memory_info = collect_memory_info(&sys);
            
            // 收集磁盘信息
            let disk_list = collect_disk_info(&disks);
            
            // 收集网络信息
            let (network_info, new_rx, new_tx) = collect_network_info(
                &networks,
                last_rx_bytes,
                last_tx_bytes,
                first_run
            );
            last_rx_bytes = new_rx;
            last_tx_bytes = new_tx;
            if first_run {
                first_run = false;
            }
            
            // 获取系统负载
            let load_average = LoadAverage {
                one: sysinfo::System::load_average().one,
                five: sysinfo::System::load_average().five,
                fifteen: sysinfo::System::load_average().fifteen,
            };
            
            // 并行收集外部命令数据（根据配置启用）
            let (gpu_info, port_info, process_info) = tokio::join!(
                async {
                    if self.global_config.collectors.enable_gpu {
                        self.collect_gpu_info_cached().await
                    } else {
                        None
                    }
                },
                async {
                    if self.global_config.collectors.enable_ports {
                        self.collect_port_info().await
                    } else {
                        Vec::new()
                    }
                },
                async {
                    if self.global_config.collectors.enable_processes {
                        collect_process_info(&sys, self.config.max_processes)
                    } else {
                        Vec::new()
                    }
                }
            );
            
            // 收集Docker容器信息
            let docker_containers = if self.global_config.collectors.enable_docker {
                self.collect_docker_containers().await
            } else {
                Vec::new()
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
                gpu: gpu_info,
                ports: port_info,
                processes: process_info,
                docker_containers,
            };
            
            // 发送数据
            if let Err(e) = self.tx.send(realtime_data) {
                debug!("No receivers for realtime data: {}", e);
            }
        }
    }

    async fn collect_cpu_info(&self, sys: &System) -> CpuInfo {
        let total_usage = sys.global_cpu_info().cpu_usage();
        let core_usage: Vec<f32> = sys.cpus().iter().map(|cpu| cpu.cpu_usage()).collect();
        
        // 获取 CPU 温度和功耗（带缓存，根据配置启用）
        let (temperature_celsius, power_watts) = if self.global_config.collectors.enable_sensors {
            if let Some(cached) = self.sensors_cache.get("cpu").await {
                cached
            } else {
                let sensors = self.collect_cpu_sensors().await;
                self.sensors_cache.set("cpu".to_string(), sensors).await;
                sensors
            }
        } else {
            (None, None)
        };
        
        CpuInfo {
            total_usage,
            core_usage,
            temperature_celsius,
            power_watts,
        }
    }

    async fn collect_cpu_sensors(&self) -> (Option<f32>, Option<f32>) {
        match execute_command_with_timeout("sensors", &[], self.config.command_timeout).await {
            Ok(output) => parse_sensors_output(&output),
            Err(e) => {
                debug!("Failed to get CPU sensors: {}", e);
                (None, None)
            }
        }
    }

    async fn collect_gpu_info_cached(&self) -> Option<Vec<GpuInfo>> {
        // 先检查缓存
        if let Some(cached) = self.gpu_cache.get("nvidia").await {
            return Some(cached);
        }

        // 采集新数据
        match self.collect_gpu_info().await {
            Some(data) => {
                self.gpu_cache.set("nvidia".to_string(), data.clone()).await;
                Some(data)
            }
            None => None,
        }
    }

    async fn collect_gpu_info(&self) -> Option<Vec<GpuInfo>> {
        let args = vec![
            "--query-gpu=gpu_name,index,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw,power.limit,fan.speed,clocks.gr,clocks.mem",
            "--format=csv,noheader,nounits"
        ];

        match execute_command_with_timeout("nvidia-smi", &args, self.config.command_timeout).await {
            Ok(output) => parse_nvidia_smi_output(&output),
            Err(e) => {
                debug!("nvidia-smi failed: {}", e);
                None
            }
        }
    }

    async fn collect_port_info(&self) -> Vec<PortInfo> {
        // 尝试使用 ss 命令
        match self.collect_ports_with_ss().await {
            Ok(ports) if !ports.is_empty() => return ports,
            Ok(_) => debug!("ss command returned no ports"),
            Err(e) => debug!("ss command failed: {}, trying netstat", e),
        }

        // 降级到 netstat
        match self.collect_ports_with_netstat().await {
            Ok(ports) => ports,
            Err(e) => {
                warn!("Both ss and netstat failed: {}", e);
                Vec::new()
            }
        }
    }

    async fn collect_ports_with_ss(&self) -> Result<Vec<PortInfo>, String> {
        let output = execute_command_with_timeout(
            "ss",
            &["-tulpn", "-H"],
            self.config.port_scan_timeout
        ).await?;
        
        Ok(parse_ss_output(&output))
    }

    async fn collect_ports_with_netstat(&self) -> Result<Vec<PortInfo>, String> {
        let output = execute_command_with_timeout(
            "netstat",
            &["-tulpn"],
            self.config.port_scan_timeout
        ).await?;
        
        Ok(parse_netstat_output(&output))
    }
    
    async fn collect_docker_containers(&self) -> Vec<DockerContainer> {
        match self.collect_docker_containers_internal().await {
            Ok(containers) => containers,
            Err(e) => {
                debug!("Failed to collect Docker containers: {}", e);
                Vec::new()
            }
        }
    }
    
    async fn collect_docker_containers_internal(&self) -> Result<Vec<DockerContainer>, String> {
        // 首先检查Docker是否可用
        if let Err(_) = execute_command_with_timeout("docker", &["version"], Duration::from_secs(2)).await {
            return Err("Docker is not available".to_string());
        }
        
        // 获取容器列表
        let containers_json = execute_command_with_timeout(
            "docker",
            &["ps", "-a", "--format", "{{json .}}"],
            self.config.command_timeout
        ).await?;
        
        // 获取容器统计信息
        let stats_output = execute_command_with_timeout(
            "docker",
            &["stats", "--no-stream", "--format", "{{json .}}"],
            self.config.command_timeout
        ).await?;
        
        // 解析容器信息
        parse_docker_containers(&containers_json, &stats_output)
    }
}

pub fn get_static_info() -> SystemStaticInfo {
    let sys = System::new_all();
    
    SystemStaticInfo {
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        kernel_version: System::kernel_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        cpu_cores: sys.cpus().len(),
        cpu_brand: sys.cpus()
            .first()
            .map(|cpu| cpu.brand().to_string())
            .unwrap_or_else(|| "Unknown".to_string()),
        total_memory_gb: sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0,
    }
}

// 辅助函数

fn collect_memory_info(sys: &System) -> MemoryInfo {
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let free_memory = sys.free_memory();
    
    let swap_total = sys.total_swap();
    let swap_used = sys.used_swap();
    let swap_free = sys.free_swap();
    
    MemoryInfo {
        total_kb: total_memory / 1024,
        used_kb: used_memory / 1024,
        free_kb: free_memory / 1024,
        used_percent: (used_memory as f32 / total_memory as f32) * 100.0,
        swap_total_kb: swap_total / 1024,
        swap_used_kb: swap_used / 1024,
        swap_free_kb: swap_free / 1024,
        swap_used_percent: if swap_total > 0 {
            (swap_used as f32 / swap_total as f32) * 100.0
        } else {
            0.0
        },
    }
}

fn collect_disk_info(disks: &Disks) -> Vec<DiskInfo> {
    disks.iter()
        .filter_map(|disk| {
            let total_space = disk.total_space();
            if total_space == 0 {
                return None;
            }
            
            let available_space = disk.available_space();
            let used_space = total_space.saturating_sub(available_space);
            
            Some(DiskInfo {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                file_system: disk.file_system().to_string_lossy().to_string(),
                total_gb: total_space as f64 / 1024.0 / 1024.0 / 1024.0,
                used_gb: used_space as f64 / 1024.0 / 1024.0 / 1024.0,
                free_gb: available_space as f64 / 1024.0 / 1024.0 / 1024.0,
                used_percent: (used_space as f32 / total_space as f32) * 100.0,
            })
        })
        .collect()
}

fn collect_network_info(
    networks: &Networks,
    last_rx_bytes: u64,
    last_tx_bytes: u64,
    first_run: bool,
) -> (NetworkInfo, u64, u64) {
    let mut total_rx_bytes = 0u64;
    let mut total_tx_bytes = 0u64;
    
    let interfaces: Vec<NetworkInterface> = networks
        .iter()
        .map(|(name, data)| {
            total_rx_bytes += data.total_received();
            total_tx_bytes += data.total_transmitted();
            
            NetworkInterface {
                name: name.clone(),
                ipv4: vec![],
                ipv6: vec![],
            }
        })
        .collect();
    
    let (rx_speed_kbps, tx_speed_kbps) = if first_run {
        (0.0, 0.0)
    } else {
        let rx_diff = total_rx_bytes.saturating_sub(last_rx_bytes);
        let tx_diff = total_tx_bytes.saturating_sub(last_tx_bytes);
        (rx_diff as f64 / 1024.0, tx_diff as f64 / 1024.0)
    };
    
    let network_info = NetworkInfo {
        interfaces,
        rx_speed_kbps,
        tx_speed_kbps,
        total_rx_gb: total_rx_bytes as f64 / 1024.0 / 1024.0 / 1024.0,
        total_tx_gb: total_tx_bytes as f64 / 1024.0 / 1024.0 / 1024.0,
    };
    
    (network_info, total_rx_bytes, total_tx_bytes)
}

fn collect_process_info(sys: &System, max_processes: usize) -> Vec<ProcessInfo> {
    let mut processes: Vec<ProcessInfo> = Vec::new();
    let total_memory = sys.total_memory();
    
    for (pid, process) in sys.processes() {
        let cpu_percent = process.cpu_usage();
        let memory_bytes = process.memory();
        let memory_mb = memory_bytes as f64 / 1024.0 / 1024.0;
        let memory_percent = (memory_bytes as f64 / total_memory as f64) * 100.0;
        
        let status = match process.status() {
            ProcessStatus::Run => "Running",
            ProcessStatus::Sleep => "Sleeping",
            ProcessStatus::Idle => "Idle",
            ProcessStatus::Zombie => "Zombie",
            _ => "Unknown",
        }.to_string();
        
        let user = process.user_id().map(|_| "user".to_string());
        
        processes.push(ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string(),
            cpu_percent,
            memory_percent: memory_percent as f32,
            memory_mb,
            status,
            user,
            command: process.cmd().join(" "),
            start_time: Some(process.start_time() as i64),
        });
    }
    
    // 按 CPU 使用率排序，取前 N 个
    processes.sort_by(|a, b| b.cpu_percent.partial_cmp(&a.cpu_percent).unwrap());
    processes.truncate(max_processes);
    
    processes
}

// 解析函数

fn parse_sensors_output(output: &str) -> (Option<f32>, Option<f32>) {
    let mut temperature = None;
    let mut power = None;
    
    for line in output.lines() {
        let line = line.trim();
        
        // 查找 CPU 温度 - 支持 Intel (Core) 和 AMD (Tctl/Tdie) 格式
        if (line.contains("Core") || line.contains("Tctl") || line.contains("Tdie") || line.contains("Package")) 
            && line.contains("°C") {
            if let Some(temp_str) = line.split('+').nth(1) {
                if let Some(temp_str) = temp_str.split('°').next() {
                    if let Ok(temp) = temp_str.trim().parse::<f32>() {
                        temperature = temperature.or(Some(temp)).map(|t| t.max(temp));
                    }
                }
            }
        }
        
        // 查找功耗信息 - 支持多种格式
        if (line.contains("power") || line.contains("Power") || line.contains("PPT") || line.contains("Package power")) 
            && line.contains("W") && !line.contains("ALARM") {
            // 处理不同的格式，如 "PPT: 13.00 W" 或 "power1: 10.50 W"
            if let Some(idx) = line.find(':') {
                let power_part = &line[idx + 1..];
                if let Some(power_str) = power_part.trim().split(' ').next() {
                    if let Ok(p) = power_str.parse::<f32>() {
                        power = Some(p);
                    }
                }
            }
        }
    }
    
    (temperature, power)
}

fn parse_nvidia_smi_output(output: &str) -> Option<Vec<GpuInfo>> {
    let mut gpus = Vec::new();
    
    for line in output.lines() {
        let parts: Vec<&str> = line.split(", ").collect();
        if parts.len() >= 7 {
            // 使用 parse_with_default 进行安全解析
            let index = parse_with_default(parts.get(1).unwrap_or(&"0"), 0u32);
            let memory_total = parse_with_default(parts.get(2).unwrap_or(&"0"), 0u32);
            let memory_used = parse_with_default(parts.get(3).unwrap_or(&"0"), 0u32);
            let memory_free = parse_with_default(parts.get(4).unwrap_or(&"0"), 0u32);
            let utilization = parse_with_default(parts.get(5).unwrap_or(&"0"), 0u8);
            let temperature = parse_with_default(parts.get(6).unwrap_or(&"0"), 0u8);
            
            // 解析可选参数
            let power_draw = parts.get(7)
                .filter(|s| **s != "[N/A]")
                .and_then(|s| s.parse::<f32>().ok());
            
            let power_limit = parts.get(8)
                .filter(|s| **s != "[N/A]")
                .and_then(|s| s.parse::<f32>().ok());
            
            let fan_speed = parts.get(9)
                .filter(|s| **s != "[N/A]")
                .and_then(|s| s.parse::<u8>().ok());
            
            let graphics_clock = parts.get(10)
                .filter(|s| **s != "[N/A]")
                .and_then(|s| s.parse::<u32>().ok());
            
            let memory_clock = parts.get(11)
                .filter(|s| **s != "[N/A]")
                .and_then(|s| s.parse::<u32>().ok());
            
            gpus.push(GpuInfo {
                name: parts.get(0).unwrap_or(&"Unknown").to_string(),
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
    
    if !gpus.is_empty() {
        Some(gpus)
    } else {
        None
    }
}

fn parse_ss_output(output: &str) -> Vec<PortInfo> {
    let mut ports = Vec::new();
    
    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 7 {
            let protocol = parts[0];
            let state = parts[1];
            let local_address = parts[4];
            
            if let Some(port_str) = local_address.split(':').last() {
                if let Ok(port) = port_str.parse::<u16>() {
                    let mut program_name = "Unknown".to_string();
                    let mut pid = None;
                    
                    // 解析进程信息
                    if parts.len() > 6 {
                        let process_info = parts[6..].join(" ");
                        
                        if let Some(start) = process_info.find("((\"") {
                            if let Some(end) = process_info[start+3..].find("\"") {
                                program_name = process_info[start+3..start+3+end].to_string();
                            }
                        }
                        
                        if let Some(pid_start) = process_info.find("pid=") {
                            if let Some(comma_pos) = process_info[pid_start+4..].find(',') {
                                pid = process_info[pid_start+4..pid_start+4+comma_pos]
                                    .parse::<u32>()
                                    .ok();
                            }
                        }
                    }
                    
                    ports.push(PortInfo {
                        port,
                        protocol: protocol.to_uppercase(),
                        state: state.to_string(),
                        program: program_name,
                        pid,
                        address: local_address.to_string(),
                    });
                }
            }
        }
    }
    
    ports.sort_by_key(|p| p.port);
    ports
}

fn parse_netstat_output(output: &str) -> Vec<PortInfo> {
    let mut ports = Vec::new();
    
    for line in output.lines().skip(2) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 7 {
            let protocol = parts[0];
            let local_address = parts[3];
            let state = if protocol.starts_with("tcp") {
                parts[5].to_string()
            } else {
                "UNCONN".to_string()
            };
            
            if let Some(port_str) = local_address.split(':').last() {
                if let Ok(port) = port_str.parse::<u16>() {
                    let mut program_name = "Unknown".to_string();
                    let mut pid = None;
                    
                    if let Some(process_info) = parts.last() {
                        if *process_info != "-" {
                            let proc_parts: Vec<&str> = process_info.split('/').collect();
                            if proc_parts.len() == 2 {
                                if let Ok(pid_val) = proc_parts[0].parse::<u32>() {
                                    pid = Some(pid_val);
                                    program_name = proc_parts[1].to_string();
                                }
                            }
                        }
                    }
                    
                    ports.push(PortInfo {
                        port,
                        protocol: if protocol.starts_with("tcp") { "TCP" } else { "UDP" }.to_string(),
                        state,
                        program: program_name,
                        pid,
                        address: local_address.to_string(),
                    });
                }
            }
        }
    }
    
    ports.sort_by_key(|p| p.port);
    ports
}