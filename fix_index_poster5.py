with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# First occurrence
content = content.replace(
    '<video playsinline src="" poster="" loop preload="metadata" style="max-height: 80vh;"></video>',
    '<video playsinline src="" poster="" loop preload="metadata" style="max-height: 80vh;"></video>'
)

# Second and Third occurrence
content = content.replace(
    '<video playsinline src="" poster="" loop preload="metadata" style="max-height:80vh;"></video>',
    '<video playsinline src="" poster="" loop preload="metadata" style="max-height:80vh;"></video>'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Restored poster logic")
