import deepseek
import os
import re
import time
import string
import json
import requests

from .parsing_cache import ParsingCache
from .post_process import correct_single_template



def get_deepseek_key(file_path="D:/log_parser_platform/deepseek_key.txt"):
    try:
        with open(file_path, 'r') as file:
            api_base = file.readline().strip()
            api_key = file.readline().strip()
            print(f"API Base: {api_base}")  # 调试输出
           # print(f"API Key: {'*' * (len(api_key)-4)}{api_key[-4:]}")  # 安全打印密钥
        return api_base, api_key
    except Exception as e:
        print(f"Error loading API key: {e}")
        return None, None


deepseek.api_base, deepseek.api_key = get_deepseek_key()


def infer_llm(instruction, exemplars, query, log_message,
              # 修改为 deepseek-chat
              model='deepseek-chat', temperature=0.0, max_tokens=2048):
    # 构造 messages
    messages = [
        {"role": "system", "content": "You are an expert of log parsing, and now you will help to do log parsing."},
        {"role": "user", "content": instruction},
        {"role": "assistant", "content": "Sure, I can help you with log parsing."},
    ]

    if exemplars is not None:
        for exemplar in exemplars:
            messages.append({"role": "user", "content": exemplar['query']})
            messages.append({"role": "assistant", "content": exemplar['answer']})

    messages.append({"role": "user", "content": query})

    retry_times = 0
    print("model: ", model)

    while retry_times < 3:
        try:
            # 使用 requests 直接调用 DeepSeek API
            headers = {
                "Authorization": f"Bearer {deepseek.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }

            url = f"{deepseek.api_base}/chat/completions"
            print(f"Request URL: {url}")
            #print(f"Request Headers: {headers}")
            print(f"Request Payload: {payload}")

            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=20  # 设置超时时间为 20 秒，可根据需要调整
            )
            response.raise_for_status()

            data = response.json()
            return data["choices"][0]["message"]["content"]

        except Exception as e:
            print("Exception:", e)
            if "list index out of range" in str(e):
                break
            retry_times += 1
            time.sleep(1)  # 添加延迟避免频繁调用

    print(f"Failed to get response from DeepSeek after {retry_times} retries.")
    if exemplars is not None and len(exemplars) > 0:
        if exemplars[0]['query'] != 'Log message: `try to connected to host: 172.16.254.1, finished.`' \
                or exemplars[0]['answer'] != 'Log template: `try to connected to host: {ip_address}, finished.`':
            examples = [{'query': 'Log message: `try to connected to host: 172.16.254.1, finished.`',
                         'answer': 'Log template: `try to connected to host: {ip_address}, finished.`'}]
            return infer_llm(instruction, examples, query, log_message, model, temperature, max_tokens)
    return 'Log message: `{}`'.format(log_message)

