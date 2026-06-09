import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('e.style.setProperty("background","transparent","important")')
if idx != -1:
    start = max(0, idx - 100)
    end = min(len(content), idx + 200)
    print(content[start:end])
else:
    print("Not found in index.html")
