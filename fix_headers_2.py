import re

with open('admin/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# The user wanted to remove repetitive headers. Let's hide the pane-headers since we now have the dynamic top header.
html = html.replace('<div class="pane-header">', '<div class="pane-header" style="display:none;">')
html = html.replace('<div class="pane-header flex-header">', '<div class="pane-header flex-header" style="display:none;">')

# But wait, some pane headers have buttons in them! (Like Add Testimonial, Add Content Item, etc).
# For those, we shouldn't hide the whole header, just the text.
html = html.replace('<div class="pane-header" style="display:none;">', '<div class="pane-header">')
html = html.replace('<div class="pane-header flex-header" style="display:none;">', '<div class="pane-header flex-header">')

# So instead, let's just hide the <h1> and <p> inside pane-header.
html = re.sub(r'<div class="pane-header[^>]*>\s*<h1>(.*?)</h1>\s*<p>(.*?)</p>', r'<div class="pane-header" style="padding-bottom: 0;">', html)
html = re.sub(r'<div class="pane-header[^>]*>\s*<div>\s*<h1>(.*?)</h1>\s*<p>(.*?)</p>\s*</div>', r'<div class="pane-header flex-header" style="padding-bottom: 0;"><div></div>', html)


with open('admin/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Removed repetitive text headers.")
