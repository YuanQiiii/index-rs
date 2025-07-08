import React, { useState, useMemo } from 'react';
import useServerStore from '../../store/serverStore';
import Card, { CardBody } from '../common/Card';
import { formatBytes } from '../../utils/helpers';

const ITEMS_PER_PAGE = 20;

const ProcessWidget = () => {
  const processes = useServerStore((state) => state.realtimeData.processes);
  const [sortBy, setSortBy] = useState('cpu'); // 'cpu' 或 'memory'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // 过滤和排序进程
  const filteredProcesses = useMemo(() => {
    let filtered = processes || [];
    
    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(process => 
        process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process.pid.toString().includes(searchTerm)
      );
    }
    
    // 排序
    return [...filtered].sort((a, b) => {
      if (sortBy === 'cpu') {
        return b.cpu_percent - a.cpu_percent;
      } else {
        return b.memory_percent - a.memory_percent;
      }
    });
  }, [processes, sortBy, searchTerm]);

  // 计算分页
  const totalPages = Math.ceil(filteredProcesses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProcesses = filteredProcesses.slice(startIndex, endIndex);

  // 当搜索或排序变化时，重置到第一页
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'text-green-400';
      case 'sleeping':
        return 'text-blue-400';
      case 'zombie':
        return 'text-red-400';
      case 'idle':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <Card className="lg:col-span-3">
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            进程监控
            <span className="text-sm text-gray-400">
              (共 {filteredProcesses.length} 个进程)
            </span>
          </h2>
        </div>

        {/* 控制栏 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索进程名称、命令或 PID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 
                       focus:outline-none focus:border-primary placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
            />
          </div>
          
          {/* 排序选择 */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('cpu')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortBy === 'cpu' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              按 CPU 排序
            </button>
            <button
              onClick={() => setSortBy('memory')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortBy === 'memory' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              按内存排序
            </button>
          </div>
        </div>

        {/* 进程表格 */}
        <div className="overflow-x-auto" style={{ minHeight: '800px' }}>
          <table className="min-w-full">
            <thead className="sticky top-0 bg-white dark:bg-dark-secondary z-10">
              <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 bg-white dark:bg-dark-secondary">PID</th>
                <th className="pb-2 bg-white dark:bg-dark-secondary">进程名</th>
                <th className="pb-2 bg-white dark:bg-dark-secondary">状态</th>
                <th className="pb-2 text-right bg-white dark:bg-dark-secondary">CPU %</th>
                <th className="pb-2 text-right bg-white dark:bg-dark-secondary">内存 %</th>
                <th className="pb-2 text-right bg-white dark:bg-dark-secondary">内存</th>
                <th className="pb-2 hidden lg:table-cell bg-white dark:bg-dark-secondary">命令</th>
              </tr>
            </thead>
            <tbody>
              {currentProcesses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {searchTerm ? '没有找到匹配的进程' : '暂无进程数据'}
                  </td>
                </tr>
              ) : (
                currentProcesses.map((process) => (
                  <tr 
                    key={process.pid} 
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-2 text-gray-700 dark:text-gray-300">{process.pid}</td>
                    <td className="py-2">
                      <div className="font-medium">{process.name}</div>
                      {process.user && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{process.user}</div>
                      )}
                    </td>
                    <td className="py-2">
                      <span className={`text-sm ${getStatusColor(process.status)}`}>
                        {process.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              process.cpu_percent > 80 ? 'bg-red-500' :
                              process.cpu_percent > 50 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(process.cpu_percent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm min-w-[3rem] text-right">
                          {process.cpu_percent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              process.memory_percent > 80 ? 'bg-red-500' :
                              process.memory_percent > 50 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(process.memory_percent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm min-w-[3rem] text-right">
                          {process.memory_percent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right text-sm text-gray-700 dark:text-gray-300">
                      {formatBytes(process.memory_mb * 1024 * 1024)}
                    </td>
                    <td className="py-2 hidden lg:table-cell">
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs" 
                           title={process.command}>
                        {process.command || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
              
              {/* 填充空行以保持表格高度固定 */}
              {currentProcesses.length > 0 && currentProcesses.length < ITEMS_PER_PAGE && (
                [...Array(ITEMS_PER_PAGE - currentProcesses.length)].map((_, index) => (
                  <tr key={`empty-${index}`} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2" colSpan="7">
                      <div style={{ height: '40px' }}></div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控制 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              显示 {startIndex + 1} - {Math.min(endIndex, filteredProcesses.length)} / 共 {filteredProcesses.length} 个进程
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                上一页
              </button>
              
              {/* 页码 */}
              <div className="flex gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = index + 1;
                  } else if (currentPage <= 3) {
                    pageNum = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + index;
                  } else {
                    pageNum = currentPage - 2 + index;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                下一页
              </button>
            </div>
          </div>
        )}

        {/* 说明 */}
        <div className="mt-4 text-xs text-gray-600 dark:text-gray-500 space-y-1">
          <p>• 显示 CPU 或内存使用率最高的进程</p>
          <p>• 进程信息每秒更新一次</p>
          <p>• 每页固定显示 20 个进程</p>
        </div>
      </CardBody>
    </Card>
  );
};

export default ProcessWidget;