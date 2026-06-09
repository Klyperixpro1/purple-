import sys
with open(r'c:\Users\garva\Downloads\5 TH JUNE (2) (1)\5 TH JUNE (2)\5 TH JUNE\4 TH JUNE\klyperix\contact-page\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

print('File size:', len(c))
print('routeId ZnAG3HaGV present:', 'ZnAG3HaGV' in c)
print('Old routeId augiA20Il absent:', 'augiA20Il' not in c)

src_dotdot = 'src="../'
href_dotdot = 'href="../'
print('src=../ paths present:', src_dotdot in c)
print('href=../ paths present:', href_dotdot in c)

hydrate_idx = c.find('data-framer-hydrate-v2')
sys.stdout.buffer.write(c[hydrate_idx:hydrate_idx+300].encode('utf-8'))
print()

script_idx = c.find('script_main')
sys.stdout.buffer.write(c[max(0,script_idx-50):script_idx+120].encode('utf-8'))
print()

# Check inject_feedback_button path
ib_idx = c.find('inject_feedback_button')
sys.stdout.buffer.write(c[max(0,ib_idx-30):ib_idx+80].encode('utf-8'))
print()

# Check api_client path
api_idx = c.find('api_client')
sys.stdout.buffer.write(c[max(0,api_idx-30):api_idx+60].encode('utf-8'))
print()
