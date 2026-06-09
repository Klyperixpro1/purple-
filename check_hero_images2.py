import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('data-framer-name="Hero"')
end = content.find('</section>', idx)
hero_html = content[idx:end]
print(re.findall(r'https?://[^\s"\'<>]*\.(?:webp|png|jpg|jpeg)', hero_html))
