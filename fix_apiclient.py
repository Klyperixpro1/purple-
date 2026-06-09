import os

js_path = 'public/api_client.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Optimize Cloudinary Videos for fast loading
js = js.replace("""        if (url.match(/\\.(mp4|webm|mov|avi)$/i)) return url; // Do not apply on-the-fly transformations to videos!""",
"""        if (url.match(/\\.(mp4|webm|mov|avi)$/i)) {
            // Compress videos to reduce load time drastically!
            if (url.includes('/upload/q_')) return url;
            return url.replace('/upload/', '/upload/q_auto,vc_auto,f_auto/');
        }""")

# 2. Hide SVG icons to remove 3rd party icons
js = js.replace("""    function hideInactiveKlyperixMedia(card, activeEl) {
        card.querySelectorAll('img, video').forEach(el => {
            if (el !== activeEl) el.style.display = 'none';
        });
    }""",
"""    function hideInactiveKlyperixMedia(card, activeEl) {
        card.querySelectorAll('img, video, svg, div[style*="background-image"]').forEach(el => {
            if (el !== activeEl) el.style.display = 'none';
        });
    }""")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated api_client.js for video optimization and icon removal.")
