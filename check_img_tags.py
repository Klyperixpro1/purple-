import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

res = re.search(r'<img loading="lazy" alt="" draggable="false" [^>]*>', content)
print(res.group(0) if res else "Not found")