def get_response_from_deepseek_key(query, examples=[],
                                   # 修改为 deepseek-chat
                                   model='deepseek-chat', temperature=0.0):
    instruction = "I want you to act like an expert of log parsing. I will give you a log message delimited by backticks. You must identify and abstract all the dynamic variables in logs with {placeholder} and output a static log template. Print ONLY the input log's template delimited by backticks, without any additional explanations. The template should be specific enough to match the original log message."

    if examples is None or len(examples) == 0:
        examples = [
            {'query': 'Log message: `try to connected to host: 172.16.254.1, finished.`',
             'answer': 'Log template: `try to connected to host: {ip_address}, finished.`'},
            {
                'query': 'Log message: `Feb 28 01:49:02 combo sshd(pam_unix)[6737]: authentication failure; logname= uid=0 euid=0 tty=NODEVssh ruser= rhost=www.buller.hoover.fresno.k12.ca.us  user=root`',
                'answer': 'Log template: `{date} {time} {host} sshd(pam_unix)[{pid}]: authentication failure; logname= uid={uid} euid={euid} tty={ssh_type} ruser= rhost={rhost}  user={user}`'},
            # 可以添加更多示例
            {"query": "LDAP: Built with OpenLDAP LDAP SDK", "answer": "LDAP: Built with OpenLDAP LDAP SDK"},
            {"query": "LDAP: SSL support unavailable", "answer": "LDAP: SSL support unavailable"},
            {"query": "suEXEC mechanism enabled (wrapper: /usr/sbin/suexec)",
             "answer": "suEXEC mechanism enabled (wrapper: {variables})"},
            {"query": "Digest: generating secret for digest authentication ...",
             "answer": "Digest: generating secret for digest authentication ..."},
            {"query": "config.update(): Can't create worker.jni:onStartup",
             "answer": "config.update(): Can't create {variables}"},
            {"query": "config.update(): Can't create worker.jni:onShutdown",
             "answer": "config.update(): Can't create {variables}"},
            {"query": "[client 210.245.151.81] Attempt to serve directory: /var/www/html/",
             "answer": "[client {variables}] Attempt to serve directory: {variables}"},
            {"query": "[client 210.115.233.107] script not found or unable to stat: /var/www/cgi-bin/awstats.pl",
             "answer": "[client {variables}] script not found or unable to stat: {variables}"},
            {"query": "[client 210.91.137.35] request failed: URI too long (longer than 8190)",
             "answer": "[client {variables}] request failed: URI too long (longer than {variables})"},
            {"query": "[client 218.1.115.14] Directory index forbidden by rule: /var/www/html/",
             "answer": "[client {variables}] Directory index forbidden by rule: {variables}"},
            {"query": "Graceful restart requested, doing restart",
             "answer": "Graceful restart requested, doing restart"},
            {"query": "jk2_init() Can't find child 12569 in scoreboard",
             "answer": "jk2_init() Can't find child {variables} in scoreboard"},
            {"query": "config.update(): Can't create worker.jni:onShutdown",
             "answer": "config.update(): Can't create {variables}"},
            {"query": "[client 63.192.33.37] request failed: URI too long (longer than 8190)",
             "answer": "[client {variables}] request failed: URI too long (longer than {variables})"},
            {"query": "mod_jk2 Shutting down", "answer": "mod_jk2 Shutting down"},
            {"query": "config.update(): Can't create worker.jni:onStartup",
             "answer": "config.update(): Can't create {variables}"},
            {"query": "suEXEC mechanism enabled (wrapper: /usr/sbin/suexec)",
             "answer": "suEXEC mechanism enabled (wrapper: {variables})"},
            {"query": "[client 222.173.144.38] request failed: error reading the headers",
             "answer": "[client {variables}] request failed: error reading the headers"},
            {"query": "mod_python: Creating 32 session mutexes based on 150 max processes and 0 max threads.",
             "answer": "mod_python: Creating {variables} session mutexes based on {variables} max processes and {variables} max threads."},
            {"query": "mod_jk child init 1 -2", "answer": "mod_jk child init {variables} {variables}"},
            {"query": "config.update(): Can't create vm:", "answer": "config.update(): Can't create {variables}"},
            {"query": "[client 216.104.137.150] Directory index forbidden by rule: /var/www/html/",
             "answer": "[client {variables}] Directory index forbidden by rule: {variables}"},
            {"query": "[client 213.150.166.78] File does not exist: /var/www/html/sumthin",
             "answer": "[client {variables}] File does not exist: {variables}"},
            {"query": "Digest: done", "answer": "Digest: done"},
            {"query": "Digest: generating secret for digest authentication ...",
             "answer": "Digest: generating secret for digest authentication ..."},
            {"query": "child process 29765 still did not exit, sending a SIGTERM",
             "answer": "child process {variables} still did not exit, sending a SIGTERM"},
            {"query": "[client 61.19.188.17] request failed: URI too long (longer than 8190)",
             "answer": "[client {variables}] request failed: URI too long (longer than {variables})"},
            {"query": "[client 83.173.150.63] request failed: URI too long (longer than 8190)",
             "answer": "[client {variables}] request failed: URI too long (longer than {variables})"},
            {"query": "env.createBean2(): Factory error creating worker.jni:onStartup ( worker.jni, onStartup)",
             "answer": "env.createBean2(): Factory error creating {variables} ({variables}, {variables})"},
            {"query": "env.createBean2(): Factory error creating worker.jni:onStartup ( worker.jni, onStartup)",
             "answer": "env.createBean2(): Factory error creating {variables} ({variables}, {variables})"},
            {"query": "[client 218.144.240.75] attempt to invoke directory as script: /var/www/cgi-bin/",
             "answer": "[client {variables}] attempt to invoke directory as script: {variables}"},
            {"query": "[client 218.144.240.75] attempt to invoke directory as script: /var/www/cgi-bin/",
             "answer": "[client {variables}] attempt to invoke directory as script: {variables}"},
            {"query": "config.update(): Can't create channel.jni:jni",
             "answer": "config.update(): Can't create {variables}"},
            {"query": "config.update(): Can't create vm:", "answer": "config.update(): Can't create {variables}"},
            {"query": "Apache/2.0.49 (Fedora) configured -- resuming normal operations",
             "answer": "Apache/{variables} configured -- resuming normal operations"},
            {"query": "Apache/2.0.49 (Fedora) configured -- resuming normal operations",
             "answer": "Apache/{variables} configured -- resuming normal operations"},
            {"query": "jk2_init() Found child 3734 in scoreboard slot 75",
             "answer": "jk2_init() Found child {variables} in scoreboard slot {variables}"},
            {"query": "mod_python: Creating 32 session mutexes based on 150 max processes and 0 max threads.",
             "answer": "mod_python: Creating {variables} session mutexes based on {variables} max processes and {variables} max threads."},
            {"query": "config.update(): Can't create worker.jni:onStartup",
             "answer": "config.update(): Can't create {variables}"},
            {"query": "config.update(): Can't create worker.jni:onShutdown",
             "answer": "config.update(): Can't create {variables}"},
            {"query": "LDAP: SSL support unavailable", "answer": "LDAP: SSL support unavailable"},
            {"query": "[client 60.177.74.172] Directory index forbidden by rule: /var/www/html/",
             "answer": "[client {variables}] Directory index forbidden by rule: {variables}"},
            {"query": "child process 707 still did not exit, sending a SIGTERM",
             "answer": "child process {variables} still did not exit, sending a SIGTERM"},
            {"query": "[client 218.232.109.223] script not found or unable to stat: /var/www/cgi-bin/awstats.pl",
             "answer": "[client {variables}] script not found or unable to stat: {variables}"},
            {"query": "jk2_init() Can't find child 5671 in scoreboard",
             "answer": "jk2_init() Can't find child {variables} in scoreboard"},
            {"query": "env.createBean2(): Factory error creating channel.jni:jni ( channel.jni, jni)",
             "answer": "env.createBean2(): Factory error creating {variables} ({variables}, {variables})"},
            {"query": "mod_jk child workerEnv in error state 3",
             "answer": "mod_jk child workerEnv in error state {variables}"},
            {"query": "LDAP: Built with OpenLDAP LDAP SDK", "answer": "LDAP: Built with OpenLDAP LDAP SDK"},
            {"query": "mod_jk2 Shutting down", "answer": "mod_jk2 Shutting down"},
            {"query": "[client 210.245.151.81] Attempt to serve directory: /var/www/html/",
             "answer": "[client {variables}] Attempt to serve directory: {variables}"},
            {"query": "[client 61.158.112.131] File does not exist: /var/www/html/sumthin",
             "answer": "[client {variables}] File does not exist: {variables}"},
            {"query": "mod_jk child init 1 -2", "answer": "mod_jk child init {variables} {variables}"},
            {"query": "Digest: done", "answer": "Digest: done"},
            {"query": "Digest: generating secret for digest authentication ...",
             "answer": "Digest: generating secret for digest authentication ..."},
            {"query": "Graceful restart requested, doing restart",
             "answer": "Graceful restart requested, doing restart"},
            {"query": "workerEnv.init() ok /etc/httpd/conf/workers2.properties",
             "answer": "workerEnv.init() ok {variables}"},
            {"query": "[client 213.238.117.47] request failed: error reading the headers",
             "answer": "[client {variables}] request failed: error reading the headers"},
            {"query": "suEXEC mechanism enabled (wrapper: /usr/sbin/suexec)",
             "answer": "suEXEC mechanism enabled (wrapper: {variables})"},

        ]
    question = 'Log message: `{}`'.format(query)
    responses = infer_llm(instruction, examples, question, query,
                          model, temperature, max_tokens=2048)
    return responses

