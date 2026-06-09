import re

with open('admin/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Change the static "Console Panel" to an ID so we can update it
html = html.replace('<h2>Console Panel</h2>', '<h2 id="dynamic-header-title">Overview</h2>')

with open('admin/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('admin/js/admin.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Update switchTab logic to dynamically set the header
new_switchTab = """window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(el => el.classList.remove('active'));

    const tab = document.getElementById('tab-' + tabId);
    if(tab) tab.classList.add('active');
    
    const link = document.querySelector(`.sidebar-nav .nav-link[data-tab="${tabId}"]`);
    if(link) {
        link.classList.add('active');
        const titleSpan = link.querySelector('span');
        const h2 = document.getElementById('dynamic-header-title');
        if(titleSpan && h2) h2.textContent = titleSpan.textContent;
    }

    if (tabId === 'portfolio') loadPortfolio();
    if (tabId === 'testimonials') loadTestimonials();
    if (tabId === 'overview') loadOverviewStats();
    if (tabId === 'contacts') loadContacts();
    if (tabId === 'bugs') loadBugs();
    if (tabId === 'faqs') loadFaqs();
};"""

js = re.sub(r'window\.switchTab = function[\s\S]*?loadOverviewStats\(\);\s*\}', new_switchTab, js)

with open('admin/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated header cleanup UI/UX")
