import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import useServerStore from '../../store/serverStore';
import Card, { CardHeader, CardBody } from '../common/Card';
import { getStatusColor, getChartBaseOptions } from '../../utils/helpers';
import echarts, { createResponsiveOption } from '../../utils/echarts';

const CpuWidget = () => {
  const cpuData = useServerStore((state) => state.realtimeData.cpu);
  const cpuHistory = useServerStore((state) => state.history.cpu);

  const chartOption = useMemo(() => {
    const baseOptions = getChartBaseOptions();
    
    return createResponsiveOption({
      ...baseOptions,
      series: [
        {
          name: 'CPU 使用率',
          type: 'line',
          smooth: true,
          symbol: 'none',
          areaStyle: {
            opacity: 0.3,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(79, 70, 229, 0.3)' },
                { offset: 1, color: 'rgba(79, 70, 229, 0.05)' }
              ]
            }
          },
          lineStyle: {
            width: 2,
            color: '#4f46e5'
          },
          data: cpuHistory,
        }
      ],
      xAxis: {
        ...baseOptions.xAxis,
        data: cpuHistory.map((_, index) => index === cpuHistory.length - 1 ? '现在' : ''),
      }
    });
  }, [cpuHistory]);

  return (
    <Card>
      <CardHeader>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
        <span>CPU 使用率</span>
      </CardHeader>
      
      <CardBody>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className={`text-3xl font-bold ${getStatusColor(cpuData.total_usage, 'cpu')}`}>
              {cpuData.total_usage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">总使用率</div>
          </div>
          
          <div className="text-right space-y-1">
            {cpuData.temperature_celsius !== null && cpuData.temperature_celsius !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className={getStatusColor(cpuData.temperature_celsius, 'temperature')}>
                  {cpuData.temperature_celsius.toFixed(1)}°C
                </span>
              </div>
            )}
            
            {cpuData.power_watts !== null && cpuData.power_watts !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-yellow-500">
                  {cpuData.power_watts.toFixed(1)}W
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="h-40">
          <ReactECharts 
            option={chartOption} 
            style={{ height: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
        
        {cpuData.core_usage.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {cpuData.core_usage.map((usage, index) => (
              <div key={index} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">核心 {index}</span>
                  <span className={getStatusColor(usage, 'cpu')}>
                    {usage.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-1 bg-dark-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default CpuWidget;