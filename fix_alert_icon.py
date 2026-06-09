with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('style="width:100%;height:100%;object-fit:contain;border-radius:0;display:block"', 'style="width:auto;height:100%;object-fit:contain;border-radius:0;display:block"')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
