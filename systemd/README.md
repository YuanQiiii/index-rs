# systemd 部署指南

本指南介绍如何使用 systemd 将 index-rs 设置为系统服务。

## 前置要求

- Linux 系统（支持 systemd）
- Rust 1.70+ （用于编译）
- Node.js 16+ （用于构建前端）

## 安装步骤

### 1. 创建系统用户

```bash
# 创建专用用户（无登录权限）
sudo useradd -r -s /bin/false -m -d /var/lib/indexrs indexrs
```

### 2. 编译安装

```bash
# 克隆项目
cd /tmp
git clone https://github.com/yourusername/index-rs.git
cd index-rs

# 构建前端
cd frontend
npm install
npm run build
cd ..

# 构建后端（发布版本）
cargo build --release

# 创建安装目录
sudo mkdir -p /opt/index-rs
sudo mkdir -p /opt/index-rs/logs

# 复制文件
sudo cp target/release/index-rs /opt/index-rs/
sudo cp -r static /opt/index-rs/
sudo cp config.example.toml /opt/index-rs/config.toml

# 设置权限
sudo chown -R indexrs:indexrs /opt/index-rs
sudo chmod +x /opt/index-rs/index-rs
```

### 3. 配置服务

```bash
# 编辑配置文件
sudo nano /opt/index-rs/config.toml

# 复制 systemd 服务文件
sudo cp systemd/index-rs.service /etc/systemd/system/

# 重新加载 systemd
sudo systemctl daemon-reload
```

### 4. 启动服务

```bash
# 启动服务
sudo systemctl start index-rs

# 设置开机自启
sudo systemctl enable index-rs

# 查看服务状态
sudo systemctl status index-rs

# 查看日志
sudo journalctl -u index-rs -f
```

## 服务管理

### 基本命令

```bash
# 启动服务
sudo systemctl start index-rs

# 停止服务
sudo systemctl stop index-rs

# 重启服务
sudo systemctl restart index-rs

# 重新加载配置
sudo systemctl reload index-rs

# 查看状态
sudo systemctl status index-rs

# 禁用服务
sudo systemctl disable index-rs
```

### 日志管理

```bash
# 查看实时日志
sudo journalctl -u index-rs -f

# 查看最近 100 条日志
sudo journalctl -u index-rs -n 100

# 查看特定时间段的日志
sudo journalctl -u index-rs --since "2024-01-01" --until "2024-01-02"

# 清理旧日志
sudo journalctl --vacuum-time=7d
```

## 高级配置

### 自定义 systemd 服务文件

创建覆盖文件以自定义配置：

```bash
# 创建覆盖目录
sudo systemctl edit index-rs

# 这会打开编辑器，添加自定义配置
```

示例覆盖配置：

```ini
[Service]
# 自定义环境变量
Environment="RUST_LOG=debug"
Environment="INDEX_RS_PORT=8080"

# 自定义资源限制
MemoryLimit=1G
CPUQuota=200%

# 自定义用户
User=myuser
Group=mygroup
```

### 多实例部署

创建多个服务实例：

```bash
# 复制服务文件
sudo cp /etc/systemd/system/index-rs.service /etc/systemd/system/index-rs@.service

# 修改服务文件，使用 %i 作为实例标识
# ExecStart=/opt/index-rs/index-rs --config /opt/index-rs/config-%i.toml

# 启动多个实例
sudo systemctl start index-rs@prod
sudo systemctl start index-rs@dev
```

### 资源限制

在服务文件中设置资源限制：

```ini
[Service]
# CPU 限制（100% = 1 核心）
CPUQuota=50%

# 内存限制
MemoryLimit=256M
MemoryMax=512M

# 文件描述符限制
LimitNOFILE=65536

# 进程数限制
LimitNPROC=512
```

## 安全加固

### 1. 文件权限

```bash
# 限制配置文件权限
sudo chmod 640 /opt/index-rs/config.toml
sudo chown root:indexrs /opt/index-rs/config.toml

# 限制执行文件权限
sudo chmod 750 /opt/index-rs/index-rs
```

### 2. systemd 安全选项

在服务文件中添加安全选项：

