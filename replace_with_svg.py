import re

html_path = r'c:\Users\ashis\Downloads\5 TH JUNE (2)\5 TH JUNE\4 TH JUNE\klyperix\index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# This is the exact HTML currently representing the image
old_img = '<img loading="lazy" src="./assets/images/WZxmw62VLxbQ1PwswqUnpVjV0.webp?v=3" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:0;display:block">'

# The SVG warning icon to replace it
svg_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#12002f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: #ffcc00; display:block; width:100%; height:100%;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'

count = content.count(old_img)
content = content.replace(old_img, svg_icon)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Replaced {count} instances of the image with SVG.')
