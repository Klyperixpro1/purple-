import re

with open('admin/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

edit_modal = """
  <!-- Edit Testimonial Modal -->
  <div id="edit-testimonial-modal" class="modal-overlay" style="display:none;">
    <div class="modal-card" style="max-width:500px;width:95%;">
      <div class="modal-header">
        <h2>Edit Testimonial</h2>
        <button class="modal-close" id="close-edit-testimonial-btn">&times;</button>
      </div>
      <form id="edit-testimonial-form">
        <input type="hidden" id="edit-testimonial-id">
        <div class="form-group">
          <label for="edit-test-name">Client Name</label>
          <input type="text" id="edit-test-name" required>
        </div>
        <div class="form-group">
          <label for="edit-test-desc">Review Text</label>
          <textarea id="edit-test-desc" rows="4" required></textarea>
        </div>
        <div id="edit-testimonial-error" class="error-banner" style="display:none;"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="cancel-edit-testimonial-btn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="save-edit-testimonial-btn">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
"""

# Inject before </body>
html = html.replace('</body>', edit_modal + '\n</body>')

with open('admin/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Injected edit-testimonial-modal into index.html")
