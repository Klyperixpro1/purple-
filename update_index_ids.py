import re
with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Add IDs to the h3 elements for OWNER and BRAND
text = text.replace('OWNER<h3 style="margin:8px 0 0;font-size:13px;font-weight:900;color:#120528;word-break:break-word">GARV AGARWAL</h3>',
                    'OWNER<h3 id="verify-owner-name" style="margin:8px 0 0;font-size:13px;font-weight:900;color:#120528;word-break:break-word">GARV AGARWAL</h3>')

text = text.replace('BRAND<h3 style="margin:8px 0 0;font-size:13px;font-weight:900;color:#120528;word-break:break-word">KLYPERIX</h3>',
                    'BRAND<h3 id="verify-brand-name" style="margin:8px 0 0;font-size:13px;font-weight:900;color:#120528;word-break:break-word">KLYPERIX</h3>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated index.html")
