import React from 'react';
import PortWidget from '../components/widgets/PortWidget';

const PortsPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">端口监控</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">查看系统中所有端口的使用情况</p>
      </div>

      <PortWidget />
    </div>
  );
};

export default PortsPage;