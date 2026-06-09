/* ==========================================================================
   Klyperix Admin Dashboard Controller (Vanilla JS + Supabase)
   ========================================================================== */

(function() {
"use strict";
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const cfg = await res.json();
      SUPABASE_URL = cfg.supabase_url;
      SUPABASE_KEY = cfg.supabase_anon_key;
    } else if (activeSession) {
      // Fallback
      SUPABASE_URL = "https://ctfwsyvpssgscfxdeuxe.supabase.co";
      SUPABASE_KEY = "sb_publishable_Qk7ESh7a5PyE9D3bRrI-0w_0O1VH-bI";
    }
  } catch (e) {
    if (activeSession) {
      SUPABASE_URL = "https://ctfwsyvpssgscfxdeuxe.supabase.co";
      SUPABASE_KEY = "sb_publishable_Qk7ESh7a5PyE9D3bRrI-0w_0O1VH-bI";
    }
    console.error('Failed to load config:', e);
  }
}
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dno51sh9s/auto/upload";
const CLOUDINARY_PRESET = "klyperix_unsigned";
const API_ORIGIN = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:') ? "http://127.0.0.1:8000" : window.location.origin;
const API_BASE = API_ORIGIN + "/api";

var supabaseClient = window.__supabaseClient || null;
var activeSession = window.__adminSession || null;
var currentTab = "overview";
var chartInstance = null;
var activePortfolioMediaType = "all";
var bulkUploadFiles = []; // Array of File objects queued for bulk upload


/**
 * Generates a thumbnail from a video File object.
 * Returns a Promise that resolves to a Blob (JPEG image) or null on failure.
 */
async function generateThumbnailBlob(videoFile) {
    return new Promise((resolve) => {
        const vid = document.createElement('video');
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'metadata';
        const url = URL.createObjectURL(videoFile);
        vid.src = url;

        const cleanup = () => URL.revokeObjectURL(url);
        const timeout = setTimeout(() => { cleanup(); resolve(null); }, 10000);

        vid.addEventListener('loadedmetadata', () => {
            vid.currentTime = Math.min(1.5, vid.duration * 0.1);
        });

        vid.addEventListener('seeked', () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                canvas.width  = Math.min(vid.videoWidth,  1280);
                canvas.height = Math.min(vid.videoHeight, 720);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    cleanup();
                    resolve(blob);
                }, 'image/jpeg', 0.85);
            } catch (e) {
                cleanup();
                resolve(null);
            }
        });

        vid.addEventListener('error', () => { clearTimeout(timeout); cleanup(); resolve(null); });
        vid.load();
    });
}

/**
 * Uploads a thumbnail Blob to the media endpoint.
 * Returns the secure_url string or null.
 */
async function uploadThumbnailBlob(blob, originalVideoFilename, token) {
    const formData = new FormData();
    const thumbFilename = originalVideoFilename.replace(/\.[^.]+$/, '') + '_thumb.jpg';
    formData.append('file', blob, thumbFilename);

    try {
        const data = await fetchFromApi('/media/upload', {
            method: 'POST',
            body: formData
        });
        return data.public_url || data.file_path || null;
    } catch (e) {
        return null;
    }
}

// Initialize when DOM loads
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

window.onerror = function(message, source, lineno, colno, error) {
    console.error("JavaScript Error: " + message + " on line " + lineno);
    return false;
};

async function initApp() {
    // 1. Setup UI Listeners immediately for dashboard functionality
    setupEventListeners();

    try {
        await loadConfig();
        // 2. Reuse the client created by the inline login script if available
        if (window.__supabaseClient) {
            supabaseClient = window.__supabaseClient;
            console.log("[ADMIN.JS] Reusing inline script's Supabase client");
        } else {
            // Fallback: create our own client
            const configRes = await fetch(`${API_ORIGIN}/api/config`);
            if (!configRes.ok) throw new Error("Failed to load backend configuration");
            const config = await configRes.json();
            supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
            window.__supabaseClient = supabaseClient;
            console.log("[ADMIN.JS] Created own Supabase client");
        }
        
        // 3. Check Authentication state — reuse inline script's session if available
        if (window.__adminSession) {
            activeSession = window.__adminSession;
            console.log("[ADMIN.JS] Reusing inline session");
        } else {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                activeSession = session;
                window.__adminSession = session;
            }
        }

        // 4. If we have a session, the inline script already handled showing dashboard
        //    Just make sure dashboard data loads
        if (activeSession) {
            // Only show dashboard if not already visible
            if (document.getElementById("dashboard-wrapper").style.display !== "flex") {
                await handleLoginSuccess(activeSession);
            } else {
                // Dashboard already visible from inline script, just load data
                loadTabData("overview");
            }
        } else {
            showLoginView();
        }
    } catch (err) {
        console.error("Initialization error:", err);
    }
}



// ==========================================
// NEW ADMIN FUNCTIONS (CONTACTS, FAQS, BUGS)
// ==========================================

function formatNumber(n) {
    if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
    if (n >= 1000) return (n/1000).toFixed(1)+'K';
    return String(n || 0);
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function updateSidebarBadges() {
    try {
        const contacts = await fetchFromApi('/contacts?status=new');
        const newCount = contacts.length || 0;
        const badge = document.getElementById('badge-new-contacts');
        if (badge) { badge.textContent = newCount; badge.style.display = newCount > 0 ? 'inline-flex' : 'none'; }
    } catch(_) {}
    try {
        const bugs = await fetchFromApi('/bugs?status=open');
        const bugCount = bugs.length || 0;
        const badge = document.getElementById('badge-open-bugs');
        if (badge) { badge.textContent = bugCount; badge.style.display = bugCount > 0 ? 'inline-flex' : 'none'; }
    } catch(_) {}
}

let deviceChartInstance = null;
function renderDeviceChart(devices) {
    const ctx = document.getElementById('deviceChart')?.getContext('2d');
    if (!ctx) return;
    if (deviceChartInstance) deviceChartInstance.destroy();
    
    const colors = {
        'mobile': '#8400ff',
        'desktop': '#1dcc5d',
        'tablet': '#f28713',
        'unknown': '#6b7280'
    };
    
    const labels = devices.map(d => d.device_type.charAt(0).toUpperCase() + d.device_type.slice(1));
    const data = devices.map(d => d.count);
    const bgColors = devices.map(d => colors[d.device_type] || colors['unknown']);
    
    deviceChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#a1a1aa', padding: 20, font: { family: 'Inter' } } }
            }
        }
    });
}

// CONTACTS
async function loadContacts(filter = 'all') {
    const list = document.getElementById('contacts-table-body');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6" class="loading-state">Loading messages...</td></tr>';
    try {
        const params = filter !== 'all' ? `?status=${filter}` : '';
        const data = await fetchFromApi(`/contacts${params}`);
        if (!data || !data.length) {
            list.innerHTML = '<tr><td colspan="6" class="empty-state" style="text-align:center;padding:20px;opacity:0.5;">No messages found.</td></tr>';
            return;
        }
        list.innerHTML = data.map(renderContactRow).join('');
    } catch(e) {
        list.innerHTML = `<tr><td colspan="6" class="error-banner">Failed to load: ${e.message}</td></tr>`;
    }
}

function renderContactRow(c) {
    const ts = c.created_at ? timeAgo(new Date(c.created_at)) : '';
    const statusClass = c.status === 'contacted' ? 'faq-status-published' : 'faq-status-draft';
    const statusLabel = c.status === 'contacted' ? 'Contacted' : 'New';
    
    const msgPreview = escapeHtml(c.message || '').substring(0, 40) + ((c.message && c.message.length > 40) ? '...' : '');

    return `
    <tr id="contact-row-${c.id}">
        <td style="font-weight:600;">${escapeHtml(c.name || 'Anonymous')}</td>
        <td style="opacity:0.8;">${escapeHtml(c.email || 'No email')}</td>
        <td style="opacity:0.7;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${msgPreview}</td>
        <td style="font-size:12px;opacity:0.6;">${ts}</td>
        <td><span class="pill-badge ${statusClass}" style="position:static;">${statusLabel}</span></td>
        <td style="text-align: right;">
            <button class="btn btn-outline" style="padding: 4px 10px; font-size: 12px; margin-right:4px;" onclick='openContactModal(${JSON.stringify(c).replace(/'/g, "&#39;")})'>View</button>
            <button class="btn btn-danger" style="padding: 4px 10px; font-size: 12px;" onclick="deleteContact('${c.id}')">Delete</button>
        </td>
    </tr>`;
}

