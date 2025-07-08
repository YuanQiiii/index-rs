import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 这里可以添加认证 token 等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API 请求错误:', error);
    return Promise.reject(error);
  }
);

// API 方法
export const serverApi = {
  // 获取系统静态信息
  getSystemInfo: () => api.get('/system/static'),
  
  // 获取服务列表
  getServices: () => api.get('/services'),
  
  // 服务健康检查
  checkServiceHealth: (serviceId) => api.get(`/services/${serviceId}/health`),
  
  // Docker 容器操作（预留）
  dockerContainers: {
    list: () => api.get('/docker/containers'),
    start: (id) => api.post(`/docker/containers/${id}/start`),
    stop: (id) => api.post(`/docker/containers/${id}/stop`),
    restart: (id) => api.post(`/docker/containers/${id}/restart`),
  },
  
  // 进程操作（预留）
  processes: {
    list: () => api.get('/processes'),
    kill: (pid) => api.delete(`/processes/${pid}`),
  },
};

export default api;