import re
content = open('index.html', 'r', encoding='utf-8').read()
scripts = re.findall(r'<script[^>]*src=\"([^\"]+)\"', content)
print("SCRIPTS:", scripts)
# Check if supabase is mentioned at all
print("SUPABASE FOUND:", 'supabase' in content)
# Check if api/content is mentioned at all
print("API FOUND:", '/api/content' in content)
# Check if fetch is mentioned at all
print("FETCH FOUND:", 'fetch(' in content)
