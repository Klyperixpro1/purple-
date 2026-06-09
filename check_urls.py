import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

res = re.findall(r'https://framerusercontent\.com/[^\"]+', content)
print(res[:5])
