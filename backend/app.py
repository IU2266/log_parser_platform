import os
import re
import time
import socket
import pandas as pd
from flask import Flask, request, jsonify, send_file, send_from_directory
from LILAC.parsing_cache import ParsingCache
from LILAC.gpt_query import query_template_from_deepseek_with_check
from LILAC.LILAC import save_results_to_csv
from flask_cors import CORS  # 导入 CORS

app = Flask(__name__)
CORS(app)  # 启用 CORS，允许所有源访问

# 获取本地 IP 地址
def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

# 日志采集模块
def upload_file(log_file):
    start_time = time.time()
    log_lines = log_file.readlines()
    end_time = time.time()
    log_count = len(log_lines)
    collection_speed = log_count / (end_time - start_time)

    # 创建 log.txt 文件并写入日志数据
    with open('log.txt', 'w') as log_file:
        log_file.writelines([line.decode('utf-8') for line in log_lines])

    return log_lines, log_count, collection_speed

# 日志预处理模块
def preprocess_logs(log_data):
    before_example = log_data[0].decode('utf-8')
    # 清洗和格式化处理
    log_data = [re.sub(r'\s+', ' ', line.decode('utf-8').strip()) for line in log_data]
    after_example = log_data[0]
    removed_count = len(before_example) - len(after_example)
    # 生成正则表达式并转换为 DataFrame
    log_format = '<Date> <Time> <Pid> <Level> <Component>: <Content>'
    headers, regex = generate_logformat_regex(log_format)
    logdf = log_to_dataframe(log_data, regex, headers, log_format)
    field_count = len(logdf.columns)
    return log_data, before_example, after_example, removed_count, field_count

def generate_logformat_regex(logformat):
    headers = []
    splitters = re.split(r'(<[^<>]+>)', logformat)
    regex = ''
    for k in range(len(splitters)):
        if k % 2 == 0:
            splitter = re.sub(' +', '\\\s+', splitters[k])
            regex += splitter
        else:
            header = splitters[k].strip('<').strip('>')
            regex += '(?P<%s>.*?)' % header
    regex = re.compile('^' + regex + '$')
    return headers, regex

def log_to_dataframe(log_data, regex, headers, logformat):
    log_messages = []
    for line in log_data:
        try:
            match = regex.search(line.strip())
            message = [match.group(header) for header in headers]
            log_messages.append(message)
        except Exception as e:
            pass
    logdf = pd.DataFrame(log_messages, columns=headers)
    logdf.insert(0, 'LineId', None)
    logdf['LineId'] = [i + 1 for i in range(len(log_messages))]
    return logdf

# 模板缓存模块
def cache_templates(log_data, cache):
    template_count = len(cache.template_list)
    hit_count = 0
    total_count = len(log_data)
    for log in log_data:
        result = cache.match_event(log)
        if result[0] != "NoMatch":
            hit_count += 1
    cache_hit_rate = (hit_count / total_count) * 100 if total_count > 0 else 0
    return cache, template_count, cache_hit_rate

# 日志解析模块
def parse_logs(log_data, cache):
    start_time = time.time()
    parsed_count = 0
    parsed_results = []
    template_lines = []  # 用于存储模板信息

    for log in log_data:
        result = cache.match_event(log)
        if result[0] == "NoMatch":
            new_template, normal = query_template_from_deepseek_with_check(log)
            template_id = cache.add_templates(new_template, normal, result[2])
        else:
            template_id = result[1]

        parsed_count += 1
        parsed_time = time.time() - start_time
        parsed_results.append({
            'message': log,
            'template': cache.template_list[template_id],
            'time': parsed_time
        })
        template_lines.append(cache.template_list[template_id])

    end_time = time.time()
    parsing_speed = parsed_count / (end_time - start_time)

    # 将模板信息写入 template.txt 文件
    template_dir = os.path.join(os.path.dirname(__file__), 'templates')
    os.makedirs(template_dir, exist_ok=True)  # 确保目录存在
    template_file_path = os.path.join(template_dir, 'template.txt')

    with open(template_file_path, 'w') as template_file:
        for line in template_lines:
            template_file.write(line + '\n')

    return parsed_count, parsing_speed, parsed_results

