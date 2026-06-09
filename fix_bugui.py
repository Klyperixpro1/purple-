import re

with open('admin/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """                <!-- BUG REPORTS TAB -->
                <div id="tab-bugs" class="tab-pane">
                    <div class="pane-header">
                        <h1>Bug & Glitch Reports</h1>
                        <p>Automatic telemetry for client-side crashes and lag</p>
                    </div>
                    <div class="toolbar-row" style="margin-bottom: 20px;">
                        <div class="filter-pills" id="bug-filters">
                            <button class="pill-btn active" data-filter="all">All</button>
                            <button class="pill-btn" data-filter="critical">Critical</button>
                            <button class="pill-btn" data-filter="warning">Warning</button>
                            <button class="pill-btn" data-filter="info">Info</button>
                        </div>
                    </div>
                    <div class="table-container">"""

content = re.sub(r'<!-- BUG REPORTS TAB -->\s*<div id="tab-bugs" class="tab-pane">\s*<div class="pane-header">\s*<h1>Bug & Glitch Reports</h1>\s*<p>Automatic telemetry for client-side crashes and lag</p>\s*</div>\s*<div class="table-container">', replacement, content)

with open('admin/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated bugs tab in index.html")
