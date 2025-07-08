# index-rs 开发指南

本指南帮助开发者快速了解 index-rs 项目的开发流程、架构设计和最佳实践。

## 快速开始

### 环境准备

1. **安装 Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **安装 Node.js**
   - 推荐使用 [nvm](https://github.com/nvm-sh/nvm) 管理 Node.js 版本
   - 需要 Node.js 16.x 或更高版本

3. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/index-rs.git
   cd index-rs
   ```

### 开发流程

1. **配置服务**
   ```bash
   cp config.example.toml config.toml
   # 编辑 config.toml 配置你的服务
   ```

2. **启动后端开发服务器**
   ```bash
   cargo run
   ```

3. **启动前端开发服务器**（新终端）
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **访问应用**
   - 前端开发服务器：http://localhost:5173
   - 后端 API：http://localhost:9876

## 架构概览

### 系统架构图

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │◄────┤  Rust Backend   │◄────┤  System Info    │
│                 │ WS  │                 │     │   (sysinfo)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │                       │                        │
         ▼                       ▼                        ▼
  ┌─────────────┐        ┌──────────────┐       ┌──────────────┐
  │   ECharts   │        │    Axum      │       │  nvidia-smi  │
  │   Zustand   │        │    Tokio     │       │   sensors    │
  │  Tailwind   │        │   Channels   │       │   ss/netstat │
  └─────────────┘        └──────────────┘       └──────────────┘
```

### 数据流

1. **系统数据采集**
   - 后台任务每秒采集一次系统数据
   - 使用 sysinfo crate 获取 CPU、内存、磁盘等信息
   - 通过命令行工具获取 GPU、端口等额外信息

2. **数据广播**
   - 使用 tokio broadcast channel 广播数据
   - 所有 WebSocket 连接都能接收到数据

3. **前端更新**
   - WebSocket 接收实时数据
   - Zustand 管理全局状态
   - React 组件自动重渲染

## 核心模块详解

### 后端模块

#### 1. 数据采集器 (collectors.rs)

负责收集系统信息：

```rust
pub async fn collect_system_data() -> RealtimeData {
    // CPU 信息
    let cpu_info = get_cpu_info(&sys);
    
    // 内存信息
    let memory_info = get_memory_info(&sys);
    
    // GPU 信息（nvidia-smi）
    let gpu_info = get_gpu_info().await;
    
    // 端口信息
    let ports = get_port_info().await;
    
    // ...
}
```

#### 2. WebSocket 处理器 (handlers.rs)

管理实时数据推送：

```rust
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(app_state): State<AppState>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, app_state))
}
```

#### 3. 配置管理 (config.rs)

使用 TOML 格式管理配置：

```rust
#[derive(Debug, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub services: ServicesConfig,
}
```

### 前端模块

#### 1. 状态管理 (store/serverStore.js)

使用 Zustand 管理全局状态：

```javascript
const useServerStore = create((set) => ({
  // 状态
  isConnected: false,
  systemInfo: null,
  realtimeData: {},
  
  // Actions
  updateRealtimeData: (data) => set((state) => ({
    realtimeData: data,
    history: updateHistory(state.history, data)
  }))
}));
```

#### 2. WebSocket 管理器 (api/websocket.js)

处理 WebSocket 连接和重连：

```javascript
class WebSocketManager {
  connect() {
    this.ws = new WebSocket(WS_URL);
    this.setupEventHandlers();
  }
  
  setupReconnect() {
    // 自动重连逻辑
  }
}
```

#### 3. 数据可视化组件

使用 ECharts 展示数据：

```javascript
const CpuWidget = () => {
  const chartRef = useRef(null);
  const cpuData = useServerStore((state) => state.realtimeData.cpu);
  
  useEffect(() => {
    const chart = echarts.init(chartRef.current);
    chart.setOption(getChartOptions(cpuData));
  }, [cpuData]);
};
```

## 添加新功能

### 添加新的系统监控项

1. **更新数据模型** (src/models.rs)
   ```rust
   #[derive(Serialize, Deserialize)]
   pub struct NewMetric {
       pub value: f32,
       pub timestamp: i64,
   }
   ```

2. **实现数据采集** (src/collectors.rs)
   ```rust
   pub fn collect_new_metric() -> NewMetric {
       // 实现采集逻辑
   }
   ```

3. **更新前端状态** (frontend/src/store/serverStore.js)
   ```javascript
   realtimeData: {
     // ...
     newMetric: null
   }
   ```

4. **创建展示组件** (frontend/src/components/widgets/NewWidget.jsx)
   ```jsx
   const NewWidget = () => {
     const data = useServerStore((state) => state.realtimeData.newMetric);
     // 实现组件
   };
   ```

### 添加新的服务卡片

1. **更新配置文件** (config.toml)
   ```toml
   [[services.items]]
   name = "新服务"
   port = 8080
   icon = "fas fa-server"
   description = "服务描述"
   ```

2. **实现健康检查**（可选）
   ```rust
   async fn check_service_health(service: &ServiceCard) -> ServiceStatus {
       // 实现健康检查逻辑
   }
   ```

## 性能优化

### 后端优化

1. **使用缓存**
   - 对静态信息使用缓存，避免重复计算
   - 使用 `Arc<RwLock<T>>` 管理共享状态

2. **异步处理**
   - 使用 `tokio::spawn` 处理耗时任务
   - 并行执行多个数据采集任务

3. **资源管理**
   - 限制 WebSocket 连接数
   - 使用连接池管理外部命令调用

### 前端优化

1. **组件优化**
   - 使用 `React.memo` 避免不必要的重渲染
   - 合理使用 Zustand 选择器

2. **图表优化**
   - 限制历史数据点数量
   - 使用 `requestAnimationFrame` 节流更新

3. **构建优化**
   - 启用代码分割
   - 使用动态导入加载大型依赖

## 测试指南

### 后端测试

```bash
# 运行所有测试
cargo test

# 运行特定测试
cargo test test_name

# 显示测试输出
cargo test -- --nocapture
```

### 前端测试

```bash
cd frontend

# 运行测试
npm test

# 运行测试覆盖率
npm run test:coverage
```

### 集成测试

1. **API 测试**
   ```rust
   #[tokio::test]
   async fn test_system_endpoint() {
       let app = create_app();
       let response = app
           .oneshot(Request::builder()
               .uri("/api/system/static")
               .body(Body::empty())
               .unwrap())
           .await
           .unwrap();
       assert_eq!(response.status(), StatusCode::OK);
   }
   ```

2. **WebSocket 测试**
   - 使用 `tokio-tungstenite` 测试 WebSocket 连接
   - 验证数据格式和更新频率

## 调试技巧

### 后端调试

1. **启用日志**
   ```bash
   RUST_LOG=debug cargo run
   ```

2. **使用调试器**
   - VS Code 配置 CodeLLDB 扩展
   - 使用断点调试

3. **性能分析**
   ```bash
   cargo build --release
   perf record ./target/release/index-rs
   perf report
   ```

### 前端调试

1. **React DevTools**
   - 查看组件树和状态
   - 分析组件性能

2. **网络调试**
   - Chrome DevTools Network 面板
   - 查看 WebSocket 帧

3. **控制台日志**
   ```javascript
   // 开发环境启用详细日志
   if (import.meta.env.DEV) {
     console.log('Debug info:', data);
   }
   ```

## 部署指南

### Docker 部署

1. **构建镜像**
   ```bash
   docker build -t index-rs .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     -p 9876:9876 \
     -v ./config.toml:/app/config.toml \
     --name index-rs \
     index-rs
   ```

### systemd 服务

1. **创建服务文件**
   ```ini
   [Unit]
   Description=index-rs monitoring
   After=network.target

   [Service]
   Type=simple
   ExecStart=/usr/local/bin/index-rs
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

2. **启用服务**
   ```bash
   sudo systemctl enable index-rs
   sudo systemctl start index-rs
   ```

### 反向代理配置

Nginx 配置示例：

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
    }
}
```

## 常见问题

### Q: CPU 温度读取失败
A: 
- 确保安装了 `lm-sensors`
- 运行 `sudo sensors-detect`
- 某些虚拟机环境可能不支持

### Q: GPU 信息不显示
A: 
- 仅支持 NVIDIA GPU
- 确保 nvidia-smi 在 PATH 中
- 检查 NVIDIA 驱动是否正确安装

### Q: WebSocket 连接频繁断开
A: 
- 检查代理配置是否支持 WebSocket
- 增加超时时间
- 查看服务器日志

### Q: 构建失败
A: 
- 确保 Rust 和 Node.js 版本符合要求
- 清理缓存：`cargo clean` 和 `rm -rf frontend/node_modules`
- 检查系统依赖是否完整

## 贡献指南

1. **代码风格**
   - Rust: 使用 `cargo fmt` 和 `cargo clippy`
   - JavaScript: 遵循 ESLint 配置

2. **提交规范**
   - feat: 新功能
   - fix: 修复 bug
   - docs: 文档更新
   - style: 代码格式调整
   - refactor: 重构
   - test: 测试相关
   - chore: 构建/工具相关

3. **PR 流程**
   - Fork 项目
   - 创建功能分支
   - 编写测试
   - 提交 PR
   - 等待 review

## 资源链接

- [Axum 文档](https://docs.rs/axum)
- [React 文档](https://react.dev)
- [ECharts 文档](https://echarts.apache.org)
- [Zustand 文档](https://github.com/pmndrs/zustand)
- [Tailwind CSS 文档](https://tailwindcss.com)