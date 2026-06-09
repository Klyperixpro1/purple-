import re

with open('assets/sites/1NAAs0Z7yPZ177pXv1DpXH/script_main.BxLwMiCg.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

res = re.findall(r'https?://[^\"]+', content)
print('\n'.join(set(res)))
