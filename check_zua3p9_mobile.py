import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('class="framer-zua3p9"')
end = content.find('class="framer-zua3p9"', idx+1)
print('VIDEO EDIT' in content[idx:end])
print('Slider 2 inside zua3p9?', content[idx:end].find('class="framer-1klk46i-container"') != -1)
