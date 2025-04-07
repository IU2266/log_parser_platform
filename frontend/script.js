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
    document.getElementById('log-file').value = '';
    document.getElementById('data-source-list').textContent = '';
    document.getElementById('collection-status').textContent = '';
    const collectionChart = document.getElementById('collection-chart');
    if (collectionChart) {
        collectionChart.parentNode.replaceChild(document.createElement('canvas'), collectionChart);
    }

    document.getElementById('preprocessing-result').textContent = '';
    document.getElementById('logppt-noise-removal').textContent = '0%';
    document.getElementById('logppt-format-unification').textContent = '0%';
    document.getElementById('lilac-noise-removal').textContent = '0%';
    document.getElementById('lilac-format-unification').textContent = '0%';

    document.getElementById('cache-status').textContent = '';
    const cacheHitRateChart = document.getElementById('cache-hit-rate-chart');
    if (cacheHitRateChart) {
        cacheHitRateChart.parentNode.replaceChild(document.createElement('canvas'), cacheHitRateChart);
    }
    const cacheUpdateChart = document.getElementById('cache-update-chart');
    if (cacheUpdateChart) {
        cacheUpdateChart.parentNode.replaceChild(document.createElement('canvas'), cacheUpdateChart);
    }

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
            document.getElementById('cache-status').innerHTML = `<p>缓存命中率: ${data.cache_hit_rate}%</p>`;
            document.getElementById('template-count-display').textContent = `模板数量: ${data.template_count}`;
        });
}

function clearCache() {
    fetch('/clear-cache')
      .then(response => response.json())
      .then(data => {
            alert(data.message);
            const templateCountDisplay = document.getElementById('template-count-display');
            const cacheList = document.getElementById('cache-list');
            if (templateCountDisplay && cacheList) {
                templateCountDisplay.textContent = '模板数量: 0';
                cacheList.innerHTML = '';
                document.getElementById('cache-status').innerHTML = '';
            } else {
                console.error('未找到模板数量显示元素或缓存列表元素');
            }
        })
      .catch(error => {
            console.error('清空缓存时出错:', error);
        });
}

function viewCache() {
    fetch('/view-cache')
      .then(response => response.json())
      .then(data => {
            const cacheList = document.getElementById('cache-list');
            cacheList.innerHTML = '';
            data.templates.forEach(template => {
                const listItem = document.createElement('li');
                listItem.textContent = template;
                cacheList.appendChild(listItem);
            });
            document.getElementById('template-count-display').textContent = `模板数量: ${data.templates.length}`;
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

            const performanceData = data.performance;
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
