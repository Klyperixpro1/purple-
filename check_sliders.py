import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

res = re.findall(r'<div[^>]*background:#fff[^>]*>.*?pointer-events:none;white-space:nowrap\">(.*?)</div>', content)
print(res)
