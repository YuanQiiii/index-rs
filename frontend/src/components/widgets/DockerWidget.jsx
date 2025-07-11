import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardBody } from '../common/Card';
import { formatBytes } from '../../utils/helpers';
import useServerStore from '../../store/serverStore';
import axios from 'axios';

const DockerWidget = () => {
  const containers = useServerStore((state) => state.realtimeData?.docker_containers || []);
  const [filter, setFilter] = useState('');
  const [showOnlyRunning, setShowOnlyRunning] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);

  // 显示Toast消息
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // 容器操作确认
  const confirmAction = (containerId, containerName, action) => {
    const actionTexts = {
      stop: '停止',
      start: '启动',
      restart: '重启',
      pause: '暂停',
      unpause: '恢复'
    };

    setConfirmDialog({
      containerId,
      containerName,
      action,
      actionText: actionTexts[action] || action,
      message: `确定要${actionTexts[action]}容器 "${containerName}" 吗？`
    });
  };

  // 执行容器操作
  const executeAction = async () => {
    if (!confirmDialog) return;

    const { containerId, containerName, action, actionText } = confirmDialog;
    setConfirmDialog(null);
    setActionLoading(prev => ({ ...prev, [containerId]: true }));

    try {
      const response = await axios.post('/api/docker/action', {
        container_id: containerId,
        action: action
      }, {
        timeout: 60000 // 60秒超时
      });
      
      if (response.data.success) {
        showToast(`容器 "${containerName}" ${actionText}成功`, 'success');
      } else {
        showToast(`容器 "${containerName}" ${actionText}失败: ${response.data.message}`, 'error');
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        showToast(`容器 "${containerName}" ${actionText}操作超时，请稍后检查容器状态`, 'warning');
      } else if (error.response) {
        showToast(`容器 "${containerName}" ${actionText}失败: ${error.response.data?.message || error.message}`, 'error');
      } else {
        showToast(`容器 "${containerName}" ${actionText}失败: 网络错误`, 'error');
      }
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[containerId];
        return newState;
      });
    }
  };

  // 获取容器日志
  const fetchLogs = async (containerId) => {
    setLoading(true);
    setSelectedContainer(containerId);
    try {
      const response = await axios.get(`/api/docker/logs/${containerId}?tail=200`);
      setLogs(response.data);
      setShowLogs(true);
    } catch (error) {
      showToast('获取容器日志失败', 'error');
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取状态颜色
  const getStatusColor = (state) => {
    if (state.running) return 'text-green-500';
    if (state.paused) return 'text-yellow-500';
    if (state.restarting) return 'text-blue-500';
    return 'text-gray-500';
  };

  // 获取状态文本
  const getStatusText = (state) => {
    if (state.running && state.paused) return '已暂停';
    if (state.running) return '运行中';
    if (state.restarting) return '重启中';
    if (state.exited) return '已停止';
    return '未知';
  };

  // 格式化日期
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // 过滤容器
  const filteredContainers = React.useMemo(() => {
    let filtered = containers;
    
    if (showOnlyRunning) {
      filtered = filtered.filter(c => c.state.running);
    }
    
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(lowerFilter) ||
        c.image.toLowerCase().includes(lowerFilter) ||
        c.id.toLowerCase().includes(lowerFilter)
      );
    }
    
    return filtered;
  }, [containers, filter, showOnlyRunning]);

  return (
    <>
      <Card>
        <CardHeader>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z"/>
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
                    <div className="mt-2 mb-3">
                      <p className="text-xs text-gray-400 mb-1">端口映射:</p>
                      <div className="flex flex-wrap gap-2">
                        {container.ports.map((port, idx) => (
                          <span key={idx} className="text-xs bg-dark-tertiary px-2 py-1 rounded">
                            {port.public_port ? `${port.public_port}:${port.private_port}` : port.private_port}/{port.type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-3">
                    {container.state.running ? (
                      <>
                        <button
                          onClick={() => confirmAction(container.id, container.name, 'stop')}
                          disabled={actionLoading[container.id]}
                          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          {actionLoading[container.id] ? '处理中...' : '停止'}
                        </button>
                        <button
                          onClick={() => confirmAction(container.id, container.name, 'restart')}
                          disabled={actionLoading[container.id]}
                          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          {actionLoading[container.id] ? '处理中...' : '重启'}
                        </button>
                        {container.state.paused ? (
                          <button
                            onClick={() => confirmAction(container.id, container.name, 'unpause')}
                            disabled={actionLoading[container.id]}
                            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            {actionLoading[container.id] ? '处理中...' : '恢复'}
                          </button>
                        ) : (
                          <button
                            onClick={() => confirmAction(container.id, container.name, 'pause')}
                            disabled={actionLoading[container.id]}
                            className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            {actionLoading[container.id] ? '处理中...' : '暂停'}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => confirmAction(container.id, container.name, 'start')}
                        disabled={actionLoading[container.id]}
                        className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                      >
                        {actionLoading[container.id] ? '处理中...' : '启动'}
                      </button>
                    )}
                    <button
                      onClick={() => fetchLogs(container.id)}
                      disabled={loading || actionLoading[container.id]}
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

      {/* 确认对话框 */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-secondary rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">确认操作</h3>
            <p className="mb-6 text-gray-300">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeAction}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Toast 通知 */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-600' :
          toast.type === 'error' ? 'bg-red-600' :
          toast.type === 'warning' ? 'bg-yellow-600' :
          'bg-blue-600'
        } text-white max-w-md`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default DockerWidget;