def query_template_from_deepseek(log_message, examples=[], model='deepseek-chat'):
    if len(log_message.split()) == 1:
        return log_message, False
    response = get_response_from_deepseek_key(log_message, examples, model)
    lines = response.split('\n')
    log_template = None
    for line in lines:
        if line.find("Log template:") != -1:
            log_template = line
            break
    if log_template is None:
        for line in lines:
            if line.find("`") != -1:
                log_template = line
                break
    if log_template is not None:
        start_index = log_template.find('`') + 1
        end_index = log_template.rfind('`')

        if start_index == 0 or end_index == -1:
            start_index = log_template.find('"') + 1
            end_index = log_template.rfind('"')

        if start_index != 0 and end_index != -1 and start_index < end_index:
            template = log_template[start_index:end_index]
            return template, True

    print("======================================")
    print("DeepSeek response format error: ")
    print(response)
    print("======================================")
    return log_message, False


def post_process_template(template, regs_common):
    # 调整正则表达式，避免过度替换
    pattern = r'\{(\w+)\}'
    template = re.sub(pattern, "<*>", template)
    for reg in regs_common:
        template = reg.sub("<*>", template)
    template = correct_single_template(template)
    # 检查模板是否过于通用
    static_part = template.replace("<*>", "")
    punc = string.punctuation
    if len(static_part.strip()) > 0 and any(s not in punc and s != ' ' for s in static_part):
        return template, True
    print("Get a too general template. Error.")
    return "", False


def query_template_from_deepseek_with_check(log_message, regs_common=[], examples=[],
                                            # 修改为 deepseek-chat
                                            model="deepseek-chat"):
    template, flag = query_template_from_deepseek(log_message, examples, model='deepseek-chat')
    print(f"DeepSeek response: {template}, Flag: {flag}")  # 添加调试信息
    if len(template) == 0 or flag == False:
        print(f"DeepSeek error")
    else:
        tree = ParsingCache()
        template, flag = post_process_template(template, regs_common)
        print(f"Post-processed template: {template}, Flag: {flag}")  # 添加调试信息
        if flag:
            tree.add_templates(template)
            result = tree.match_event(log_message)
            print(f"Match result: {result}")  # 添加调试信息
            if tree.match_event(log_message)[0] == "NoMatch":
                print("==========================================================")
                print(log_message)
                print("DeepSeek template wrong: cannot match itself! And the wrong template is : ")
                print(template)
                print("==========================================================")
            else:
                return template, True
    return post_process_template(log_message, regs_common)