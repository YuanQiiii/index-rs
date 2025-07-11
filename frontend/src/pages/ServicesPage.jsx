import React from 'react';
import ServiceWidget from '../components/widgets/ServiceWidget';

const ServicesPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">服务导航</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">快速访问服务器上的各种服务</p>
      </div>

      <ServiceWidget />
    </div>
  );
};

export default ServicesPage;