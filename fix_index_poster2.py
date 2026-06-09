import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the poster logic for 'a'
old_a_pattern = r'poster="\$\{a\.replace\(/\\\.([^/]+)/i,\s*[\'"].jpg[\'"]\)\}"'
new_a_replacement = r'poster=""'
content, count_a = re.subn(old_a_pattern, new_a_replacement, content)
print(f"Replaced {count_a} occurrences of a.replace poster")

# Replace the poster logic for '_url'
old_url_pattern = r'poster="\$\{\_url\.replace\(/\\\.([^/]+)/i,\s*[\'"].jpg[\'"]\)\}"'
new_url_replacement = r'poster=""'
content, count_url = re.subn(old_url_pattern, new_url_replacement, content)
print(f"Replaced {count_url} occurrences of _url.replace poster")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
