with open('admin/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('width:min(94vw,820px);', 'width:min(94%,820px);')

with open('admin/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated crop modal width")
