import os
import re

js_path = 'admin/js/admin.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

new_logic = """
        // Populate Metric Cards
        const safeText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
        
        safeText("stat-portfolio-count", stats.portfolio_count || 0);
        safeText("stat-testimonials-active", stats.testimonials ? stats.testimonials.active : 0);
        safeText("stat-testimonials-pending", stats.testimonials ? stats.testimonials.pending : 0);
        safeText("stat-media-count", stats.media ? stats.media.count : 0);
        
        safeText("stat-unique-visitors", stats.views_count || 0);
        safeText("stat-page-views", stats.views_count || 0); // Simplified to total views for now
        
        const sizeMb = stats.media ? (stats.media.total_size_bytes / (1024 * 1024)).toFixed(2) : "0.00";
        safeText("stat-media-size", `${sizeMb} MB used`);
        safeText("stat-storage-used", `${sizeMb} MB`);
        
        const errors = stats.bug_reports ? stats.bug_reports.length : 0;
        safeText("stat-error-count", errors);
        
        // Update bug pill badge
        const openBugsBadge = document.getElementById("badge-open-bugs");
        if (openBugsBadge) {
            openBugsBadge.textContent = errors;
            openBugsBadge.style.display = errors > 0 ? "inline-flex" : "none";
        }
"""

js = re.sub(r'// Populate Metric Cards[\s\S]*?document\.getElementById\("stat-media-size"\)\.textContent = `\$\{sizeMb\} MB used`;', new_logic, js)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated loadOverviewStats!")
