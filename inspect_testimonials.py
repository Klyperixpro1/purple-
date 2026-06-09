import re

content = open('index.html', encoding='utf-8', errors='ignore').read()

# Look at the phone section structure - find "Client Info" context
pos = 570190
chunk = content[pos:pos+8000]

# Find Client Info 
ci_match = re.search(r'data-framer-name="Client Info"[^>]*>(.*?)(?=data-framer-name="Phone"|</div>\s*</div>\s*</div>\s*</div>)', chunk, re.DOTALL)
if ci_match:
    print('CLIENT INFO context (800 chars):', ci_match.group(0)[:800])

print()
print('--- FULL CHUNK (first 3000) ---')
print(chunk[:3000])
