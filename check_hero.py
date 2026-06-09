import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('data-framer-name="Hero"')
print(content[max(0, idx):idx+1500])
