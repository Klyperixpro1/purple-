import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('script type="module"')
print(content[idx:idx+200])
