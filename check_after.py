import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.rfind('class="framer-1klk46i-container"')
end_idx = content.find('</section>', idx)
print(content[end_idx:end_idx+1000])
