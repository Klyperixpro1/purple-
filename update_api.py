import re
import os

with open('api/index.py', 'r', encoding='utf-8') as f:
    content = f.read()

route_str = '''
    @app.get("/inject_feedback_button.js")
    def read_js():
        if os.path.isfile("inject_feedback_button.js"):
            return FileResponse("inject_feedback_button.js")
        return {"error": "not found"}
'''

if 'inject_feedback_button.js' not in content:
    content = content.replace('def read_feedback():', route_str + '\n    @app.get("/submit-feedback.html")\n    def read_feedback():')
    with open('api/index.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated api/index.py successfully')
else:
    print('Already has route')
