use crate::models::*;
use serde_json;
use std::collections::HashMap;
use tracing::debug;

pub fn parse_docker_containers(containers_json: &str, stats_json: &str) -> Result<Vec<DockerContainer>, String> {
    let mut containers = Vec::new();
    let mut stats_map: HashMap<String, (f32, f64, f64, f64, f64, f64)> = HashMap::new();
    
    // 解析统计信息
    for line in stats_json.lines() {
        if line.trim().is_empty() {
            continue;
        }
        
        match serde_json::from_str::<serde_json::Value>(line) {
            Ok(stats) => {
                if let (Some(container), Some(cpu_perc), Some(mem_usage), Some(mem_limit), Some(net_io)) = (
                    stats.get("Container").and_then(|v| v.as_str()),
                    stats.get("CPUPerc").and_then(|v| v.as_str()),
                    stats.get("MemUsage").and_then(|v| v.as_str()),
                    stats.get("MemLimit").and_then(|v| v.as_str()),
                    stats.get("NetIO").and_then(|v| v.as_str()),
                ) {
                    let cpu_percent = cpu_perc.trim_end_matches('%').parse::<f32>().unwrap_or(0.0);
                    let (mem_usage_mb, mem_limit_mb) = parse_memory_usage(mem_usage, mem_limit);
                    let (rx_mb, tx_mb) = parse_network_io(net_io);
                    
                    stats_map.insert(
                        container.to_string(),
                        (cpu_percent, mem_usage_mb, mem_limit_mb, rx_mb, tx_mb, 
                         if mem_limit_mb > 0.0 { (mem_usage_mb / mem_limit_mb) * 100.0 } else { 0.0 })
                    );
                }
            }
            Err(e) => debug!("Failed to parse Docker stats line: {}", e),
        }
    }
    
    // 解析容器信息
    for line in containers_json.lines() {
        if line.trim().is_empty() {
            continue;
        }
        
        match serde_json::from_str::<serde_json::Value>(line) {
            Ok(container_json) => {
                if let Some(container) = parse_container_json(&container_json, &stats_map) {
                    containers.push(container);
                }
            }
            Err(e) => debug!("Failed to parse Docker container line: {}", e),
        }
    }
    
    Ok(containers)
}

fn parse_container_json(json: &serde_json::Value, stats_map: &HashMap<String, (f32, f64, f64, f64, f64, f64)>) -> Option<DockerContainer> {
    let id = json.get("ID")?.as_str()?.to_string();
    let name = json.get("Names")?.as_str()?.to_string();
    let image = json.get("Image")?.as_str()?.to_string();
    let status = json.get("Status")?.as_str()?.to_string();
    let state_str = json.get("State")?.as_str()?;
    let created_at = json.get("CreatedAt")?.as_str()?.to_string();
    
    // 解析端口映射
    let ports = if let Some(ports_str) = json.get("Ports").and_then(|v| v.as_str()) {
        parse_port_mappings(ports_str)
    } else {
        Vec::new()
    };
    
    // 解析状态
    let state = ContainerState {
        running: state_str == "running",
        paused: state_str == "paused",
        restarting: state_str == "restarting",
        dead: state_str == "dead",
        pid: None,
        exit_code: None,
        started_at: None,
        finished_at: None,
    };
    
    // 获取统计信息
    let (cpu_percent, memory_usage_mb, memory_limit_mb, network_rx_mb, network_tx_mb, memory_percent) = 
        stats_map.get(&name).copied().unwrap_or((0.0, 0.0, 0.0, 0.0, 0.0, 0.0));
    
    // 解析创建时间
    let created = chrono::DateTime::parse_from_rfc3339(&created_at)
        .map(|dt| dt.timestamp())
        .unwrap_or(0);
    
    Some(DockerContainer {
        id,
        name,
        image,
        status,
        state,
        created,
        ports,
        cpu_percent,
        memory_usage_mb,
        memory_limit_mb,
        memory_percent: memory_percent as f32,
        network_rx_mb,
        network_tx_mb,
    })
}

fn parse_port_mappings(ports_str: &str) -> Vec<PortMapping> {
    let mut mappings = Vec::new();
    
    for port_part in ports_str.split(", ") {
        if port_part.trim().is_empty() {
            continue;
        }
        
        // 格式例如: "0.0.0.0:8080->80/tcp" 或 "80/tcp"
        if let Some(arrow_pos) = port_part.find("->") {
            let host_part = &port_part[..arrow_pos];
            let container_part = &port_part[arrow_pos + 2..];
            
            if let Some(slash_pos) = container_part.find('/') {
                let container_port = container_part[..slash_pos].parse::<u16>().unwrap_or(0);
                let protocol = container_part[slash_pos + 1..].to_string();
                
                let (host_ip, host_port) = if let Some(colon_pos) = host_part.rfind(':') {
                    let ip = host_part[..colon_pos].to_string();
                    let port = host_part[colon_pos + 1..].parse::<u16>().ok();
                    (Some(ip), port)
                } else {
                    (None, None)
                };
                
                mappings.push(PortMapping {
                    container_port,
                    host_port,
                    protocol,
                    host_ip,
                });
            }
        } else if let Some(slash_pos) = port_part.find('/') {
            // 只有容器端口，没有主机映射
            let container_port = port_part[..slash_pos].parse::<u16>().unwrap_or(0);
            let protocol = port_part[slash_pos + 1..].to_string();
            
            mappings.push(PortMapping {
                container_port,
                host_port: None,
                protocol,
                host_ip: None,
            });
        }
    }
    
    mappings
}

fn parse_memory_usage(usage_str: &str, limit_str: &str) -> (f64, f64) {
    let usage_mb = parse_size_to_mb(usage_str.split(" / ").next().unwrap_or("0"));
    let limit_mb = parse_size_to_mb(limit_str);
    (usage_mb, limit_mb)
}

fn parse_network_io(net_io_str: &str) -> (f64, f64) {
    let parts: Vec<&str> = net_io_str.split(" / ").collect();
    let rx_mb = if parts.len() > 0 { parse_size_to_mb(parts[0]) } else { 0.0 };
    let tx_mb = if parts.len() > 1 { parse_size_to_mb(parts[1]) } else { 0.0 };
    (rx_mb, tx_mb)
}

fn parse_size_to_mb(size_str: &str) -> f64 {
    let size_str = size_str.trim();
    if size_str.ends_with("GiB") || size_str.ends_with("GB") {
        size_str.trim_end_matches("GiB").trim_end_matches("GB").trim()
            .parse::<f64>().unwrap_or(0.0) * 1024.0
    } else if size_str.ends_with("MiB") || size_str.ends_with("MB") {
        size_str.trim_end_matches("MiB").trim_end_matches("MB").trim()
            .parse::<f64>().unwrap_or(0.0)
    } else if size_str.ends_with("KiB") || size_str.ends_with("KB") || size_str.ends_with("kB") {
        size_str.trim_end_matches("KiB").trim_end_matches("KB").trim_end_matches("kB").trim()
            .parse::<f64>().unwrap_or(0.0) / 1024.0
    } else if size_str.ends_with("B") {
        size_str.trim_end_matches("B").trim()
            .parse::<f64>().unwrap_or(0.0) / 1024.0 / 1024.0
    } else {
        size_str.parse::<f64>().unwrap_or(0.0)
    }
}