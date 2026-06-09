import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix cache issue for the script
content = content.replace('<script src="./inject_feedback_button.js"></script>', '<script src="./inject_feedback_button.js?v=2"></script>')

# Remove alert icon background and border radius
wrapper_pattern = r'(<div style="overflow:hidden;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;)(box-shadow:0 12px 30px rgba\(123,44,255,\.35\);width:48px;height:48px;background:#7b2cff;border-radius:999px;)(transform:translate\(5px,8px\)">)'
wrapper_replacement = r'\g<1>width:48px;height:48px;background:transparent;border-radius:0;\g<3>'

img_pattern = r'(<img loading="lazy" src="https://framerusercontent.com/images/WZxmw62VLxbQ1PwswqUnpVjV0.webp\?width=416&amp;height=416" alt="" style="width:100%;height:100%;object-fit:cover;)(border-radius:999px;)(display:block">)'
img_replacement = r'\g<1>border-radius:0;\g<3>'

content = re.sub(wrapper_pattern, wrapper_replacement, content)
content = re.sub(img_pattern, img_replacement, content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated index.html successfully')
