import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<video playsinline src="\$\{a\}" poster=""', r'<video playsinline src="" poster=""', content)
content = re.sub(r'<video playsinline src="\$\{\_url\}" poster=""', r'<video playsinline src="" poster=""', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace done")
