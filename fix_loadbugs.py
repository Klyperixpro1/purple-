import re

js_path = 'admin/js/admin.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

old_loadBugs = re.search(r'async function loadBugs\(\) \{[\s\S]*?\}\n\nasync function loadFaqs', js).group(0)

new_loadBugs = """window.allBugReports = [];
window.currentBugFilter = 'all';

document.querySelectorAll('#bug-filters .pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('#bug-filters .pill-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        window.currentBugFilter = e.target.dataset.filter;
        renderBugs();
    });
});

async function loadBugs() {
    const tbody = document.getElementById("bugs-table-body");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="loading-state">Loading bug reports...</td></tr>`;
    
    try {
        const res = await fetchFromApi('/analytics');
        if (!res || !res.bug_reports || res.bug_reports.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;opacity:0.5;">No bug reports found.</td></tr>`;
            return;
        }
        window.allBugReports = res.bug_reports;
        renderBugs();
        
        const badge = document.getElementById('badge-open-bugs');
        if (badge) {
            badge.textContent = res.bug_reports.length;
            badge.style.display = res.bug_reports.length > 0 ? 'inline-flex' : 'none';
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="error-state">Failed to load bugs: ${err.message}</td></tr>`;
    }
}

function renderBugs() {
    const tbody = document.getElementById("bugs-table-body");
    if (!tbody) return;
    
    let filtered = window.allBugReports;
    if (window.currentBugFilter !== 'all') {
        filtered = filtered.filter(item => {
            const type = (item.metadata ? item.metadata.type : '').toLowerCase();
            const msg = (item.metadata ? item.metadata.message : '').toLowerCase();
            let sev = 'info';
            if (type.includes('unhandledrejection') || msg.includes('crash') || msg.includes('fatal')) sev = 'critical';
            else if (type.includes('error') || msg.includes('fail')) sev = 'warning';
            return sev === window.currentBugFilter;
        });
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;opacity:0.5;">No ${window.currentBugFilter} bug reports.</td></tr>`;
        return;
    }
    
    let html = '';
    filtered.forEach(item => {
        const date = new Date(item.created_at).toLocaleString();
        const type = item.metadata ? item.metadata.type : 'Unknown Error';
        const msg = item.metadata ? item.metadata.message : 'N/A';
        const userAgent = item.metadata ? item.metadata.userAgent : 'Unknown Device';
        
        let sev = 'info';
        let color = '#3b82f6';
        let text = 'INFO';
        const typeLower = type.toLowerCase();
        const msgLower = msg.toLowerCase();
        if (typeLower.includes('unhandledrejection') || msgLower.includes('crash') || msgLower.includes('fatal')) {
            sev = 'critical'; color = '#ef4444'; text = 'CRITICAL';
        } else if (typeLower.includes('error') || msgLower.includes('fail')) {
            sev = 'warning'; color = '#f59e0b'; text = 'WARNING';
        }
        
        html += `<tr>
            <td>
                <div style="font-weight:600;margin-bottom:4px;">${type}</div>
                <span class="pill-badge" style="background:${color};color:#fff;font-size:10px;padding:2px 6px;">${text}</span>
            </td>
            <td>${item.page_path || '/'}</td>
            <td style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${userAgent}">${userAgent}</td>
            <td>${date}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${msg}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

async function loadFaqs"""

js = js.replace(old_loadBugs, new_loadBugs)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated loadBugs in admin.js")
