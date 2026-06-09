import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: modal open logic
# Find: poster=""
# We have 	=r.querySelector(".custom-overlay-img") so 	 is available. We can do 	 ? t.src : a.replace(...)
content = content.replace(
    'poster=""',
    'poster=""'
)

# Fix 2: arrow navigation logic
# Find: poster=""
# We have _itm available which is the object.
content = content.replace(
    'poster=""',
    'poster=""'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced successfully")
