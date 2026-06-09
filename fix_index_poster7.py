with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<video playsinline src="" poster="" loop preload="metadata" style="max-height: 80vh;"></video>',
    '<video playsinline src="${a}" poster="${t?t.src:a.replace(/\.(mp4|webm|mov|avi)$/i, \'.jpg\')}" loop preload="metadata" style="max-height: 80vh;"></video>'
)

content = content.replace(
    '<video playsinline src="" poster="" loop preload="metadata" style="max-height:80vh;"></video>',
    '<video playsinline src="${_url}" poster="${_itm.thumbnail_url || _url.replace(/\.(mp4|webm|mov|avi)$/i,\'.jpg\')}" loop preload="metadata" style="max-height:80vh;"></video>'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