window.openContactModal = function(c) {
    document.getElementById('contact-meta-info').innerHTML = `
        <strong>From:</strong> ${escapeHtml(c.name)} &lt;${escapeHtml(c.email)}&gt;<br>
        <strong>Date:</strong> ${new Date(c.created_at).toLocaleString()}
    `;
    document.getElementById('contact-original-message').textContent = c.message || 'No message content.';
    
    const sendBtn = document.getElementById('send-contact-reply-btn');
    if (sendBtn) {
        sendBtn.onclick = function() {
            alert("Reply sent to " + escapeHtml(c.email) + " (Mocked)");
            document.getElementById('contact-reply-modal').style.display = 'none';
            if (c.status === 'new') loadContacts();
        };
    }
    
    document.getElementById('contact-reply-modal').style.display = 'flex';
};

window.deleteContact = function(id) {
    if(!confirm("Delete this message?")) return;
    alert("Message deleted (Mocked)");
    loadContacts();
};

let _replyContactId = null;
function openContactReplyModal(id) {
    _replyContactId = id;
    const card = document.getElementById(`contact-card-${id}`);
    const msg = card ? card.querySelector('.contact-card-message')?.textContent || '' : '';
    document.getElementById('contact-original-message').innerHTML =
        `<strong>Original message:</strong><br>${escapeHtml(msg)}`;
    document.getElementById('contact-reply-text').value = '';
    document.getElementById('contact-reply-error').style.display = 'none';
    document.getElementById('contact-reply-modal').style.display = 'flex';
}

async function sendContactReply() {
    const replyText = document.getElementById('contact-reply-text').value.trim();
    if (!replyText) return;
    const errEl = document.getElementById('contact-reply-error');
    try {
        await fetchFromApi(`/contacts/${_replyContactId}/reply`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({reply_text: replyText})
        });
        document.getElementById('contact-reply-modal').style.display = 'none';
        loadContacts('all');
        updateSidebarBadges();
    } catch(e) {
        errEl.textContent = 'Failed to send reply: ' + e.message;
        errEl.style.display = 'block';
    }
}

async function markContacted(id) {
    try {
        await fetchFromApi(`/contacts/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({status: 'contacted'})
        });
        loadContacts('all');
        updateSidebarBadges();
    } catch(e) { alert('Failed: ' + e.message); }
}

async function deleteContact(id) {
    if (!confirm('Delete this contact submission?')) return;
    try {
        await fetchFromApi(`/contacts/${id}`, {method: 'DELETE'});
        document.getElementById(`contact-card-${id}`)?.remove();
        updateSidebarBadges();
    } catch(e) { alert('Failed: ' + e.message); }
}

// FAQS
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
        <span class="pill-badge" style="position:static;background:rgba(132,0,255,0.15);color:var(--primary-light);min-width:28px;text-align:center;">#${f.order}</span>
        <div style="flex:1;">
          <p style="font-weight:600;margin-bottom:4px;">${escapeHtml(f.question)}</p>
          <p style="font-size:13px;color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(f.answer)}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <span class="pill-badge ${statusClass}" style="position:static;">${f.status}</span>
          <button class="btn btn-outline" style="padding:6px 12px;font-size:12px;" onclick='openFaqModal(${JSON.stringify(f).replace(/'/g, "&#39;")})'>Edit</button>
          <button class="btn btn-danger" style="padding:6px 12px;font-size:12px;" onclick="deleteFaq('${f.id}')">Delete</button>
        </div>
      </div>
    </div>`;
}

window.openFaqModal = function(faq = null) {
    window.openFaqModalGlobal(faq);
};

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

// BUGS
async function loadBugReports(filter = 'all') {
    const tbody = document.getElementById('bugs-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="loading-state">Loading...</td></tr>';
    try {
        const params = filter !== 'all' ? `?status=${filter}` : '';
        const data = await fetchFromApi(`/bugs${params}`);
        if (!data || !data.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:24px;text-align:center;">No bug reports found.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(b => `
          <tr id="bug-row-${b.id}">
            <td style="font-size:12px;color:var(--text-muted);">${b.created_at ? new Date(b.created_at).toLocaleString() : '-'}</td>
            <td style="font-size:12px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(b.page_url||'')}">${escapeHtml(b.page_url || '-')}</td>
            <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(b.message||'')}">${escapeHtml(b.message)}</td>
            <td style="font-size:12px;">${escapeHtml(b.device_type || '-')}</td>
            <td><span class="pill-badge ${b.status === 'resolved' ? '' : 'pill-badge--red'}">${b.status}</span></td>
            <td style="text-align:right;">
              ${b.status === 'open' ? `<button class="btn btn-outline" style="padding:5px 10px;font-size:12px;" onclick="resolveBug('${b.id}')">Resolve</button>` : ''}
            </td>
          </tr>`).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" class="error-banner">${e.message}</td></tr>`;
    }
}

async function loadRecentBugsPreview() {
    const container = document.getElementById('recent-bugs-table');
    if (!container) return;
    try {
        const data = await fetchFromApi('/bugs?status=open');
        if (!data || !data.length) { container.innerHTML = '<div class="empty-state" style="padding:16px;font-size:13px;">No open error reports.</div>'; return; }
        const rows = data.slice(0, 5).map(b => `
          <tr id="prev-bug-${b.id}">
            <td style="font-size:12px;color:var(--text-muted);">${b.created_at ? new Date(b.created_at).toLocaleString() : '-'}</td>
            <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(b.message||'')}">${escapeHtml(b.message)}</td>
            <td style="font-size:12px;">${escapeHtml(b.device_type || '-')}</td>
            <td><button class="btn btn-outline" style="padding:4px 10px;font-size:11px;" onclick="resolveBug('${b.id}')">Resolve</button></td>
          </tr>`).join('');
        container.innerHTML = `<table class="users-table"><thead><tr><th>Time</th><th>Error</th><th>Device</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch(_) {}
}

async function resolveBug(id) {
    try {
        await fetchFromApi(`/bugs/${id}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:'resolved'})});
        document.getElementById(`bug-row-${id}`)?.remove();
        document.getElementById(`prev-bug-${id}`)?.remove();
        loadRecentBugsPreview();
        updateSidebarBadges();
    } catch(e) { alert('Failed: ' + e.message); }
}

async function clearResolvedBugs() {
    if (!confirm('Clear all resolved bug reports?')) return;
    try {
        await fetchFromApi('/bugs/clear-resolved', {method:'DELETE'});
        loadBugReports('all');
    } catch(e) { alert('Failed: ' + e.message); }
}

window.addEventListener('error', function(e) { reportClientError(e.message, e.filename, e.lineno); });
window.addEventListener('unhandledrejection', function(e) { reportClientError(String(e.reason), window.location.pathname, 0); });
async function reportClientError(msg, src, line) {
    try {
        await fetch(API_ORIGIN + '/api/bugs/report', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                message: msg, source_file: src, line_number: line,
                page_url: window.location.href,
                device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                browser: navigator.userAgent.substring(0, 200),
                status: 'open'
            })
        });
    } catch(_) {}
}


