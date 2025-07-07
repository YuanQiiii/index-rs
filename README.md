### index-rs
#### 1\. 项目概述

`index-rs` 是一个基于 Rust 和 `axum` 框架开发的现代化服务器状态监控与服务导航面板。它通过一个简洁美观的 Web 界面，以卡片和实时图表的形式，集中展示服务器的核心指标、运行状态、网络信息以及已部署服务的快捷入口，旨在为服务器管理员和开发者提供一个轻量、高效、一目了然的监控解决方案。

#### 2\. 核心功能设计 (扩展与细化)

我们将您已有的功能进行细化，并加入新的功能模块。

**2.1 服务导航 (Service Navigation)**

  * **功能描述**: 以卡片形式展示服务器上部署的各个 Web 服务或应用。
  * **设计细节**:
      * **静态配置**: 通过服务器上的一个配置文件（例如 `config.toml` 或 `services.json`）来定义卡片信息。每个服务可以配置：
          * `name`: 服务名称 (e.g., "Gitea")
          * `url`: 访问地址 (e.g., "[http://192.168.1.10:3000](https://www.google.com/search?q=http://192.168.1.10:3000)")
          * `icon`: 图标 (可以使用 Font Awesome 图标名或图片的 URL)
          * `description`: 简短描述。
      * **状态探测 (新增功能)**: 后端可以定期（例如每分钟）通过简单的 HTTP GET 或 TCP 连接请求来检查服务的健康状态。
          * **在线 (Online)**: 请求成功 (HTTP 2xx/3xx 或 TCP 连接成功)。卡片上显示一个绿色小圆点。
          * **离线 (Offline)**: 请求失败或超时。卡片上显示红色小圆点，并可置灰处理。

**2.2 实时系统状态 (Real-time System Status)**

  * **功能描述**: 实时展示服务器核心资源的占用情况。数据通过 WebSocket 推送到前端，实现秒级更新。
  * **设计细节**:
      * **CPU**:
          * 总使用率（百分比）。
          * 每个核心的使用率图表。
          * CPU 负载 (Load Average) (1分钟, 5分钟, 15分钟)。
      * **内存 (Memory)**:
          * 总内存、已用、可用。
          * 使用率百分比仪表盘。
          * 交换空间 (Swap) 的使用情况。
      * **磁盘 (Disk)**:
          * 以列表或卡片形式展示每个挂载点。
          * 显示总空间、已用空间、可用空间和使用率。
      * **网络 (Network)**:
          * **IP 地址**: 清晰列出所有网络接口的 IPv4 和 IPv6 地址。
          * **实时速率**: 实时显示上行和下行的网络速度 (KB/s 或 MB/s)。
          * **数据总量**: 显示自服务启动以来的总上传和下载数据量。

**2.3 系统信息 (System Information) (新增功能)**

  * **功能描述**: 展示服务器的静态硬件和软件信息，这些信息通常不会改变。
  * **设计细节**:
      * **操作系统**: 系统名称、发行版及版本 (e.g., "Ubuntu 22.04.3 LTS")。
      * **内核版本**: Linux Kernel Version。
      * **主机名 (Hostname)**。
      * **系统运行时间 (Uptime)**。

**2.4 网络与进程监控 (Network & Process Monitoring) (新增功能)**

  * **功能描述**: 提供更深度的系统洞察。
  * **设计细节**:
      * **端口占用**: 列出当前所有正在监听的 TCP/UDP 端口及其对应的进程名称和 PID。这对于排查端口冲突非常有用。
      * **进程列表**: 一个简化的 `top` / `htop` 视图。可以按 CPU 或内存使用率排序，显示 PID、用户、CPU占用、内存占用和命令。

**2.5 历史数据图表 (Historical Data Charts) (新增功能)**

  * **功能描述**: 除了实时图表，还提供历史数据查询与可视化。
  * **设计细节**:
      * 后端在内存中（或使用轻量级数据库如 SQLite）缓存最近一段时间（如过去24小时）的 CPU 和内存使用率数据。
      * 前端提供时间范围选择器（如 "过去1小时", "过去6小时", "过去24小时"），动态加载并展示历史趋势图。

**2.6 用户界面 (UI/UX)**

  * **主题切换**: 提供明亮 (Light) 和暗黑 (Dark) 两种主题模式。
  * **响应式设计**: 页面布局能自适应桌面、平板和手机屏幕。

-----

