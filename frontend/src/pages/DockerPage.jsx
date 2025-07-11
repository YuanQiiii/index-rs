import React from 'react';
import DockerWidget from '../components/widgets/DockerWidget';

const DockerPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Docker 容器管理</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">管理和监控 Docker 容器</p>
      </div>

      <DockerWidget />
    </div>
  );
};

export default DockerPage;