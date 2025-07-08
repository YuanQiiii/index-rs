import React from 'react';
import useServerStore from '../../store/serverStore';
import Card, { CardBody } from '../common/Card';
import { formatBytes } from '../../utils/helpers';

const GpuWidget = () => {
  const gpuList = useServerStore((state) => state.realtimeData.gpu);

  if (!gpuList || gpuList.length === 0) {
    return (
      <Card>
        <CardBody>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            GPU 信息
          </h2>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            未检测到 GPU 或 GPU 监控未启用
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          GPU 信息
        </h2>
        
        <div className="space-y-4">
          {gpuList.map((gpu, index) => (
            <div key={index} className="space-y-3">
              {gpuList.length > 1 && (
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">
                  GPU {gpu.index}: {gpu.name}
                </h3>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">温度</p>
                  <p className={`text-lg font-medium ${
                    gpu.temperature_celsius > 80 ? 'text-red-500' :
                    gpu.temperature_celsius > 70 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {gpu.temperature_celsius}°C
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">使用率</p>
                  <p className={`text-lg font-medium ${
                    gpu.utilization_percent > 90 ? 'text-red-500' :
                    gpu.utilization_percent > 70 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {gpu.utilization_percent}%
                  </p>
                </div>
                
                {gpu.power_draw_watts !== null && gpu.power_draw_watts !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">功耗</p>
                    <p className="text-lg font-medium text-yellow-500">
                      {gpu.power_draw_watts.toFixed(1)}W
                    </p>
                  </div>
                )}
                
                {gpu.fan_speed_percent !== null && gpu.fan_speed_percent !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">风扇转速</p>
                    <p className="text-lg font-medium">
                      {gpu.fan_speed_percent}%
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">显存</p>
                  <p className="text-lg font-medium">
                    {((gpu.memory_used_mb / gpu.memory_total_mb) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">显存使用</span>
                  <span>
                    {formatBytes(gpu.memory_used_mb * 1024 * 1024)} / {formatBytes(gpu.memory_total_mb * 1024 * 1024)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                    style={{ width: `${(gpu.memory_used_mb / gpu.memory_total_mb) * 100}%` }}
                  />
                </div>
              </div>
              
              {(gpu.graphics_clock_mhz !== null || gpu.memory_clock_mhz !== null) && (
                <div className="flex gap-4 text-sm">
                  {gpu.graphics_clock_mhz !== null && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">核心频率: </span>
                      <span>{gpu.graphics_clock_mhz} MHz</span>
                    </div>
                  )}
                  {gpu.memory_clock_mhz !== null && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">显存频率: </span>
                      <span>{gpu.memory_clock_mhz} MHz</span>
                    </div>
                  )}
                </div>
              )}
              
              {index < gpuList.length - 1 && (
                <hr className="border-gray-200 dark:border-gray-700" />
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default GpuWidget;