#### 3\. 系统架构设计

  (这是一个概念图，实际需要您来绘制)

  * **后端 (Backend - Rust / `axum`)**:
    1.  **数据采集器 (Data Collector)**:
          * 使用 `tokio::spawn` 创建一个后台异步任务。
          * 此任务每秒钟运行一次，使用 `sysinfo` 这个 crate 来获取所有动态的系统信息 (CPU, Mem, Network, Processes)。
          * 采集到的数据通过 `tokio` 的广播通道 (broadcast channel) 发送出去。
    2.  **Web 服务器 (`axum`)**:
          * **静态文件服务**: 托管编译好的前端 HTML, CSS, JavaScript 文件。
          * **HTTP API 端点**: 提供一次性的数据接口，如获取静态系统信息 (`/api/static_info`) 和服务卡片配置 (`/api/services`)。
          * **WebSocket 服务**:
              * 建立 `/ws/realtime` 端点。
              * 当有新的客户端连接时，订阅上述的数据广播通道。
              * 将通道中收到的最新系统数据实时推送给所有连接的前端客户端。
  * **前端 (Frontend - SPA)**:
      * 使用现代前端框架（如 Vue, React, Svelte）或原生 JavaScript 构建单页应用。
      * **初始化**: 页面加载时，通过 HTTP API 获取静态信息和服务列表。
      * **实时更新**:
          * 与后端的 `/ws/realtime` 建立 WebSocket 连接。
          * 监听消息，用收到的新数据来更新 UI 上的图表和数值。
      * **可视化**: 使用 `Chart.js` 或 `ECharts` 等库来绘制美观的动态图表。

-----

#### 4\. 技术栈选择

  * **后端 (Backend)**:
      * **Web 框架**: `axum` (用户指定)
      * **异步运行时**: `tokio`
      * **系统信息库**: `sysinfo` (跨平台，功能强大)
      * **序列化/反序列化**: `serde` (配合 `serde_json` 处理 JSON)
      * **配置文件解析**: `toml`
      * **日志**: `tracing`
  * **前端 (Frontend)**:
      * **JavaScript 框架 (可选)**: Vue.js 或 React.js (推荐，便于组件化管理)
      * **UI 库**: Tailwind CSS (用于快速构建现代化的界面)
      * **图表库**: `ECharts` (功能强大) 或 `Chart.js` (轻量易用)
      * **图标**: `Font Awesome` 或 `Lucide Icons`

-----

#### 5\. API 与数据模型设计

**5.1 REST API**

  * `GET /api/services`: 获取服务卡片列表。
      * 返回 `Vec<ServiceCard>`
  * `GET /api/system/static`: 获取一次性的静态系统信息。
      * 返回 `SystemStaticInfo`

**5.2 WebSocket**

  * `WS /ws/realtime`: 用于实时数据推送。
  * **推送消息格式**: 服务器每秒推送一个 JSON 对象，包含所有动态数据。

<!-- end list -->

```json
{
  "cpu_total_usage": 15.5,
  "memory_usage": {
    "total_kb": 8192000,
    "used_kb": 3276800,
    "free_kb": 4915200,
    "used_percent": 40.0
  },
  "network_io": {
    "rx_speed_kbps": 1024.5,
    "tx_speed_kbps": 128.2
  },
  "disks": [
    { "name": "/dev/sda1", "mount_point": "/", "total_gb": 100, "used_gb": 45 }
  ],
  "uptime_secs": 864000
}
```

**5.3 Rust 数据结构 (示例)**

```rust
use serde::Serialize;

#[derive(Serialize)]
pub struct ServiceCard {
    name: String,
    url: String,
    icon: String,
    description: String,
    status: String, // "Online" or "Offline"
}

#[derive(Serialize)]
pub struct SystemStaticInfo {
    os_name: String,
    kernel_version: String,
    hostname: String,
    cpu_cores: usize,
}

#[derive(Serialize)]
pub struct RealtimeData {
    // ... 对应上面 JSON 格式的字段
}
```

-----

#### 6\. 开发实施步骤 (Roadmap)

1.  **环境搭建**: `cargo new index-rs`，并添加 `axum`, `tokio`, `sysinfo`, `serde` 等基础依赖。
2.  **后端核心**:
      * 实现数据采集器，能够稳定地从 `sysinfo` 获取数据。
      * 搭建基础的 `axum` Web 服务器。
3.  **API 开发**:
      * 实现 `/api/services`，能够读取 `config.toml` 并返回数据。
      * 实现 WebSocket 端点 (`/ws/realtime`)，并将采集器的数据广播出去。
4.  **前端开发**:
      * 构建基础 HTML 布局和 CSS 样式。
      * 编写 JavaScript，连接 WebSocket，并在控制台打印接收到的数据。
      * 将数据渲染到页面上，先实现数值展示。
      * 集成图表库，将实时数据可视化。
5.  **功能完善**:
      * 实现服务卡片的状态探测功能。
      * 添加磁盘、进程、网络端口等高级监控模块的 API 和前端展示。
      * 实现历史数据图表。
6.  **优化与部署**:
      * 优化代码，处理错误和异常情况。
      * 编写 Dockerfile，方便容器化部署。
      * 编写 `systemd` 服务文件，实现开机自启和进程守护。
      * 撰写 README 文档，说明如何配置和部署。

