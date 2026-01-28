// Atrak - Modern Tech Team Website JavaScript

const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const enableHoverEffects = hasFinePointer && !prefersReducedMotion;
const enableHeroParallax = enableHoverEffects;
const supportsIntersectionObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;

// Custom Cursor
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

if (cursorDot && cursorOutline && !prefersReducedMotion && hasFinePointer) {
    document.body.classList.add('cursor-enabled');

    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });

    document.querySelectorAll('a, button, .project-card').forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorDot.classList.add('active');
            cursorOutline.classList.add('active');
        });
        el.addEventListener('mouseleave', () => {
            cursorDot.classList.remove('active');
            cursorOutline.classList.remove('active');
        });
    });
}

// Glass Card Mouse Tracker
document.querySelectorAll('.glass-card, .project-card, .stat-item').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// Scroll Reveal (fails open so content never gets stuck hidden)
if (supportsIntersectionObserver && !prefersReducedMotion) {
    const revealElements = Array.from(document.querySelectorAll('.reveal'));
    const autoRevealElements = Array.from(document.querySelectorAll('.project-card, .leader-card, .stat-item, .feature'));

    autoRevealElements.forEach(el => el.classList.add('reveal'));

    const allRevealElements = Array.from(new Set([...revealElements, ...autoRevealElements]));
    const viewportHeight = window.innerHeight || 0;

    allRevealElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < viewportHeight && rect.bottom > 0) {
            el.classList.add('active');
        }
    });

    document.body.classList.add('reveal-enabled');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    allRevealElements.forEach(el => {
        if (!el.classList.contains('active')) {
            revealObserver.observe(el);
        }
    });
} else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
}

// Hero Parallax
const hero = document.querySelector('.hero');
if (hero && enableHeroParallax) {
    window.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
        
        const cards = hero.querySelectorAll('.floating-card');
        cards.forEach((card, index) => {
            const depth = (index + 1) * 0.5;
            card.style.transform = `translate(${moveX * depth}px, ${moveY * depth}px) rotate(${moveX * 0.5}px)`;
        });
    });
}

// Infinite Card Rotation
const cardStack = document.getElementById('card-stack');
if (cardStack) {
    const cards = Array.from(cardStack.querySelectorAll('.visual-card'));
    
    // Function to rotate classes
    const rotateCards = () => {
        // Find current active card
        const currentActiveIndex = cards.findIndex(card => card.classList.contains('active'));
        
        // Calculate new indices
        const nextActiveIndex = (currentActiveIndex + 1) % cards.length;
        const nextNextIndex = (currentActiveIndex + 2) % cards.length;
        
        // Reset all classes first
        cards.forEach(card => {
            card.classList.remove('active', 'next', 'back', 'closed');
        });
        
        // Assign new classes
        cards[currentActiveIndex].classList.add('back'); // Old active goes to back
        cards[nextActiveIndex].classList.add('active'); // Next becomes active
        cards[nextNextIndex].classList.add('next'); // The one after becomes next
        
        // All others stay 'back' (already handled by reset) or can be specifically targeted
        cards.forEach((card, index) => {
            if (index !== nextActiveIndex && index !== nextNextIndex) {
                card.classList.add('back');
            }
        });
    };

    // Attach click listeners to all close buttons
    cards.forEach((card, index) => {
        const closeBtn = card.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Only rotate if clicking the active card
                if (card.classList.contains('active')) {
                    // Animate out
                    card.classList.add('closed');
                    
                    // Wait for animation then rotate
                    setTimeout(() => {
                        rotateCards();
                    }, 400); // Slightly faster than CSS transition to feel snappy
                }
            });
        }
    });
}

// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const navbar = document.querySelector('.navbar');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });
}

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
            const navHeight = navbar ? navbar.getBoundingClientRect().height : 0;
            const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            
            // Close mobile menu if open
            if (navLinks && mobileMenuBtn && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        }
    });
});

// Consolidated Scroll Handler with Throttling
let lastScroll = 0;
let ticking = false;
const floatingCards = document.querySelectorAll('.floating-card');
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