function setupEventListeners() {
    console.log("[ADMIN] setupEventListeners() called");
    
    // Login form submission — MOST CRITICAL
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
        console.log("[ADMIN] Login form listener attached");
    } else {
        console.error("[ADMIN] login-form element NOT FOUND");
    }
    
    // Logout button click
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
    
    // Sidebar navigation tabs
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Portfolio Manager button to add item
    const addPortBtn = document.getElementById("open-add-portfolio-modal-btn");
    if (addPortBtn) addPortBtn.addEventListener("click", () => window.openPortfolioModal && window.openPortfolioModal());
    
    // Testimonials Manager button to add item
    const addTestimonialBtn = document.getElementById("open-add-testimonial-modal-btn");
    if (addTestimonialBtn) {
        addTestimonialBtn.addEventListener("click", () => {
            if (window.openPortfolioModal) window.openPortfolioModal();
            // Pre-select 'testimonial' category
            const categorySelect = document.getElementById("port-category");
            if (categorySelect) {
                categorySelect.value = "testimonial";
                if (typeof window.toggleCategoryFields === 'function') window.toggleCategoryFields();
            }
            // Update title
            const modalTitle = document.getElementById("portfolio-modal-title");
            if (modalTitle) {
                modalTitle.textContent = "Add Customer Testimonial";
            }
        });
    }
    
    // Portfolio Manager Filter Pills
    const filterPills = document.querySelectorAll(".filter-pills .pill-btn");
    filterPills.forEach(pill => {
        pill.addEventListener("click", () => {
            filterPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            const cat = pill.dataset.filter;
            window.loadPortfolioCatalog && window.loadPortfolioCatalog(cat);
        });
    });

    // Close Modals
    const closePortBtn = document.getElementById("close-portfolio-modal-btn");
    if (closePortBtn) closePortBtn.addEventListener("click", () => window.closePortfolioModal && window.closePortfolioModal());
    const cancelPortBtn = document.getElementById("cancel-portfolio-modal-btn");
    if (cancelPortBtn) cancelPortBtn.addEventListener("click", () => window.closePortfolioModal && window.closePortfolioModal());
    const closePickerBtn = document.getElementById("close-media-picker-btn");
    if (closePickerBtn) closePickerBtn.addEventListener("click", () => window.closeMediaPickerModal && window.closeMediaPickerModal());
    
    // Submit Portfolio Form
    const portForm = document.getElementById("portfolio-item-form");
    if (portForm) portForm.addEventListener("submit", (e) => window.handlePortfolioSubmit && window.handlePortfolioSubmit(e));
    
    // Settings Form
    const settingsForm = document.getElementById("settings-form");
    window.handleSettingsSubmit = handleSettingsSubmit;
    if (settingsForm) settingsForm.addEventListener("submit", handleSettingsSubmit);
    
    // Legacy Bulk Upload Button logic removed to avoid conflict with the new advanced modal.

    // ── Bulk Upload & Publish Modal wiring ──────────────────────────────────
    const openBulkBtn = document.getElementById("open-bulk-upload-modal-btn");
    const closeBulkBtn = document.getElementById("close-bulk-upload-modal-btn");
    const cancelBulkBtn = document.getElementById("cancel-bulk-upload-btn");
    const bulkDropZone = document.getElementById("bulk-drop-zone");
    const bulkFileInput = document.getElementById("bulk-file-input");
    const startBulkBtn = document.getElementById("start-bulk-upload-btn");

    window.openBulkUploadModal = function() {
        bulkUploadFiles = [];
        renderBulkFileList();
        document.getElementById("bulk-upload-error").style.display = "none";
        document.getElementById("bulk-upload-modal").style.display = "flex";
    };
    if (openBulkBtn) openBulkBtn.addEventListener("click", window.openBulkUploadModal);

    if (closeBulkBtn) closeBulkBtn.addEventListener("click", closeBulkUploadModal);
    if (cancelBulkBtn) cancelBulkBtn.addEventListener("click", closeBulkUploadModal);

    if (bulkDropZone) {
        bulkDropZone.addEventListener("click", () => bulkFileInput && bulkFileInput.click());
        bulkDropZone.addEventListener("dragover", e => { e.preventDefault(); bulkDropZone.style.borderColor = "rgba(139,92,246,0.9)"; });
        bulkDropZone.addEventListener("dragleave", () => { bulkDropZone.style.borderColor = "rgba(139,92,246,0.45)"; });
        bulkDropZone.addEventListener("drop", e => {
            e.preventDefault();
            bulkDropZone.style.borderColor = "rgba(139,92,246,0.45)";
            addFilesToBulkQueue(Array.from(e.dataTransfer.files));
        });
    }

    if (bulkFileInput) {
        bulkFileInput.addEventListener("change", e => {
            addFilesToBulkQueue(Array.from(e.target.files));
            bulkFileInput.value = "";
        });
    }

    if (startBulkBtn) startBulkBtn.addEventListener("click", runBulkUpload);
    // ── End bulk upload wiring ───────────────────────────────────────────────

    // Direct Upload from Portfolio Modal
    const directUploadBtn = document.getElementById("direct-upload-btn");
    const directUploadInput = document.getElementById("direct-upload-input");
    if (directUploadBtn && directUploadInput) {
        directUploadBtn.addEventListener("click", () => directUploadInput.click());
        directUploadInput.addEventListener("change", async (e) => {
            if (e.target.files.length > 0) {
                const originalText = directUploadBtn.textContent;
                directUploadBtn.textContent = `Uploading ${e.target.files.length} file(s)...`;
                directUploadBtn.disabled = true;
                
                try {
                    await loadConfig();
                    let uploadedUrls = [];
                    for (let i = 0; i < e.target.files.length; i++) {
                        const file = e.target.files[i];
                        const formData = new FormData();
                        formData.append("file", file);
                        
                        const data = await fetchFromApi("/media/upload", {
                            method: "POST",
                            body: formData
                        });
                        
                        uploadedUrls.push(data.public_url || data.file_path);
                    }
                    
                    document.getElementById("port-media").value = uploadedUrls.join(", ");
                    
                } catch (err) {
                    alert("Upload failed: " + err.message);
                } finally {
                    directUploadBtn.textContent = originalText;
                    directUploadBtn.disabled = false;
                    directUploadInput.value = "";
                }
            }
        });
    }

    console.log("[ADMIN] setupEventListeners() complete");
}


// ==========================================================================
// AUTHENTICATION FLOWS
// ==========================================================================

function showLoginView() {
    document.getElementById("login-overlay").style.display = "flex";
    document.getElementById("dashboard-wrapper").style.display = "none";
    document.getElementById("login-error-msg").style.display = "none";
}

function showDashboardView() {
    document.getElementById("login-overlay").style.display = "none";
    document.getElementById("dashboard-wrapper").style.display = "flex";
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("[AUTH] handleLoginSubmit fired");
    
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("login-btn");
    const errorMsg = document.getElementById("login-error-msg");
    
    console.log("[AUTH] Attempting login for:", email);
    
    btn.disabled = true;
    btn.textContent = "Authenticating...";
    errorMsg.style.display = "none";
    
    // Guard: Supabase client must be initialized
    if (!supabaseClient) {
        console.error("[AUTH] supabaseClient is NULL — initApp likely failed");
        errorMsg.textContent = "System not initialized. Please refresh the page and check that the backend server is running.";
        errorMsg.style.display = "block";
        btn.disabled = false;
        btn.textContent = "Sign In to Dashboard";
        return;
    }
    
    try {
        await loadConfig();
        console.log("[AUTH] Calling supabaseClient.auth.signInWithPassword...");
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        console.log("[AUTH] signInWithPassword response:", { data: data ? "OK" : "null", error: error ? error.message : "none" });
        
        if (error) throw error;
        
        console.log("[AUTH] Login succeeded, calling handleLoginSuccess...");
        await handleLoginSuccess(data.session);
    } catch (err) {
        console.error("[AUTH] Login failed:", err);
        errorMsg.textContent = err.message || "Invalid credentials. Try again.";
        errorMsg.style.display = "block";
        btn.disabled = false;
        btn.textContent = "Sign In to Dashboard";
    }
}


async function handleLoginSuccess(session) {
    activeSession = session;
    
    // Fetch profile and check role from FastAPI (to ensure role validation matches backend rules)
    try {
        await loadConfig();
        const profile = await fetchFromApi("/users/me");
        
        if (profile.role !== "admin" && profile.role !== "editor") {
            // Not authorized for management
            await supabaseClient.auth.signOut();
            throw new Error("Access Denied: Admin or Editor role required.");
        }
        
        // Show details in UI
        document.getElementById("sidebar-user-email").textContent = profile.email;
        document.getElementById("sidebar-user-role").textContent = profile.role.toUpperCase();
        document.getElementById("avatar-letters").textContent = profile.email.substring(0, 2).toUpperCase();
        
        showDashboardView();
        switchTab("overview");
    } catch (err) {
        console.error("Profile authorization check failed:", err);
        const errorMsg = document.getElementById("login-error-msg");
        errorMsg.textContent = err.message || "Access denied. Admin access only.";
        errorMsg.style.display = "block";
        showLoginView();
    } finally {
        const btn = document.getElementById("login-btn");
        btn.disabled = false;
        btn.textContent = "Sign In to Dashboard";
    }
}

async function handleLogout() {
    try {
        await loadConfig();
        await supabaseClient.auth.signOut();
        activeSession = null;
        showLoginView();
    } catch (err) {
        console.error("Logout failed:", err);
    }
}

function showErrorBanner(msg) {
    const errorMsg = document.getElementById("login-error-msg");
    errorMsg.textContent = msg;
    errorMsg.style.display = "block";
}

// ==========================================================================
// API CLIENT UTILITY (With Auth Token Header)
// ==========================================================================

