import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

res = re.findall(r'[^\"\']*(?:Nt75YhrpJLiSNH6u3W82t0MZbeQ|xZRuMQcF9lomPKo7ByLFxF4TZRY|YyOHT2hQlePi7qm5rEqt9fcmQ)\.jpg', content)
print('\n'.join(set(res)))
