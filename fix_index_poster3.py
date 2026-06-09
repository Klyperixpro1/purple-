import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# I want to find the exact poster strings and replace them properly.
# The original script might still have the messed up replacement, let's fix it.
content = re.sub(r'poster="\$\{t\?t\.src:a\.replace\(/\\\.\\\(\w+\|\w+\|\w+\|\w+\\\)\$/i, \'.jpg\'\)\}"', 'poster=""', content)

content = re.sub(r'poster="\$\{\_itm\.thumbnail_url \|\| \_url\.replace\(/\\\.\\\(\w+\|\w+\|\w+\|\w+\\\)\$/i, \'.jpg\'\)\}"', 'poster=""', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fix done")
