import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'(src="\./assets/assets/(?:YyOHT2hQlePi7qm5rEqt9fcmQ|xZRuMQcF9lomPKo7ByLFxF4TZRY|Nt75YhrpJLiSNH6u3W82t0MZbeQ)\.mp4"[^>]*?)preload="none"', r'\1preload="auto"', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
