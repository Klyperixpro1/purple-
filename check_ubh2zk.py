import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('class="framer-ubh2zk"')
print(content[max(0, idx-50):idx+300])