function handleScroll() {
    const currentScroll = window.pageYOffset;
    
    // Navbar effect
    if (navbar) {
        if (currentScroll <= 0) {
            navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        } else {
            navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        }
    }
    
    // Parallax effect for hero visual (desktop only)
    if (floatingCards.length) {
        if (enableHeroParallax) {
            floatingCards.forEach((card, index) => {
                const speed = 0.5 + (index * 0.1);
                card.style.setProperty('--parallax-y', `${currentScroll * speed}px`);
            });
        } else {
            floatingCards.forEach(card => card.style.setProperty('--parallax-y', '0px'));
        }
    }
    
    // Active navigation highlighting
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (currentScroll >= sectionTop - 150) {
            current = section.getAttribute('id');
        }
    });
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${current}`) {
            item.classList.add('active');
        }
    });
    
    lastScroll = currentScroll;
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
            handleScroll();
        });
    }
});

// Dynamic Stats Counter
const stats = document.querySelectorAll('.stat-number');
let statsAnimated = false;

const animateStats = () => {
    stats.forEach(stat => {
        const target = stat.textContent;
        const isNumber = /^\d+/.test(target);
        
        if (isNumber) {
            const number = parseInt(target, 10);
            const increment = number / 50;
            let current = 0;
            
            const updateCounter = setInterval(() => {
                current += increment;
                if (current >= number) {
                    stat.textContent = target;
                    clearInterval(updateCounter);
                } else {
                    stat.textContent = Math.floor(current) + target.replace(/^\d+/, '');
                }
            }, 30);
        }
    });
};

if (supportsIntersectionObserver) {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !statsAnimated) {
                animateStats();
                statsAnimated = true;
            }
        });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }
}

// Project Card Tilt Effect
const projectCards = document.querySelectorAll('.project-card');

// Make project cards clickable (opens the "Details" link)
projectCards.forEach(card => {
    if (!card || card.tagName === 'A') return;

    const detailsLink = card.querySelector('.project-actions a[href]');
    if (!detailsLink) return;

    const href = detailsLink.getAttribute('href');
    if (!href) return;

    card.setAttribute('role', 'link');
    if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
    }

    const navigate = () => {
        window.location.href = href;
    };

    card.addEventListener('click', (e) => {
        if (e.target && e.target.closest && e.target.closest('a, button, input, textarea, select, label')) {
            return;
        }
        navigate();
    });

    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate();
        }
    });
});

if (enableHoverEffects) {
    projectCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// Leader Card Hover Effect
const leaderCards = document.querySelectorAll('.leader-card');

if (enableHoverEffects) {
    leaderCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            leaderCards.forEach(otherCard => {
                if (otherCard !== card) {
                    otherCard.style.opacity = '0.5';
                }
            });
        });

        card.addEventListener('mouseleave', () => {
            leaderCards.forEach(otherCard => {
                otherCard.style.opacity = '1';
            });
        });
    });
}

// Forms (Suggestion Box + Join/Contact)
const formConfig = (window.ATRAK_CONFIG && typeof window.ATRAK_CONFIG === 'object')
    ? window.ATRAK_CONFIG
    : (window.LUNARWEB_CONFIG && typeof window.LUNARWEB_CONFIG === 'object')
        ? window.LUNARWEB_CONFIG
        : {};
const configuredFormEndpoints = formConfig.forms && typeof formConfig.forms === 'object' ? formConfig.forms : {};

const getFormEndpoint = (form) => {
    const endpointKey = (form.dataset.endpointKey || '').trim();
    if (endpointKey && typeof configuredFormEndpoints[endpointKey] === 'string') {
        const configured = configuredFormEndpoints[endpointKey].trim();
        if (configured) return configured;
    }

    if (typeof configuredFormEndpoints.default === 'string') {
        const configuredDefault = configuredFormEndpoints.default.trim();
        if (configuredDefault) return configuredDefault;
    }

    const datasetEndpoint = (form.dataset.endpoint || '').trim();
    if (datasetEndpoint) return datasetEndpoint;

    return (form.action || '').trim();
};

const setFormStatus = (statusEl, message, state) => {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.remove('is-success', 'is-error', 'is-pending');
    if (state) statusEl.classList.add(state);
};

const setupCharCounters = (form) => {
    const counters = Array.from(form.querySelectorAll('[data-char-count]'));
    const updates = [];

    counters.forEach(counter => {
        const targetId = counter.getAttribute('data-char-count');
        if (!targetId) return;

        const target = document.getElementById(targetId);
        if (!target) return;

        const max = Number.parseInt(target.getAttribute('maxlength') || '', 10) || target.maxLength || 0;
        const update = () => {
            const length = (target.value || '').length;
            counter.textContent = max ? `${length}/${max}` : `${length}`;
        };

        target.addEventListener('input', update);
        updates.push(update);
        update();
    });

    return () => updates.forEach(fn => fn());
};

const wireAsyncForm = (form, options) => {
    if (!form) return;

    const statusEl = form.querySelector('.form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    const messageEl = form.querySelector('textarea[name="message"]');
    const minMessageLength = Number.isFinite(options.minMessageLength) ? options.minMessageLength : 10;
    const successMessage = options.successMessage || 'Sent.';
    const updateCharCounts = setupCharCounters(form);

    const setStatus = (message, state) => setFormStatus(statusEl, message, state);

    const resolveEndpoint = () => {
        const endpoint = getFormEndpoint(form);
        return endpoint ? endpoint.trim() : '';
    };

    const isEndpointConfigured = (endpoint) => Boolean(endpoint) && !endpoint.includes('REPLACE_ME');

    // If the form isn't configured, disable submit up-front so users don't type a long message then fail.
    const initialEndpoint = resolveEndpoint();
    if (!isEndpointConfigured(initialEndpoint)) {
        if (submitButton) submitButton.disabled = true;
        setStatus('This form is not active yet. Please check back later.', null);
        console.warn('[Atrak] Form endpoint is not configured. Update config.js with your Formspree form ID.');
    }

    form.addEventListener('input', () => {
        if (statusEl && statusEl.classList.contains('is-error')) {
            setStatus('', null);
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            setStatus('Please check the highlighted fields.', 'is-error');
            return;
        }

        if (messageEl) {
            const message = messageEl.value.trim();
            if (message.length < minMessageLength) {
                setStatus(`Please write at least ${minMessageLength} characters.`, 'is-error');
                messageEl.focus();
                return;
            }
        }

        const honeypot = form.querySelector('input[name="_gotcha"]');
        if (honeypot && honeypot.value) {
            form.reset();
            updateCharCounts();
            setStatus(successMessage, 'is-success');
            return;
        }

        const endpoint = resolveEndpoint();
        if (!isEndpointConfigured(endpoint)) {
            setStatus('This form is not active yet. Please check back later.', 'is-error');
            return;
        }

        if (form.action !== endpoint) form.action = endpoint;

        const originalButtonText = submitButton ? submitButton.textContent : '';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Sending…';
        }
        form.setAttribute('aria-busy', 'true');
        setStatus('Sending…', 'is-pending');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' }
            });

            if (response.ok) {
                form.reset();
                updateCharCounts();
                setStatus(successMessage, 'is-success');
                return;
            }

            let errorMessage = 'Something went wrong. Please try again.';
            try {
                const data = await response.json();
                if (data && Array.isArray(data.errors) && data.errors[0] && data.errors[0].message) {
                    errorMessage = data.errors[0].message;
                }
            } catch (_) {
                // ignore JSON parsing errors
            }

            setStatus(errorMessage, 'is-error');
        } catch (_) {
            setStatus('Network error. Please try again.', 'is-error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
            form.removeAttribute('aria-busy');
        }
    });
};

wireAsyncForm(document.querySelector('#suggestion-form'), {
    minMessageLength: 10,
    successMessage: 'Thanks — your suggestion was sent.'
});

wireAsyncForm(document.querySelector('#join-form'), {
    minMessageLength: 20,
    successMessage: 'Thanks — your message was sent. We’ll reply soon.'
});

wireAsyncForm(document.querySelector('#security-form'), {
    minMessageLength: 30,
    successMessage: 'Thanks — your security report was sent.'
});

const initSharePage = () => {
    const shareRoot = document.querySelector('[data-share-page]');
    if (!shareRoot) return;

    const shareUrl = (shareRoot.dataset.shareUrl || '').trim()
        || (window.location && window.location.origin ? window.location.origin : '');
    const shareText = (shareRoot.dataset.shareText || '').trim()
        || 'Atrak — student tech team building AI, accessibility, and real-world software projects.';
    const shareTitle = (shareRoot.dataset.shareTitle || '').trim() || 'Atrak';

    const shareUrlInput = document.getElementById('share-url');
    const statusEl = document.getElementById('share-status');
    const copyButton = document.getElementById('share-copy');
    const nativeButton = document.getElementById('share-native');
    const xLink = document.getElementById('share-x');
    const linkedinLink = document.getElementById('share-linkedin');

    const setStatus = (message, state) => setFormStatus(statusEl, message, state);

    if (shareUrlInput && shareUrl) {
        shareUrlInput.value = shareUrl;
        shareUrlInput.addEventListener('focus', () => shareUrlInput.select());
    }

    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            if (!shareUrl) return;
            try {
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(shareUrl);
                    setStatus('Copied to clipboard.', 'is-success');
                    return;
                }

                if (shareUrlInput) {
                    shareUrlInput.select();
                    setStatus('Select the link and copy it.', 'is-pending');
                    return;
                }
            } catch (_) {
                // fall through
            }

            setStatus('Copy failed. Please copy the link manually.', 'is-error');
        });
    }

    if (nativeButton) {
        const canShare = typeof navigator.share === 'function';
        if (!canShare) {
            nativeButton.style.display = 'none';
        } else {
            nativeButton.addEventListener('click', async () => {
                if (!shareUrl) return;
                try {
                    await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
                } catch (err) {
                    if (err && err.name === 'AbortError') return;
                    setStatus('Could not open the share dialog.', 'is-error');
                }
            });
        }
    }

    const encodedUrl = encodeURIComponent(shareUrl || '');
    const encodedText = encodeURIComponent(shareText || '');

    if (xLink) {
        xLink.href = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    }

    if (linkedinLink) {
        linkedinLink.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    }
};

initSharePage();

// Cursor Follow Effect (Optional - for enhanced UX)
// Only enable if the page doesn't already use the dot/outline cursor.
if (enableHoverEffects && !cursorDot && !cursorOutline) {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    let cursorX = 0;
    let cursorY = 0;
    let cursorTicking = false;

    function updateCursor() {
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        cursorTicking = false;
    }

    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;

        if (!cursorTicking) {
            cursorTicking = true;
            window.requestAnimationFrame(updateCursor);
        }
    });

    // Add hover effects
    document.querySelectorAll('a, button').forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.style.transform = 'scale(1.5)';
            cursor.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        });

        element.addEventListener('mouseleave', () => {
            cursor.style.transform = 'scale(1)';
            cursor.style.backgroundColor = 'transparent';
        });
    });

    // Add custom cursor styles
    const style = document.createElement('style');
    style.textContent = `
        .custom-cursor {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(59, 130, 246, 0.5);
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            transition: transform 0.2s ease;
            display: none;
        }

        @media (min-width: 1024px) {
            .custom-cursor {
                display: block;
            }
        }
    `;
    document.head.appendChild(style);
}

// Console Message
console.log('%cAtrak ', 'background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 8px 16px; border-radius: 4px; font-size: 16px; font-weight: bold;');
console.log('%cBuilding the future, one line of code at a time.', 'color: #a0a0a0; font-size: 12px;');

// Helper to initialize a single timeline item's interactions
const initTimelineItem = (item, node) => {
    const toggleExpand = () => {
        const isExpanded = item.getAttribute('data-expanded') === 'true';
        item.setAttribute('data-expanded', !isExpanded);
        node.setAttribute('aria-expanded', !isExpanded);

        if (!isExpanded) {
            try {
                item.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            } catch (_) {
                // ignore scroll errors
            }
        }
        
        // Announce change for screen readers
        const title = item.querySelector('.update-title')?.textContent || 'Timeline item';
        const announcement = !isExpanded ? `${title} expanded` : `${title} collapsed`;
        announceToScreenReader(announcement);
    };
    
    // Click event
    node.addEventListener('click', toggleExpand);
    
    // Keyboard support (Enter and Space)
    node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpand();
        }
    });
    
    // Enhanced hover effects
    node.addEventListener('mouseenter', () => {
        if (!prefersReducedMotion) {
            item.style.transition = 'all 0.3s ease';
        }
    });
};

// Timeline Interactive Features
const initTimeline = () => {
    const timelineItems = document.querySelectorAll('.timeline-item');
    const timelineNodes = document.querySelectorAll('.timeline-node');

    const timelineScroll = document.querySelector('.timeline-scroll');
    if (timelineScroll) {
        timelineScroll.addEventListener('wheel', (e) => {
            const canScrollHorizontally = timelineScroll.scrollWidth > timelineScroll.clientWidth;
            if (!canScrollHorizontally) return;

            const dominantVerticalScroll = Math.abs(e.deltaY) > Math.abs(e.deltaX);
            if (!e.shiftKey && dominantVerticalScroll) {
                timelineScroll.scrollLeft += e.deltaY;
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    timelineNodes.forEach((node, index) => {
        const item = timelineItems[index];
        if (item) {
            initTimelineItem(item, node);
        }
    });
};

// Helper function to announce changes to screen readers
const announceToScreenReader = (message) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
};

// Initialize timeline when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimeline);
} else {
    initTimeline();
}

// Add timeline items to intersection observer for reveal animations
if (supportsIntersectionObserver) {
    const timelineItemsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.timeline-item').forEach(item => {
        timelineItemsObserver.observe(item);
    });
}

// Dynamic timeline update function
// Adds a new timeline item. Position can be 'start' (default) or 'end'
window.addTimelineItem = function(data, position = 'start') {
    const container = document.querySelector('.timeline-container');
    if (!container) return;
    
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.setAttribute('data-expanded', 'false');
    
    item.innerHTML = `
        <div class="timeline-node" tabindex="0" role="button" aria-expanded="false" aria-label="${data.date} - ${data.title}">
            <div class="node-dot"></div>
            <div class="node-glow"></div>
        </div>
        <div class="timeline-content">
            <div class="timeline-header">
                <div class="update-date">${data.date}</div>
                <h3 class="update-title">${data.title}</h3>
            </div>
            <p class="update-description">${data.description}</p>
            <div class="update-tags">
                ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="timeline-details">
                <p>${data.details || ''}</p>
            </div>
        </div>
    `;
    
    // Insert at specified position
    if (position === 'end') {
        container.appendChild(item);
    } else {
        container.insertBefore(item, container.firstChild);
    }
    
    // Initialize interactions for the new item only
    const node = item.querySelector('.timeline-node');
    if (node) {
        initTimelineItem(item, node);
    }
    
    // Announce addition to screen readers
    announceToScreenReader(`New timeline item added: ${data.title}`);
    
    return item;
};

// Prevent default link behavior for demo links
document.querySelectorAll('a[href="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.getAttribute('href') === '#') {
            e.preventDefault();
        }
    });
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Performance: Reduce animations on low-end devices
if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    document.body.classList.add('reduce-motion');
}

// Project Tabs Functionality
const projectTabs = document.querySelectorAll('.project-tab');
const projectTabContents = document.querySelectorAll('.project-tab-content');

projectTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        
        // Remove active class from all tabs and contents
        projectTabs.forEach(t => t.classList.remove('active'));
        projectTabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const targetContent = document.getElementById(`${targetTab}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
            
            // Load GitHub projects when switching to More Projects tab
            if (targetTab === 'more' && window.GitHubProjects && typeof window.GitHubProjects.renderMoreProjects === 'function') {
                window.GitHubProjects.renderMoreProjects();
            }
        }
    });
});

