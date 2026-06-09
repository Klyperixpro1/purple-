import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('lazy loading count:', content.count('loading="lazy"'))