async function fetchFromApi(endpoint, options = {}) {
    // Sync session from inline login script if needed
    if (!activeSession && window.__adminSession) {
        activeSession = window.__adminSession;
    }
    if (!activeSession) {
        throw new Error("No active session. Please authenticate.");
    }
    
    // Add token to headers
    const token = activeSession.access_token;
    options.headers = {
        ...options.headers,
        "Authorization": `Bearer ${token}`
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    
    if (response.status === 401 || response.status === 403) {
        // Session might be expired
        handleLogout();
        throw new Error("Session expired. Please log in again.");
    }
    
    if (!response.ok) {
        if (response.status === 404 && (endpoint.includes('/faqs') || endpoint.includes('/contacts') || endpoint.includes('/bugs'))) {
            return [];
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
    }
    
    return await response.json();
}

// ==========================================================================
// TAB SWITCHING & INITS
// ==========================================================================

window.switchTab = function(tabId) {
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

    if (tabId === 'portfolio') {
        if (typeof loadPortfolio === 'function') loadPortfolio();
        else if (typeof loadPortfolioCatalog === 'function') loadPortfolioCatalog();
    }
    if (tabId === 'testimonials') {
        if (typeof loadTestimonials === 'function') loadTestimonials();
        else if (typeof loadTestimonialsList === 'function') loadTestimonialsList();
    }
    if (tabId === 'overview' && typeof loadOverviewStats === 'function') loadOverviewStats();
    if (tabId === 'contacts' && typeof loadContacts === 'function') loadContacts();
    if (tabId === 'bugs' && typeof loadBugs === 'function') loadBugs();
    if (tabId === 'faqs' && typeof loadFaqs === 'function') loadFaqs();
};


// ==========================================================================
// TAB 3: TESTIMONIALS MANAGER
// ==========================================================================

async function loadTestimonialsList() {
    const list = document.getElementById("testimonials-list");
    list.innerHTML = '<div class="loading-state">Syncing reviews queue...</div>';
    
    try {
        await loadConfig();
        // Query testimonials via backend endpoint (fetch all states)
        
        const reviews = await fetchFromApi("/content?is_admin=true&category=testimonial&limit=1000");

        
        if (reviews.length === 0) {
            list.innerHTML = '<div class="empty-state">No testimonials submitted yet. Submit one using the public feedback form!</div>';
            return;
        }
        
        list.innerHTML = "";
        reviews.forEach(review => {
            const strip = document.createElement("div");
            strip.className = "testimonial-strip";
            
            // Format rating stars
            let stars = "";
            const rating = review.metadata.rating || 5;
            for (let i = 0; i < 5; i++) {
                stars += i < rating ? "&#9733;" : "&#9734;";
            }
            
            const isPending = review.status === "pending_review";
            
            strip.innerHTML = `
                <div class="testimonial-logo-wrapper">
                    <img src="${review.media_url || 'https://picsum.photos/100'}" alt="Logo">
                </div>
                <div class="testimonial-main">
                    <div class="testimonial-rating">${stars}</div>
                    <p class="testimonial-text">"${review.description}"</p>
                    <div class="testimonial-author">
                        <strong>${review.title}</strong> — ${review.metadata.profession || 'Client'}
                    </div>
                </div>
                <div class="testimonial-strip-actions">
                    <span class="badge-status status-${review.status === 'active' ? 'active' : review.status === 'draft' ? 'draft' : 'pending'}">${review.status}</span>
                    <div class="testimonial-strip-buttons">
                        ${isPending ? `
                            <button class="btn btn-primary" style="padding: 8px 16px; font-size: 12px; border-radius: 8px;" onclick="approveTestimonial('${review.id}')">Approve</button>
                        ` : ''}
                        <button class="action-btn btn-edit" style="width:32px; height:32px; border-radius:8px; margin-right: 4px;" onclick="editTestimonial('${review.id}')" title="Edit Testimonial">
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="action-btn btn-delete" style="width:32px; height:32px; border-radius:8px;" onclick="deleteTestimonial('${review.id}')" title="Delete Testimonial">
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
            `;
            
            list.appendChild(strip);
        });
    } catch (err) {
        list.innerHTML = `<div class="error-banner">${err.message}</div>`;
    }
}

async function approveTestimonial(id) {
    try {
        await loadConfig();
        await fetchFromApi(`/content/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "active" })
        });
        loadTestimonialsList();
        loadOverviewStats();
    } catch (err) {
        alert("Failed to approve: " + err.message);
    }
}

async function editTestimonial(id) {
    try {
        await loadConfig();
        const item = await fetchFromApi(`/content/${id}`);
        
        document.getElementById('edit-test-id').value = item.id;
        document.getElementById('edit-test-name').value = item.title || "";
        document.getElementById('edit-test-role').value = item.metadata?.role || "";
        document.getElementById('edit-test-desc').value = item.description || "";
        document.getElementById('edit-test-media').value = item.media_url || "";
        document.getElementById('edit-test-status').value = item.status || "active";
        
        document.getElementById('edit-testimonial-modal').style.display = 'flex';
    } catch (err) {
        alert("Failed to load testimonial details: " + err.message);
    }
}

async function deleteTestimonial(id) {
    if (!confirm("Are you sure you want to remove this client testimonial?")) return;
    try {
        await loadConfig();
        await fetchFromApi(`/content/${id}`, { method: "DELETE" });
        loadTestimonialsList();
        loadOverviewStats();
    } catch (err) {
        alert("Failed to delete testimonial: " + err.message);
    }
}



// ==========================================================================
// TAB 5: GENERAL SITE CONFIGURATIONS
// ==========================================================================

async function loadSiteSettings() {
    try {
        await loadConfig();
        
        const settingsArray = await fetchFromApi("/settings");
        const settings = {};
        settingsArray.forEach(s => settings[s.key_name] = s.value);

        
        // Populate inputs
        document.getElementById("set-whatsapp").value = settings.whatsapp_number || "919542785647";
        document.getElementById("set-email").value = settings.contact_email || "contact@klyperix.com";
        document.getElementById("set-owner").value = settings.owner_name || "GARV AGARWAL";
        document.getElementById("set-brand").value = settings.brand_name || "KLYPERIX";
        document.getElementById("set-cta").value = settings.cta_text || "Let's Grow Your Content";
        document.getElementById("set-pricing").value = JSON.stringify(settings.pricing_details || {}, null, 2);
        
    } catch (err) {
        console.error("Failed to load settings:", err);
    }
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("save-settings-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";
    
    // Parse pricing JSON
    let pricingJson = {};
    try {
        await loadConfig();
        const rawPricing = document.getElementById("set-pricing").value;
        if (rawPricing && rawPricing.trim() !== '') {
            pricingJson = JSON.parse(rawPricing);
        }
    } catch (err) {
        alert("Pricing must be valid JSON format.");
        btn.disabled = false;
        btn.textContent = "Save Configurations";
        return;
    }
    
    try {
        await loadConfig();
        // Save each settings key individually
        
        await fetchFromApi("/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key_name: "whatsapp_number", value: document.getElementById("set-whatsapp").value }) });
        await fetchFromApi("/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key_name: "contact_email", value: document.getElementById("set-email").value }) });
        await fetchFromApi("/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key_name: "owner_name", value: document.getElementById("set-owner").value }) });
        await fetchFromApi("/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key_name: "brand_name", value: document.getElementById("set-brand").value }) });
        await fetchFromApi("/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key_name: "cta_text", value: document.getElementById("set-cta").value }) });
        await fetchFromApi("/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key_name: "pricing_details", value: pricingJson }) });

        
        alert("Configurations saved successfully.");
    } catch (err) {
        alert("Failed to save settings: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Save Configurations";
    }
}

// ==========================================================================
// TAB 6: STAFF ROLES MANAGER
// ==========================================================================

async function loadUserManagement() {
    const tbody = document.getElementById("users-table-body");
    tbody.innerHTML = '<tr><td colspan="4" class="loading-state">Fetching users catalog...</td></tr>';
    
    try {
        await loadConfig();
        
        // Note: Supabase restricts fetching users to service_role keys. 
        // Admin must manage users via the Supabase Dashboard.
        const users = [];

        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No users registered in database.</td></tr>';
            return;
        }
        
        tbody.innerHTML = "";
        users.forEach(user => {
            const tr = document.createElement("tr");
            
            // Format dates
            const regDate = new Date(user.created_at).toLocaleDateString(undefined, {
                year: "numeric", month: "short", day: "numeric"
            });
            
            tr.innerHTML = `
                <td style="font-weight: 600;">${user.email}</td>
                <td style="color: var(--text-muted);">${regDate}</td>
                <td>
                    <span class="badge-status status-${user.role === 'admin' ? 'active' : user.role === 'editor' ? 'pending' : 'draft'}">${user.role.toUpperCase()}</span>
                </td>
                <td style="text-align: right;">
                    <select onchange="changeUserRole('${user.id}', this.value)">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="error-banner">${err.message}</td></tr>`;
    }
}

async function changeUserRole(userId, newRole) {
    try {
        await loadConfig();
        await fetchFromApi(`/users/${userId}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole })
        });
        loadUserManagement();
    } catch (err) {
        alert("Failed to modify user access: " + err.message);
        loadUserManagement(); // Reload to reset state
    }
}

