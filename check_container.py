import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('_transparent.png')
start = max(0, idx - 300)
end = min(len(content), idx + 100)
print(content[start:end])
