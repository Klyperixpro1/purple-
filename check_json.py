import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

scripts = re.findall(r'<script.*?>.*?</script>', content, re.DOTALL)
for s in scripts:
    if 'WZxmw62VLxbQ1PwswqUnpVjV0' in s:
        print("Found in script!")
        print(s[:200])
