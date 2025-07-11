import React, { useState, useMemo } from 'react';
import useServerStore from '../../store/serverStore';
import Card, { CardHeader, CardBody } from '../common/Card';

const ITEMS_PER_PAGE = 10;

const PortWidget = () => {
  const ports = useServerStore((state) => state.realtimeData.ports);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('port');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedPorts = useMemo(() => {
    let filtered = ports;
    
    if (filter) {
      filtered = ports.filter(port => 
        port.port.toString().includes(filter) ||
        port.program.toLowerCase().includes(filter.toLowerCase()) ||
        port.protocol.toLowerCase().includes(filter.toLowerCase()) ||
        port.state.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'port':
          return a.port - b.port;
        case 'program':
          return a.program.localeCompare(b.program);
        case 'protocol':
          return a.protocol.localeCompare(b.protocol);
        default:
          return 0;
      }
    });
  }, [ports, filter, sortBy]);

  // 计算分页
  const totalPages = Math.ceil(filteredAndSortedPorts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPorts = filteredAndSortedPorts.slice(startIndex, endIndex);

  // 当搜索或排序变化时，重置到第一页
  useMemo(() => {
    setCurrentPage(1);
  }, [filter, sortBy]);

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
        <span>端口占用 ({filteredAndSortedPorts.length})</span>
      </CardHeader>
      
      <CardBody>
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索端口、程序、协议..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-md focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-md focus:outline-none focus:border-primary text-sm"
          >
            <option value="port">按端口排序</option>
            <option value="program">按程序排序</option>
            <option value="protocol">按协议排序</option>
          </select>
        </div>
        
        {filteredAndSortedPorts.length > 0 ? (
          <div className="overflow-hidden">
            <div className="overflow-x-auto" style={{ height: '400px', overflowY: 'auto' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-dark-secondary z-10">
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-400 bg-dark-secondary">端口</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-400 bg-dark-secondary">协议</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-400 bg-dark-secondary">状态</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-400 bg-dark-secondary">地址</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-400 bg-dark-secondary">程序</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-400 bg-dark-secondary">PID</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPorts.map((port, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-dark-tertiary transition-colors">
                    <td className="py-2 px-3 font-mono">{port.port}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        port.protocol === 'TCP' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {port.protocol}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-xs ${
                        port.state === 'LISTEN' ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {port.state}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{port.address}</td>
                    <td className="py-2 px-3">{port.program}</td>
                    <td className="py-2 px-3 text-gray-400">{port.pid || '-'}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {filter ? '没有匹配的端口' : '暂无端口占用信息'}
          </div>
        )}

        {/* 分页控制 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              显示 {startIndex + 1} - {Math.min(endIndex, filteredAndSortedPorts.length)} / 共 {filteredAndSortedPorts.length} 个端口
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default PortWidget;