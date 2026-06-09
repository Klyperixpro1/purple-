import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx_hero = content.find('data-framer-name="Hero"')
idx_zua = content.find('class="framer-zua3p9"')
print('Distance:', idx_zua - idx_hero)
