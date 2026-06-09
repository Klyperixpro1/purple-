with open('admin/css/admin.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '.form-group textarea {\n    background: var(--input-bg);',
    '.form-group textarea {\n    resize: vertical;\n    background: var(--input-bg);'
)

with open('admin/css/admin.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated textarea resize")
