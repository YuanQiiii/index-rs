// WebSocket 连接管理
class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectInterval = 5000;
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket 连接成功');
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.notifyConnectionHandlers(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyMessageHandlers(data);
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket 连接断开');
        this.notifyConnectionHandlers(false);
        this.startReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
      };
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error);
      this.startReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  startReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setInterval(() => {
        console.log('尝试重新连接...');
        this.connect();
      }, this.reconnectInterval);
    }
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onConnectionChange(handler) {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  notifyMessageHandlers(data) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('消息处理器错误:', error);
      }
    });
  }

  notifyConnectionHandlers(isConnected) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(isConnected);
      } catch (error) {
        console.error('连接处理器错误:', error);
      }
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket 未连接');
    }
  }
}

// 创建单例实例
const wsManager = new WebSocketManager(`ws://${window.location.host}/ws/realtime`);

export default wsManager;