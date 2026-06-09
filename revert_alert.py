import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" style="width:100%;height:100%;display:block;transform:scale(1.2)">
  <path d="M12 2C11.5 2 11 2.2 10.7 2.7L1.2 19.2C0.9 19.7 0.9 20.3 1.2 20.8C1.5 21.3 2 21.6 2.5 21.6H21.5C22 21.6 22.5 21.3 22.8 20.8C23.1 20.3 23.1 19.7 22.8 19.2L13.3 2.7C13 2.2 12.5 2 12 2Z" fill="#FACC15"/>
  <path d="M12 7.2C12.6 7.2 13.1 7.7 13.1 8.3V13.8C13.1 14.4 12.6 14.9 12 14.9C11.4 14.9 10.9 14.4 10.9 13.8V8.3C10.9 7.7 11.4 7.2 12 7.2ZM12 18.2C12.8 18.2 13.4 17.6 13.4 16.8C13.4 16 12.8 15.4 12 15.4C11.2 15.4 10.6 16 10.6 16.8C10.6 17.6 11.2 18.2 12 18.2Z" fill="#111827"/>
</svg>'''

new_png_img = '<img loading="lazy" src="./assets/images/WZxmw62VLxbQ1PwswqUnpVjV0_transparent.png" alt="Alert" style="width:100%;height:100%;object-fit:contain;border-radius:0;display:block">'

if new_svg in content:
    content = content.replace(new_svg, new_png_img)
    open('index.html', 'w', encoding='utf-8').write(content)
    print("Reverted SVGs back to PNG!")
else:
    print("SVGs not found!")
