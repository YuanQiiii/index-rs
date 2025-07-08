# 构建阶段 - Rust 后端
FROM rust:1.75-slim as rust-builder

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 Cargo 文件
COPY Cargo.toml Cargo.lock ./

# 创建空的 src 目录以缓存依赖
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# 复制源代码
COPY src ./src

# 构建应用
RUN touch src/main.rs && cargo build --release

# 构建阶段 - React 前端
FROM node:18-slim as frontend-builder

WORKDIR /app/frontend

# 复制 package 文件
COPY frontend/package*.json ./

# 安装依赖
RUN npm ci

# 复制前端源代码
COPY frontend/ .

# 构建前端
RUN npm run build

# 运行阶段
FROM debian:bookworm-slim

# 安装运行时依赖
RUN apt-get update && apt-get install -y \
    ca-certificates \
    net-tools \
    iproute2 \
    procps \
    lm-sensors \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN useradd -m -u 1000 indexrs

WORKDIR /app

# 从构建阶段复制文件
COPY --from=rust-builder /app/target/release/index-rs .
COPY --from=frontend-builder /app/static ./static
COPY config.example.toml ./config.toml

# 更改所有权
RUN chown -R indexrs:indexrs /app

USER indexrs

# 暴露端口
EXPOSE 9876

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:9876/api/system/static || exit 1

# 启动应用
CMD ["./index-rs"]