// Deep link: open "More Projects" tab when linked from other pages (e.g. /projects/github-project.html)
if (projectTabs.length) {
    const hash = (window.location && typeof window.location.hash === 'string')
        ? window.location.hash.toLowerCase()
        : '';

    if (hash === '#more-projects') {
        const moreTab = document.querySelector('.project-tab[data-tab="more"]');
        if (moreTab) moreTab.click();
    }
}

// ================================
// Contact Tabs (Index Page)
// ================================
const initContactTabs = () => {
    const tabs = Array.from(document.querySelectorAll('.contact-tab'));
    const panels = Array.from(document.querySelectorAll('.contact-tab-content'));
    if (!tabs.length || !panels.length) return;

    const validTabs = new Set(tabs.map(tab => (tab.dataset.tab || '').trim()).filter(Boolean));

    const setActiveTab = (tabName) => {
        const target = (tabName || '').trim();
        if (!target || !validTabs.has(target)) return;

        tabs.forEach(tab => {
            const isActive = (tab.dataset.tab || '').trim() === target;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.tabIndex = isActive ? 0 : -1;
        });

        panels.forEach(panel => {
            const isActive = (panel.dataset.tab || '').trim() === target;
            panel.classList.toggle('active', isActive);
        });
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));

        tab.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();

            const currentIndex = tabs.indexOf(tab);
            if (currentIndex < 0) return;

            const delta = e.key === 'ArrowRight' ? 1 : -1;
            const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
            const nextTab = tabs[nextIndex];
            if (!nextTab) return;

            setActiveTab(nextTab.dataset.tab);
            nextTab.focus();
        });
    });

    document.addEventListener('click', (e) => {
        const link = e.target && e.target.closest ? e.target.closest('[data-open-contact-tab]') : null;
        if (!link) return;
        const desiredTab = (link.dataset.openContactTab || '').trim();
        if (!desiredTab) return;
        setActiveTab(desiredTab);
    });

    const initialHash = (window.location && typeof window.location.hash === 'string')
        ? window.location.hash.toLowerCase()
        : '';
    const initialActive = tabs.find(tab => tab.classList.contains('active'));
    setActiveTab(initialActive ? initialActive.dataset.tab : tabs[0].dataset.tab);

    if (initialHash === '#contact-apply' || initialHash === '#apply') setActiveTab('apply');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactTabs);
} else {
    initContactTabs();
}

