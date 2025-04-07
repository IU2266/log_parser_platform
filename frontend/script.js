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

    });
}

function cacheTemplates() {
    fetch('/cache')
    .then(response => response.json())
    .then(data => {
        document.getElementById('cache-status').textContent = `模板数量: ${data.template_count}, 缓存命中率: ${data.cache_hit_rate}%`;


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

    });
}

function outputResults() {
    fetch('/output')
    .then(response => response.json())
    .then(data => {
        document.getElementById('output-report').textContent = JSON.stringify(data.frequency, null, 2);
        document.getElementById('output-chart').textContent = `解析准确率: ${data.accuracy}%`;

        // 填充各解析器在 Loghub - 2.0 数据集上的平均性能对比表格
        const performanceData = data.performance; // 假设后端返回的数据中有 performance 字段，包含各解析器的性能指标
        if (performanceData) {
            document.getElementById('drain-ga').textContent = performanceData.Drain.GA;
            document.getElementById('drain-fga').textContent = performanceData.Drain.FGA;
            document.getElementById('drain-pa').textContent = performanceData.Drain.PA;
            document.getElementById('drain-fta').textContent = performanceData.Drain.FTA;

            document.getElementById('logppt-ga').textContent = performanceData.LogPPT.GA;
            document.getElementById('logppt-fga').textContent = performanceData.LogPPT.FGA;
            document.getElementById('logppt-pa').textContent = performanceData.LogPPT.PA;
            document.getElementById('logppt-fta').textContent = performanceData.LogPPT.FTA;

            document.getElementById('platform-ga').textContent = performanceData.Platform.GA;
            document.getElementById('platform-fga').textContent = performanceData.Platform.FGA;
            document.getElementById('platform-pa').textContent = performanceData.Platform.PA;
            document.getElementById('platform-fta').textContent = performanceData.Platform.FTA;
        }
    });
}