// ECharts 按需导入配置
import * as echarts from 'echarts/core';
import {
  LineChart,
  BarChart,
  PieChart,
  GaugeChart
} from 'echarts/charts';

import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components';

import { CanvasRenderer } from 'echarts/renderers';

// 注册必要的组件
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer
]);

// 导出配置好的echarts
export default echarts;

// 通用图表配置
export const commonChartConfig = {
  animation: true,
  animationDuration: 300,
  animationEasing: 'cubicOut',
  textStyle: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
};

// 深色主题配置
export const darkThemeConfig = {
  backgroundColor: 'transparent',
  textStyle: {
    color: '#e5e7eb'
  },
  grid: {
    borderColor: '#374151'
  },
  xAxis: {
    axisLine: {
      lineStyle: {
        color: '#4b5563'
      }
    },
    axisLabel: {
      color: '#9ca3af'
    },
    splitLine: {
      lineStyle: {
        color: '#374151'
      }
    }
  },
  yAxis: {
    axisLine: {
      lineStyle: {
        color: '#4b5563'
      }
    },
    axisLabel: {
      color: '#9ca3af'
    },
    splitLine: {
      lineStyle: {
        color: '#374151'
      }
    }
  },
  tooltip: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderColor: '#4b5563',
    textStyle: {
      color: '#f3f4f6'
    }
  }
};

// 创建响应式图表配置
export const createResponsiveOption = (baseOption) => {
  return {
    ...commonChartConfig,
    ...darkThemeConfig,
    ...baseOption,
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
      ...darkThemeConfig.grid,
      ...baseOption.grid
    },
    xAxis: {
      ...darkThemeConfig.xAxis,
      ...baseOption.xAxis
    },
    yAxis: {
      ...darkThemeConfig.yAxis,
      ...baseOption.yAxis
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      ...darkThemeConfig.tooltip,
      ...baseOption.tooltip
    }
  };
};