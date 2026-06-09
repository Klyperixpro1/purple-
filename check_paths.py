import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print("src starting with / (not //):", len(re.findall(r'src="/[^/]', content)))
print("href starting with / (not //):", len(re.findall(r'href="/[^/]', content)))
