import sys

with open('admin/js/admin.js', 'r', encoding='utf-8') as f:
    text = f.read()

new_logic = """
async function loadFaqs() {
    const list = document.getElementById('faqs-list');
    if (!list) return;
    list.innerHTML = '<div class="loading-state">Loading FAQs...</div>';
    try {
        const res = await fetchFromApi('/settings');
        const faqSetting = res.find(s => s.key === 'faq_data');
        const faqs = faqSetting && faqSetting.value ? faqSetting.value : [];
        if (faqs.length === 0) {
            list.innerHTML = '<div class="empty-state">No FAQs configured. Add your first question!</div>';
            return;
        }
        
        // Sort by order
        faqs.sort((a,b) => (a.order || 0) - (b.order || 0));
        list.innerHTML = faqs.map(renderFaqItem).join('');
    } catch(e) {
        list.innerHTML = `<div class="error-banner">Failed to load FAQs: ${e.message}</div>`;
    }
}

function renderFaqItem(f) {
    const statusClass = f.status === 'published' ? 'faq-status-published' : 'faq-status-draft';
    return `
    <div class="faq-card" id="faq-card-${f.id}">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <span class="pill-badge" style="background:rgba(132,0,255,0.15);color:var(--primary-light);min-width:28px;text-align:center;">#${f.order}</span>
        <div style="flex:1;">
          <p style="font-weight:600;margin-bottom:4px;">${escapeHtml(f.question)}</p>
          <p style="font-size:13px;color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(f.answer)}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <span class="pill-badge ${statusClass}">${f.status}</span>
          <button class="btn btn-outline" style="padding:6px 12px;font-size:12px;" onclick='openFaqModal(${JSON.stringify(f).replace(/'/g, "&#39;")})'>Edit</button>
          <button class="btn btn-danger" style="padding:6px 12px;font-size:12px;" onclick="deleteFaq('${f.id}')">Delete</button>
        </div>
      </div>
    </div>`;
}

function openFaqModal(faq = null) {
    window.openFaqModalGlobal(faq);
}

window.openFaqModalGlobal = function(faq = null) {
    const isEdit = !!faq;
    document.getElementById('faq-modal-title').textContent = isEdit ? 'Edit Question' : 'Add Question';
    document.getElementById('faq-item-id').value = faq?.id || '';
    document.getElementById('faq-question').value = faq?.question || '';
    document.getElementById('faq-answer').value = faq?.answer || '';
    document.getElementById('faq-order').value = faq?.order ?? 0;
    document.getElementById('faq-status').value = faq?.status || 'published';
    const errEl = document.getElementById('faq-error');
    if (errEl) errEl.style.display = 'none';
    document.getElementById('faq-modal').style.display = 'flex';
};

window.saveFaq = async function() {
    const id = document.getElementById('faq-item-id').value;
    const payload = {
        question: document.getElementById('faq-question').value.trim(),
        answer: document.getElementById('faq-answer').value.trim(),
        order: parseInt(document.getElementById('faq-order').value) || 0,
        status: document.getElementById('faq-status').value
    };
    
    const e = document.getElementById('faq-error');
    if (!payload.question || !payload.answer) {
        if(e){ e.textContent = 'Question and answer are required.'; e.style.display = 'block';}
        return;
    }
    
    try {
        const res = await fetchFromApi('/settings');
        const faqSetting = res.find(s => s.key === 'faq_data');
        let faqs = faqSetting && faqSetting.value ? faqSetting.value : [];
        
        if (id) {
            const idx = faqs.findIndex(f => f.id === id);
            if (idx > -1) {
                payload.id = id;
                faqs[idx] = payload;
            } else {
                payload.id = id;
                faqs.push(payload);
            }
        } else {
            payload.id = 'faq_' + Date.now();
            faqs.push(payload);
        }
        
        await fetchFromApi('/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key_name: 'faq_data', value: faqs })
        });
        
        document.getElementById('faq-modal').style.display = 'none';
        loadFaqs();
    } catch(err) {
        if(e) { e.textContent = 'Save failed: ' + err.message; e.style.display = 'block'; }
    }
};

window.deleteFaq = async function(id) {
    if (!confirm('Delete this FAQ?')) return;
    try {
        const res = await fetchFromApi('/settings');
        const faqSetting = res.find(s => s.key === 'faq_data');
        if (!faqSetting) return;
        
        let faqs = faqSetting.value || [];
        faqs = faqs.filter(f => f.id !== id);
        
        await fetchFromApi('/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key_name: 'faq_data', value: faqs })
        });
        
        loadFaqs();
    } catch(err) {
        alert("Failed to delete FAQ: " + err.message);
    }
};
"""

# We need to replace `async function loadFaqs() { ...` up to `async function deleteFaq(id) { ... }`
# I will just write a regex to replace from `async function loadFaqs()` to `loadContacts();` (which is right after it, wait is it?)
import re
pattern = r"async function loadFaqs\(\).*?async function deleteFaq\(id\)\s*{.*?\n}"
new_text = re.sub(pattern, new_logic.strip(), text, flags=re.DOTALL)

with open('admin/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Updated FAQ logic in admin.js")
