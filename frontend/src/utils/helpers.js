// 格式化字节为人类可读的单位
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 格式化网络速度 (输入: KB/s)
export function formatNetworkSpeed(kbps, decimals = 1) {
  if (kbps === 0) return '0 KB/s';
  
  if (kbps < 1024) {
    return `${kbps.toFixed(decimals)} KB/s`;
  } else if (kbps < 1024 * 1024) {
    return `${(kbps / 1024).toFixed(decimals)} MB/s`;
  } else {
    return `${(kbps / 1024 / 1024).toFixed(decimals)} GB/s`;
  }
}

// 格式化运行时间
export function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  
  return parts.join(' ') || '刚刚启动';
}

// 获取状态颜色
export function getStatusColor(value, type = 'default') {
  if (type === 'cpu' || type === 'memory') {
    if (value < 50) return 'text-green-500';
    if (value < 80) return 'text-yellow-500';
    return 'text-red-500';
  }
  
  if (type === 'temperature') {
    if (value < 60) return 'text-green-500';
    if (value < 80) return 'text-yellow-500';
    return 'text-red-500';
  }
  
  return 'text-gray-500';
}

// 生成图表基础配置
export function getChartBaseOptions(theme = 'dark') {
  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');
  
  return {
    grid: {
      top: 10,
      right: 10,
      bottom: 20,
      left: 40,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderColor: isDark ? '#334155' : '#e5e7eb',
      textStyle: {
        color: isDark ? '#f1f5f9' : '#111827',
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: isDark ? '#475569' : '#9ca3af',
        },
      },
      axisLabel: {
        color: isDark ? '#94a3b8' : '#6b7280',
      },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: {
        lineStyle: {
          color: isDark ? '#475569' : '#9ca3af',
        },
      },
      axisLabel: {
        color: isDark ? '#94a3b8' : '#6b7280',
      },
      splitLine: {
        lineStyle: {
          color: isDark ? '#334155' : '#e5e7eb',
        },
      },
    },
  };
}