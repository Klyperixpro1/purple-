import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('data-framer-name="Hero"')
end = content.find('</section>', idx)
hero_html = content[idx:end]
v = re.search(r'<video[^>]*>', hero_html)
print(hero_html[max(0, v.start()-200):v.end()+200])