window.editPortfolioItem = async function(id) {
    try {
        await loadConfig();
        const item = await fetchFromApi(`/content/${id}`);
        window.openPortfolioModal && window.openPortfolioModal(item);
    } catch (err) {
        alert('Failed to load item: ' + err.message);
    }
};

window.togglePublishItem = async function(id, currentStatus) {
    const btn = document.getElementById(`toggle-btn-${id}`);
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
        await loadConfig();
        const result = await fetchFromApi(`/content/${id}/status`, { method: 'PATCH' });
        const newStatus = result.status;
        // Update card in-place without full reload
        const card = document.getElementById(`card-${id}`);
        if (card) {
            const statusBadge = card.querySelector('.status-badge');
            if (statusBadge) {
                statusBadge.textContent = newStatus;
                statusBadge.style.background = newStatus === 'active' ? 'rgba(34,197,94,0.85)' : 'rgba(255,165,0,0.85)';
            }
            if (btn) {
                btn.disabled = false;
                btn.textContent = newStatus === 'active' ? '🌐 Unpublish' : '✅ Publish';
                btn.style.color = newStatus === 'active' ? '#f87171' : '#4ade80';
                btn.style.borderColor = newStatus === 'active' ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.4)';
                btn.setAttribute('onclick', `window.togglePublishItem('${id}','${newStatus}')`);
            }
        }
    } catch (err) {
        alert('Failed to toggle status: ' + err.message);
        if (btn) { btn.disabled = false; btn.textContent = currentStatus === 'active' ? '🌐 Unpublish' : '✅ Publish'; }
    }
};

window.deletePortfolioItem = async function(id, mediaUrl) {
    if (!confirm('⚠️ Permanently delete this item from Supabase AND Cloudinary?\n\nThis cannot be undone.')) return;
    try {
        await loadConfig();
        // Delete content record (API also handles Cloudinary cleanup via media_url)
        await fetchFromApi(`/content/${id}`, { method: 'DELETE' });
        // Also try to delete the media record if media URL known
        if (mediaUrl) {
            try {
                const mediaRes = await fetchFromApi(`/media?limit=1`);
                // Silently attempt cleanup — content delete already handles Cloudinary
            } catch(e) {}
        }
        // Remove card from DOM immediately
        const card = document.getElementById(`card-${id}`);
        if (card) {
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => card.remove(), 300);
        } else {
            window.loadPortfolioCatalog && window.loadPortfolioCatalog();
        }
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
};
window.approveTestimonial = approveTestimonial;
window.deleteTestimonial = deleteTestimonial;
window.editTestimonial = editTestimonial;
window.changeUserRole = changeUserRole;
window.switchTab = switchTab;

// =============================================================================
// BULK UPLOAD & PUBLISH SYSTEM
// =============================================================================

function closeBulkUploadModal() {
    document.getElementById("bulk-upload-modal").style.display = "none";
    bulkUploadFiles = [];
}

function addFilesToBulkQueue(newFiles) {
    const allowed = ["video/", "image/"];
    newFiles.forEach(f => {
        if (allowed.some(t => f.type.startsWith(t))) {
            bulkUploadFiles.push(f);
        }
    });
    renderBulkFileList();
}

function renderBulkFileList() {
    const list = document.getElementById("bulk-file-list");
    const summary = document.getElementById("bulk-upload-summary");
    const startBtn = document.getElementById("start-bulk-upload-btn");
    if (!list) return;

    if (bulkUploadFiles.length === 0) {
        list.style.display = "none";
        if (summary) summary.style.display = "none";
        if (startBtn) startBtn.disabled = true;
        return;
    }

    list.style.display = "block";
    list.innerHTML = "";

    bulkUploadFiles.forEach((file, idx) => {
        const isVideo = file.type.startsWith("video/");
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const row = document.createElement("div");
        row.id = `bulk-file-row-${idx}`;
        row.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.04);margin-bottom:6px;";
        row.innerHTML = `
            <span style="font-size:20px;">${isVideo ? "🎬" : "🖼️"}</span>
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</div>
                <div style="font-size:11px;opacity:0.55;">${sizeMB} MB · ${file.type.split("/")[1].toUpperCase()}</div>
                <div id="bulk-prog-bar-wrap-${idx}" style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:6px;overflow:hidden;display:none;">
                    <div id="bulk-prog-bar-${idx}" style="height:100%;width:0%;background:var(--primary-accent-color,#8b5cf6);transition:width 0.3s;border-radius:2px;"></div>
                </div>
            </div>
            <span id="bulk-file-status-${idx}" style="font-size:11px;opacity:0.5;white-space:nowrap;">Queued</span>
            <button onclick="removeBulkFile(${idx})" style="background:none;border:none;cursor:pointer;opacity:0.5;padding:4px;color:inherit;" title="Remove">✕</button>
        `;
        list.appendChild(row);
    });

    if (summary) {
        const videos = bulkUploadFiles.filter(f => f.type.startsWith("video/")).length;
        const images = bulkUploadFiles.length - videos;
        let txt = `${bulkUploadFiles.length} file${bulkUploadFiles.length !== 1 ? "s" : ""} queued`;
        if (videos && images) txt += ` (${videos} video${videos !== 1 ? "s" : ""}, ${images} image${images !== 1 ? "s" : ""})`;
        summary.textContent = txt;
        summary.style.display = "block";
    }
    if (startBtn) startBtn.disabled = false;
}

window.removeBulkFile = function(idx) {
    bulkUploadFiles.splice(idx, 1);
    renderBulkFileList();
};

async function runBulkUpload() {
    if (bulkUploadFiles.length === 0) return;

    const category = document.getElementById("bulk-category").value;
    const ratio = document.getElementById("bulk-ratio").value;
    const startBtn = document.getElementById("start-bulk-upload-btn");
    const errEl = document.getElementById("bulk-upload-error");
    const closeBtn = document.getElementById("close-bulk-upload-modal-btn");

    if (errEl) errEl.style.display = "none";
    if (startBtn) { startBtn.disabled = true; startBtn.textContent = "Uploading…"; }
    if (closeBtn) closeBtn.style.display = "none";

    let successCount = 0;
    let failCount = 0;

    try {
        await loadConfig();
    } catch (e) {
        if (errEl) { errEl.textContent = "Failed to load config: " + e.message; errEl.style.display = "block"; }
        if (startBtn) { startBtn.disabled = false; startBtn.innerHTML = "Upload &amp; Publish All"; }
        if (closeBtn) closeBtn.style.display = "";
        return;
    }

    for (let idx = 0; idx < bulkUploadFiles.length; idx++) {
        const file = bulkUploadFiles[idx];
        const statusEl = document.getElementById(`bulk-file-status-${idx}`);
        const barWrap  = document.getElementById(`bulk-prog-bar-wrap-${idx}`);
        const bar      = document.getElementById(`bulk-prog-bar-${idx}`);

        if (statusEl) { statusEl.textContent = "Uploading…"; statusEl.style.opacity = "1"; statusEl.style.color = "var(--primary-accent-color,#8b5cf6)"; }
        if (barWrap) barWrap.style.display = "block";
        if (bar) bar.style.width = "30%";

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("category_slug", category);
            formData.append("aspect_ratio", ratio);
            formData.append("title", file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));

            const token = activeSession && activeSession.access_token;
            if (!token) throw new Error("Not authenticated");

            if (bar) bar.style.width = "60%";

            const res = await fetch(`${API_BASE}/media/upload-and-publish`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (bar) bar.style.width = "90%";

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `HTTP ${res.status}`);
            }

            await res.json(); // consume body
            if (bar) bar.style.width = "100%";
            if (bar) bar.style.background = "#22c55e";
            if (statusEl) { statusEl.textContent = "✓ Live on site!"; statusEl.style.color = "#22c55e"; }
            successCount++;

        } catch (err) {
            if (bar) { bar.style.width = "100%"; bar.style.background = "#ef4444"; }
            if (statusEl) { statusEl.textContent = "✗ Failed"; statusEl.style.color = "#ef4444"; }
            console.error(`[BulkUpload] ${file.name}:`, err.message);
            failCount++;
        }
    }

    // Done — show result
    if (startBtn) {
        startBtn.textContent = failCount === 0
            ? `✓ All ${successCount} published!`
            : `Done: ${successCount} published, ${failCount} failed`;
        startBtn.disabled = true;
    }
    if (closeBtn) closeBtn.style.display = "";

    if (successCount > 0) {
        // Refresh portfolio list and stats
        setTimeout(() => {
            loadPortfolioCatalog();
            loadOverviewStats();
        }, 500);
        // Auto-close modal after 2s if no failures
        if (failCount === 0) {
        setTimeout(closeBulkUploadModal, 2000);
        }
    }
}
// =============================================================================
// END BULK UPLOAD SYSTEM
// =============================================================================

