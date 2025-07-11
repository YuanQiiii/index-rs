import React from 'react';
import FileManager from '../components/widgets/FileManager';

const FilesPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">文件管理</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">浏览、上传和下载服务器文件</p>
      </div>

      <FileManager />
    </div>
  );
};

export default FilesPage;