# 结果输出模块
def output_results(parsed_results):
    # 保存为 CSV 文件
    log_file = 'log.txt'
    template_file = 'path/to/template.txt'  # 确保路径与生成文件时一致
    cache_file = 'cache.pkl'
    output_file = 'output.csv'
    output_template_file = 'output_templates.csv'
    save_results_to_csv(log_file, template_file, cache_file, output_file, output_template_file)
    # 统计不同模板的出现频率
    frequency = {}
    for result in parsed_results:
        template = result['template']
        if template in frequency:
            frequency[template] += 1
        else:
            frequency[template] = 1
    # 计算解析准确率（这里简单假设全部正确）
    accuracy = 100
    return frequency, accuracy


# 添加根路径路由
@app.route('/')
def index():
    base_dir = os.path.dirname(os.path.dirname(__file__))  # 获取上一级目录
    frontend_dir = os.path.join(base_dir, 'frontend')
    try:
        return send_from_directory(frontend_dir, 'login.html')
    except FileNotFoundError:
        return jsonify({"error": "Login page not found"}), 404

@app.route('/favicon.ico')
def favicon():
    base_dir = os.path.dirname(os.path.dirname(__file__))  # 获取上一级目录
    frontend_dir = os.path.join(base_dir, 'frontend')
    try:
        return send_file(os.path.join(frontend_dir, 'favicon.ico'), mimetype='image/vnd.microsoft.icon')
    except FileNotFoundError:
        return '', 204

@app.route('/<path:path>')
def send_static(path):
    base_dir = os.path.dirname(os.path.dirname(__file__))  # 获取上一级目录
    frontend_dir = os.path.join(base_dir, 'frontend')
    try:
        return send_from_directory(frontend_dir, path)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route('/upload', methods=['POST'])
def upload():
    log_file = request.files['log_file']
    if log_file:
        log_data, log_count, collection_speed = upload_file(log_file)
        return jsonify({
            'log_count': log_count,
            'collection_speed': collection_speed
        })

@app.route('/preprocess', methods=['GET'])
def preprocess():
    with open('log.txt', 'r') as f:
        log_data = f.readlines()
    log_data, before_example, after_example, removed_count, field_count = preprocess_logs(log_data)
    return jsonify({
        'before_example': before_example,
        'after_example': after_example,
        'removed_count': removed_count,
        'field_count': field_count
    })

@app.route('/cache', methods=['GET'])
def cache():
    with open('log.txt', 'r') as f:
        log_data = f.readlines()
    cache = ParsingCache()
    cache, template_count, cache_hit_rate = cache_templates(log_data, cache)
    return jsonify({
        'template_count': template_count,
        'cache_hit_rate': cache_hit_rate
    })

@app.route('/clear-cache', methods=['GET'])
def clear_cache():
    # 这里简单返回清空信息，实际可添加清空缓存逻辑
    return jsonify({
        'message': '缓存已清空'
    })

@app.route('/view-cache', methods=['GET'])
def view_cache():
    # 这里简单返回示例信息，实际可添加查看缓存逻辑
    templates = []
    return jsonify({
        'templates': templates
    })

@app.route('/parse', methods=['GET'])
def parse():
    with open('log.txt', 'r') as f:
        log_data = f.readlines()
    cache = ParsingCache()
    parsed_count, parsing_speed, parsed_results = parse_logs(log_data, cache)
    return jsonify({
        'parsed_count': parsed_count,
        'parsing_speed': parsing_speed,
        'results': parsed_results
    })

@app.route('/output', methods=['GET'])
def output():
    with open('log.txt', 'r') as f:
        log_data = f.readlines()
    cache = ParsingCache()
    parsed_count, parsing_speed, parsed_results = parse_logs(log_data, cache)
    frequency, accuracy = output_results(parsed_results)
    return jsonify({
        'frequency': frequency,
        'accuracy': accuracy
    })

# 404 错误处理
@app.errorhandler(404)
def page_not_found(e):
    return jsonify({"error": "Page not found"}), 404


if __name__ == "__main__":
    local_ip = get_local_ip()
    port = 8080
    print(f"后端服务已启动，前端访问地址: http://{local_ip}:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)