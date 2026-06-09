import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

res = re.search(r'data-framer-name="Phone"(.*)', content, re.DOTALL)
print(res.group(1)[:2000])
