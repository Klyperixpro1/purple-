import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('data-framer-name="Hero"')
end = content.find('framer-1klk46i-container')
print(content[idx:end].count('rotateZ('))
