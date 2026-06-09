import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

sliders = list(re.finditer(r'<div[^>]*background:#fff[^>]*>', content))
for i in range(len(sliders)):
    start = sliders[i].start()
    end = sliders[i+1].start() if i+1 < len(sliders) else start + 3000
    snippet = content[start:end]
    print(f"Slider {i} length: {len(snippet)}")
    # Find videos inside this slider
    videos = re.findall(r'<video[^>]*>', snippet)
    print(f"Slider {i} videos: {len(videos)}")
    # Find img tags without src
    empty_imgs = re.findall(r'<img loading="lazy" alt="" draggable="false"[^>]*>', snippet)
    print(f"Slider {i} empty imgs: {len(empty_imgs)}")

