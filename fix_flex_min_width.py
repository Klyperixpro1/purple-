with open('admin/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'style="flex:1; padding:12px; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:8px; align-items:center; justify-content:center;"',
    'style="flex:1; min-width:0; padding:12px; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:8px; align-items:center; justify-content:center;"'
)

content = content.replace(
    'style="flex:1; padding:12px; display:flex; flex-direction:column; gap:8px; align-items:center; justify-content:center;"',
    'style="flex:1; min-width:0; padding:12px; display:flex; flex-direction:column; gap:8px; align-items:center; justify-content:center;"'
)

with open('admin/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added min-width:0 to flex items")
