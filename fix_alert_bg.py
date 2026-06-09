html_path = r'c:\Users\ashis\Downloads\5 TH JUNE (2)\5 TH JUNE\4 TH JUNE\klyperix\index.html'
content = open(html_path, 'r', encoding='utf-8').read()

# Find and replace the container div styles - there are variations
# Pattern 1: translate(5px,8px) version
old1 = 'overflow:hidden;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 12px 30px rgba(123,44,255,.35);width:48px;height:48px;background:#7b2cff;border-radius:999px;transform:translate(5px,8px)'
new1 = 'overflow:visible;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:none;width:48px;height:48px;background:transparent;border-radius:0;transform:translate(5px,8px)'
c1 = content.count(old1)
content = content.replace(old1, new1)

# Pattern 2: translate(-2px,2px) version
old2 = 'overflow:hidden;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 12px 30px rgba(123,44,255,.35);width:48px;height:48px;background:#7b2cff;border-radius:999px;transform:translate(-2px,2px)'
new2 = 'overflow:visible;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:none;width:48px;height:48px;background:transparent;border-radius:0;transform:translate(-2px,2px)'
c2 = content.count(old2)
content = content.replace(old2, new2)

# Remove border-radius from the img inside
old_img = 'width:100%;height:100%;object-fit:cover;border-radius:999px;display:block'
new_img = 'width:100%;height:100%;object-fit:contain;border-radius:0;display:block'
c3 = content.count(old_img)
content = content.replace(old_img, new_img)

# Also fix the JS so it doesn't re-apply anything weird
old_js = 'e.style.setProperty("background","#7b2cff","important")'
new_js_var = 'e.style.setProperty("background","transparent","important"),e.style.setProperty("border-radius","0","important"),e.style.setProperty("box-shadow","none","important"),e.style.setProperty("overflow","visible","important")'
c4 = content.count(old_js)
content = content.replace(old_js, new_js_var)

print(f'Container style 1: {c1} fixed')
print(f'Container style 2: {c2} fixed')
print(f'Image style: {c3} fixed')
print(f'JS override: {c4} fixed')

open(html_path, 'w', encoding='utf-8').write(content)
print('Done!')
