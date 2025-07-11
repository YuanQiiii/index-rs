import React, { useState, useEffect, useRef } from 'react';
import Card, { CardHeader, CardBody } from '../common/Card';
import { formatBytes } from '../../utils/helpers';
import axios from 'axios';

const FileManager = () => {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('fileManagerViewMode') || 'list';
  }); // 'list' or 'grid'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'size', 'modified'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const fileInputRef = useRef(null);

  // 保存视图模式到 localStorage
  useEffect(() => {
    localStorage.setItem('fileManagerViewMode', viewMode);
  }, [viewMode]);

  // 加载文件列表
  const loadFiles = async (path = currentPath) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/files/list', {
        params: { path: path || '.' }
      });
      setFiles(response.data.files);
      setCurrentPath(response.data.path);
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  // 处理文件上传
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        await axios.post('/api/files/upload', formData, {
          params: { path: currentPath },
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              ((i * 100 + (progressEvent.loaded * 100) / progressEvent.total) / files.length)
            );
            setUploadProgress(percentCompleted);
          },
        });
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    loadFiles();
  };

  // 拖拽处理
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  // 文件排序
  const sortFiles = (filesArray) => {
    const sorted = [...filesArray].sort((a, b) => {
      // 目录始终在前
      if (a.is_dir !== b.is_dir) {
        return a.is_dir ? -1 : 1;
      }

      let compareValue = 0;
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'size':
          compareValue = a.size - b.size;
          break;
        case 'modified':
          compareValue = a.modified - b.modified;
          break;
        default:
          compareValue = a.name.localeCompare(b.name);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    return sorted;
  };

  // 文件操作
  const handleFileClick = (file) => {
    if (file.is_dir) {
      loadFiles(currentPath ? `${currentPath}/${file.name}` : file.name);
    } else {
      // 切换选中状态
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file.name)) {
        newSelected.delete(file.name);
      } else {
        newSelected.add(file.name);
      }
      setSelectedFiles(newSelected);
    }
  };

  const handleDownload = async (file) => {
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    window.open(`/api/files/download/${encodeURIComponent(filePath)}`, '_blank');
  };

  const handleDelete = async () => {
    if (selectedFiles.size === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedFiles.size} 个文件吗？`)) return;

    setLoading(true);
    for (const fileName of selectedFiles) {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      try {
        await axios.post('/api/files/delete', { path: filePath });
      } catch (error) {
        console.error(`Failed to delete ${fileName}:`, error);
      }
    }
    setLoading(false);
    loadFiles();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await axios.post('/api/files/mkdir', {
        path: currentPath,
        name: newFolderName.trim()
      });
      setShowNewFolderDialog(false);
      setNewFolderName('');
      loadFiles();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const navigateToParent = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    loadFiles(parentPath);
  };

  // 处理排序
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // 格式化时间
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取文件图标（简化版）
  const getFileIcon = (file, size = 'normal') => {
    const iconClass = size === 'small' ? 'w-4 h-4' : 'w-5 h-5';
    
    if (file.is_dir) {
      return (
        <svg className={`${iconClass} text-yellow-500`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
        </svg>
      );
    }
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <svg className={`${iconClass} text-green-500`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"></path></svg>;
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) {
      return <svg className={`${iconClass} text-purple-500`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1z" clipRule="evenodd"></path></svg>;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <svg className={`${iconClass} text-orange-500`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"></path></svg>;
    } else if (['pdf'].includes(ext)) {
      return <svg className={`${iconClass} text-red-500`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd"></path></svg>;
    } else if (['doc', 'docx', 'txt', 'md'].includes(ext)) {
      return <svg className={`${iconClass} text-blue-500`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4zm2 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>;
    } else {
      return <svg className={`${iconClass} text-gray-500`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>;
    }
  };

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
        </svg>
        <span>文件管理</span>
      </CardHeader>
      
      <CardBody>
        {/* 工具栏 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1 bg-primary hover:bg-primary/90 text-white rounded text-sm transition-colors disabled:opacity-50"
          >
            上传文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(Array.from(e.target.files))}
          />
          
          <button
            onClick={() => setShowNewFolderDialog(true)}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
          >
            新建文件夹
          </button>
          
          {selectedFiles.size > 0 && (
            <>
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              >
                删除 ({selectedFiles.size})
              </button>
            </>
          )}
          
          <div className="flex-1"></div>
          
          {/* 视图切换 */}
          <div className="flex items-center gap-1 bg-gray-700 rounded p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="列表视图"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="网格视图"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={() => loadFiles()}
            disabled={loading}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* 路径导航 */}
        <div className="mb-3 flex items-center text-xs text-gray-400">
          <button
            onClick={() => loadFiles('')}
            className="hover:text-white transition-colors"
          >
            根目录
          </button>
          {currentPath && currentPath.split('/').map((part, index, arr) => (
            <React.Fragment key={index}>
              <span className="mx-1">/</span>
              <button
                onClick={() => loadFiles(arr.slice(0, index + 1).join('/'))}
                className="hover:text-white transition-colors"
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* 上传进度 */}
        {uploading && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>上传中...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 文件列表 */}
        <div
          className={`border-2 border-dashed rounded-lg transition-colors ${
            dragActive ? 'border-primary bg-primary/10' : 'border-gray-700'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {dragActive ? (
            <div className="p-8 text-center text-gray-400">
              <svg className="w-8 h-8 mx-auto mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm">释放以上传文件</p>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-gray-400">
              加载中...
            </div>
          ) : files.length === 0 && !currentPath ? (
            <div className="p-6 text-center text-gray-400">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <p className="mb-1 text-sm">此目录为空</p>
              <p className="text-xs">拖拽文件到此处或点击上传按钮</p>
            </div>
          ) : viewMode === 'list' ? (
            // 列表视图
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="border-b border-gray-700 sticky top-0 bg-dark-secondary">
                  <tr className="text-left text-gray-400">
                    <th className="py-1.5 px-2 font-medium">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        名称
                        {sortBy === 'name' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d={sortOrder === 'asc' 
                              ? "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                              : "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            } clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="py-1.5 px-2 font-medium w-20 text-right">
                      <button
                        onClick={() => handleSort('size')}
                        className="flex items-center gap-1 hover:text-white transition-colors ml-auto"
                      >
                        大小
                        {sortBy === 'size' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d={sortOrder === 'asc' 
                              ? "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                              : "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            } clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="py-1.5 px-2 font-medium w-36 hidden sm:table-cell">
                      <button
                        onClick={() => handleSort('modified')}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        修改时间
                        {sortBy === 'modified' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d={sortOrder === 'asc' 
                              ? "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                              : "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            } clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="py-1.5 px-2 font-medium w-16 hidden lg:table-cell">权限</th>
                    <th className="py-1.5 px-2 font-medium w-16 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPath && (
                    <tr 
                      className="hover:bg-dark-tertiary cursor-pointer transition-colors"
                      onClick={navigateToParent}
                    >
                      <td className="py-1 px-2" colSpan="5">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"></path>
                          </svg>
                          <span>..</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {sortFiles(files).map((file) => (
                    <tr 
                      key={file.name}
                      className={`hover:bg-dark-tertiary cursor-pointer transition-colors ${
                        selectedFiles.has(file.name) ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => handleFileClick(file)}
                      onDoubleClick={() => file.is_file && handleDownload(file)}
                    >
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.name)}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-600 text-primary focus:ring-primary"
                          />
                          {getFileIcon(file, 'small')}
                          <span className={`truncate ${file.is_dir ? 'font-medium' : ''}`}>{file.name}</span>
                        </div>
                      </td>
                      <td className="py-1 px-2 text-right text-gray-400 text-xs">
                        {file.is_file ? formatBytes(file.size) : '-'}
                      </td>
                      <td className="py-1 px-2 text-gray-400 text-xs hidden sm:table-cell">
                        {formatDate(file.modified)}
                      </td>
                      <td className="py-1 px-2 text-gray-400 font-mono text-xs hidden lg:table-cell">
                        {file.permissions}
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center justify-center gap-1">
                          {file.is_file && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                              }}
                              className="p-0.5 text-gray-400 hover:text-white transition-colors"
                              title="下载"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // 网格视图
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-3">
              {currentPath && (
                <button
                  onClick={navigateToParent}
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-dark-tertiary transition-colors"
                >
                  <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"></path>
                  </svg>
                  <span className="mt-1 text-xs">返回</span>
                </button>
              )}
              
              {sortFiles(files).map((file) => (
                <div
                  key={file.name}
                  className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedFiles.has(file.name)
                      ? 'bg-primary/20 ring-1 ring-primary'
                      : 'hover:bg-dark-tertiary'
                  }`}
                  onClick={() => handleFileClick(file)}
                  onDoubleClick={() => file.is_file && handleDownload(file)}
                  title={file.name}
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    {getFileIcon(file)}
                  </div>
                  <span className="mt-1 text-xs text-center break-all line-clamp-2">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {file.is_file ? formatBytes(file.size) : '文件夹'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 状态栏 */}
        <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
          <div>
            <span>{files.length} 个项目</span>
            {selectedFiles.size > 0 && <span className="ml-2">• 已选择 {selectedFiles.size} 个</span>}
          </div>
          <div className="flex gap-2 text-xs">
            <span>• 单击选择</span>
            <span>• 双击下载</span>
            <span>• 拖拽上传</span>
          </div>
        </div>
      </CardBody>

      {/* 新建文件夹对话框 */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-secondary rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">新建文件夹</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="文件夹名称"
              className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-md focus:outline-none focus:border-primary"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded transition-colors disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default FileManager;