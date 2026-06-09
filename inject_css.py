import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

style = """<style>
/* Fix alert icon background overridden by React */
div:has(> img[src*="WZxmw6"]) {
    background: transparent !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
}
img[src*="WZxmw6"] {
    border-radius: 0 !important;
    object-fit: contain !important;
}
</style>
"""

if "Fix alert icon background overridden by React" not in content:
    content = content.replace('<body>', '<body>\n' + style)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected CSS!")
else:
    print("CSS already injected.")
