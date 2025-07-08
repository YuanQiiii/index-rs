# Docker 部署指南

本指南介绍如何使用 Docker 部署 index-rs 服务器监控系统。

## 快速开始

### 1. 使用 Docker Compose（推荐）

```bash
# 克隆项目
git clone https://github.com/yourusername/index-rs.git
cd index-rs

# 配置服务
cp config.example.toml config.toml
# 编辑 config.toml 配置你的服务

# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 2. 使用 Docker 命令

```bash
# 构建镜像
docker build -t index-rs:latest .

# 运行容器
docker run -d \
  --name index-rs \
  -p 9876:9876 \
  -v $(pwd)/config.toml:/app/config.toml:ro \
  --restart unless-stopped \
  index-rs:latest
```

## 配置说明

### 环境变量

- `RUST_LOG`: 日志级别（debug/info/warn/error），默认为 info
- `HOST_PROC`: 主机 /proc 目录路径（用于容器内读取主机信息）
- `HOST_SYS`: 主机 /sys 目录路径

### 挂载卷

#### 基本配置

```yaml
volumes:
  - ./config.toml:/app/config.toml:ro  # 配置文件（只读）
```

#### 监控主机系统（可选）

如果需要监控 Docker 主机的系统信息而不是容器内部：

```yaml
volumes:
  - /proc:/host/proc:ro
  - /sys:/host/sys:ro
  - /etc/os-release:/host/etc/os-release:ro
```

### GPU 支持

如果需要监控 NVIDIA GPU：

```yaml
services:
  index-rs:
    # ... 其他配置
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

或使用 Docker 命令：

```bash
docker run -d \
  --name index-rs \
  --gpus all \
  -p 9876:9876 \
  -v $(pwd)/config.toml:/app/config.toml:ro \
  index-rs:latest
```

## 生产环境优化

### 使用优化的 Dockerfile

```bash
# 使用生产环境优化的 Dockerfile
docker build -f Dockerfile.production -t index-rs:prod .
```

### 资源限制

在 docker-compose.yml 中添加资源限制：

```yaml
services:
  index-rs:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 日志管理

配置日志轮转：

```yaml
services:
  index-rs:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 反向代理配置

### Nginx 示例

```nginx
server {
    listen 80;
    server_name monitor.example.com;

    location / {
        proxy_pass http://localhost:9876;
        proxy_http_version 1.1;
        
        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Traefik 示例

在 docker-compose.yml 中添加标签：

```yaml
services:
  index-rs:
    # ... 其他配置
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.index-rs.rule=Host(`monitor.example.com`)"
      - "traefik.http.routers.index-rs.entrypoints=websecure"
      - "traefik.http.routers.index-rs.tls.certresolver=letsencrypt"
      - "traefik.http.services.index-rs.loadbalancer.server.port=9876"
```

## 故障排除

### 容器无法启动

1. 检查日志：
   ```bash
   docker logs index-rs
   ```

2. 验证配置文件：
   ```bash
   docker run --rm -v $(pwd)/config.toml:/app/config.toml:ro index-rs:latest ./index-rs --check-config
   ```

### 无法获取系统信息

1. 确保正确挂载了主机目录
2. 检查容器用户权限
3. 某些信息（如 CPU 温度）可能需要特权模式：
   ```bash
   docker run --privileged ...
   ```

### WebSocket 连接失败

1. 检查反向代理配置是否支持 WebSocket
2. 确保防火墙允许 WebSocket 连接
3. 检查浏览器控制台错误信息

## 安全建议

1. **使用只读挂载**：配置文件应该以只读方式挂载
2. **限制网络访问**：使用 Docker 网络隔离
3. **定期更新镜像**：及时更新基础镜像和依赖
4. **最小权限原则**：避免使用 root 用户运行
5. **资源限制**：设置 CPU 和内存限制防止资源耗尽

## 备份和恢复

### 备份配置

```bash
# 备份配置文件
cp config.toml config.toml.backup

# 导出容器配置
docker inspect index-rs > index-rs-config.json
```

### 恢复服务

```bash
# 恢复配置
cp config.toml.backup config.toml

# 重新创建容器
docker-compose up -d
```

## 监控 Docker 容器

如果要监控其他 Docker 容器，可以挂载 Docker socket：

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

**注意**：这会给容器很高的权限，请谨慎使用。

## 更新升级

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build --no-cache

# 重启服务
docker-compose up -d
```