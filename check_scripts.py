import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

res = re.findall(r'<script[^>]*src="[^"]+"[^>]*>', content)
print('\n'.join(res))
