import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<style>#global-preloader\{.*?</style>', '', content, flags=re.DOTALL)
content = re.sub(r'<div id="global-preloader">.*?</div>', '', content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