// NEW: MISSING LOADER FUNCTIONS
// =============================================================================

window.generateVideoThumbnail = function(videoUrl) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
        video.currentTime = 1; // Seek to 1s
        video.onloadeddata = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL());
            } catch (e) {
                resolve(null);
            }
        };
        video.onerror = () => resolve(null);
    });
};

window.loadPortfolioCatalog = async function(filterCategory) {
    const grid = document.getElementById("portfolio-items-grid");
    if (!grid) return;
    grid.innerHTML = '<div class="loading-state" style="text-align:center;padding:40px;color:rgba(255,255,255,0.5);">⏳ Loading portfolio...</div>';
    try {
        await loadConfig();
        let endpoint = '/content?is_admin=true&limit=300';
        if (filterCategory && filterCategory !== 'all' && filterCategory !== '') {
            endpoint = `/content?is_admin=true&category=${filterCategory}&limit=300`;
        }
        const items = await fetchFromApi(endpoint);
        const portfolioItems = items.filter(i => i.category_slug !== 'testimonial' && i.category_slug !== 'contact_submission');
        if (portfolioItems.length === 0) {
            grid.innerHTML = '<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,0.35);font-size:15px;">No items found.<br><span style="font-size:13px;">Upload using <strong style="color:#a78bfa">Bulk Upload & Publish</strong> or <strong style="color:#a78bfa">+ Add Content Item</strong></span></div>';
            return;
        }
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(240px, 1fr))';
        grid.style.gap = '16px';
        grid.innerHTML = '';
        portfolioItems.forEach(item => {
            const isActive = item.status === 'active';
            const isVideo = item.media_url && (item.media_url.includes('.mp4') || item.media_url.includes('.webm') || item.media_url.includes('video'));
            const thumb = item.thumbnail_url || (isVideo ? '' : item.media_url) || '';
            const categoryLabel = (item.category_slug || 'uncategorized').replace(/-/g, ' ');
            const safeMediaUrl = (item.media_url || '').replace(/'/g, "\\'");
            const el = document.createElement('div');
            el.id = `card-${item.id}`;
            el.style.cssText = 'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:border-color 0.2s,transform 0.2s;';
            el.onmouseenter = () => { el.style.borderColor = 'rgba(139,92,246,0.4)'; el.style.transform = 'translateY(-2px)'; };
            el.onmouseleave = () => { el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.transform = 'translateY(0)'; };
            el.innerHTML = `
                <div style="height:165px;background:#0a0a10;overflow:hidden;position:relative;flex-shrink:0;">
                    ${thumb
                        ? `<img src="${thumb}" id="thumb-${item.id}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.querySelector('.no-thumb').style.display='flex';this.style.display='none'">
                           <div class="no-thumb" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;font-size:36px;">${isVideo ? '🎬' : '🖼️'}</div>`
                        : `<img id="thumb-${item.id}" style="width:100%;height:100%;object-fit:cover;display:none;">
                           <div class="no-thumb" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:36px;">${isVideo ? '🎬' : '🖼️'}</div>`
                    }
                    <div class="status-badge" style="position:absolute;top:8px;left:8px;background:${isActive ? 'rgba(34,197,94,0.9)' : 'rgba(251,146,60,0.9)'};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;backdrop-filter:blur(4px);">${isActive ? '🌐 Live' : '📝 Draft'}</div>
                    <div style="position:absolute;top:8px;right:8px;background:rgba(139,92,246,0.85);color:#fff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;text-transform:capitalize;backdrop-filter:blur(4px);">${categoryLabel}</div>
                    ${isVideo && item.media_url ? `<a href="${item.media_url}" target="_blank" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;padding:4px 8px;border-radius:8px;text-decoration:none;backdrop-filter:blur(4px);">▶ Preview</a>` : ''}
                </div>
                <div style="padding:14px;flex:1;display:flex;flex-direction:column;gap:10px;">
                    <div style="font-weight:600;font-size:14px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${item.title || 'Untitled'}">${item.title || '<em style="color:rgba(255,255,255,0.4)">Untitled</em>'}</div>
                    ${item.description ? `<div style="font-size:12px;color:rgba(255,255,255,0.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.description}</div>` : ''}
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;">
                        <button id="toggle-btn-${item.id}" onclick="window.togglePublishItem('${item.id}','${item.status}')" style="flex:1;min-width:90px;padding:7px 8px;background:transparent;border:1px solid ${isActive ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.4)'};color:${isActive ? '#f87171' : '#4ade80'};border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;transition:all 0.2s;">${isActive ? '🌐 Unpublish' : '✅ Publish'}</button>
                        <button onclick="window.editPortfolioItem('${item.id}')" style="padding:7px 10px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.2s;" title="Edit">✏️</button>
                        <button onclick="window.deletePortfolioItem('${item.id}','${safeMediaUrl}')" style="padding:7px 10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171;border-radius:8px;cursor:pointer;font-size:12px;transition:all 0.2s;" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
            grid.appendChild(el);

            if (isVideo && (!thumb || thumb.includes('.mp4') || thumb.includes('.webm') || thumb.includes('.mov'))) {
                window.generateVideoThumbnail(item.media_url).then(dataUrl => {
                    if (dataUrl) {
                        const img = document.getElementById(`thumb-${item.id}`);
                        const noThumb = el.querySelector('.no-thumb');
                        if (img) {
                            img.src = dataUrl;
                            img.style.display = 'block';
                            if (noThumb) noThumb.style.display = 'none';
                        }
                    }
                });
            }
        });
    } catch (err) {
        grid.innerHTML = `<div class="error-banner">${err.message}</div>`;
    }
};

window.loadPortfolio = window.loadPortfolioCatalog;

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

window.loadOverviewStats = async function() {
    try {
        const stats = await fetchFromApi('/analytics');
        if (stats) {
            const pCount = document.getElementById('stat-portfolio-count');
            if (pCount) pCount.textContent = stats.portfolio_count || 0;
            
            const mCount = document.getElementById('stat-media-count');
            if (mCount) mCount.textContent = stats.media?.count || 0;
            
            const cBandwidth = document.getElementById('stat-cloudinary-bandwidth');
            if (cBandwidth && stats.usage) cBandwidth.textContent = formatBytes(stats.usage.cloudinary_bandwidth);
            
            const cStorage = document.getElementById('stat-cloudinary-storage');
            if (cStorage && stats.usage) cStorage.textContent = formatBytes(stats.usage.cloudinary_storage);
            
            const sStorage = document.getElementById('stat-supabase-storage');
            if (sStorage && stats.usage) sStorage.textContent = formatBytes(stats.usage.supabase_tracked_storage);
            
            const tActive = document.getElementById('stat-testimonials-active');
            if (tActive && stats.testimonials) tActive.textContent = stats.testimonials.active || 0;
            
            const tPending = document.getElementById('stat-testimonials-pending');
            if (tPending && stats.testimonials) tPending.textContent = stats.testimonials.pending || 0;
            
            const vCount = document.getElementById('stat-page-views');
            if (vCount) vCount.textContent = stats.views_count_7d || 0;
            
            const uvCount = document.getElementById('stat-unique-visitors');
            if (uvCount) uvCount.textContent = stats.unique_visitors_7d || 0;
            
            const errorCount = document.getElementById('stat-error-count');
            if (errorCount && stats.bug_reports) errorCount.textContent = stats.bug_reports.length || 0;
            
            // Also update the stray large cards if they exist
            const bigMediaSize = document.getElementById('stat-media-size');
            if (bigMediaSize && stats.media) bigMediaSize.textContent = `${formatBytes(stats.media.total_size_bytes)} used`;
            
            const bigTestActive = document.querySelectorAll('#stat-testimonials-active');
            if (bigTestActive.length > 1 && stats.testimonials) bigTestActive[1].textContent = stats.testimonials.active || 0;
            
            const bigTestPending = document.querySelectorAll('#stat-testimonials-pending');
            if (bigTestPending.length > 1 && stats.testimonials) bigTestPending[1].textContent = stats.testimonials.pending || 0;
            
            const bigMediaCount = document.querySelectorAll('#stat-media-count');
            if (bigMediaCount.length > 1 && stats.media) bigMediaCount[1].textContent = stats.media.count || 0;
        }
    } catch (e) {
        console.warn('Could not load overview stats:', e);
    }
};

