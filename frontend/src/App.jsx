import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import useServerStore from './store/serverStore';
import wsManager from './api/websocket';
import { serverApi } from './api';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import PortsPage from './pages/PortsPage';
import ProcessesPage from './pages/ProcessesPage';
import DockerPage from './pages/DockerPage';
import FilesPage from './pages/FilesPage';
import ServicesPage from './pages/ServicesPage';
import NotFound from './pages/NotFound';
import Loading from './components/common/Loading';

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
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="ports" element={<PortsPage />} />
          <Route path="processes" element={<ProcessesPage />} />
          <Route path="docker" element={<DockerPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;