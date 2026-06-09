import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = 0
while True:
    idx = content.find('WZxmw62VLxbQ1PwswqUnpVjV0.webp', idx)
    if idx == -1: break
    start = max(0, idx - 100)
    end = min(len(content), idx + 100)
    print(f'Match at {idx}: {content[start:end]}')
    idx += 1
