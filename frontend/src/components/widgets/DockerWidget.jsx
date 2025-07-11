import React, { useState, useMemo } from 'react';
import useServerStore from '../../store/serverStore';
import Card, { CardHeader, CardBody } from '../common/Card';
import { formatBytes } from '../../utils/helpers';
import axios from 'axios';

const DockerWidget = () => {
  const containers = useServerStore((state) => state.realtimeData.docker_containers || []);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [showOnlyRunning, setShowOnlyRunning] = useState(false);

  // 过滤容器
  const filteredContainers = useMemo(() => {
    let filtered = containers;
    
    if (showOnlyRunning) {
      filtered = filtered.filter(container => container.state.running);
    }
    
    if (filter) {
      filtered = filtered.filter(container => 
        container.name.toLowerCase().includes(filter.toLowerCase()) ||
        container.image.toLowerCase().includes(filter.toLowerCase()) ||
        container.id.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    return filtered;
  }, [containers, filter, showOnlyRunning]);

  // 容器操作
  const handleContainerAction = async (containerId, action) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/docker/action', {
        container_id: containerId,
        action: action
      });
      
      if (response.data.success) {
        // 操作成功，等待数据更新
        console.log(response.data.message);
      } else {
        console.error('操作失败:', response.data.message);
      }
    } catch (error) {
      console.error('请求失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取容器日志
  const fetchLogs = async (containerId) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/docker/logs/${containerId}?tail=100`);
      setLogs(response.data);
      setSelectedContainer(containerId);
      setShowLogs(true);
    } catch (error) {
      console.error('获取日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取状态颜色
  const getStatusColor = (state) => {
    if (state.running) return 'text-green-500';
    if (state.paused) return 'text-yellow-500';
    if (state.restarting) return 'text-blue-500';
    if (state.dead) return 'text-red-500';
    return 'text-gray-500';
  };

  // 获取状态文本
  const getStatusText = (state) => {
    if (state.running) return 'Running';
    if (state.paused) return 'Paused';
    if (state.restarting) return 'Restarting';
    if (state.dead) return 'Dead';
    return 'Stopped';
  };

  // 格式化时间
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <>
      <Card className="lg:col-span-3">
        <CardHeader>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.04 1.46c-.65 0-1.3.26-1.78.74L4.86 7.6c-.48.48-.74 1.13-.74 1.78v5.16c0 .65.26 1.3.74 1.78l5.4 5.4c.48.48 1.13.74 1.78.74h5.16c.65 0 1.3-.26 1.78-.74l5.4-5.4c.48-.48.74-1.13.74-1.78V9.38c0-.65-.26-1.3-.74-1.78l-5.4-5.4c-.48-.48-1.13-.74-1.78-.74h-5.16M12 2.96h5.16c.25 0 .5.1.68.28l5.4 5.4c.18.18.28.43.28.68v5.16c0 .25-.1.5-.28.68l-5.4 5.4c-.18.18-.43.28-.68.28H12c-.25 0-.5-.1-.68-.28l-5.4-5.4a.96.96 0 01-.28-.68V9.32c0-.25.1-.5.28-.68l5.4-5.4c.18-.18.43-.28.68-.28M8.81 8.29c-.54 0-.99.45-.99.99s.45.99.99.99.99-.45.99-.99-.45-.99-.99-.99m6.48 0c-.54 0-.99.45-.99.99s.45.99.99.99.99-.45.99-.99-.45-.99-.99-.99M8.81 15.33c-.54 0-.99.45-.99.99s.45.99.99.99.99-.45.99-.99-.45-.99-.99-.99m6.48 0c-.54 0-.99.45-.99.99s.45.99.99.99.99-.45.99-.99-.45-.99-.99-.99M12 11.8c-.54 0-.99.45-.99.99s.45.99.99.99.99-.45.99-.99-.45-.99-.99-.99z"/>
          </svg>
          <span>Docker 容器 ({filteredContainers.length})</span>
        </CardHeader>
        
        <CardBody>
          {/* 过滤控件 */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索容器名称、镜像或ID..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-md focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyRunning}
                onChange={(e) => setShowOnlyRunning(e.target.checked)}
                className="rounded"
              />
              只显示运行中
            </label>
          </div>

          {/* 容器列表 */}
          <div className="space-y-3">
            {filteredContainers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {filter || showOnlyRunning ? '没有匹配的容器' : '暂无Docker容器'}
              </div>
            ) : (
              filteredContainers.map((container) => (
                <div key={container.id} className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{container.name}</h3>
                      <p className="text-sm text-gray-400">镜像: {container.image}</p>
                      <p className="text-sm text-gray-500">ID: {container.id}</p>
                      <p className="text-xs text-gray-500">创建时间: {formatDate(container.created)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${getStatusColor(container.state)}`}>
                        {getStatusText(container.state)}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{container.status}</p>
                    </div>
                  </div>

                  {/* 资源使用情况 */}
                  {container.state.running && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">CPU</span>
                          <span>{container.cpu_percent.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              container.cpu_percent > 80 ? 'bg-red-500' :
                              container.cpu_percent > 50 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(container.cpu_percent, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">内存</span>
                          <span>{formatBytes(container.memory_usage_mb * 1024 * 1024)} / {formatBytes(container.memory_limit_mb * 1024 * 1024)}</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              container.memory_percent > 80 ? 'bg-red-500' :
                              container.memory_percent > 50 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(container.memory_percent, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">网络 I/O</span>
                          <span>↓{formatBytes(container.network_rx_mb * 1024 * 1024)} ↑{formatBytes(container.network_tx_mb * 1024 * 1024)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 端口映射 */}
                  {container.ports.length > 0 && (
                    <div className="text-xs text-gray-400 mb-3">
                      端口映射: {container.ports.map(port => 
                        port.host_port ? `${port.host_port}->${port.container_port}/${port.protocol}` : `${port.container_port}/${port.protocol}`
                      ).join(', ')}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-3">
                    {container.state.running ? (
                      <>
                        <button
                          onClick={() => handleContainerAction(container.id, 'stop')}
                          disabled={loading}
                          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          停止
                        </button>
                        <button
                          onClick={() => handleContainerAction(container.id, 'restart')}
                          disabled={loading}
                          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          重启
                        </button>
                        {container.state.paused ? (
                          <button
                            onClick={() => handleContainerAction(container.id, 'unpause')}
                            disabled={loading}
                            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            恢复
                          </button>
                        ) : (
                          <button
                            onClick={() => handleContainerAction(container.id, 'pause')}
                            disabled={loading}
                            className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            暂停
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => handleContainerAction(container.id, 'start')}
                        disabled={loading}
                        className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                      >
                        启动
                      </button>
                    )}
                    <button
                      onClick={() => fetchLogs(container.id)}
                      disabled={loading}
                      className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50"
                    >
                      查看日志
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>

      {/* 日志弹窗 */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-secondary rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">容器日志 - {selectedContainer}</h3>
              <button
                onClick={() => {
                  setShowLogs(false);
                  setLogs('');
                  setSelectedContainer(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">{logs || '暂无日志'}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DockerWidget;