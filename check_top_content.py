import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('data-framer-name="Top Content"')
end = content.find('data-framer-name="Video Conntent + Tags"')
print(re.sub(r'<svg[^>]*>.*?</svg>', '<SVG/>', content[idx:end], flags=re.DOTALL))
