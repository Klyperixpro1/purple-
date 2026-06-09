document.addEventListener("DOMContentLoaded", () => {
    // Inject styles for the button
    const style = document.createElement('style');
    style.innerHTML = `
        .injected-buttons-row {
            display: flex !important;
            flex-direction: row !important;
            gap: 20px !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
        }
        @media (max-width: 768px) {
            .injected-buttons-row {
                flex-direction: column !important;
                gap: 16px !important;
            }
        }
        #injected-feedback-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #injected-feedback-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            background: rgb(132, 0, 255);
            border-radius: 100px;
            color: #ffffff;
            font-family: var(--font-family, Inter, sans-serif);
            font-size: inherit;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
            box-shadow: 0 6px 20px rgba(132, 0, 255, 0.35);
            letter-spacing: 0.01em;
            padding: 0;
        }
        #injected-feedback-btn:hover {
            background: rgb(100, 0, 210);
            transform: translateY(-2px);
            box-shadow: 0 10px 28px rgba(132, 0, 255, 0.45);
        }
        #injected-feedback-btn:active {
            transform: translateY(0px);
        }
    `;
    document.head.appendChild(style);

    setInterval(addSubmitFeedbackButton, 500);
});

function addSubmitFeedbackButton() {
    // Wait for hydration
    var main = document.getElementById('main');
    if (!main) return false;

    // If already injected, stop
    if (document.getElementById('injected-feedback-wrapper')) return true;

    // Strategy: find the <a> button with "Let's Grow Your Content" text
    const allLinks = Array.from(document.querySelectorAll('a'));
    const growBtns = allLinks.filter(a => {
        const text = (a.textContent || '').toLowerCase();
        return text.includes("grow your content");
    });

    if (growBtns.length === 0) return false;

    const lastGrowBtn = growBtns[growBtns.length - 1];
    let targetContainer = null;

    let btnContainer = lastGrowBtn.parentElement;
    for (let i = 0; i < 5; i++) {
        if (!btnContainer) break;
        const parent = btnContainer.parentElement;
        if (!parent) break;
        
        const siblings = Array.from(parent.children);
        const hasMultipleLinks = siblings.filter(s => s.querySelector('a')).length >= 1;
        
        if (hasMultipleLinks && siblings.length >= 1) {
            targetContainer = btnContainer;
            break;
        }
        btnContainer = parent;
    }

    if (!targetContainer) return false;

    const parentEl = targetContainer.parentElement;
    if (!parentEl) return false;

    // Calculate dynamic styles based on the target container
    const computedStyle = window.getComputedStyle(targetContainer);
    const gap = window.getComputedStyle(parentEl).gap || '4px';

    // Build the new feedback button wrapper
    const wrapper = document.createElement('div');
    wrapper.id = 'injected-feedback-wrapper';
    wrapper.style.width = computedStyle.width;
    wrapper.style.height = computedStyle.height;

    const btn = document.createElement('a');
    btn.id = 'injected-feedback-btn';
    btn.href = './submit-feedback.html';
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Submit Feedback`;

    wrapper.appendChild(btn);

    // Make the target container a flex row to hold both buttons
    targetContainer.style.setProperty('display', 'flex', 'important');
    targetContainer.style.setProperty('flex-direction', 'row', 'important');
    targetContainer.style.setProperty('gap', '20px', 'important');
    targetContainer.style.setProperty('justify-content', 'center', 'important');
    targetContainer.style.setProperty('align-items', 'center', 'important');
    targetContainer.style.setProperty('flex-wrap', 'wrap', 'important');

    // On mobile, we want them stacked. We can add a class to targetContainer
    targetContainer.classList.add('injected-buttons-row');
    targetContainer.style.setProperty('height', 'auto', 'important');

    // Append wrapper inside targetContainer
    targetContainer.appendChild(wrapper);

    // Make sure the parent container can show it
    parentEl.style.overflow = 'visible';
    parentEl.style.height = 'auto';
    parentEl.style.minHeight = 'auto';

    let p = parentEl.parentElement;
    for (let i = 0; i < 3; i++) {
        if (!p) break;
        p.style.overflow = 'visible';
        p.style.height = 'auto';
        p = p.parentElement;
    }

    console.log('Submit Feedback button injected successfully.');
    return true;
}
