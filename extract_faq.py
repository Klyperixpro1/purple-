import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find anything that looks like a Question and Answer.
# In Framer, they might be in headers or bold text.
# The user mentioned "GodQuestion". Let's search for that literal string.
idx = content.find("GodQuestion")
if idx == -1:
    idx = content.lower().find("faq")

print("Found index:", idx)
if idx != -1:
    print("Context around found index:")
    print(content[max(0, idx-500):min(len(content), idx+2000)])
