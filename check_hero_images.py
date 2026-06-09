import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('data-framer-name="Hero"')
end = content.find('</section>', idx)
imgs = re.findall(r'<img', content[idx:end])
print('Found images in Hero:', len(imgs))
