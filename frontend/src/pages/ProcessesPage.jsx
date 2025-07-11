import React from 'react';
import ProcessWidget from '../components/widgets/ProcessWidget';

const ProcessesPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">进程监控</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">实时监控系统运行的进程</p>
      </div>

      <ProcessWidget />
    </div>
  );
};

export default ProcessesPage;