import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import useServerStore from '../../store/serverStore';
import Card, { CardHeader, CardBody } from '../common/Card';
import { formatBytes, getStatusColor } from '../../utils/helpers';
import echarts, { createResponsiveOption } from '../../utils/echarts';

const MemoryWidget = () => {
  const memoryData = useServerStore((state) => state.realtimeData.memory);

  const chartOption = useMemo(() => {
    const usedPercent = memoryData.used_percent || 0;
    
    return {
      series: [
        {
          name: '内存使用率',
          type: 'gauge',
          radius: '90%',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 10,
          progress: {
            show: true,
            width: 18,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: '#10b981' },
                  { offset: 0.5, color: '#eab308' },
                  { offset: 1, color: '#ef4444' }
                ]
              }
            }
          },
          axisLine: {
            lineStyle: {
              width: 18,
              color: [[1, '#1e293b']]
            }
          },
          axisTick: {
            show: false
          },
          splitLine: {
            distance: -23,
            length: 5,
            lineStyle: {
              width: 2,
              color: '#475569'
            }
          },
          axisLabel: {
            distance: -45,
            color: '#94a3b8',
            fontSize: 10
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            fontSize: 24,
            color: '#f1f5f9',
            offsetCenter: [0, '15%']
          },
          data: [{ value: usedPercent.toFixed(1) }]
        }
      ]
    };
  }, [memoryData.used_percent]);

  const swapChartOption = useMemo(() => {
    if (memoryData.swap_total_kb === 0) return null;
    
    const swapPercent = memoryData.swap_used_percent || 0;
    
    return {
      series: [
        {
          name: 'Swap 使用率',
          type: 'gauge',
          radius: '90%',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 5,
          progress: {
            show: true,
            width: 8,
            itemStyle: {
              color: '#7c3aed'
            }
          },
          axisLine: {
            lineStyle: {
              width: 8,
              color: [[1, '#1e293b']]
            }
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: false
          },
          axisLabel: {
            show: false
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            fontSize: 16,
            color: '#94a3b8',
            offsetCenter: [0, '15%']
          },
          data: [{ value: swapPercent.toFixed(1) }]
        }
      ]
    };
  }, [memoryData.swap_total_kb, memoryData.swap_used_percent]);

  return (
    <Card>
      <CardHeader>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>内存使用</span>
      </CardHeader>
      
      <CardBody>
        <div className="h-40">
          <ReactECharts 
            option={chartOption} 
            style={{ height: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
        
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">物理内存</span>
              <span>
                {formatBytes(memoryData.used_kb * 1024)} / {formatBytes(memoryData.total_kb * 1024)}
              </span>
            </div>
            <div className="h-2 bg-dark-tertiary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                style={{ width: `${memoryData.used_percent}%` }}
              />
            </div>
          </div>
          
          {memoryData.swap_total_kb > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Swap 内存</span>
                <span>
                  {formatBytes(memoryData.swap_used_kb * 1024)} / {formatBytes(memoryData.swap_total_kb * 1024)}
                </span>
              </div>
              <div className="h-2 bg-dark-tertiary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary transition-all duration-300"
                  style={{ width: `${memoryData.swap_used_percent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default MemoryWidget;