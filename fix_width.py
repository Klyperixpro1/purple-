with open('admin/css/admin.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('width: 100vw; height: 100vh;', 'width: 100%; height: 100%;')

with open('admin/css/admin.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated admin.css width")
