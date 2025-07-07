// 全局变量
let ws = null;
let charts = {};
let reconnectTimer = null;

// 图表配置
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        }
    },
    scales: {
        x: {
            display: false
        },
        y: {
            beginAtZero: true,
            max: 100
        }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initCharts();
    await loadStaticInfo();
    await loadServices();
    connectWebSocket();
});

// 主题切换
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const newTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        updateThemeIcon();
    });
    
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.querySelector('#theme-toggle i');
    if (document.body.classList.contains('dark-theme')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// 初始化图表
function initCharts() {
    // CPU 图表
    const cpuCtx = document.getElementById('cpu-chart').getContext('2d');
    charts.cpu = new Chart(cpuCtx, {
        type: 'line',
        data: {
            labels: Array(60).fill(''),
            datasets: [{
                data: Array(60).fill(0),
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4
            }]
        },
        options: chartOptions
    });
    
    // 内存图表
    const memoryCtx = document.getElementById('memory-chart').getContext('2d');
    charts.memory = new Chart(memoryCtx, {
        type: 'line',
        data: {
            labels: Array(60).fill(''),
            datasets: [{
                data: Array(60).fill(0),
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.4
            }]
        },
        options: chartOptions
    });
    
    // 网络图表
    const networkCtx = document.getElementById('network-chart').getContext('2d');
    charts.network = new Chart(networkCtx, {
        type: 'line',
        data: {
            labels: Array(60).fill(''),
            datasets: [{
                label: '下载',
                data: Array(60).fill(0),
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                tension: 0.4
            }, {
                label: '上传',
                data: Array(60).fill(0),
                borderColor: '#f39c12',
                backgroundColor: 'rgba(243, 156, 18, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                ...chartOptions.scales,
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 加载静态信息
async function loadStaticInfo() {
    try {
        const response = await fetch('/api/system/static');
        const data = await response.json();
        
        document.getElementById('hostname').textContent = data.hostname;
        document.getElementById('os-name').textContent = data.os_name;
        document.getElementById('kernel-version').textContent = data.kernel_version;
        document.getElementById('cpu-info').textContent = `${data.cpu_brand} (${data.cpu_cores} 核心)`;
        document.getElementById('total-memory').textContent = `${data.total_memory_gb.toFixed(2)} GB`;
    } catch (error) {
        console.error('加载静态信息失败:', error);
    }
}

// 加载服务列表
async function loadServices() {
    try {
        const response = await fetch('/api/services');
        const services = await response.json();
        
        const container = document.getElementById('service-cards');
        container.innerHTML = '';
        
        services.forEach(service => {
            const card = document.createElement('div');
            card.className = `service-card ${service.status === 'online' ? 'online' : 'offline'}`;
            card.innerHTML = `
                <div class="service-status"></div>
                <div class="service-icon">
                    <i class="${service.icon}"></i>
                </div>
                <h4>${service.name}</h4>
                <p>${service.description}</p>
            `;
            card.addEventListener('click', () => {
                window.open(service.url, '_blank');
            });
            container.appendChild(card);
        });
    } catch (error) {
        console.error('加载服务列表失败:', error);
    }
}

// WebSocket 连接
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/realtime`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket 连接成功');
        if (reconnectTimer) {
            clearInterval(reconnectTimer);
            reconnectTimer = null;
        }
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateRealtimeData(data);
    };
    
    ws.onclose = () => {
        console.log('WebSocket 连接断开');
        if (!reconnectTimer) {
            reconnectTimer = setInterval(() => {
                console.log('尝试重新连接...');
                connectWebSocket();
            }, 5000);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
    };
}

// 更新实时数据
function updateRealtimeData(data) {
    // 更新运行时间
    const uptime = formatUptime(data.uptime_secs);
    document.getElementById('uptime').textContent = `运行时间: ${uptime}`;
    
    // 更新 CPU
    const cpuUsage = data.cpu.total_usage.toFixed(1);
    document.getElementById('cpu-usage').textContent = cpuUsage;
    updateChart(charts.cpu, parseFloat(cpuUsage));
    
    // 更新内存
    const memoryUsage = data.memory.used_percent.toFixed(1);
    document.getElementById('memory-usage').textContent = memoryUsage;
    updateChart(charts.memory, parseFloat(memoryUsage));
    
    // 更新网络
    document.getElementById('network-rx').textContent = data.network.rx_speed_kbps.toFixed(1);
    document.getElementById('network-tx').textContent = data.network.tx_speed_kbps.toFixed(1);
    updateNetworkChart(data.network.rx_speed_kbps, data.network.tx_speed_kbps);
    
    // 更新系统负载
    document.getElementById('load-1').textContent = data.load_average.one.toFixed(2);
    document.getElementById('load-5').textContent = data.load_average.five.toFixed(2);
    document.getElementById('load-15').textContent = data.load_average.fifteen.toFixed(2);
    
    // 更新磁盘信息
    updateDisks(data.disks);
}

// 更新图表数据
function updateChart(chart, value) {
    chart.data.datasets[0].data.shift();
    chart.data.datasets[0].data.push(value);
    chart.update('none');
}

// 更新网络图表
function updateNetworkChart(rx, tx) {
    charts.network.data.datasets[0].data.shift();
    charts.network.data.datasets[0].data.push(rx);
    charts.network.data.datasets[1].data.shift();
    charts.network.data.datasets[1].data.push(tx);
    charts.network.update('none');
}

// 更新磁盘列表
function updateDisks(disks) {
    const container = document.getElementById('disk-list');
    container.innerHTML = '';
    
    disks.forEach(disk => {
        const diskItem = document.createElement('div');
        diskItem.className = 'disk-item';
        diskItem.innerHTML = `
            <div class="disk-info">
                <h4>${disk.mount_point}</h4>
                <p>${disk.file_system} - ${disk.name}</p>
            </div>
            <div class="disk-usage">
                <div class="usage-text">
                    ${disk.used_gb.toFixed(1)} GB / ${disk.total_gb.toFixed(1)} GB
                    (${disk.used_percent.toFixed(1)}%)
                </div>
                <div class="usage-bar">
                    <div class="usage-fill" style="width: ${disk.used_percent}%"></div>
                </div>
            </div>
        `;
        container.appendChild(diskItem);
    });
}

// 格式化运行时间
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}天 ${hours}小时 ${minutes}分钟`;
    } else if (hours > 0) {
        return `${hours}小时 ${minutes}分钟`;
    } else {
        return `${minutes}分钟`;
    }
}