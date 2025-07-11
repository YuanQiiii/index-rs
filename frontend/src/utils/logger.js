// 日志工具 - 生产环境自动禁用console.log
const isDevelopment = import.meta.env.DEV;

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor() {
    this.level = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  debug(...args) {
    if (this.level <= LogLevel.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (this.level <= LogLevel.INFO) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args) {
    if (this.level <= LogLevel.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args) {
    if (this.level <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args);
      // 在生产环境，可以将错误发送到错误追踪服务
      if (!isDevelopment) {
        this.reportError(args);
      }
    }
  }

  // 错误上报（可以集成到监控服务）
  reportError(errorData) {
    // TODO: 实现错误上报逻辑
    // 例如：发送到 Sentry、LogRocket 等服务
  }

  // 性能日志
  time(label) {
    if (this.level <= LogLevel.DEBUG) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (this.level <= LogLevel.DEBUG) {
      console.timeEnd(label);
    }
  }
}

// 创建单例
const logger = new Logger();

// 在生产环境禁用原生console方法
if (!isDevelopment) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  // 保留 console.warn 和 console.error 用于关键问题
}

export default logger;