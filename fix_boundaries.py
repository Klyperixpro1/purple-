with open('admin/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('style="flex: 1;"', 'style="flex: 1; min-width: 0;"')
content = content.replace('style="flex:1;"', 'style="flex: 1; min-width: 0;"')

with open('admin/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html")

with open('admin/css/admin.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

css_content = css_content.replace('.input-with-button input {\n    flex: 1;\n}', '.input-with-button input {\n    flex: 1;\n    min-width: 0;\n}')

with open('admin/css/admin.css', 'w', encoding='utf-8') as f:
    f.write(css_content)
print("Updated admin.css")
