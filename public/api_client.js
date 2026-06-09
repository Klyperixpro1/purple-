/* ==========================================================================
   Klyperix Database Content Sync Client — FIXED VERSION
   ========================================================================== */

(function() {
    'use strict';

    const API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:')
        ? 'http://127.0.0.1:8000'
        : window.location.origin;

    // ── Global data stores ────────────────────────────────────────────────────
    window.longformImages     = [];
    window.shortformVideos    = [];
    window.thumbnailImages    = [];
    window.graphicImages      = [];
    window.clientTestimonials = [];
    window.siteSettings       = {};
    window.heroVideos         = [];

    let contentFetched = false;

    function optimizeCloudinaryUrl(url) {
        if (!url || !url.includes('res.cloudinary.com')) return url;
        if (url.match(/\.(mp4|webm|mov|avi)$/i)) {
            // Compress videos to reduce load time drastically!
            if (url.includes('/upload/q_')) return url;
            return url.replace('/upload/', '/upload/q_auto,vc_auto,f_auto/');
        }
        if (url.includes('/upload/f_') || url.includes('/upload/q_')) return url;
        return url.replace('/upload/', '/upload/f_auto,q_auto/');
    }

    // ── 1. Fetch content from backend ─────────────────────────────────────────
    function syncContents() {
        // Kill slider autoplay and hover animations for video section only
        const styleKill = document.createElement('style');
        styleKill.textContent = `
            .thumb-slider-wrapper, .thumb-slider-wrapper > div {
                justify-content: center !important;
                align-items: center !important;
            }
            .video-slider-wrapper [class*="framer-component"] {
                border-radius: 20px !important;
                overflow: hidden !important;
                background-color: transparent !important;
            }
            .video-slider-wrapper [class*="framer-component"]:hover {
                transform: none !important;
                box-shadow: none !important;
            }
        `;
        document.head.appendChild(styleKill);

        fetch(API_BASE + '/api/content?status=active&limit=1000&_t=' + new Date().getTime())
            .then(res => { if (!res.ok) throw new Error('API error'); return res.json(); })
            .then(data => {
                const opt = optimizeCloudinaryUrl;
                window.longformImages     = data.filter(i => i.category_slug === 'long-form')
                    .map(i => ({ media_url: opt(i.media_url), thumbnail_url: opt(i.thumbnail_url), aspect_ratio: i.metadata?.aspect_ratio || '16:9', is_featured: i.is_featured, id: i.id }));
                window.shortformVideos    = data.filter(i => i.category_slug === 'short-form')
                    .map(i => ({ media_url: opt(i.media_url), thumbnail_url: opt(i.thumbnail_url), aspect_ratio: i.metadata?.aspect_ratio || '9:16', is_featured: i.is_featured, id: i.id }));
                window.thumbnailImages    = data.filter(i => i.category_slug === 'thumbnail')
                    .map(i => ({ media_url: opt(i.media_url), thumbnail_url: opt(i.thumbnail_url), is_featured: i.is_featured, id: i.id }));
                window.graphicImages      = data.filter(i => i.category_slug === 'graphic-design')
                    .map(i => ({ media_url: opt(i.media_url), thumbnail_url: opt(i.thumbnail_url), is_featured: i.is_featured, id: i.id }));
                window.heroVideos         = data.filter(i => i.category_slug === 'hero-video')
                    .map(i => ({ media_url: opt(i.media_url), thumbnail_url: opt(i.thumbnail_url), aspect_ratio: i.metadata?.aspect_ratio || '16:9', is_featured: true, id: i.id }));
                window.clientTestimonials = data.filter(i => i.category_slug === 'testimonial');

                contentFetched = true;
                console.log('[Klyperix] Content synced:', {
                    shortform: window.shortformVideos.length,
                    longform: window.longformImages.length,
                    thumbnails: window.thumbnailImages.length,
                    graphics: window.graphicImages.length
                });

                if (window.processFramerDOM) window.processFramerDOM();
            })
            .catch(err => {
                contentFetched = true; // Don't block UI on error
                console.warn('[Klyperix] Content sync warning:', err);
                if (window.processFramerDOM) window.processFramerDOM();
            });
    }

    // ── 2. Fetch settings ─────────────────────────────────────────────────────
    function syncSettings() {
        fetch(API_BASE + '/api/settings')
            .then(res => { if (!res.ok) throw new Error('API error'); return res.json(); })
            .then(data => {
                data.forEach(s => { window.siteSettings[s.key_name] = s.value; });
                if (window.processFramerDOM) window.processFramerDOM();
            })
            .catch(err => console.warn('[Klyperix] Settings sync warning:', err));
    }

    // ── 3. Generate thumbnail from video via canvas ───────────────────────────
    function generateVideoThumbnail(videoUrl) {
        return new Promise((resolve) => {
            const vid = document.createElement('video');
            vid.crossOrigin = 'anonymous';
            vid.preload = 'metadata';
            vid.muted = true;
            vid.playsInline = true;
            vid.src = videoUrl;

            const timeout = setTimeout(() => resolve(null), 8000); // 8s timeout

            vid.addEventListener('loadedmetadata', () => {
                vid.currentTime = Math.min(1.5, vid.duration * 0.1);
            });

            vid.addEventListener('seeked', () => {
                clearTimeout(timeout);
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width  = vid.videoWidth  || 640;
                    canvas.height = vid.videoHeight || 360;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } catch (e) {
                    resolve(null);
                }
                vid.src = ''; // free memory
            });

            vid.addEventListener('error', () => { clearTimeout(timeout); resolve(null); });
            vid.load();
        });
    }

    // ── 4. Assign one video per card (stable, non-re-assigning) ──────────────
    // Cards get a permanent data-klyperix-idx attribute on first assignment.
    // Re-runs skip already-assigned cards. Cards with no matching video are hidden.
    function assignVideosToCards(cards, videos) {
        if (!videos || videos.length === 0) return;

        cards.forEach((card, i) => {
            if (card.dataset.klyperixIdx !== undefined) return; // Already assigned

            if (i >= videos.length) {
                // More cards than videos — hide the extra cards
                card.style.display = 'none';
                card.dataset.klyperixIdx = 'hidden';
                return;
            }

            const item = videos[i];
            card.dataset.klyperixIdx = String(i);

            const vid = card.querySelector('video');
            const img = card.querySelector('img');

            if (!item.media_url) return;

            const isVideoUrl = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(item.media_url) || item.media_url.includes('/video/');

            if (vid) {
                vid.dataset.origSrc = item.media_url;
                vid.src = item.media_url;
                vid.preload = 'metadata'; // Load enough to show poster frame
                vid.removeAttribute('autoplay'); vid.play = function() { return Promise.resolve(); };

                // Set poster/thumbnail
                if (item.thumbnail_url) {
                    vid.poster = item.thumbnail_url;
                } else {
                    // Auto-generate thumbnail from video
                    generateVideoThumbnail(item.media_url).then(dataUrl => {
                        if (dataUrl) vid.poster = dataUrl;
                    });
                }
                vid.load();
            } else if (img && !isVideoUrl) {
                img.dataset.origSrc = item.media_url;
                img.src = item.media_url;
                img.srcset = '';
                if (item.thumbnail_url) img.src = item.thumbnail_url;
            }
        });
    }

    // ── 5. Main DOM processor ─────────────────────────────────────────────────
    function isKlyperixVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url || '') || (url || '').includes('/video/');
    }

    function prepareKlyperixMediaElement(el) {
        el.style.position = 'absolute';
        el.style.top = '0';
        el.style.left = '0';
        el.style.display = 'block';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.objectFit = 'cover';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.removeAttribute('hidden');
    }

    function getOrCreateKlyperixImage(card) {
        let img = card.querySelector('img:not(.custom-overlay-img)');
        if (!img) {
            img = document.createElement('img');
            img.alt = 'Klyperix portfolio preview';
            card.appendChild(img);
        }
        prepareKlyperixMediaElement(img);
        img.loading = 'eager';
        img.decoding = 'async';
        if (!img.getAttribute('width')) img.setAttribute('width', '1280');
        if (!img.getAttribute('height')) img.setAttribute('height', '720');
        img.removeAttribute('srcset');
        return img;
    }

    function getOrCreateKlyperixVideo(card) {
        let video = card.querySelector('video:not(.custom-overlay-video)');
        if (!video) {
            video = document.createElement('video');
            card.appendChild(video);
        }
        prepareKlyperixMediaElement(video);
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.autoplay = false; // explicitly disable autoplay
        video.controls = true; // add controls so user can play it
        return video;
    }

    function hideInactiveKlyperixMedia(card, activeEl) {
        card.querySelectorAll('img, video, iframe, svg, canvas, div[style*="background-image"]').forEach(el => {
            if (el !== activeEl && !el.classList.contains('custom-overlay-img') && !el.classList.contains('custom-overlay-video')) {
                el.style.display = 'none';
            }
        });
    }

    function ensureCardCount(cards, targetCount) {
        if (cards.length >= targetCount || cards.length === 0) return cards;
        const templateCard = cards[cards.length - 1];
        const container = templateCard.parentNode;
        
        for (let i = cards.length; i < targetCount; i++) {
            const clone = templateCard.cloneNode(true);
            clone.removeAttribute('data-framer-name');
            delete clone.dataset.klyperixIdx;
            delete clone.dataset.klyperixHiddenAt;
            container.appendChild(clone);
            cards.push(clone);
        }
        return cards;
    }
    function assignMediaToCards(cards, items) {
        if (!items || items.length === 0 || cards.length === 0) return;


        cards.forEach((card, i) => {
            // Skip already-assigned cards (stability)
            if (card.dataset.klyperixIdx !== undefined && card.dataset.klyperixIdx !== 'hidden') return;

            // Use modulo for seamless repeating in Framer Carousels
            const item = items[i % items.length];
            const mediaUrl = item.media_url || item.thumbnail_url;
            if (!mediaUrl) return;

            card.style.display = '';
            card.style.opacity = '1';
            card.style.visibility = 'visible';
            card.dataset.klyperixIdx = String(i);

            if (isKlyperixVideoUrl(mediaUrl)) {
                const video = getOrCreateKlyperixVideo(card);
                video.dataset.origSrc = mediaUrl;
                if (video.src !== mediaUrl) {
                    video.src = mediaUrl;
                }
                if (item.thumbnail_url) video.poster = item.thumbnail_url;
                video.load();
                // video.play().catch(e => {}); // removed autoplay
                hideInactiveKlyperixMedia(card, video);

                if (!item.thumbnail_url) {
                    generateVideoThumbnail(mediaUrl).then(dataUrl => {
                        if (dataUrl && card.dataset.klyperixIdx === String(i)) video.poster = dataUrl;
                    });
                }
            } else {
                const img = getOrCreateKlyperixImage(card);
                img.dataset.origSrc = mediaUrl;
                if (img.src !== mediaUrl) img.src = mediaUrl;
                hideInactiveKlyperixMedia(card, img);
            }
        });
    }

    window.processFramerDOM = function() {
        if (!contentFetched) return; // Wait until data is loaded

        // ── 5a. VIDEO SLIDERS (short-form and long-form) ──────────────────────
        const videoSliderWrappers = document.querySelectorAll('.video-slider-wrapper');
        videoSliderWrappers.forEach(wrapper => {
            let isLongform = wrapper.classList.contains('slider-longform-mode');
            const anyLongActive = Array.from(document.querySelectorAll('.video-btn.active')).some(btn => btn.dataset.tab === 'long');
            if (anyLongActive) isLongform = true;
            const videoPool   = isLongform ? window.longformImages : window.shortformVideos;
            // DYNAMIC: start from whatever cards exist; ensureCardCount will add more if needed
            let cards = Array.from(wrapper.children).filter(el => el.tagName !== 'SCRIPT');
            if (videoPool.length > 0 && cards.length > 0) {
                assignMediaToCards(cards, videoPool);
            }
        });

        // ── 5b. THUMBNAIL / GRAPHIC SLIDERS ───────────────────────────────────
        const thumbSliderWrappers = document.querySelectorAll('.thumb-slider-wrapper');
        thumbSliderWrappers.forEach(wrapper => {
            let isGraphic  = wrapper.classList.contains('slider-graphic-mode');
            const anyGraphicActive = Array.from(document.querySelectorAll('.thumb-btn.active')).some(btn => btn.dataset.tab === 'graphic');
            if (anyGraphicActive) isGraphic = true;
            const imagePool  = isGraphic ? window.graphicImages : window.thumbnailImages;
            let cards = Array.from(wrapper.querySelectorAll('div[style*="border-radius:"]'))
                .filter(el => !el.closest('.custom-pill-container'));

            if (imagePool.length > 0 && cards.length > 0) {
                assignMediaToCards(cards, imagePool);
                
                                // Enforce Aspect Ratio strictly based on user requirement
                cards.forEach(card => {
                    const img = card.querySelector('img:not(.custom-overlay-img)');
                    if (img) {
                        if (isGraphic) {
                            // Graphic section: use padding-bottom hack to strictly enforce 1:1 ratio
                            card.style.setProperty('position', 'relative', 'important');
                            card.style.setProperty('height', '0', 'important');
                            card.style.setProperty('padding-bottom', '100%', 'important');
                            card.style.setProperty('overflow', 'hidden', 'important');
                            
                            img.style.setProperty('position', 'absolute', 'important');
                            img.style.setProperty('top', '0', 'important');
                            img.style.setProperty('left', '0', 'important');
                            img.style.setProperty('width', '100%', 'important');
                            img.style.setProperty('height', '100%', 'important');
                            img.style.setProperty('object-fit', 'cover', 'important');
                        } else {
                            // Thumbnail section: use relative aspect-ratio so the scrolling marquee doesn't break
                            card.style.removeProperty('padding-bottom');
                            card.style.removeProperty('overflow');
                            card.style.setProperty('height', 'auto', 'important');
                            
                            img.style.setProperty('position', 'relative', 'important');
                            img.style.setProperty('aspect-ratio', '16 / 9', 'important');
                            img.style.setProperty('object-fit', 'cover', 'important');
                            img.style.setProperty('width', '100%', 'important');
                            img.style.setProperty('height', 'auto', 'important');
                            img.style.setProperty('display', 'block', 'important');
                        }
                    }
                });
            }
        });

        // ── 5c. HERO VIDEOS ───────────────────────────────────────────────────
        if (window.heroVideos && window.heroVideos.length > 0) {
            const heroSection = document.querySelector('[data-framer-name="Hero"]');
            if (heroSection) {
                const heroVids = heroSection.querySelectorAll('video');
                heroVids.forEach((vid, i) => {
                    const item = window.heroVideos[i % window.heroVideos.length];
                    if (item && item.media_url && vid.src !== item.media_url) {
                        vid.src = item.media_url;
                        if (item.thumbnail_url) vid.poster = item.thumbnail_url;
                        vid.load();
                    }
                });
            }
        }

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

        // ── 5e. TESTIMONIALS ──────────────────────────────────────────────────
        if (window.clientTestimonials && window.clientTestimonials.length > 0) {
            const testimonials = window.clientTestimonials;

            // Helper: inject data into one card element
            function injectTestimonialIntoCard(card, t) {
                if (!t) return;

                // Review text — framer uses <p class="framer-text ...">
                const reviewEl = card.querySelector('[data-framer-name="Review"] p.framer-text, [data-framer-name="Review"] p, [data-framer-name="Review"]');
                if (reviewEl && t.description) {
                    const span = reviewEl.querySelector('span');
                    if (span) span.textContent = t.description;
                    else reviewEl.textContent = t.description;
                }

                // Avatar image — framer wraps in data-framer-background-image-wrapper
                const clientInfo = card.querySelector('[data-framer-name="Client Info"]');
                if (clientInfo) {
                    const imgWrapper = clientInfo.querySelector('[data-framer-background-image-wrapper="true"] img, img');
                    if (imgWrapper && t.media_url) {
                        imgWrapper.src = t.media_url;
                        imgWrapper.srcset = t.media_url; // clear srcset so it doesn't override
                        imgWrapper.removeAttribute('srcset');
                    }

                    // Name and role from Text Wrap p tags
                    const textWrap = clientInfo.querySelector('[data-framer-name="Text Wrap"]');
                    if (textWrap) {
                        const pTags = textWrap.querySelectorAll('p');
                        if (pTags.length >= 1 && t.title) {
                            const span = pTags[0].querySelector('span');
                            if (span) span.textContent = t.title;
                            else pTags[0].textContent = t.title;
                        }
                        if (pTags.length >= 2) {
                            const val = (t.metadata && t.metadata.role) ? t.metadata.role : (t.metadata && t.metadata.profession) ? t.metadata.profession : '';
                            const span = pTags[1].querySelector('span');
                            if (span) span.textContent = val;
                            else pTags[1].textContent = val;
                        }
                    }
                }
            }

            // ── Desktop/Tablet ticker rows ─────────────────────────────────────
            // Row 1: framer-lw61ut-container, Row 2: framer-mjmwg1-container
            const tickerContainers = document.querySelectorAll('.framer-lw61ut-container, .framer-mjmwg1-container');
            tickerContainers.forEach(function(ticker, tickerIdx) {
                // Cards are inside <section> > <ul> > <li> > .framer-*-container > .framer-HFCqX
                const liItems = ticker.querySelectorAll('ul > li');
                if (!liItems || liItems.length === 0) return;

                liItems.forEach(function(li, i) {
                    const t = testimonials[i % testimonials.length];
                    injectTestimonialIntoCard(li, t);
                });
            });

            // ── Phone ticker ───────────────────────────────────────────────────
            // framer-1on26z4-container wraps the phone card directly (no ul/li)
            const phoneContainers = document.querySelectorAll('.framer-1on26z4-container');
            phoneContainers.forEach(function(container, i) {
                const t = testimonials[i % testimonials.length];
                injectTestimonialIntoCard(container, t);
            });
        }
    };


    // ── 6. Analytics page view ────────────────────────────────────────────────
    function recordPageView() {
        try {
            fetch(API_BASE + '/api/analytics/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_type: 'page_view', path: window.location.pathname })
            }).catch(() => {});
        } catch (e) {}
    }

    // ── 7. Image replacement helper (used by legacy Framer img injection) ─────
    window.applyImageReplacement = function(img, replacement) {
        if (!replacement || !replacement.media_url) return;
        const newSrc = replacement.media_url;
        if (img.src !== newSrc) {
            img.src = newSrc;
            img.srcset = '';
        }
        if (img.parentElement && img.parentElement.style.display === 'none') {
            img.parentElement.style.display = '';
        }

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

        //  5e. Verification Info 
        if (window.siteSettings) {
            const ownerEl = document.getElementById('verify-owner-name');
            const brandEl = document.getElementById('verify-brand-name');
            if (ownerEl && window.siteSettings.owner_name) {
                ownerEl.textContent = window.siteSettings.owner_name;
            }
            if (brandEl && window.siteSettings.brand_name) {
                brandEl.textContent = window.siteSettings.brand_name;
            }
        }
    };


    // ── 8. Stable interval & MutationObserver for Framer dynamic rendering ────
    let pollCount = 0;
    let allAssigned = false;

    function tryAssign() {
        if (!contentFetched) return;
        if (window.processFramerDOM) window.processFramerDOM();

        // Check if sliders exist and all cards are assigned
        const allSliders = document.querySelectorAll('.video-slider-wrapper, .thumb-slider-wrapper');
        if (allSliders.length === 0) return; // Framer hasn't rendered sliders yet

        const hasUnassigned = Array.from(allSliders).some(wrapper => {
            const cards = Array.from(wrapper.children).filter(el => el.tagName !== 'SCRIPT');
            return cards.length > 0 && cards.some(card => !card.dataset.klyperixIdx);
        });

        if (!hasUnassigned) {
            allAssigned = true;
            clearInterval(poll);
            observer.disconnect();
            console.log('[Klyperix] All cards assigned. Polling stopped.');
        }
    }

    // Poll every 500ms for up to 120s (Framer can take time to render)
    const poll = setInterval(() => {
        pollCount++;
        if (pollCount > 240) { clearInterval(poll); return; } // Stop after 120s
        tryAssign();
    }, 500);

    // MutationObserver: trigger immediately when new DOM elements are added by Framer
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
        if (allAssigned) { observer.disconnect(); return; }
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(tryAssign, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // ── 8b. Full Portfolio Lightbox (navigates entire data pool) ──────────────
    (function() {
        let modalEl = null;
        let currentPool = [];
        let currentIdx  = 0;

        // Inject styles once
        if (!document.getElementById('klyperix-lb-styles')) {
            const s = document.createElement('style');
            s.id = 'klyperix-lb-styles';
            s.textContent = [
                '#klyperix-lb{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.88);opacity:0;transition:opacity .25s ease;}',
                '#klyperix-lb.open{opacity:1;}',
                '#klyperix-lb-media{position:relative;max-width:90vw;max-height:88vh;display:flex;align-items:center;justify-content:center;}',
                '#klyperix-lb-media video,#klyperix-lb-media img{max-width:90vw;max-height:85vh;border-radius:16px;object-fit:contain;box-shadow:0 24px 80px rgba(0,0,0,.7);display:block;}',
                '#klyperix-lb-close{position:fixed;top:20px;right:20px;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:26px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;transition:background .2s;}',
                '#klyperix-lb-close:hover{background:rgba(255,255,255,.28);}',
                '.klyperix-lb-nav{position:fixed;top:50%;transform:translateY(-50%);width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:34px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;transition:background .2s,opacity .2s;line-height:1;}',
                '.klyperix-lb-nav:hover{background:rgba(255,255,255,.28);}',
                '#klyperix-lb-prev{left:18px;}',
                '#klyperix-lb-next{right:18px;}',
                '.klyperix-lb-nav.disabled{opacity:.15;pointer-events:none;}',
                '#klyperix-lb-counter{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.5);color:#fff;font-size:14px;padding:5px 18px;border-radius:20px;z-index:10;letter-spacing:.5px;}',
                '@media(max-width:768px){#klyperix-lb-media video,#klyperix-lb-media img{max-height:75vh;border-radius:10px;}.klyperix-lb-nav{width:40px;height:40px;font-size:24px;}#klyperix-lb-prev{left:6px;}#klyperix-lb-next{right:6px;}}'
            ].join('');
            document.head.appendChild(s);
        }

        function buildModal() {
            const el = document.createElement('div');
            el.id = 'klyperix-lb';
            el.setAttribute('role', 'dialog');
            el.setAttribute('aria-modal', 'true');
            el.innerHTML = '<button id="klyperix-lb-close" aria-label="Close">&times;</button>' +
                '<button class="klyperix-lb-nav" id="klyperix-lb-prev" aria-label="Previous">&#8249;</button>' +
                '<div id="klyperix-lb-media" class="modal-media-container"></div>' +
                '<button class="klyperix-lb-nav" id="klyperix-lb-next" aria-label="Next">&#8250;</button>' +
                '<div id="klyperix-lb-counter"></div>';
            document.body.appendChild(el);
            el.querySelector('#klyperix-lb-close').addEventListener('click', closeModal);
            el.querySelector('#klyperix-lb-prev').addEventListener('click', function(ev){ ev.stopPropagation(); navigate(-1); });
            el.querySelector('#klyperix-lb-next').addEventListener('click', function(ev){ ev.stopPropagation(); navigate(1); });
            el.addEventListener('click', function(ev){ if (ev.target === el) closeModal(); });
            return el;
        }

        function showItem(idx) {
            if (idx < 0 || idx >= currentPool.length) return;
            const item = currentPool[idx];
            if (!item) return;
            const mediaEl = modalEl.querySelector('#klyperix-lb-media');
            const prevBtn = modalEl.querySelector('#klyperix-lb-prev');
            const nextBtn = modalEl.querySelector('#klyperix-lb-next');
            const counter = modalEl.querySelector('#klyperix-lb-counter');

            // Stop old video
            const oldV = mediaEl.querySelector('video');
            if (oldV) { oldV.pause(); oldV.src = ''; }

            const url = item.media_url || item.thumbnail_url || '';
            const isV = url && (url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('/video/'));

            mediaEl.innerHTML = '';
            if (isV) {
                const v = document.createElement('video');
                v.src = url;
                const thumb = item.thumbnail_url || url.replace(/\.(mp4|webm|mov|avi)$/i, '.jpg');
                if (thumb) v.poster = thumb;
                v.loop = true; v.playsInline = true;
                v.setAttribute('controlsList', 'nodownload noplaybackrate');
                v.disablePictureInPicture = true;
                v.muted = false; v.volume = 1;
                v.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (v.paused) v.play();
                    else v.pause();
                });
                mediaEl.appendChild(v);
                v.play().catch(function(){});
            } else {
                const img = document.createElement('img');
                img.src = url; img.alt = 'Portfolio item'; img.loading = 'eager';
                mediaEl.appendChild(img);
            }

            currentIdx = idx;
            prevBtn.classList.toggle('disabled', idx <= 0);
            nextBtn.classList.toggle('disabled', idx >= currentPool.length - 1);
            counter.textContent = (idx + 1) + ' / ' + currentPool.length;
        }

        function navigate(dir) {
            const next = currentIdx + dir;
            if (next >= 0 && next < currentPool.length) showItem(next);
        }

        function openModal(pool, startIdx) {
            currentPool = pool;
            if (!modalEl || !document.body.contains(modalEl)) modalEl = buildModal();
            showItem(startIdx);
            requestAnimationFrame(function(){ modalEl.classList.add('open'); });
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            if (!modalEl) return;
            const v = modalEl.querySelector('video');
            if (v) { v.pause(); v.src = ''; }
            modalEl.classList.remove('open');
            setTimeout(function(){ if (modalEl){ modalEl.remove(); modalEl = null; } }, 270);
            document.body.style.overflow = '';
        }

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (!modalEl || !modalEl.classList.contains('open')) return;
            if (e.key === 'Escape')     closeModal();
            if (e.key === 'ArrowRight') navigate(1);
            if (e.key === 'ArrowLeft')  navigate(-1);
        });

        // Intercept card clicks (capture phase runs before Framer's own handler)
        document.addEventListener('click', function(e) {
            // Pill / tab toggle: just reset indices
            if (e.target.closest('.thumb-btn') || e.target.closest('.video-btn') || e.target.closest('.pill-btn')) {
                setTimeout(function(){
                    document.querySelectorAll('.video-slider-wrapper div[style*="border-radius:"], .thumb-slider-wrapper div[style*="border-radius:"]').forEach(function(card){
                        delete card.dataset.klyperixIdx;
                        delete card.dataset.klyperixHiddenAt;
                    });
                    if (window.processFramerDOM) window.processFramerDOM();
                }, 100);
                return;
            }

            // Portfolio card click
            var card = e.target.closest('.video-slider-wrapper > div') ||
                       e.target.closest('.thumb-slider-wrapper div[style*="border-radius:"]');
            if (!card) return;

            e.preventDefault();
            e.stopImmediatePropagation();

            var wrapper = card.closest('.video-slider-wrapper') || card.closest('.thumb-slider-wrapper');
            var pool = [];
            if (wrapper) {
                let isLong    = wrapper.classList.contains('slider-longform-mode');
                const anyLongActive = Array.from(document.querySelectorAll('.video-btn.active')).some(btn => btn.dataset.tab === 'long');
                if (anyLongActive) isLong = true;
                
                let isGraphic = wrapper.classList.contains('slider-graphic-mode');
                const anyGraphicActive = Array.from(document.querySelectorAll('.thumb-btn.active')).some(btn => btn.dataset.tab === 'graphic');
                if (anyGraphicActive) isGraphic = true;
                var isVideo   = wrapper.classList.contains('video-slider-wrapper');
                if (isVideo) {
                    pool = isLong ? (window.longformImages || []) : (window.shortformVideos || []);
                } else {
                    pool = isGraphic ? (window.graphicImages || []) : (window.thumbnailImages || []);
                }
            }
            if (pool.length === 0) return;

            var rawIdx   = parseInt(card.dataset.klyperixIdx, 10);
            var startIdx = isNaN(rawIdx) ? 0 : rawIdx % pool.length;
            openModal(pool, startIdx);

        }, true); // capture = true so we beat Framer's own click handler

        window.klyperixLightbox = { open: openModal, close: closeModal };
    })();

    // ── 9. Start ──────────────────────────────────────────────────────────────
    recordPageView();
    syncContents();
    syncSettings();

})();
