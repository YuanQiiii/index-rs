import logger from '../utils/logger';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.url = `ws://${window.location.host}/ws/realtime`;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1000; // 1秒基础延迟
    this.maxReconnectDelay = 30000; // 最大30秒延迟
    this.listeners = {
      message: [],
      connection: [],
    };
    this.isIntentionallyClosed = false;
  }

  // 计算重连延迟（指数退避）
  getReconnectDelay() {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    // 添加随机抖动，避免同时重连
    const jitter = delay * 0.1 * Math.random();
    return delay + jitter;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.debug('WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    logger.info('Connecting to WebSocket...');

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      logger.info('WebSocket connected');
      this.reconnectAttempts = 0;
      this.notifyConnectionListeners(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyMessageListeners(data);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      logger.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      logger.info('WebSocket disconnected');
      this.notifyConnectionListeners(false);
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.getReconnectDelay();
        logger.info(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('Max reconnection attempts reached');
      }
    };
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      logger.warn('WebSocket is not connected');
    }
  }

  onMessage(callback) {
    this.listeners.message.push(callback);
    return () => {
      this.listeners.message = this.listeners.message.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback) {
    this.listeners.connection.push(callback);
    return () => {
      this.listeners.connection = this.listeners.connection.filter(cb => cb !== callback);
    };
  }

  notifyMessageListeners(data) {
    this.listeners.message.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('Error in message listener:', error);
      }
    });
  }

  notifyConnectionListeners(isConnected) {
    this.listeners.connection.forEach(callback => {
      try {
        callback(isConnected);
      } catch (error) {
        logger.error('Error in connection listener:', error);
      }
    });
  }
}

export default new WebSocketManager();