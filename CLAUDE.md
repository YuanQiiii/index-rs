# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`index-rs` is a modern server monitoring and service navigation dashboard built with Rust and the axum web framework. It provides real-time system monitoring, service health checks, and a clean web interface for server administrators.

## Build and Development Commands

```bash
# Build the project
cargo build

# Run the project
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

## Architecture

### Backend (Rust/axum)
- **Data Collector**: Background async task using tokio that collects system metrics every second via the `sysinfo` crate
- **Web Server**: axum-based server providing:
  - Static file serving for frontend
  - REST API endpoints:
    - `GET /api/services` - Service card configurations
    - `GET /api/system/static` - Static system information
  - WebSocket endpoint: `/ws/realtime` - Real-time system metrics streaming

### Frontend (SPA)
- Single Page Application with real-time updates via WebSocket
- Visualization using Chart.js or ECharts
- Service cards with health status indicators

## Key Dependencies

- `axum` - Web framework
- `tokio` - Async runtime
- `sysinfo` - System information collection
- `serde` / `serde_json` - Serialization
- `toml` - Configuration parsing
- `tracing` - Logging

## Configuration

Services are configured via a `config.toml` file defining:
- Service name, URL, icon, and description
- Health check endpoints for status monitoring

## Data Models

Key structures include:
- `ServiceCard` - Service navigation cards
- `SystemStaticInfo` - Static system information
- `RealtimeData` - Dynamic metrics pushed via WebSocket

## Development Workflow

1. System metrics are collected by a background task every second
2. Data is broadcast through tokio channels to WebSocket connections
3. Frontend receives real-time updates and renders charts/metrics
4. Service health checks run periodically to update service status