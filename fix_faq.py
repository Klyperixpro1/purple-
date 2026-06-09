import os

js_path = 'public/api_client.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

new_logic = """
        // ── 5d. FAQs ───────────────────────────────────────────────────────────
        if (window.siteSettings && window.siteSettings.faq_data && window.siteSettings.faq_data.length > 0) {
            // Find the FAQ container by searching for the class known to wrap them
            const faqContainers = document.querySelectorAll('.framer-1li6sz7, [data-framer-name="FAQ"]');
            if (faqContainers.length > 0) {
                const wrapper = faqContainers[0];
                const templates = wrapper.querySelectorAll('.framer-14ffb45-container, [data-framer-component-type="Stack"]'); // Find the accordion item
                if (templates.length > 0) {
                    const template = templates[0];
                    let currentCards = Array.from(wrapper.children).filter(el => el.classList.contains('framer-14ffb45-container') || el.hasAttribute('data-framer-name'));
                    
                    const faqs = window.siteSettings.faq_data.filter(f => f.status !== 'draft');
                    faqs.sort((a,b) => (a.order||0) - (b.order||0));
                    
                    // We only want to duplicate the actual templates
                    if(currentCards.length > 0) {
                        while (currentCards.length < faqs.length) {
                            const clone = currentCards[0].cloneNode(true);
                            wrapper.appendChild(clone);
                            currentCards.push(clone);
                        }
                        while (currentCards.length > faqs.length) {
                            const extra = currentCards.pop();
                            extra.remove();
                        }
                        
                        currentCards.forEach((card, i) => {
                            const faq = faqs[i];
                            // Try to find the text nodes inside Question/Answer
                            const qEl = card.querySelector('[data-framer-name="Question"] p, [data-framer-name="Question"]');
                            const aEl = card.querySelector('[data-framer-name="Answer"] p, [data-framer-name="Answer"]');
                            if (qEl) qEl.textContent = faq.question;
                            if (aEl) aEl.textContent = faq.answer;
                        });
                    }
                }
            }
        }
    };
"""

js = js.replace('    };', new_logic)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected FAQ sync logic into api_client.js")
