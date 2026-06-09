with open('admin/css/admin.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('width: 98vw !important;', 'width: 98% !important;')

with open('admin/css/admin.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated 98vw")
