import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import useServerStore from './store/serverStore';
import wsManager from './api/websocket';
import { serverApi } from './api';
import MainLayout from './components/layout/MainLayout';
import Loading from './components/common/Loading';

// 路由懒加载
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PortsPage = lazy(() => import('./pages/PortsPage'));
const ProcessesPage = lazy(() => import('./pages/ProcessesPage'));
const DockerPage = lazy(() => import('./pages/DockerPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
          <Route index element={
            <Suspense fallback={<Loading size="lg" text="加载中..." />}>
              <Dashboard />
            </Suspense>
          } />
          <Route path="ports" element={
            <Suspense fallback={<Loading size="lg" text="加载中..." />}>
              <PortsPage />
            </Suspense>
          } />
          <Route path="processes" element={
            <Suspense fallback={<Loading size="lg" text="加载中..." />}>
              <ProcessesPage />
            </Suspense>
          } />
          <Route path="docker" element={
            <Suspense fallback={<Loading size="lg" text="加载中..." />}>
              <DockerPage />
            </Suspense>
          } />
          <Route path="files" element={
            <Suspense fallback={<Loading size="lg" text="加载中..." />}>
              <FilesPage />
            </Suspense>
          } />
          <Route path="services" element={
            <Suspense fallback={<Loading size="lg" text="加载中..." />}>
              <ServicesPage />
            </Suspense>
          } />
          <Route path="*" element={
            <Suspense fallback={<Loading size="lg" text="加载中..." />}>
              <NotFound />
            </Suspense>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;