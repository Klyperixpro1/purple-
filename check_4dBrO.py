import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('class="framer-4dBrO')
print(content[max(0, idx-200):idx+50])
