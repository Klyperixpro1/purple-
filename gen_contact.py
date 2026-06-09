import sys, re, os

with open(r'c:\Users\garva\Downloads\5 TH JUNE (2) (1)\5 TH JUNE (2)\5 TH JUNE\4 TH JUNE\klyperix\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Replace routeId
contact = c.replace('routeId":"augiA20Il"', 'routeId":"ZnAG3HaGV"')

# 2. Replace relative asset paths ./  with  ../
contact = contact.replace('href="./', 'href="../')
contact = contact.replace('src="./', 'src="../')
contact = contact.replace('url("./', 'url("../')
contact = contact.replace("url('./", "url('../")

# 3. Remove current page marker from nav
contact = contact.replace(' data-framer-page-link-current="true"', '')

# 4. Update title
contact = contact.replace(
    '<title>KLYPERIX PRODUTION - Video Editor &amp; Video Editing Agency Template</title>',
    '<title>Contact \u2014 KLYPERIX PRODUCTION</title>'
)

print('routeId replaced:', 'ZnAG3HaGV' in contact)
print('src paths updated:', 'src="../' in contact)
print('File length:', len(contact))

os.makedirs(r'c:\Users\garva\Downloads\5 TH JUNE (2) (1)\5 TH JUNE (2)\5 TH JUNE\4 TH JUNE\klyperix\contact-page', exist_ok=True)
with open(r'c:\Users\garva\Downloads\5 TH JUNE (2) (1)\5 TH JUNE (2)\5 TH JUNE\4 TH JUNE\klyperix\contact-page\index.html', 'w', encoding='utf-8') as f:
    f.write(contact)
print('contact-page/index.html written successfully')
