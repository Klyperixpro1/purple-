import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

res = re.findall(r'id="projects".*?data-framer-name="Phone"', content, re.DOTALL)
print(len(res))
