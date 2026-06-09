import os

file_path = 'admin/index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will find "<!-- Reviews List -->" and insert the missing stuff there up to "<div class=\"settings-card\">"
start_str = "<!-- Reviews List -->"
end_str = '<div class="settings-card">'

if start_str in content and end_str in content:
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    
    new_html = """<!-- Reviews List -->
                    <div class="testimonials-container" id="testimonials-list">
                        <div class="loading-state">Retrieving testimonials...</div>
                    </div>
                </div>

                <!-- 4. CONTACT SUBMISSIONS TAB -->
                <div id="tab-contacts" class="tab-pane">
                    <div class="pane-header">
                        <h1>Contact Forms & Inbox</h1>
                        <p>Read and reply to user inquiries submitted via the website</p>
                    </div>
                    <div class="table-container">
                        <table class="users-table">
                            <thead>
                                <tr>
                                    <th>Sender Name</th>
                                    <th>Email</th>
                                    <th>Message Preview</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th style="text-align: right;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="contacts-table-body">
                                <tr><td colspan="6" class="loading-state">Loading messages...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- FAQ MANAGER TAB -->
                <div id="tab-faqs" class="tab-pane">
                    <div class="pane-header flex-header">
                        <div>
                            <h1>FAQ / GodQuestion Section</h1>
                            <p>Manage frequently asked questions on the main site</p>
                        </div>
                        <button class="btn btn-primary" id="open-add-faq-btn">
                            <svg class="btn-icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            <span>Add Question</span>
                        </button>
                    </div>
                    <div class="portfolio-grid" id="faqs-list" style="display: flex; flex-direction: column; gap: 10px;">
                        <div class="loading-state">Loading FAQs...</div>
                    </div>
                </div>

                <!-- BUG REPORTS TAB -->
                <div id="tab-bugs" class="tab-pane">
                    <div class="pane-header">
                        <h1>Bug & Glitch Reports</h1>
                        <p>Automatic telemetry for client-side crashes and lag</p>
                    </div>
                    <div class="table-container">
                        <table class="users-table">
                            <thead>
                                <tr>
                                    <th>Error Type</th>
                                    <th>Page Path</th>
                                    <th>Device / Browser</th>
                                    <th>Date</th>
                                    <th style="text-align: right;">Message</th>
                                </tr>
                            </thead>
                            <tbody id="bugs-table-body">
                                <tr><td colspan="5" class="loading-state">Loading error logs...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 5. SITE SETTINGS MANAGER TAB -->
                <div id="tab-settings" class="tab-pane">
                    <div class="pane-header">
                        <h1>General Configurations</h1>
                        <p>Manage WhatsApp link, site headings, contact points, and details</p>
                    </div>

                    <div class="settings-card">"""

    modified_content = content[:start_idx] + new_html + content[end_idx + len(end_str):]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    print("Fixed!")
else:
    print("Could not find delimiters.")
