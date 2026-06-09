import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('class="framer-0G5an')
print(content[max(0, idx-100):idx+500])
