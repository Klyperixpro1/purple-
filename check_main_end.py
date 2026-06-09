import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('id="main"')
end = content.rfind('</div>', 0, content.find('</body>'))
print(content[end-50:end+50])
