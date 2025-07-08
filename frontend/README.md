# index-rs 前端

基于 React 的现代化服务器监控面板前端应用，提供实时数据可视化和服务导航功能。

## 技术栈

- **React 18** - 用户界面框架
- **Vite** - 快速的开发构建工具  
- **Zustand** - 轻量级状态管理
- **ECharts** - 强大的数据可视化库
- **Tailwind CSS** - 实用优先的 CSS 框架
- **PostCSS** - CSS 后处理器

## 开发环境设置

### 前置要求

- Node.js 16.x 或更高版本
- npm 7.x 或更高版本

### 安装依赖

```bash
npm install
```

### 开发模式

启动开发服务器（默认端口 5173）：

```bash
npm run dev
```

开发服务器会自动代理后端 API 请求到 `http://localhost:9876`。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `../static` 目录，供 Rust 后端服务。

### 代码检查

```bash
npm run lint
```

## 项目结构

```
frontend/
├── src/
│   ├── api/              # API 和 WebSocket 管理
│   │   ├── index.js      # REST API 客户端
│   │   └── websocket.js  # WebSocket 管理器
│   ├── components/       # React 组件
│   │   ├── common/       # 通用组件
│   │   │   ├── Card.jsx
│   │   │   └── Loading.jsx
│   │   └── widgets/      # 监控小部件
│   │       ├── SystemInfo.jsx
│   │       ├── CpuWidget.jsx
│   │       ├── MemoryWidget.jsx
│   │       ├── NetworkWidget.jsx
│   │       ├── DiskWidget.jsx
│   │       ├── GpuWidget.jsx
│   │       ├── PortWidget.jsx
│   │       └── ServiceWidget.jsx
│   ├── store/            # Zustand 状态管理
│   │   └── serverStore.js
│   ├── utils/            # 工具函数
│   │   └── formatters.js
│   ├── App.jsx           # 主应用组件
│   ├── main.jsx          # 应用入口
│   └── index.css         # 全局样式
├── public/               # 静态资源
├── index.html            # HTML 模板
├── package.json          # 项目配置
├── vite.config.js        # Vite 配置
├── tailwind.config.js    # Tailwind 配置
└── postcss.config.js     # PostCSS 配置
```

## 组件说明

### 核心组件

- **App.jsx** - 主应用组件，负责初始化和整体布局
- **SystemInfo** - 显示系统静态信息（主机名、操作系统等）
- **CpuWidget** - CPU 使用率实时图表，包含温度和功耗
- **MemoryWidget** - 内存使用情况饼图
- **NetworkWidget** - 网络流量实时监控
- **DiskWidget** - 磁盘使用情况可视化
- **GpuWidget** - GPU 监控（支持 NVIDIA）
- **PortWidget** - 端口占用情况表格
- **ServiceWidget** - 服务导航卡片

### 通用组件

- **Card** - 统一的卡片容器组件
- **Loading** - 加载状态指示器

## 状态管理

使用 Zustand 进行全局状态管理，主要包含：

```javascript
const useServerStore = create((set) => ({
  // 连接状态
  isConnected: false,
  
  // 系统信息
  systemInfo: null,
  
  // 服务列表
  services: [],
  
  // 实时数据
  realtimeData: {
    cpu: null,
    memory: null,
    network: null,
    disk: null,
    gpu: [],
    ports: []
  },
  
  // 历史数据（用于图表）
  history: {
    cpu: [],
    memory: [],
    network: []
  }
}));
```

## WebSocket 通信

WebSocket 管理器提供：

- 自动重连机制
- 连接状态管理
- 消息订阅/取消订阅
- 统一的错误处理

使用示例：

```javascript
// 连接
wsManager.connect();

// 监听消息
const unsubscribe = wsManager.onMessage((data) => {
  console.log('收到数据:', data);
});

// 清理
unsubscribe();
wsManager.disconnect();
```

## 数据可视化

### ECharts 配置

项目使用 ECharts 进行数据可视化，主要图表类型：

- **折线图** - CPU 使用率趋势
- **饼图** - 内存使用分布
- **柱状图** - 网络流量
- **仪表盘** - GPU 使用率

### 图表主题

统一使用深色主题，主要颜色：

- 主色：`#3b82f6` (blue-500)
- 成功：`#10b981` (emerald-500)
- 警告：`#f59e0b` (amber-500)
- 危险：`#ef4444` (red-500)

## 样式规范

### Tailwind CSS 配置

自定义扩展：

```javascript
theme: {
  extend: {
    colors: {
      primary: '#3b82f6',
      dark: '#0f172a',
      darker: '#020817'
    }
  }
}
```

### CSS 类命名约定

- 使用 Tailwind 实用类为主
- 自定义类使用 kebab-case
- 组件特定样式使用 CSS Modules 或内联样式

## 性能优化

### 已实施的优化

1. **组件懒加载** - 对大型组件使用 React.lazy
2. **状态更新优化** - 使用 Zustand 的选择器避免不必要的重渲染
3. **图表更新节流** - 限制图表更新频率为每秒一次
4. **历史数据限制** - 只保留最近 60 个数据点

### 构建优化

- 代码分割
- Tree shaking
- 资源压缩
- 浏览器缓存优化

## 开发指南

### 添加新的监控小部件

1. 在 `src/components/widgets/` 创建新组件
2. 在 store 中添加相应的状态
3. 在 `App.jsx` 中引入并使用组件
4. 更新 WebSocket 数据处理逻辑

示例：

```jsx
// src/components/widgets/NewWidget.jsx
import React from 'react';
import useServerStore from '../../store/serverStore';
import Card from '../common/Card';

const NewWidget = () => {
  const data = useServerStore((state) => state.realtimeData.newData);
  
  return (
    <Card title="新监控项">
      {/* 组件内容 */}
    </Card>
  );
};

export default NewWidget;
```

### 自定义主题

修改 `tailwind.config.js` 中的主题配置：

```javascript
theme: {
  extend: {
    colors: {
      primary: '#你的主色',
      // 其他颜色
    }
  }
}
```

### 调试技巧

1. **开发者工具** - 使用 React DevTools 查看组件状态
2. **网络调试** - 在 Network 标签页查看 WebSocket 消息
3. **性能分析** - 使用 Performance 标签页分析渲染性能

## 故障排除

### 常见问题

1. **WebSocket 连接失败**
   - 检查后端服务是否运行在 9876 端口
   - 查看浏览器控制台错误信息

2. **图表不更新**
   - 确认 WebSocket 连接正常
   - 检查数据格式是否正确

3. **样式问题**
   - 清除浏览器缓存
   - 重新运行 `npm install`

### 日志级别

开发环境下会输出详细日志，生产环境仅输出错误日志。

## 部署说明

### 环境变量

创建 `.env.production` 文件：

```env
VITE_API_BASE_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com
```

### 构建和部署

```bash
# 构建生产版本
npm run build

# 构建产物在 ../static 目录
# 由 Rust 后端直接服务
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 React Hooks 规范
- 组件使用函数式组件
- 使用 Prettier 格式化代码

## 许可证

MIT License