```ini
[Service]
# 禁止获取新权限
NoNewPrivileges=true

# 使用私有 /tmp
PrivateTmp=true

# 保护系统目录
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/index-rs/logs

# 限制系统调用
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM

# 限制网络访问（如果不需要）
# PrivateNetwork=true

# 设备访问限制
PrivateDevices=true
DeviceAllow=/dev/null rw
DevicePolicy=strict
```

### 3. SELinux/AppArmor

如果系统启用了 SELinux 或 AppArmor，需要相应配置：

```bash
# SELinux
sudo semanage fcontext -a -t bin_t "/opt/index-rs/index-rs"
sudo restorecon -v /opt/index-rs/index-rs

# AppArmor
sudo aa-complain /opt/index-rs/index-rs
```

## 性能优化

### 1. 调整文件描述符限制

```bash
# 编辑 limits.conf
sudo nano /etc/security/limits.conf

# 添加
indexrs soft nofile 65536
indexrs hard nofile 65536
```

### 2. 内核参数优化

```bash
# 编辑 sysctl.conf
sudo nano /etc/sysctl.conf

# 添加
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535

# 应用更改
sudo sysctl -p
```

## 监控和告警

### 使用 systemd 监控

```bash
# 创建监控脚本
cat > /usr/local/bin/check-index-rs.sh << 'EOF'
#!/bin/bash
if ! systemctl is-active --quiet index-rs; then
    echo "index-rs service is not running"
    # 发送告警邮件或通知
    exit 1
fi
EOF

chmod +x /usr/local/bin/check-index-rs.sh

# 创建定时任务
echo "*/5 * * * * root /usr/local/bin/check-index-rs.sh" > /etc/cron.d/check-index-rs
```

### 集成 Prometheus

在 index-rs 中添加 metrics 端点，然后配置 Prometheus：

```yaml
scrape_configs:
  - job_name: 'index-rs'
    static_configs:
      - targets: ['localhost:9876']
    metrics_path: '/metrics'
```

## 故障排除

### 服务无法启动

1. 检查日志：
   ```bash
   sudo journalctl -u index-rs -n 50
   ```

2. 检查配置文件语法：
   ```bash
   sudo -u indexrs /opt/index-rs/index-rs --check-config
   ```

3. 检查端口占用：
   ```bash
   sudo netstat -tlnp | grep 9876
   ```

4. 检查权限：
   ```bash
   ls -la /opt/index-rs/
   ```

### 性能问题

1. 查看资源使用：
   ```bash
   systemctl status index-rs
   ```

2. 查看详细资源统计：
   ```bash
   systemd-cgtop
   ```

3. 分析日志中的错误：
   ```bash
   sudo journalctl -u index-rs | grep ERROR
   ```

## 备份和恢复

### 备份

```bash
#!/bin/bash
# backup-index-rs.sh

BACKUP_DIR="/backup/index-rs"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 停止服务
systemctl stop index-rs

# 备份文件
tar -czf "$BACKUP_DIR/index-rs_$DATE.tar.gz" -C /opt index-rs

# 启动服务
systemctl start index-rs

# 清理旧备份（保留7天）
find "$BACKUP_DIR" -name "index-rs_*.tar.gz" -mtime +7 -delete
```

### 恢复

```bash
#!/bin/bash
# restore-index-rs.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# 停止服务
systemctl stop index-rs

# 恢复文件
tar -xzf "$BACKUP_FILE" -C /opt

# 修复权限
chown -R indexrs:indexrs /opt/index-rs

# 启动服务
systemctl start index-rs
```

## 升级流程

```bash
#!/bin/bash
# upgrade-index-rs.sh

# 备份当前版本
/usr/local/bin/backup-index-rs.sh

# 下载新版本
cd /tmp
git clone https://github.com/yourusername/index-rs.git
cd index-rs

# 构建新版本
cd frontend && npm install && npm run build && cd ..
cargo build --release

# 停止服务
sudo systemctl stop index-rs

# 替换文件
sudo cp target/release/index-rs /opt/index-rs/
sudo cp -r static /opt/index-rs/
sudo chown -R indexrs:indexrs /opt/index-rs

# 启动服务
sudo systemctl start index-rs

# 检查状态
sudo systemctl status index-rs
```