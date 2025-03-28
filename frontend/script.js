function login() {
    const username = document.getElementById('username').value;
    localStorage.setItem('username', username);
    window.location.href = 'index.html';
}

function logout() {
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

function showModule(moduleId) {
    const modules = document.querySelectorAll('.module');
    modules.forEach(module => {
        module.style.display = 'none';
    });
    document.getElementById(moduleId).style.display = 'block';
}

function uploadLogFile() {
    const logFile = document.getElementById('log-file').files[0];
    if (logFile) {
        const formData = new FormData();
        formData.append('log_file', logFile);
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('data-source-list').textContent = `数据源名称: ${data.data_source_name}`;
            document.getElementById('collection-status').textContent = `日志数量: ${data.log_count}, 采集速度: ${data.collection_speed} 条/秒`;
            // 绘制采集速度对比图表
            const collectionChartCtx = document.getElementById('collection-chart').getContext('2d');
            new Chart(collectionChartCtx, {
                type: 'bar',
                data: {
                    labels: ['LogPPT', 'LILAC'],
                    datasets: [{
                        label: '采集时间',
                        data: [10, 8], // 示例数据，需要根据实际情况修改
                        backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)'],
                        borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)'],
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        });
    }
}

function resetUpload() {
    // 清空文件选择框
    document.getElementById('log-file').value = '';
    // 清空日志采集模块内容
    document.getElementById('data-source-list').textContent = '';
    document.getElementById('collection-status').textContent = '';
    // 清空采集图表
    const collectionChart = document.getElementById('collection-chart');
    if (collectionChart) {
        collectionChart.parentNode.replaceChild(document.createElement('canvas'), collectionChart);
    }

    // 清空日志预处理模块内容
    document.getElementById('preprocessing-result').textContent = '';
    document.getElementById('logppt-noise-removal').textContent = '0%';
    document.getElementById('logppt-format-unification').textContent = '0%';
    document.getElementById('lilac-noise-removal').textContent = '0%';
    document.getElementById('lilac-format-unification').textContent = '0%';

    // 清空模板缓存模块内容
    document.getElementById('cache-status').textContent = '';
    const cacheHitRateChart = document.getElementById('cache-hit-rate-chart');
    if (cacheHitRateChart) {
        cacheHitRateChart.parentNode.replaceChild(document.createElement('canvas'), cacheHitRateChart);
    }
    const cacheUpdateChart = document.getElementById('cache-update-chart');
    if (cacheUpdateChart) {
        cacheUpdateChart.parentNode.replaceChild(document.createElement('canvas'), cacheUpdateChart);
    }

    // 清空日志解析模块内容
    document.getElementById('parsing-progress').textContent = '';
    document.getElementById('parsing-result').textContent = '';
    const parsingAccuracyChart = document.getElementById('parsing-accuracy-chart');
    if (parsingAccuracyChart) {
        parsingAccuracyChart.parentNode.replaceChild(document.createElement('canvas'), parsingAccuracyChart);
    }
    const parsingSpeedChart = document.getElementById('parsing-speed-chart');
    if (parsingSpeedChart) {
        parsingSpeedChart.parentNode.replaceChild(document.createElement('canvas'), parsingSpeedChart);
    }
    document.getElementById('logppt-error-type').textContent = '无';
    document.getElementById('logppt-error-count').textContent = '0';
    document.getElementById('lilac-error-type').textContent = '无';
    document.getElementById('lilac-error-count').textContent = '0';

    // 清空结果输出模块内容
    document.getElementById('output-report').textContent = '';
    document.getElementById('output-chart').textContent = '';
    const resultComparisonChart = document.getElementById('result-comparison-chart');
    if (resultComparisonChart) {
        resultComparisonChart.parentNode.replaceChild(document.createElement('canvas'), resultComparisonChart);
    }
}

function preprocessLogs() {
    fetch('/preprocess')
    .then(response => response.json())
    .then(data => {
        document.getElementById('preprocessing-result').textContent = `预处理前示例: ${data.before_example}, 预处理后示例: ${data.after_example}, 去除字符数量: ${data.removed_count}, 字段数量: ${data.field_count}`;
        // 填充预处理数据质量指标对比表格
        document.getElementById('logppt-noise-removal').textContent = '80%'; // 示例数据，需要根据实际情况修改
        document.getElementById('logppt-format-unification').textContent = '90%'; // 示例数据，需要根据实际情况修改
        document.getElementById('lilac-noise-removal').textContent = '85%'; // 示例数据，需要根据实际情况修改
        document.getElementById('lilac-format-unification').textContent = '95%'; // 示例数据，需要根据实际情况修改
    });
}

function cacheTemplates() {
    fetch('/cache')
    .then(response => response.json())
    .then(data => {
        document.getElementById('cache-status').textContent = `模板数量: ${data.template_count}, 缓存命中率: ${data.cache_hit_rate}%`;
        // 绘制缓存命中率对比折线图
        const cacheHitRateChartCtx = document.getElementById('cache-hit-rate-chart').getContext('2d');
        new Chart(cacheHitRateChartCtx, {
            type: 'line',
            data: {
                labels: ['1', '2', '3', '4', '5'],
                datasets: [{
                    label: 'LogPPT 缓存命中率',
                    data: [0.8, 0.85, 0.9, 0.92, 0.95], // 示例数据，需要根据实际情况修改
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false
                },
                {
                    label: 'LILAC 缓存命中率',
                    data: [0.82, 0.88, 0.93, 0.95, 0.97], // 示例数据，需要根据实际情况修改
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        // 绘制缓存更新频率对比柱状图
        const cacheUpdateChartCtx = document.getElementById('cache-update-chart').getContext('2d');
        new Chart(cacheUpdateChartCtx, {
            type: 'bar',
            data: {
                labels: ['LogPPT', 'LILAC'],
                datasets: [{
                    label: '缓存更新次数',
                    data: [5, 3], // 示例数据，需要根据实际情况修改
                    backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)'],
                    borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    });
}

function clearCache() {
    fetch('/clear-cache')
    .then(response => response.json())
    .then(data => {
        alert(data.message);
    });
}

function viewCache() {
    fetch('/view-cache')
    .then(response => response.json())
    .then(data => {
        alert(data.templates.join('\n'));
    });
}

function parseLogs() {
    fetch('/parse')
    .then(response => response.json())
    .then(data => {
        document.getElementById('parsing-progress').textContent = `解析数量: ${data.parsed_count}, 解析速度: ${data.parsing_speed} 条/秒`;
        document.getElementById('parsing-result').textContent = JSON.stringify(data.results, null, 2);
        // 绘制解析准确率对比柱状图
        const parsingAccuracyChartCtx = document.getElementById('parsing-accuracy-chart').getContext('2d');
        new Chart(parsingAccuracyChartCtx, {
            type: 'bar',
            data: {
                labels: ['LogPPT', 'LILAC'],
                datasets: [{
                    label: '解析准确率',
                    data: [0.9, 0.95], // 示例数据，需要根据实际情况修改
                    backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)'],
                    borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        // 绘制解析速度对比折线图
        const parsingSpeedChartCtx = document.getElementById('parsing-speed-chart').getContext('2d');
        new Chart(parsingSpeedChartCtx, {
            type: 'line',
            data: {
                labels: ['100', '200', '300', '400', '500'],
                datasets: [{
                    label: 'LogPPT 解析速度',
                    data: [0.1, 0.12, 0.15, 0.18, 0.2], // 示例数据，需要根据实际情况修改
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false
                },
                {
                    label: 'LILAC 解析速度',
                    data: [0.08, 0.1, 0.12, 0.14, 0.16], // 示例数据，需要根据实际情况修改
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        // 填充解析错误类型及数量对比表格
        document.getElementById('logppt-error-type').textContent = '格式错误'; // 示例数据，需要根据实际情况修改
        document.getElementById('logppt-error-count').textContent = '5'; // 示例数据，需要根据实际情况修改
        document.getElementById('lilac-error-type').textContent = '字段缺失'; // 示例数据，需要根据实际情况修改
        document.getElementById('lilac-error-count').textContent = '3'; // 示例数据，需要根据实际情况修改
    });
}

function outputResults() {
    fetch('/output')
    .then(response => response.json())
    .then(data => {
        document.getElementById('output-report').textContent = JSON.stringify(data.frequency, null, 2);
        document.getElementById('output-chart').textContent = `解析准确率: ${data.accuracy}%`;
        // 绘制结果对比图表
        const resultComparisonChartCtx = document.getElementById('result-comparison-chart').getContext('2d');
        new Chart(resultComparisonChartCtx, {
            type: 'bar',
            data: {
                labels: ['采样准确性', '采样效率'],
                datasets: [{
                    label: 'LogPPT',
                    data: [0.9, 0.8], // 示例数据，需要根据实际情况修改
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'LILAC',
                    data: [0.95, 0.85], // 示例数据，需要根据实际情况修改
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    });
}