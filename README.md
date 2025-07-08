# index-rs

一个现代化的服务器监控面板，使用 Rust (Axum) 后端和 React 前端构建，提供实时系统监控和服务导航功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Rust](https://img.shields.io/badge/rust-1.70%2B-orange.svg)
![React](https://img.shields.io/badge/react-18.2%2B-61dafb.svg)

## 功能特性

### 系统监控
- **实时性能监控**：CPU、内存、网络、磁盘使用情况
- **CPU 详情**：各核心使用率、温度、功耗监控
- **GPU 监控**：支持 NVIDIA GPU（温度、使用率、功耗、风扇转速等）
- **端口占用**：实时显示系统端口占用情况，支持搜索和排序
- **系统信息**：主机名、操作系统、内核版本、运行时间等

### 服务导航
- 自定义服务卡片配置
- 服务健康状态检查
- 一键跳转到配置的服务

### 技术特点
- **WebSocket 实时推送**：低延迟的实时数据更新
- **响应式设计**：适配各种屏幕尺寸
- **深色主题**：护眼的深色界面设计
- **高性能**：Rust 后端确保低资源占用

## 技术栈

### 后端
- **Rust** - 系统编程语言
- **Axum** - 现代化的 Web 框架
- **Tokio** - 异步运行时
- **Sysinfo** - 系统信息采集
- **Serde** - 序列化/反序列化

### 前端
- **React** - UI 框架
- **Vite** - 构建工具
- **Zustand** - 状态管理
- **ECharts** - 数据可视化
- **Tailwind CSS** - 样式框架

## 快速开始

### 环境要求
- Rust 1.70+
- Node.js 16+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/index-rs.git
cd index-rs
```

2. **配置服务**
```bash
cp config.example.toml config.toml
# 编辑 config.toml 配置你的服务
```

3. **构建前端**
```bash
cd frontend
npm install
npm run build
cd ..
```

4. **运行服务**
```bash
cargo run --release
```

5. **访问面板**
打开浏览器访问 `http://localhost:9876`

## 配置说明

### 基本配置 (config.toml)

```toml
[server]
host = "0.0.0.0"
port = 9876

[services]
ip = "localhost"  # 所有服务共享的 IP 地址

[[services.items]]
name = "Gitea"
port = 3000
icon = "fab fa-git-alt"
description = "Git 仓库管理"
protocol = "http"
health_check_path = "/api/v1/version"  # 可选：健康检查路径
```

### 服务配置说明
- `name`: 服务名称
- `port`: 服务端口
- `icon`: Font Awesome 图标类名
- `description`: 服务描述
- `protocol`: 协议（http/https）
- `health_check_path`: 健康检查接口路径（可选）

## 开发指南

### 后端开发

```bash
# 开发模式运行
cargo run

# 运行测试
cargo test

# 代码格式化
cargo fmt

# 代码检查
cargo clippy
```

### 前端开发

```bash
cd frontend

# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

## 系统架构

### 数据流
1. **数据采集**：后端每秒采集一次系统数据
2. **WebSocket 推送**：通过 WebSocket 实时推送到前端
3. **状态管理**：前端使用 Zustand 管理全局状态
4. **UI 更新**：React 组件订阅状态变化自动更新

### 目录结构
```
index-rs/
├── src/                    # Rust 后端源码
│   ├── main.rs            # 入口文件
│   ├── models.rs          # 数据模型
│   ├── collectors.rs      # 数据采集器
│   ├── handlers.rs        # HTTP/WebSocket 处理器
│   └── config.rs          # 配置管理
├── frontend/              # React 前端源码
│   ├── src/
│   │   ├── api/          # API 和 WebSocket 管理
│   │   ├── components/   # React 组件
│   │   ├── store/        # Zustand 状态管理
│   │   └── utils/        # 工具函数
│   └── ...
├── static/               # 前端构建输出目录
└── config.toml          # 配置文件
```

## API 文档

### REST API

- `GET /api/system/static` - 获取系统静态信息
- `GET /api/services` - 获取服务列表

### WebSocket

- `/ws/realtime` - 实时数据推送端点

数据格式示例：
```json
{
  "timestamp": 1234567890,
  "cpu": {
    "total_usage": 15.2,
    "core_usage": [10.1, 20.3, ...],
    "temperature_celsius": 65.0,
    "power_watts": 45.5
  },
  "memory": {
    "total_kb": 16777216,
    "used_kb": 8388608,
    "used_percent": 50.0
  },
  // ... 更多数据
}
```

## 部署建议

### systemd 服务

创建 `/etc/systemd/system/index-rs.service`：

```ini
[Unit]
Description=index-rs server monitoring
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/index-rs
ExecStart=/path/to/index-rs/target/release/index-rs
Restart=always
Environment="RUST_LOG=info"

[Install]
WantedBy=multi-user.target
```

### Docker 部署

```dockerfile
# Dockerfile 示例
FROM rust:latest as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM node:18 as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/index-rs .
COPY --from=frontend-builder /app/static ./static
COPY config.example.toml ./config.toml
EXPOSE 9876
CMD ["./index-rs"]
```

## 故障排除

### CPU 温度无法读取
- 确保安装了 `lm-sensors` 包：`sudo apt install lm-sensors`
- 运行 `sudo sensors-detect` 并按提示操作
- 某些虚拟机或容器环境可能无法读取温度

### 端口占用信息不完整
- 需要 root 权限才能看到所有进程信息
- 运行：`sudo ./target/release/index-rs`

### GPU 信息不显示
- 仅支持 NVIDIA GPU
- 确保安装了 NVIDIA 驱动和 nvidia-smi 工具

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范
- Rust 代码使用 `cargo fmt` 格式化
- React 代码遵循项目 ESLint 配置
- 提交信息使用语义化格式

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [Axum](https://github.com/tokio-rs/axum) - 优秀的 Rust Web 框架
- [React](https://react.dev) - 构建用户界面
- [ECharts](https://echarts.apache.org) - 强大的图表库
- [Tailwind CSS](https://tailwindcss.com) - 实用的 CSS 框架