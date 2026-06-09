import os

js_path = 'admin/js/admin.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

edit_logic = """
// --- Edit Testimonial Logic ---
window.editTestimonial = function(id, name, desc) {
    document.getElementById('edit-testimonial-id').value = id;
    document.getElementById('edit-test-name').value = name;
    document.getElementById('edit-test-desc').value = desc;
    document.getElementById('edit-testimonial-modal').style.display = 'flex';
};

document.getElementById('close-edit-testimonial-btn')?.addEventListener('click', () => {
    document.getElementById('edit-testimonial-modal').style.display = 'none';
});
document.getElementById('cancel-edit-testimonial-btn')?.addEventListener('click', () => {
    document.getElementById('edit-testimonial-modal').style.display = 'none';
});

document.getElementById('edit-testimonial-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-testimonial-id').value;
    const name = document.getElementById('edit-test-name').value;
    const desc = document.getElementById('edit-test-desc').value;
    const btn = document.getElementById('save-edit-testimonial-btn');
    const errEl = document.getElementById('edit-testimonial-error');
    
    btn.disabled = true;
    btn.textContent = 'Saving...';
    errEl.style.display = 'none';
    
    try {
        await fetchFromApi(`/content/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: name,
                description: desc
            })
        });
        document.getElementById('edit-testimonial-modal').style.display = 'none';
        loadTestimonials(); // Refresh list
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
});
// --- End Edit Testimonial Logic ---

"""

# Inject right before `window.deleteContent = async function` or at the end
js += edit_logic

# Update the render loadTestimonials to include Edit button
import re
js = re.sub(
    r'<button class="btn btn-outline" style="padding:4px 8px;font-size:12px;color:\#ef4444;border-color:\#ef4444;" onclick="deleteContent\(\'\$\{item.id\}\'\)">Remove</button>',
    r'<button class="btn btn-outline" style="padding:4px 8px;font-size:12px;" onclick="editTestimonial(\'${item.id}\', \`${item.title}\`, \`${item.description.replace(/\"/g, \'&quot;\')}\`)">Edit</button>\n<button class="btn btn-outline" style="padding:4px 8px;font-size:12px;color:#ef4444;border-color:#ef4444;" onclick="deleteContent(\'${item.id}\')">Remove</button>',
    js
)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected edit logic to admin.js")
