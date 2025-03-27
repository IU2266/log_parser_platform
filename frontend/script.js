let username;
const backendApiUrl = 'http://192.168.50.11:8080';

function showModule(moduleId) {
    const modules = document.querySelectorAll('.module');
    modules.forEach(module => {
        module.style.display = 'none';
    });
    const selectedModule = document.getElementById(moduleId);
    selectedModule.style.display = 'block';
    if (moduleId === 'log-preprocessing' && !hasUploadedFile) {
        document.getElementById('preprocessing-result').innerHTML = '未上传文件';
    }
    if (moduleId === 'log-parsing' && (!hasUploadedFile || !hasPreprocessed)) {
        document.getElementById('parsing-result').innerHTML = '未上传文件或文件未预处理';
    }
    if (moduleId === 'result-output' && !hasParsed) {
        document.getElementById('output-report').innerHTML = '未收到解析结果';
    }
}

let hasUploadedFile = false;
let hasPreprocessed = false;
let hasCached = false;
let hasParsed = false;

function uploadLogFile() {
    const file = document.getElementById('log-file').files[0];
    if (file) {
        const formData = new FormData();
        formData.append('log_file', file);
        fetch(`${backendApiUrl}/upload`, {
            method: 'POST',
            body: formData
        })
       .then(response => response.json())
       .then(data => {
            hasUploadedFile = true;
            // 显示数据源列表
            document.getElementById('data-source-list').innerHTML = `数据源名称: ${data.data_source_name}, 类型: 文件, 状态: 正常采集`;
            // 显示采集的实时状态
            document.getElementById('collection-status').innerHTML = `采集的日志数量: ${data.log_count}, 采集速度: ${data.collection_speed} 条/秒`;
        });
    }
}

function resetUpload() {
    hasUploadedFile = false;
    hasPreprocessed = false;
    hasCached = false;
    hasParsed = false;
    document.getElementById('log-file').value = '';
    document.getElementById('data-source-list').innerHTML = '';
    document.getElementById('collection-status').innerHTML = '';
    document.getElementById('preprocessing-result').innerHTML = '';
    document.getElementById('cache-status').innerHTML = '';
    document.getElementById('parsing-progress').innerHTML = '';
    document.getElementById('parsing-result').innerHTML = '';
    document.getElementById('output-report').innerHTML = '';
    document.getElementById('output-chart').innerHTML = '';
}

function preprocessLogs() {
    if (hasUploadedFile) {
        fetch(`${backendApiUrl}/preprocess`)
        .then(response => response.json())
        .then(data => {
            hasPreprocessed = true;
            document.getElementById('preprocessing-result').innerHTML = `预处理前示例: ${data.before_example}<br>预处理后示例: ${data.after_example}<br>去除的无用信息数量: ${data.removed_count}<br>格式化后的日志字段数量: ${data.field_count}`;
        });
    }
}

function cacheTemplates() {
    if (hasPreprocessed) {
        fetch(`${backendApiUrl}/cache`)
        .then(response => response.json())
        .then(data => {
            hasCached = true;
            document.getElementById('cache-status').innerHTML = `缓存中的模板数量: ${data.template_count}, 缓存命中率: ${data.cache_hit_rate}%`;
        });
    }
}

function clearCache() {
    fetch(`${backendApiUrl}/clear-cache`)
    .then(response => response.json())
    .then(data => {
        document.getElementById('cache-status').innerHTML = `缓存已清空`;
    });
}

function viewCache() {
    fetch(`${backendApiUrl}/view-cache`)
    .then(response => response.json())
    .then(data => {
        const cacheList = data.templates.join('<br>');
        document.getElementById('cache-status').innerHTML = `缓存中的模板列表:<br>${cacheList}`;
    });
}

function parseLogs() {
    if (hasPreprocessed) {
        fetch(`${backendApiUrl}/parse`, {
            method: 'GET',
            timeout: 60000  // 设置超时时间为 60 秒，可根据需要调整
        })
       .then(response => response.json())
       .then(data => {
            hasParsed = true;
            document.getElementById('parsing-progress').innerHTML = `已解析的日志数量: ${data.parsed_count}, 解析速度: ${data.parsing_speed} 条/秒`;
            const resultList = data.results.map(result => `日志消息: ${result.message}, 模板: ${result.template}, 解析时间: ${result.time}`).join('<br>');
            document.getElementById('parsing-result').innerHTML = resultList;
        });
    }
}
function outputResults() {
    if (hasParsed) {
        fetch(`${backendApiUrl}/output`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('output-report').innerHTML = `不同模板的出现频率: ${JSON.stringify(data.frequency)}, 解析准确率: ${data.accuracy}%`;
            document.getElementById('output-chart').innerHTML = '<canvas id="chart"></canvas>';
            const ctx = document.getElementById('chart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(data.frequency),
                    datasets: [{
                        label: '出现频率',
                        data: Object.values(data.frequency),
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
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