window.openPortfolioModal = function(item = null) {
    const modal = document.getElementById("portfolio-modal");
    if (!modal) return;
    const form = document.getElementById("portfolio-item-form");
    if (form) form.reset();
    
    document.getElementById("port-item-id").value = item ? item.id : "";
    
    if (item) {
        document.getElementById("port-category").value = item.category_slug || "";
        document.getElementById("port-aspect-ratio").value = item.metadata?.aspect_ratio || "16:9";
        document.getElementById("port-order").value = item.order_index || 0;
        document.getElementById("port-title").value = item.title || "";
        document.getElementById("port-profession").value = item.metadata?.role || item.metadata?.profession || "";
        document.getElementById("port-description").value = item.description || "";
        document.getElementById("port-media").value = item.media_url || "";
        document.getElementById("port-thumbnail").value = item.thumbnail_url || "";
        
        const ratingEl = document.getElementById("port-rating");
        if (ratingEl) ratingEl.value = item.metadata?.rating || 5;
        
        const featuredEl = document.getElementById("port-featured");
        if (featuredEl) featuredEl.checked = !!item.is_featured;
        
        const statusEl = document.getElementById("port-status");
        if (statusEl) statusEl.value = item.status || "draft";
    } else {
        const titleEl = document.getElementById('portfolio-modal-title');
        if (titleEl) titleEl.textContent = "Create Portfolio Item";
    }
    
    modal.style.display = "flex";
};

window.closePortfolioModal = function() {
    const modal = document.getElementById("portfolio-modal");
    if (modal) modal.style.display = "none";
};

window.closeMediaPickerModal = function() {
    const modal = document.getElementById("media-picker-modal");
    if (modal) modal.style.display = "none";
};

