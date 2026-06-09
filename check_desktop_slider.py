import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('Hidden Desktop Slider:', content.find('class="framer-143l9i6-container"'))
