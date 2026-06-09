import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('class="framer-zua3p9"')
print(content[idx:idx+1500])
