import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('class="framer-zua3p9"')
end = content.find('class="framer-zua3p9"', idx+1)
print(re.sub('<[^>]*>', '', content[idx:end]).strip())
