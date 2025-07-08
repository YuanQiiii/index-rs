import React from 'react';
import useServerStore from '../../store/serverStore';
import Card, { CardHeader, CardBody } from '../common/Card';
import { formatBytes } from '../../utils/helpers';

const DiskWidget = () => {
  const disks = useServerStore((state) => state.realtimeData.disks);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
        <span>磁盘使用情况</span>
      </CardHeader>
      
      <CardBody>
        <div className="space-y-4">
          {disks.map((disk, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{disk.mount_point}</p>
                  <p className="text-sm text-gray-400">
                    {disk.file_system} - {disk.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${
                    disk.used_percent > 90 ? 'text-red-500' : 
                    disk.used_percent > 70 ? 'text-yellow-500' : 
                    'text-green-500'
                  }`}>
                    {disk.used_percent.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-400">
                    {formatBytes(disk.used_gb * 1024 * 1024 * 1024)} / {formatBytes(disk.total_gb * 1024 * 1024 * 1024)}
                  </p>
                </div>
              </div>
              
              <div className="w-full bg-dark-tertiary rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    disk.used_percent > 90 ? 'bg-red-500' : 
                    disk.used_percent > 70 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                  style={{ width: `${disk.used_percent}%` }}
                />
              </div>
            </div>
          ))}
          
          {disks.length === 0 && (
            <p className="text-center text-gray-400 py-8">暂无磁盘信息</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default DiskWidget;