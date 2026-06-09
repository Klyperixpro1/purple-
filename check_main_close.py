import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.rfind('</div>', 0, content.find('</body>'))
print(content[max(0, idx-100):idx+50])
