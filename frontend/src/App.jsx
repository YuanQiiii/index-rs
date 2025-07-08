import React, { useEffect } from 'react';
import useServerStore from './store/serverStore';
import wsManager from './api/websocket';
import { serverApi } from './api';
import SystemInfo from './components/widgets/SystemInfo';
import CpuWidget from './components/widgets/CpuWidget';
import MemoryWidget from './components/widgets/MemoryWidget';
import NetworkWidget from './components/widgets/NetworkWidget';
import DiskWidget from './components/widgets/DiskWidget';
import GpuWidget from './components/widgets/GpuWidget';
import PortWidget from './components/widgets/PortWidget';
import ProcessWidget from './components/widgets/ProcessWidget';
import ServiceWidget from './components/widgets/ServiceWidget';
import Loading from './components/common/Loading';
import ThemeToggle from './components/common/ThemeToggle';

function App() {
  const setConnectionStatus = useServerStore((state) => state.setConnectionStatus);
  const setSystemInfo = useServerStore((state) => state.setSystemInfo);
  const setServices = useServerStore((state) => state.setServices);
  const updateRealtimeData = useServerStore((state) => state.updateRealtimeData);
  const systemInfo = useServerStore((state) => state.systemInfo);

  useEffect(() => {
    // 初始化 WebSocket 连接
    wsManager.connect();

    // 监听连接状态
    const unsubscribeConnection = wsManager.onConnectionChange((isConnected) => {
      setConnectionStatus(isConnected);
    });

    // 监听实时数据
    const unsubscribeMessage = wsManager.onMessage((data) => {
      updateRealtimeData(data);
    });

    // 获取系统静态信息
    const loadStaticData = async () => {
      try {
        const [systemInfoData, servicesData] = await Promise.all([
          serverApi.getSystemInfo(),
          serverApi.getServices(),
        ]);
        
        setSystemInfo(systemInfoData);
        setServices(servicesData);
      } catch (error) {
        console.error('加载静态数据失败:', error);
      }
    };

    loadStaticData();

    // 清理函数
    return () => {
      unsubscribeConnection();
      unsubscribeMessage();
      wsManager.disconnect();
    };
  }, [setConnectionStatus, setSystemInfo, setServices, updateRealtimeData]);

  if (!systemInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center transition-colors">
        <Loading size="lg" text="正在连接服务器..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              index-rs 服务器监控
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">实时监控服务器性能和资源使用情况</p>
          </div>
          <ThemeToggle />
        </header>

        {/* 服务导航 - 置顶 */}
        <div className="mb-8">
          <ServiceWidget />
        </div>

        {/* 系统信息 */}
        <SystemInfo />

        {/* CPU 和 GPU 信息合并展示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CpuWidget />
          <GpuWidget />
        </div>

        {/* 其他监控组件 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MemoryWidget />
          <NetworkWidget />
          <DiskWidget />
        </div>

        {/* 端口占用 */}
        <div className="mb-8">
          <PortWidget />
        </div>

        {/* 进程监控 */}
        <div className="mb-8">
          <ProcessWidget />
        </div>
      </div>
    </div>
  );
}

export default App;