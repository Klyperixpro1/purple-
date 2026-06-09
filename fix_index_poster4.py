with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find exactly what's there
import re
match_a = re.search(r'poster="[^"]+"', content)
if match_a:
    print("Found poster:", match_a.group(0))

for m in re.finditer(r'poster="[^"]+"', content):
    print("ALL:", m.group(0))