window.handlePortfolioSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById("save-portfolio-btn");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving...";
    }
    
    try {
        await loadConfig();
        const id = document.getElementById("port-item-id").value;
        const aspect_ratio = document.getElementById("port-aspect-ratio").value;
        const role = document.getElementById("port-profession").value;
        const ratingEl = document.getElementById("port-rating");
        const featuredEl = document.getElementById("port-featured");
        const statusEl = document.getElementById("port-status");
        
        const payload = {
            category_slug: document.getElementById("port-category").value,
            title: document.getElementById("port-title").value,
            description: document.getElementById("port-description").value,
            media_url: document.getElementById("port-media").value,
            thumbnail_url: document.getElementById("port-thumbnail").value,
            order_index: parseInt(document.getElementById("port-order").value) || 0,
            status: statusEl ? statusEl.value : "draft",
            is_featured: featuredEl ? featuredEl.checked : false,
            metadata: { 
                aspect_ratio: aspect_ratio, 
                role: role,
                profession: role,
                rating: ratingEl ? parseInt(ratingEl.value) : 5
            }
        };
        
        if (id) {
            await fetchFromApi(`/content/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            payload.status = "active";
            payload.is_featured = false;
            await fetchFromApi(`/content`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }
        
        window.closePortfolioModal();
        window.loadPortfolioCatalog && window.loadPortfolioCatalog();
        window.loadTestimonialsList && window.loadTestimonialsList();
    } catch(err) {
        alert("Error saving: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Confirm Item";
        }
    }
};

window.filterPortfolio = function(filterVal) {
    const grid = document.getElementById("portfolio-items-grid");
    if (grid) {
        grid.style.opacity = '0.5';
        setTimeout(() => {
            grid.style.opacity = '1';
        }, 300);
    }
};
// --- Testimonial Modal Logic ---
document.getElementById('close-testimonial-modal')?.addEventListener('click', () => {
    document.getElementById('edit-testimonial-modal').style.display = 'none';
});
document.getElementById('cancel-test-btn')?.addEventListener('click', () => {
    document.getElementById('edit-testimonial-modal').style.display = 'none';
});

document.getElementById('test-upload-btn')?.addEventListener('click', () => {
    document.getElementById('test-file-input')?.click();
});

document.getElementById('test-file-input')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        document.getElementById('edit-test-media').value = evt.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById('edit-testimonial-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-test-id').value;
    const title = document.getElementById('edit-test-name').value;
    const role = document.getElementById('edit-test-role').value;
    const desc = document.getElementById('edit-test-desc').value;
    const media_url = document.getElementById('edit-test-media').value;
    const status = document.getElementById('edit-test-status').value;
    
    const btn = document.getElementById('save-test-btn');
    const errEl = document.getElementById('test-modal-error');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    errEl.style.display = 'none';
    
    try {
        const payload = {
            category_slug: 'testimonial',
            title: title,
            description: desc,
            media_url: media_url,
            status: status,
            metadata: { role: role }
        };
        
        if (id) {
            await fetchFromApi('/content/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            await fetchFromApi('/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        document.getElementById('edit-testimonial-modal').style.display = 'none';
        if (typeof loadTestimonialsList === 'function') loadTestimonialsList();
        if (typeof loadOverviewStats === 'function') loadOverviewStats();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Testimonial';
    }
});



// --- FAQ Event Listeners ---
document.getElementById('save-faq-btn')?.addEventListener('click', window.saveFaq);
document.getElementById('close-faq-btn')?.addEventListener('click', () => { document.getElementById('faq-modal').style.display = 'none'; });
document.getElementById('cancel-faq-btn')?.addEventListener('click', () => { document.getElementById('faq-modal').style.display = 'none'; });

// =============================================================================
// CROP & PREVIEW SYSTEM
// =============================================================================

// State
window.cropperInstance = null;
window._cropTarget = null; // 'media' or 'thumb'

// --- Helpers ---
function getAspectRatioValue() {
    const ratio = (document.getElementById('port-aspect-ratio')?.value || '16:9').trim();
    const map = { '16:9': 16/9, '9:16': 9/16, '1:1': 1, '4:5': 4/5, '4:3': 4/3 };
    return map[ratio] || 16/9;
}

function getRatioLabel() {
    return document.getElementById('port-aspect-ratio')?.value || '16:9';
}

function isVideoUrl(url) {
    if (!url) return false;
    return /\.(mp4|mov|webm|m4v|avi|mkv)/i.test(url) || url.includes('/video/upload/');
}

// --- Live Preview Panel ---
function refreshPreviewPanel() {
    const mediaUrl  = (document.getElementById('port-media')?.value || '').trim();
    const thumbUrl  = (document.getElementById('port-thumbnail')?.value || '').trim();
    const ratio     = getRatioLabel();
    const ratioNum  = getAspectRatioValue();
    const panel     = document.getElementById('media-preview-panel');
    if (!panel) return;

    // Always show the panel (hide it only when both are empty & no item loaded)
    panel.style.display = 'block';

    // Update ratio badge
    const ratioLbl = document.getElementById('preview-ratio-label');
    if (ratioLbl) ratioLbl.textContent = ratio;

    // ---- Media side ----
    const wrapper   = document.getElementById('media-preview-wrapper');
    const imgEl     = document.getElementById('media-preview-img');
    const vidEl     = document.getElementById('media-preview-vid');
    const ph        = document.getElementById('media-preview-placeholder');
    const btnCropM  = document.getElementById('btn-crop-media');

    // Apply aspect ratio to wrappers
    [wrapper, document.getElementById('thumb-preview-wrapper')].forEach(w => {
        if (!w) return;
        w.style.aspectRatio = String(ratioNum).replace('/', '/');
        w.style.maxHeight = '180px';
        w.style.minHeight = 'unset';
    });

    if (mediaUrl) {
        if (isVideoUrl(mediaUrl)) {
            imgEl.style.display = 'none';
            vidEl.src = mediaUrl;
            vidEl.style.display = 'block';
            if (ph) ph.style.display = 'none';
            if (btnCropM) btnCropM.style.display = 'none'; // can't crop video directly
            // Show frame grab button
            const btnExtract = document.getElementById('btn-extract-thumb');
            if (btnExtract) btnExtract.style.display = 'inline-block';
        } else {
            vidEl.style.display = 'none';
            vidEl.src = '';
            imgEl.src = mediaUrl;
            imgEl.style.display = 'block';
            if (ph) ph.style.display = 'none';
            if (btnCropM) btnCropM.style.display = 'inline-block';
        }
    } else {
        vidEl.style.display = 'none'; vidEl.src = '';
        imgEl.style.display = 'none'; imgEl.src = '';
        if (ph) { ph.style.display = 'block'; ph.textContent = 'No media URL'; }
        if (btnCropM) btnCropM.style.display = 'none';
    }

    // ---- Thumbnail side ----
    const tWrapper  = document.getElementById('thumb-preview-wrapper');
    const tImgEl    = document.getElementById('thumb-preview-img');
    const tPh       = document.getElementById('thumb-preview-placeholder');
    const btnCropT  = document.getElementById('btn-crop-thumb');
    const btnExtract = document.getElementById('btn-extract-thumb');

    if (thumbUrl) {
        tImgEl.src = thumbUrl;
        tImgEl.style.display = 'block';
        if (tPh) tPh.style.display = 'none';
        if (btnCropT) btnCropT.style.display = 'inline-block';
    } else {
        tImgEl.style.display = 'none'; tImgEl.src = '';
        if (tPh) { tPh.style.display = 'block'; tPh.textContent = 'No thumbnail URL'; }
        if (btnCropT) btnCropT.style.display = 'none';
    }

    // Show extract button when media is video (regardless of thumb)
    if (btnExtract) {
        btnExtract.style.display = (mediaUrl && isVideoUrl(mediaUrl)) ? 'inline-block' : 'none';
    }
}

// Bind URL input listeners
function bindPreviewListeners() {
    const mInp = document.getElementById('port-media');
    const tInp = document.getElementById('port-thumbnail');
    const rSel = document.getElementById('port-aspect-ratio');
    if (mInp) mInp.addEventListener('input', refreshPreviewPanel);
    if (tInp) tInp.addEventListener('input', refreshPreviewPanel);
    if (rSel) rSel.addEventListener('change', refreshPreviewPanel);

    // Crop buttons
    const btnCropM = document.getElementById('btn-crop-media');
    if (btnCropM) btnCropM.addEventListener('click', () => window.openCropModal('media'));

    const btnCropT = document.getElementById('btn-crop-thumb');
    if (btnCropT) btnCropT.addEventListener('click', () => window.openCropModal('thumb'));

    // Frame grab
    const btnExtract = document.getElementById('btn-extract-thumb');
    if (btnExtract) btnExtract.addEventListener('click', extractVideoFrame);

    // Thumbnail file upload
    const btnUpload = document.getElementById('btn-upload-thumb-file');
    const thumbFileIn = document.getElementById('thumb-upload-input');
    if (btnUpload && thumbFileIn) {
        btnUpload.addEventListener('click', () => thumbFileIn.click());
        thumbFileIn.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            btnUpload.disabled = true;
            btnUpload.textContent = 'Uploading...';
            try {
                const url = await uploadFileToCloudinary(file);
                document.getElementById('port-thumbnail').value = url;
                refreshPreviewPanel();
            } catch(err) {
                alert('Upload failed: ' + err.message);
            } finally {
                btnUpload.disabled = false;
                btnUpload.textContent = '📁 Upload';
                thumbFileIn.value = '';
            }
        });
    }
}

// --- Crop Modal ---
window.openCropModal = function(target) {
    window._cropTarget = target;
    const url = target === 'media'
        ? document.getElementById('port-media')?.value
        : document.getElementById('port-thumbnail')?.value;

    if (!url || url.trim() === '') {
        alert('Please enter a URL in the field first, then click Crop.');
        return;
    }

    const ratioLabel = getRatioLabel();
    const ratioNum   = getAspectRatioValue();

    // Set crop modal title & badge
    document.getElementById('crop-modal-title').textContent =
        target === 'media' ? '✂️ Crop Media Image' : '✂️ Crop Thumbnail';
    document.getElementById('crop-ratio-badge').textContent = ratioLabel;

    // Load image
    const cropImg = document.getElementById('crop-image-el');
    cropImg.crossOrigin = 'anonymous';
    cropImg.src = url;

    // Show modal
    const modal = document.getElementById('crop-modal');
    modal.style.display = 'flex';

    // Destroy previous instance
    if (window.cropperInstance) {
        window.cropperInstance.destroy();
        window.cropperInstance = null;
    }

    cropImg.onload = () => {
        window.cropperInstance = new Cropper(cropImg, {
            aspectRatio: ratioNum,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.9,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    };

    cropImg.onerror = () => {
        // Try proxying through a CORS-friendly method
        alert('Could not load the image for cropping. Make sure the URL is publicly accessible. For Cloudinary images, cropping is fully supported.');
        window.closeCropModal();
    };
};

window.closeCropModal = function() {
    document.getElementById('crop-modal').style.display = 'none';
    if (window.cropperInstance) {
        window.cropperInstance.destroy();
        window.cropperInstance = null;
    }
    window._cropTarget = null;
};

window.applyCrop = async function() {
    if (!window.cropperInstance) return;

    const applyBtn = document.querySelector('#crop-modal button[onclick="window.applyCrop()"]');
    if (applyBtn) { applyBtn.disabled = true; applyBtn.textContent = 'Uploading...'; }

    try {
        // Get cropped canvas
        const canvas = window.cropperInstance.getCroppedCanvas({
            maxWidth: 3840,
            maxHeight: 2160,
            fillColor: '#000',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        // Convert to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        const file = new File([blob], 'cropped_' + Date.now() + '.jpg', { type: 'image/jpeg' });

        // Upload to Cloudinary
        const url = await uploadFileToCloudinary(file);

        // Set back to the correct field
        if (window._cropTarget === 'media') {
            document.getElementById('port-media').value = url;
        } else {
            document.getElementById('port-thumbnail').value = url;
        }

        refreshPreviewPanel();
        window.closeCropModal();

    } catch (err) {
        alert('Failed to apply crop: ' + err.message);
        if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = '✓ Apply Crop'; }
    }
};

// --- Video Frame Extractor ---
function extractVideoFrame() {
    const vidEl = document.getElementById('media-preview-vid');
    const mediaUrl = document.getElementById('port-media')?.value;
    if (!mediaUrl || !isVideoUrl(mediaUrl)) return;

    const btnExtract = document.getElementById('btn-extract-thumb');
    if (btnExtract) { btnExtract.disabled = true; btnExtract.textContent = 'Grabbing...'; }

    const tempVid = document.createElement('video');
    tempVid.crossOrigin = 'anonymous';
    tempVid.src = mediaUrl;
    tempVid.muted = true;
    tempVid.currentTime = 1; // grab 1 second in

    tempVid.addEventListener('seeked', async () => {
        const canvas = document.createElement('canvas');
        canvas.width  = tempVid.videoWidth  || 1280;
        canvas.height = tempVid.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempVid, 0, 0, canvas.width, canvas.height);

        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
            const file = new File([blob], 'thumb_frame_' + Date.now() + '.jpg', { type: 'image/jpeg' });
            const url = await uploadFileToCloudinary(file);
            document.getElementById('port-thumbnail').value = url;
            refreshPreviewPanel();
            // Offer to crop the grabbed frame
            setTimeout(() => {
                if (confirm('Frame grabbed! Would you like to crop it to the correct aspect ratio now?')) {
                    window.openCropModal('thumb');
                }
            }, 200);
        } catch(err) {
            alert('Could not extract frame: ' + err.message);
        } finally {
            if (btnExtract) { btnExtract.disabled = false; btnExtract.textContent = '🎬 Grab Frame from Video'; }
        }
    }, { once: true });

    tempVid.load();
}

// --- Cloudinary uploader (reusable) ---
async function uploadFileToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Cloudinary upload failed: ' + res.status);
    const data = await res.json();
    return data.secure_url;
}

// --- Hook into openPortfolioModal to bind listeners once ---
const _origOpenPortfolioModal = window.openPortfolioModal;
window.openPortfolioModal = function(item = null) {
    _origOpenPortfolioModal(item);
    // Bind listeners (safe to call multiple times, inputs replace their events)
    setTimeout(() => {
        bindPreviewListeners();
        refreshPreviewPanel();
    }, 50);
};

// Close crop modal on overlay click
document.getElementById('crop-modal')?.addEventListener('click', function(e) {
    if (e.target === this) window.closeCropModal();
});

})(); // End IIFE
