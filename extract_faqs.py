import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

q_matches = re.findall(r'data-framer-name="Question"[^>]*>.*?<p[^>]*>(.*?)</p>', content)
a_matches = re.findall(r'data-framer-name="Answer"[^>]*>.*?<p[^>]*>(.*?)</p>', content)

print('Q:', q_matches)
print('A:', a_matches)
