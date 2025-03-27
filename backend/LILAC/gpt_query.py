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
    instruction = "I want you to act like an expert of log parsing. I will give you a log message delimited by backticks. You must identify and abstract all the dynamic variables in logs with {placeholder} and output a static log template. Print the input log's template delimited by backticks."
    if examples is None or len(examples) == 0:
        examples = [{'query': 'Log message: `try to connected to host: 172.16.254.1, finished.`',
                     'answer': 'Log template: `try to connected to host: {ip_address}, finished.`'}]
    question = 'Log message: `{}`'.format(query)
    responses = infer_llm(instruction, examples, question, query,
                          model, temperature, max_tokens=2048)
    return responses

def query_template_from_deepseek(log_message, examples=[], model='deepseek-reasoner'):
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
    pattern = r'\{(\w+)\}'
    template = re.sub(pattern, "<*>", template)
    for reg in regs_common:
        template = reg.sub("<*>", template)
    template = correct_single_template(template)
    static_part = template.replace("<*>", "")
    punc = string.punctuation
    static_chars = [s for s in static_part if s != ' ' and s not in punc]
    if len(static_chars) > 5:  # 示例阈值
        return template, True
    print("Get a too general template. Error.")
    return "", False


def query_template_from_deepseek_with_check(log_message, regs_common=[], examples=[],
                                            # 修改为 deepseek-chat
                                            model="deepseek-chat"):
    template, flag = query_template_from_deepseek(log_message, examples, model)
    if len(template) == 0 or flag == False:
        print(f"DeepSeek error")
    else:
        tree = ParsingCache()
        template, flag = post_process_template(template, regs_common)
        if flag:
            tree.add_templates(template)
            if tree.match_event(log_message)[0] == "NoMatch":
                print("==========================================================")
                print(log_message)
                print("DeepSeek template wrong: cannot match itself! And the wrong template is : ")
                print(template)
                print("==========================================================")
            else:
                return template, True
    return post_process_template(log_message, regs_common)