import React from 'react';
import useServerStore from '../../store/serverStore';
import Card, { CardHeader, CardBody } from '../common/Card';
import { formatUptime } from '../../utils/helpers';

// 图标组件
const Icon = ({ name, className = '' }) => {
  const icons = {
    server: (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
    cpu: (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    memory: (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    clock: (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  
  return icons[name] || null;
};

const SystemInfo = () => {
  const systemInfo = useServerStore((state) => state.systemInfo);
  const realtimeData = useServerStore((state) => state.realtimeData);
  const isConnected = useServerStore((state) => state.isConnected);

  if (!systemInfo) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <Icon name="server" />
        <span>系统信息</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            {isConnected ? '已连接' : '未连接'}
          </span>
          <div className={isConnected ? 'status-online' : 'status-offline'} />
        </div>
      </CardHeader>
      
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">主机名</p>
            <p className="font-medium">{systemInfo.hostname}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-400">操作系统</p>
            <p className="font-medium">{systemInfo.os_name}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-400">内核版本</p>
            <p className="font-medium">{systemInfo.kernel_version}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-400">运行时间</p>
            <p className="font-medium flex items-center gap-1">
              <Icon name="clock" className="w-4 h-4" />
              {formatUptime(realtimeData.uptime_secs)}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-400">CPU</p>
            <p className="font-medium flex items-center gap-1">
              <Icon name="cpu" className="w-4 h-4" />
              {systemInfo.cpu_brand}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-400">CPU 核心数</p>
            <p className="font-medium">{systemInfo.cpu_cores} 核</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-400">总内存</p>
            <p className="font-medium flex items-center gap-1">
              <Icon name="memory" className="w-4 h-4" />
              {systemInfo.total_memory_gb.toFixed(2)} GB
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-400">系统负载</p>
            <p className="font-medium">
              {realtimeData.load_average.one.toFixed(2)} / 
              {realtimeData.load_average.five.toFixed(2)} / 
              {realtimeData.load_average.fifteen.toFixed(2)}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default SystemInfo;