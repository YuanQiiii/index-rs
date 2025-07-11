import React from 'react';
import SystemInfo from '../components/widgets/SystemInfo';
import CpuWidget from '../components/widgets/CpuWidget';
import MemoryWidget from '../components/widgets/MemoryWidget';
import NetworkWidget from '../components/widgets/NetworkWidget';
import DiskWidget from '../components/widgets/DiskWidget';
import GpuWidget from '../components/widgets/GpuWidget';

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">性能监控</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">实时监控服务器性能和资源使用情况</p>
      </div>

      {/* 系统信息 */}
      <SystemInfo />

      {/* CPU 和 GPU 信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CpuWidget />
        <GpuWidget />
      </div>

      {/* 其他监控组件 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MemoryWidget />
        <NetworkWidget />
        <DiskWidget />
      </div>
    </div>
  );
};

export default Dashboard;