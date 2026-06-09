import os

js_path = 'admin/js/admin.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# We will inject the new switchTab logic
js = js.replace('if (tab === "overview") loadOverviewStats();', 'if (tab === "overview") loadOverviewStats();\n        else if (tab === "contacts") loadContacts();\n        else if (tab === "faqs") loadFaqs();\n        else if (tab === "bugs") loadBugs();')

# We will append the new functions at the bottom
new_functions = """
// =============================================================================
// NEW: CONTACTS, BUGS, FAQS
// =============================================================================

async function loadContacts() {
    const tbody = document.getElementById("contacts-table-body");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" class="loading-state">Loading messages...</td></tr>`;
    
    try {
        const res = await fetchFromApi('/content?category=contact_submission');
        if (!res || res.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;opacity:0.5;">No contact submissions found.</td></tr>`;
            return;
        }
        
        let html = '';
        res.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString();
            const email = (item.metadata && item.metadata.email) || 'N/A';
            const msg = item.description || '';
            const statusColor = item.status === 'active' ? '#22c55e' : '#f59e0b';
            const statusText = item.status === 'active' ? 'Contacted' : 'Pending';
            
            html += `<tr>
                <td>${item.title || 'Unknown'}</td>
                <td>${email}</td>
                <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${msg}</td>
                <td>${date}</td>
                <td><span class="pill-badge" style="background:${statusColor};color:#fff;">${statusText}</span></td>
                <td style="text-align:right;">
                    <button class="btn btn-outline" style="padding:4px 8px;font-size:12px;" onclick="viewContact('${item.id}', \`${item.title}\`, \`${email}\`, \`${msg.replace(/"/g, '&quot;')}\`, '${item.status}')">View & Reply</button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
        
        const pendingCount = res.filter(i => i.status === 'pending').length;
        const badge = document.getElementById('badge-new-contacts');
        if (badge) {
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
            if (pendingCount > 0) badge.classList.add('pill-badge--red');
            else badge.classList.remove('pill-badge--red');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="error-state">Failed to load contacts: ${err.message}</td></tr>`;
    }
}

window.viewContact = function(id, name, email, msg, status) {
    document.getElementById('contact-reply-modal').style.display = 'flex';
    document.getElementById('contact-original-message').innerHTML = `<strong>From:</strong> ${name} &lt;${email}&gt;<br><br>${msg}`;
    
    document.getElementById('send-contact-reply-btn').onclick = async function() {
        const reply = document.getElementById('contact-reply-text').value;
        const btn = document.getElementById('send-contact-reply-btn');
        const errEl = document.getElementById('contact-reply-error');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        errEl.style.display = 'none';
        
        try {
            // Usually you'd have an API to send email, but we'll just mark it as contacted for now
            // and optionally you can implement mail sending in backend.
            await fetchFromApi(`/content/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "active", metadata: { email: email, reply: reply } })
            });
            document.getElementById('contact-reply-modal').style.display = 'none';
            document.getElementById('contact-reply-text').value = '';
            loadContacts();
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Reply & Mark Contacted';
        }
    };
};

document.getElementById('close-contact-reply-modal')?.addEventListener('click', () => document.getElementById('contact-reply-modal').style.display = 'none');
document.getElementById('cancel-contact-reply-btn')?.addEventListener('click', () => document.getElementById('contact-reply-modal').style.display = 'none');

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
        
        let html = '';
        res.bug_reports.forEach(item => {
            const date = new Date(item.created_at).toLocaleString();
            const type = item.metadata ? item.metadata.type : 'Unknown Error';
            const msg = item.metadata ? item.metadata.message : 'N/A';
            const userAgent = item.metadata ? item.metadata.userAgent : 'Unknown Device';
            
            html += `<tr>
                <td style="color:#ef4444;font-weight:600;">${type}</td>
                <td>${item.page_path || '/'}</td>
                <td style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${userAgent}">${userAgent}</td>
                <td>${date}</td>
                <td style="text-align:right;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${msg}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
        
        const badge = document.getElementById('badge-open-bugs');
        if (badge) {
            badge.textContent = res.bug_reports.length;
            badge.style.display = res.bug_reports.length > 0 ? 'inline-flex' : 'none';
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="error-state">Failed to load bugs: ${err.message}</td></tr>`;
    }
}

async function loadFaqs() {
    const list = document.getElementById("faqs-list");
    if (!list) return;
    list.innerHTML = `<div class="loading-state">Loading FAQs...</div>`;
    
    try {
        const res = await fetchFromApi('/settings');
        const faqSetting = res.find(s => s.key_name === 'faq_data');
        const faqs = faqSetting && faqSetting.value ? faqSetting.value : [];
        
        if (faqs.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:20px;opacity:0.5;">No FAQs configured.</div>`;
            return;
        }
        
        let html = '';
        faqs.forEach((faq, idx) => {
            html += `
            <div class="portfolio-card" style="padding:15px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px;">
                <div style="font-weight:600;font-size:15px;margin-bottom:6px;">Q: ${faq.question}</div>
                <div style="font-size:13px;opacity:0.8;margin-bottom:12px;">A: ${faq.answer}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:11px;opacity:0.5;">Order: ${faq.order || 0} | Status: ${faq.status || 'published'}</span>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline" style="padding:4px 8px;font-size:12px;" onclick="editFaq(${idx})">Edit</button>
                        <button class="btn btn-outline" style="padding:4px 8px;font-size:12px;color:#ef4444;" onclick="deleteFaq(${idx})">Delete</button>
                    </div>
                </div>
            </div>`;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = `<div class="error-state">Failed to load FAQs: ${err.message}</div>`;
    }
}

document.getElementById('open-add-faq-btn')?.addEventListener('click', () => {
    document.getElementById('faq-item-id').value = '';
    document.getElementById('faq-question').value = '';
    document.getElementById('faq-answer').value = '';
    document.getElementById('faq-order').value = '0';
    document.getElementById('faq-status').value = 'published';
    document.getElementById('faq-modal-title').textContent = 'Add Question';
    document.getElementById('faq-modal').style.display = 'flex';
});

document.getElementById('close-faq-modal')?.addEventListener('click', () => document.getElementById('faq-modal').style.display = 'none');
document.getElementById('cancel-faq-btn')?.addEventListener('click', () => document.getElementById('faq-modal').style.display = 'none');

document.getElementById('save-faq-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-faq-btn');
    const errEl = document.getElementById('faq-error');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    errEl.style.display = 'none';
    
    try {
        const res = await fetchFromApi('/settings');
        let faqSetting = res.find(s => s.key_name === 'faq_data');
        let faqs = faqSetting && faqSetting.value ? faqSetting.value : [];
        
        const q = document.getElementById('faq-question').value;
        const a = document.getElementById('faq-answer').value;
        const o = document.getElementById('faq-order').value;
        const s = document.getElementById('faq-status').value;
        const idx = document.getElementById('faq-item-id').value;
        
        if (!q || !a) throw new Error("Question and answer are required.");
        
        if (idx !== '') {
            faqs[parseInt(idx)] = { question: q, answer: a, order: parseInt(o), status: s };
        } else {
            faqs.push({ question: q, answer: a, order: parseInt(o), status: s });
        }
        
        faqs.sort((x, y) => (x.order || 0) - (y.order || 0));
        
        await fetchFromApi('/settings', {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key_name: "faq_data", value: faqs })
        });
        
        document.getElementById('faq-modal').style.display = 'none';
        loadFaqs();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Question';
    }
});

window.editFaq = async function(idx) {
    const res = await fetchFromApi('/settings');
    const faqSetting = res.find(s => s.key_name === 'faq_data');
    const faq = faqSetting.value[idx];
    document.getElementById('faq-item-id').value = idx;
    document.getElementById('faq-question').value = faq.question;
    document.getElementById('faq-answer').value = faq.answer;
    document.getElementById('faq-order').value = faq.order || 0;
    document.getElementById('faq-status').value = faq.status || 'published';
    document.getElementById('faq-modal-title').textContent = 'Edit Question';
    document.getElementById('faq-modal').style.display = 'flex';
};

window.deleteFaq = async function(idx) {
    if (!confirm("Delete this FAQ?")) return;
    const res = await fetchFromApi('/settings');
    const faqSetting = res.find(s => s.key_name === 'faq_data');
    faqSetting.value.splice(idx, 1);
    await fetchFromApi('/settings', {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_name: "faq_data", value: faqSetting.value })
    });
    loadFaqs();
};
"""

js += new_functions

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected admin.js logic.")
