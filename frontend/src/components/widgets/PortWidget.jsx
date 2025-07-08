import React, { useState } from 'react';
import useServerStore from '../../store/serverStore';
import Card, { CardHeader, CardBody } from '../common/Card';

const PortWidget = () => {
  const ports = useServerStore((state) => state.realtimeData.ports);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('port');

  const filteredAndSortedPorts = React.useMemo(() => {
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-400">端口</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">协议</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">状态</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">地址</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">程序</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">PID</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedPorts.map((port, index) => (
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
        ) : (
          <div className="text-center py-8 text-gray-400">
            {filter ? '没有匹配的端口' : '暂无端口占用信息'}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default PortWidget;