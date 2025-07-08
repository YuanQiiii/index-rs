import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import useServerStore from '../../store/serverStore';
import Card, { CardHeader, CardBody } from '../common/Card';
import { formatBytes, formatNetworkSpeed, getChartBaseOptions } from '../../utils/helpers';

const NetworkWidget = () => {
  const networkData = useServerStore((state) => state.realtimeData.network);
  const networkHistory = useServerStore((state) => state.history.network);

  const chartOption = useMemo(() => {
    const baseOptions = getChartBaseOptions();
    
    return {
      ...baseOptions,
      legend: {
        data: ['下载', '上传'],
        top: 10,
        textStyle: {
          color: '#94a3b8',
        },
      },
      tooltip: {
        ...baseOptions.tooltip,
        formatter: (params) => {
          return params.map(item => {
            return `${item.seriesName}: ${formatNetworkSpeed(item.value)}`;
          }).join('<br/>');
        },
      },
      series: [
        {
          name: '下载',
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
                { offset: 0, color: 'rgba(34, 197, 94, 0.3)' },
                { offset: 1, color: 'rgba(34, 197, 94, 0.05)' }
              ]
            }
          },
          lineStyle: {
            width: 2,
            color: '#22c55e'
          },
          data: networkHistory.rx,
        },
        {
          name: '上传',
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
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ]
            }
          },
          lineStyle: {
            width: 2,
            color: '#3b82f6'
          },
          data: networkHistory.tx,
        }
      ],
      xAxis: {
        ...baseOptions.xAxis,
        data: networkHistory.rx.map((_, index) => index === networkHistory.rx.length - 1 ? '现在' : ''),
      },
      yAxis: {
        ...baseOptions.yAxis,
        max: null,
        axisLabel: {
          ...baseOptions.yAxis.axisLabel,
          formatter: (value) => formatNetworkSpeed(value)
        }
      }
    };
  }, [networkHistory]);

  return (
    <Card>
      <CardHeader>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>网络流量</span>
      </CardHeader>
      
      <CardBody>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span className="text-sm text-gray-400">下载速度</span>
            </div>
            <p className="text-2xl font-bold text-green-500">
              {formatNetworkSpeed(networkData.rx_speed_kbps)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              总计: {formatBytes(networkData.total_rx_gb * 1024 * 1024 * 1024)}
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span className="text-sm text-gray-400">上传速度</span>
            </div>
            <p className="text-2xl font-bold text-blue-500">
              {formatNetworkSpeed(networkData.tx_speed_kbps)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              总计: {formatBytes(networkData.total_tx_gb * 1024 * 1024 * 1024)}
            </p>
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
        
        {networkData.interfaces.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-2">网络接口</p>
            <div className="flex flex-wrap gap-2">
              {networkData.interfaces.map((iface, index) => (
                <span key={index} className="px-2 py-1 bg-dark-tertiary rounded text-xs">
                  {iface.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default NetworkWidget;