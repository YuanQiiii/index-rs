# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`index-rs` is a modern server monitoring and service navigation dashboard built with:
- **Backend**: Rust with Axum web framework
- **Frontend**: React with Vite, Zustand, and ECharts
- **Real-time Communication**: WebSocket for live data streaming

The dashboard provides real-time system monitoring (CPU, memory, network, disk, GPU), service health checks, port monitoring, and a clean web interface for server administrators.

## Build and Development Commands

### Backend (Rust)
```bash
# Development mode
cargo run

# Build for release
cargo build --release

# Run tests
cargo test

# Format code
cargo fmt

# Check code with linter
cargo clippy
```

### Frontend (React)
```bash
cd frontend

# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# The build output goes to ../static directory
```

## Architecture

### Backend (Rust/Axum)

1. **Data Collector** (`src/collectors.rs`)
   - Background async task using tokio
   - Collects system metrics every second via `sysinfo` crate
   - Monitors CPU (including temperature/power via `sensors`)
   - Monitors GPU via `nvidia-smi`
   - Monitors ports via `ss` or `netstat`

2. **Web Server** (`src/main.rs`, `src/handlers.rs`)
   - Axum-based server on port 9876
   - Static file serving from `static/` directory
   - REST API endpoints:
     - `GET /api/services` - Service configurations
     - `GET /api/system/static` - Static system information
   - WebSocket endpoint: `/ws/realtime` - Real-time metrics

3. **Configuration** (`src/config.rs`)
   - TOML-based configuration
   - Services share a common IP with different ports

### Frontend (React)

1. **State Management** (`frontend/src/store/serverStore.js`)
   - Zustand for global state management
   - Stores real-time data and historical data for charts

2. **WebSocket Management** (`frontend/src/api/websocket.js`)
   - Handles connection, reconnection, and message distribution

3. **Components** (`frontend/src/components/`)
   - Modular widget-based architecture
   - Each system metric has its own widget component
   - ECharts for data visualization

## Key Dependencies

### Backend
- `axum` - Web framework
- `tokio` - Async runtime
- `sysinfo` - System information collection
- `serde` / `serde_json` - Serialization
- `toml` - Configuration parsing
- `tracing` - Logging
- `tower-http` - HTTP middleware (CORS, static files)

### Frontend
- `react` - UI framework
- `vite` - Build tool
- `zustand` - State management
- `echarts` / `echarts-for-react` - Charts
- `tailwindcss` - Styling
- `axios` - HTTP requests

## Data Models (`src/models.rs`)

Key structures:
- `ServiceCard` - Service navigation cards with health status
- `SystemStaticInfo` - Static system information (OS, hostname, etc.)
- `RealtimeData` - Dynamic metrics pushed via WebSocket
- `CpuInfo` - CPU usage, temperature, power
- `GpuInfo` - GPU metrics (NVIDIA only)
- `PortInfo` - Port usage information
- `NetworkInfo` - Network interfaces and speeds
- `DiskInfo` - Disk usage per mount point

## Configuration (`config.toml`)

```toml
[server]
host = "0.0.0.0"
port = 9876

[services]
ip = "localhost"  # Shared IP for all services

[[services.items]]
name = "Service Name"
port = 3000
icon = "fab fa-icon"
description = "Service description"
protocol = "http"
health_check_path = "/api/health"  # Optional
```

## Development Workflow

1. **Backend Development**
   - Modify Rust code in `src/`
   - Run `cargo run` to test changes
   - System metrics are collected every second
   - Data broadcasts through tokio channels to WebSocket connections

2. **Frontend Development**
   - Work in `frontend/src/`
   - Run `npm run dev` in `frontend/` for hot reload
   - Access dev server at `http://localhost:5173`
   - Build with `npm run build` to update `static/`

3. **Adding New Features**
   - Add data model in `src/models.rs`
   - Update collector in `src/collectors.rs`
   - Create React component in `frontend/src/components/widgets/`
   - Update `App.jsx` to include new component

## Common Tasks

### Adding a New System Metric
1. Define the data structure in `models.rs`
2. Add collection logic in `collectors.rs`
3. Include in `RealtimeData` struct
4. Create a widget component in frontend
5. Add to the dashboard layout

### Modifying Service Configuration
1. Edit `config.toml`
2. Restart the backend server
3. Services will appear in the frontend automatically

### Debugging WebSocket Issues
1. Check browser console for connection errors
2. Verify backend is running on correct port
3. Check CORS settings if accessing from different origin
4. Use browser DevTools Network tab to inspect WebSocket frames

## Performance Considerations

- Data collection runs every second - avoid expensive operations
- WebSocket broadcasts to all connected clients - minimize payload size
- Frontend stores limited history (60 data points) to prevent memory issues
- Use `cargo build --release` for production deployment

## Security Notes

- The server binds to `0.0.0.0` by default - consider restricting in production
- No authentication is implemented - add if needed for public deployment
- Port scanning requires elevated privileges for complete information
- Sensitive system information is exposed - ensure proper network security