// ================================
// Run Tabs (Project Pages)
// ================================
const runTabs = document.querySelectorAll('.run-tab');
if (runTabs.length) {
    runTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active from all tabs
            runTabs.forEach(t => t.classList.remove('active'));
            
            // Hide all content
            document.querySelectorAll('.run-content').forEach(content => {
                content.classList.add('hidden');
            });
            
            // Activate clicked tab and show content
            tab.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-content`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });
}

// ================================
// Media Carousels (Project Demo Screenshots)
// ================================
const initMediaCarousels = () => {
    const carousels = Array.from(document.querySelectorAll('[data-carousel]'));
    if (!carousels.length) return;

    carousels.forEach(carousel => {
        const track = carousel.querySelector('[data-carousel-track]');
        if (!track) return;

        const slides = Array.from(track.querySelectorAll('.carousel-slide'));
        if (!slides.length) return;

        const prevBtn = carousel.querySelector('[data-carousel-prev]');
        const nextBtn = carousel.querySelector('[data-carousel-next]');

        const getCurrentIndex = () => {
            const center = track.scrollLeft + (track.clientWidth / 2);
            let bestIndex = 0;
            let bestDistance = Number.POSITIVE_INFINITY;

            slides.forEach((slide, idx) => {
                const slideCenter = slide.offsetLeft + (slide.clientWidth / 2);
                const dist = Math.abs(slideCenter - center);
                if (dist < bestDistance) {
                    bestDistance = dist;
                    bestIndex = idx;
                }
            });

            return bestIndex;
        };

        const scrollToIndex = (index) => {
            const clamped = Math.max(0, Math.min(slides.length - 1, Number(index) || 0));
            const target = slides[clamped];
            if (!target) return;
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        };

        const updateControls = () => {
            const canScroll = track.scrollWidth > track.clientWidth + 4;
            if (prevBtn) prevBtn.hidden = !canScroll;
            if (nextBtn) nextBtn.hidden = !canScroll;
            if (!canScroll) return;

            const idx = getCurrentIndex();
            if (prevBtn) prevBtn.disabled = idx <= 0;
            if (nextBtn) nextBtn.disabled = idx >= slides.length - 1;
        };

        if (prevBtn && !prevBtn.dataset.bound) {
            prevBtn.dataset.bound = 'true';
            prevBtn.addEventListener('click', () => scrollToIndex(getCurrentIndex() - 1));
        }

        if (nextBtn && !nextBtn.dataset.bound) {
            nextBtn.dataset.bound = 'true';
            nextBtn.addEventListener('click', () => scrollToIndex(getCurrentIndex() + 1));
        }

        let raf = 0;
        track.addEventListener('scroll', () => {
            if (raf) return;
            raf = window.requestAnimationFrame(() => {
                raf = 0;
                updateControls();
            });
        }, { passive: true });

        window.addEventListener('resize', updateControls, { passive: true });
        updateControls();
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMediaCarousels);
} else {
    initMediaCarousels();
}
