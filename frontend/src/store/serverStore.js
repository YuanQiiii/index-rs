import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useServerStore = create(
  subscribeWithSelector((set, get) => ({
    // 连接状态
    isConnected: false,
    
    // 系统静态信息
    systemInfo: null,
    
    // 服务列表
    services: [],
    
    // 实时数据
    realtimeData: {
      cpu: {
        total_usage: 0,
        core_usage: [],
        temperature_celsius: null,
        power_watts: null,
      },
      memory: {
        total_kb: 0,
        used_kb: 0,
        free_kb: 0,
        used_percent: 0,
        swap_total_kb: 0,
        swap_used_kb: 0,
        swap_free_kb: 0,
        swap_used_percent: 0,
      },
      network: {
        interfaces: [],
        rx_speed_kbps: 0,
        tx_speed_kbps: 0,
        total_rx_gb: 0,
        total_tx_gb: 0,
      },
      disks: [],
      gpu: null,
      ports: [],
      processes: [],
      docker_containers: [],
      load_average: {
        one: 0,
        five: 0,
        fifteen: 0,
      },
      uptime_secs: 0,
      timestamp: null,
    },
    
    // 历史数据（用于图表）
    history: {
      cpu: [],
      memory: [],
      network: {
        rx: [],
        tx: [],
      },
    },
    
    // Actions
    setConnectionStatus: (isConnected) => set({ isConnected }),
    
    setSystemInfo: (systemInfo) => set({ systemInfo }),
    
    setServices: (services) => set({ services }),
    
    updateRealtimeData: (data) => {
      const state = get();
      const maxHistoryLength = 60; // 保留最近60个数据点
      
      // 更新历史数据
      const newHistory = {
        cpu: [...state.history.cpu, data.cpu.total_usage].slice(-maxHistoryLength),
        memory: [...state.history.memory, data.memory.used_percent].slice(-maxHistoryLength),
        network: {
          rx: [...state.history.network.rx, data.network.rx_speed_kbps].slice(-maxHistoryLength),
          tx: [...state.history.network.tx, data.network.tx_speed_kbps].slice(-maxHistoryLength),
        },
      };
      
      set({
        realtimeData: data,
        history: newHistory,
      });
    },
    
    // 更新单个服务状态
    updateServiceStatus: (serviceId, status) => {
      set((state) => ({
        services: state.services.map((service) =>
          service.id === serviceId ? { ...service, status } : service
        ),
      }));
    },
    
    // 清除历史数据
    clearHistory: () => {
      set({
        history: {
          cpu: [],
          memory: [],
          network: {
            rx: [],
            tx: [],
          },
        },
      });
    },
  }))
);

export default useServerStore;