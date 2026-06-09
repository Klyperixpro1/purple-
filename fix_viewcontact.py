import re

js_path = 'admin/js/admin.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Update the viewContact call in loadContacts
# from: onclick="viewContact('${item.id}', \`${item.title}\`, \`${email}\`, \`${msg.replace(/"/g, '&quot;')}\`, '${item.status}')"
# to: onclick="viewContact('${item.id}', \`${item.title}\`, \`${email}\`, \`${msg.replace(/"/g, '&quot;')}\`, '${item.status}', \`${item.metadata ? (item.metadata.userAgent || 'Unknown') : 'Unknown'}\`, \`${date}\`)"
js = re.sub(
    r'onclick="viewContact\(\'\$\{item.id\}\', `\$\{item.title\}`(.*?)>View & Reply</button>',
    r'onclick="viewContact(\'${item.id}\', \\`${item.title}\\`, \\`${email}\\`, \\`${msg.replace(/"/g, \'&quot;\')}\\`, \'${item.status}\', \\`${item.metadata ? (item.metadata.userAgent || \'Unknown\') : \'Unknown\'}\\`, \\`${date}\\`)">View & Reply</button>',
    js
)

# Update the window.viewContact function definition
old_func = """window.viewContact = function(id, name, email, msg, status) {
    document.getElementById('contact-reply-modal').style.display = 'flex';
    document.getElementById('contact-original-message').innerHTML = `<strong>From:</strong> ${name} &lt;${email}&gt;<br><br>${msg}`;"""

new_func = """window.viewContact = function(id, name, email, msg, status, device, date) {
    document.getElementById('contact-reply-modal').style.display = 'flex';
    document.getElementById('contact-meta-info').innerHTML = `<strong>Submitted:</strong> ${date} | <strong>Device:</strong> ${device}`;
    document.getElementById('contact-original-message').innerHTML = `<strong>From:</strong> ${name} &lt;${email}&gt;<br><br>${msg}`;"""

js = js.replace(old_func, new_func)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated viewContact in admin.js")
