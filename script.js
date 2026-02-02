
// Main JavaScript for Atrak - Modern Tech Team Website
// This file handles UI interactions, accessibility, animations, forms, and more.


// Accessibility and feature detection
// Use "any-*" queries so hybrid laptops (touch + trackpad/mouse) keep desktop effects.
const supportsMediaQueries = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
const prefersReducedMotion = supportsMediaQueries
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
const hasAnyHover = supportsMediaQueries
    ? (window.matchMedia('(hover: hover)').matches || window.matchMedia('(any-hover: hover)').matches)
    : true;
const hasAnyFinePointer = supportsMediaQueries
    ? (window.matchMedia('(pointer: fine)').matches || window.matchMedia('(any-pointer: fine)').matches)
    : true;
// Back-compat name used by some blocks below.
const hasFinePointer = hasAnyFinePointer;
const enableHoverEffects = hasAnyHover && hasAnyFinePointer && !prefersReducedMotion;
const enableHeroParallax = enableHoverEffects;
const supportsIntersectionObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;


// ================================
// Custom Cursor
// ================================
// Adds a custom dot/outline cursor for desktop users with fine pointer
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');


if (cursorDot && cursorOutline && !prefersReducedMotion && hasFinePointer) {
    document.body.classList.add('cursor-enabled');

    // Move cursor elements on mouse move
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

    // Cursor hover effect for interactive elements
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


// ================================
// Glass Card Mouse Tracker
// ================================
// Tracks mouse position for glass/project/stat cards for interactive effects
document.querySelectorAll('.glass-card, .project-card, .stat-item').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// ================================
// Scroll Reveal (fails open so content never gets stuck hidden)
// ================================
// Reveals elements as they enter the viewport
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

    // Make observer available globally for dynamic content
    window.revealObserver = revealObserver;

    allRevealElements.forEach(el => {
        if (!el.classList.contains('active')) {
            revealObserver.observe(el);
        }
    });
} else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
}

// ================================
// Hero Parallax
// ================================
// Adds parallax effect to hero section cards
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

// ================================
// Infinite Card Rotation
// ================================
// Rotates visual cards in a stack with animation
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


// ================================
// Mobile Menu Toggle
// ================================
// Handles mobile navigation menu open/close
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const navbar = document.querySelector('.navbar');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });
}

// ================================
// Smooth Scroll for Navigation Links
// ================================
// Smoothly scrolls to anchor targets and closes mobile menu
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


// ================================
// Consolidated Scroll Handler with Throttling
// ================================
// Handles navbar background, parallax, and nav highlighting on scroll
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

// ================================
// Dynamic Stats Counter
// ================================
// Animates numbers in stats section when visible
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

// ================================
// Project Card Tilt Effect
// ================================
// Adds 3D tilt and click/keyboard navigation to project cards
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

// ================================
// Leader Card Hover Effect
// ================================
// Dims other leader cards on hover for focus effect
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


// ================================
// Forms (Suggestion Box + Join/Contact)
// ================================
// Handles async form submission, validation, and feedback
const formConfig = (window.ATRAK_CONFIG && typeof window.ATRAK_CONFIG === 'object')
    ? window.ATRAK_CONFIG
    : (window.LUNARWEB_CONFIG && typeof window.LUNARWEB_CONFIG === 'object')
        ? window.LUNARWEB_CONFIG
        : {};
const configuredFormEndpoints = formConfig.forms && typeof formConfig.forms === 'object' ? formConfig.forms : {};

// Determines the endpoint for a given form
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

// Updates the form status message and state
const setFormStatus = (statusEl, message, state) => {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.remove('is-success', 'is-error', 'is-pending');
    if (state) statusEl.classList.add(state);
};

// Sets up live character counters for form fields
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

// Wires up async form submission and validation
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

        // Clear previous errors
        form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        form.querySelectorAll('input, textarea, select').forEach(field => {
            field.setAttribute('aria-invalid', 'false');
        });

        if (!form.checkValidity()) {
            // Show field-specific errors
            form.querySelectorAll('input:invalid, textarea:invalid, select:invalid').forEach(field => {
                const errorId = field.getAttribute('aria-describedby')?.split(' ').find(id => id.includes('error'));
                const errorEl = errorId ? document.getElementById(errorId) : null;
                field.setAttribute('aria-invalid', 'true');
                
                if (errorEl) {
                    if (field.validity.valueMissing) {
                        errorEl.textContent = 'This field is required.';
                    } else if (field.validity.typeMismatch && field.type === 'email') {
                        errorEl.textContent = 'Please enter a valid email address.';
                    } else if (field.validity.tooShort) {
                        errorEl.textContent = `Please enter at least ${field.minLength} characters.`;
                    } else if (field.validity.tooLong) {
                        errorEl.textContent = `Please enter no more than ${field.maxLength} characters.`;
                    } else {
                        errorEl.textContent = 'Please check this field.';
                    }
                }
            });
            
            form.reportValidity();
            setStatus('Please check the highlighted fields.', 'is-error');
            showToast('Please check the form fields for errors.', 'error');
            return;
        }

        if (messageEl) {
            const message = messageEl.value.trim();
            if (message.length < minMessageLength) {
                const errorId = messageEl.getAttribute('aria-describedby')?.split(' ').find(id => id.includes('error'));
                const errorEl = errorId ? document.getElementById(errorId) : null;
                if (errorEl) {
                    errorEl.textContent = `Please write at least ${minMessageLength} characters.`;
                }
                messageEl.setAttribute('aria-invalid', 'true');
                setStatus(`Please write at least ${minMessageLength} characters.`, 'is-error');
                messageEl.focus();
                showToast(`Please write at least ${minMessageLength} characters.`, 'error');
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
                // Clear all errors
                form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
                form.querySelectorAll('input, textarea, select').forEach(field => {
                    field.setAttribute('aria-invalid', 'false');
                });
                setStatus(successMessage, 'is-success');
                showToast(successMessage, 'success');
                return;
            }

            let errorMessage = 'Something went wrong. Please try again.';
            try {
                const data = await response.json();
                if (data && Array.isArray(data.errors) && data.errors[0] && data.errors[0].message) {
                    errorMessage = data.errors[0].message;
                } else if (data && data.error) {
                    errorMessage = data.error;
                }
            } catch (_) {
                // ignore JSON parsing errors
            }

            setStatus(errorMessage, 'is-error');
            showToast(errorMessage, 'error');
        } catch (error) {
            const errorMessage = error.message?.includes('Failed to fetch') || error.message?.includes('network')
                ? 'Network error. Please check your connection and try again.'
                : 'Network error. Please try again.';
            setStatus(errorMessage, 'is-error');
            showToast(errorMessage, 'error');
            
            // Add retry button
            if (submitButton) {
                const retryBtn = document.createElement('button');
                retryBtn.type = 'button';
                retryBtn.className = 'btn btn-secondary btn-sm';
                retryBtn.textContent = 'Retry';
                retryBtn.style.marginTop = '8px';
                retryBtn.addEventListener('click', () => {
                    retryBtn.remove();
                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                });
                statusEl?.parentNode?.insertBefore(retryBtn, statusEl.nextSibling);
            }
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

// ================================
// Share Page Functionality
// ================================
// Handles sharing links, copy, and social buttons
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

// ================================
// Cursor Follow Effect (Optional - for enhanced UX)
// ================================
// Adds a simple custom cursor if dot/outline cursor is not present
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

// Helper to initialize a single timeline item's interactions (expand/collapse)
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

// ================================
// Timeline Interactive Features
// ================================
// Handles timeline expand/collapse and horizontal scroll
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

// Helper function to announce changes to screen readers (for accessibility)
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


// ================================
// Project Tabs Functionality
// ================================
// Handles switching between project tabs and loading more projects
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
            
            // Activate reveal animations for elements in this tab
            targetContent.querySelectorAll('.reveal:not(.active)').forEach(el => {
                el.classList.add('active');
            });
            
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
// Handles switching between contact/join tabs
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
// Handles switching between run tabs on project pages
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
// Handles media carousels for project demo screenshots
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

// ============================================
// KEYBOARD NAVIGATION ENHANCEMENTS
// ============================================
// Improves accessibility for keyboard users

// Create live region for screen reader announcements
const liveRegion = document.createElement('div');
liveRegion.setAttribute('role', 'status');
liveRegion.setAttribute('aria-live', 'polite');
liveRegion.setAttribute('aria-atomic', 'true');
liveRegion.className = 'live-region';
document.body.appendChild(liveRegion);

function announceToScreenReader(message) {
    liveRegion.textContent = message;
    // Clear after announcement
    setTimeout(() => {
        liveRegion.textContent = '';
    }, 1000);
}

// Esc key to close modals, menus, and overlays
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        // Close mobile menu if open
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navLinks = document.querySelector('.nav-links');
        if (mobileMenuBtn && navLinks && navLinks.classList.contains('active')) {
            mobileMenuBtn.click();
            announceToScreenReader('Mobile menu closed');
        }
        
        // Close any open modals or overlays
        const modals = document.querySelectorAll('[role="dialog"], .modal, .overlay');
        modals.forEach(modal => {
            if (modal.style.display !== 'none' && modal.getAttribute('aria-hidden') !== 'true') {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                // Return focus to trigger element if it exists
                const trigger = document.querySelector(`[aria-controls="${modal.id}"]`);
                if (trigger) trigger.focus();
                announceToScreenReader('Dialog closed');
            }
        });
        
        // Close expanded timeline items
        const expandedItems = document.querySelectorAll('.timeline-item[data-expanded="true"]');
        expandedItems.forEach(item => {
            const node = item.querySelector('.timeline-node');
            if (node) {
                node.click();
                announceToScreenReader('Timeline item collapsed');
            }
        });
    }
});

// Arrow key navigation for carousels and sliders
document.addEventListener('keydown', (e) => {
    const target = e.target;
    
    // Only handle arrow keys when focus is on carousel/slider controls
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        return;
    }
    
    // Weekly highlights slider
    if (target.closest('#weekly-highlights')) {
        if (e.key === 'ArrowLeft') {
            const prevBtn = document.getElementById('prev-week-btn');
            if (prevBtn && !prevBtn.disabled) {
                e.preventDefault();
                prevBtn.click();
                announceToScreenReader('Previous week');
            }
        } else if (e.key === 'ArrowRight') {
            const nextBtn = document.getElementById('next-week-btn');
            if (nextBtn && !nextBtn.disabled) {
                e.preventDefault();
                nextBtn.click();
                announceToScreenReader('Next week');
            }
        }
    }
    
    // Media carousels
    const carousel = target.closest('.media-carousel');
    if (carousel) {
        if (e.key === 'ArrowLeft') {
            const prevBtn = carousel.querySelector('.carousel-btn:first-of-type');
            if (prevBtn && !prevBtn.disabled) {
                e.preventDefault();
                prevBtn.click();
            }
        } else if (e.key === 'ArrowRight') {
            const nextBtn = carousel.querySelector('.carousel-btn:last-of-type');
            if (nextBtn && !nextBtn.disabled) {
                e.preventDefault();
                nextBtn.click();
            }
        }
    }
    
    // Timeline horizontal scroll
    const timelineScroll = document.querySelector('.timeline-scroll');
    if (timelineScroll && document.activeElement.closest('.timeline-item')) {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            timelineScroll.scrollBy({ left: -320, behavior: 'smooth' });
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            timelineScroll.scrollBy({ left: 320, behavior: 'smooth' });
        }
    }
});

// Focus trap for modals (basic implementation)
function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    modal.addEventListener('keydown', function trapHandler(e) {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}

// Apply focus trap to any modals when they open
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
                const modals = node.querySelectorAll ? node.querySelectorAll('[role="dialog"], .modal') : [];
                modals.forEach(modal => {
                    if (modal.getAttribute('aria-hidden') !== 'true') {
                        trapFocus(modal);
                    }
                });
            }
        });
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// Improve Tab navigation - ensure all interactive elements are keyboard accessible
document.addEventListener('DOMContentLoaded', () => {
    // Make sure all buttons and links are keyboard accessible
    document.querySelectorAll('button, a, [role="button"]').forEach(el => {
        if (!el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1') {
            el.setAttribute('tabindex', '0');
        }
    });
    
    // Ensure project cards are keyboard accessible
    document.querySelectorAll('.project-card').forEach(card => {
        if (!card.hasAttribute('tabindex')) {
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'article');
        }
    });
});

// ============================================
// SMOOTH SCROLL IMPROVEMENTS
// ============================================
// Adds scroll progress bar and smooth scroll to top

// Scroll progress indicator
function updateScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;
    
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const progress = (scrollTop / documentHeight) * 100;
    
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(progress));
}

// Scroll to top button
function initScrollToTop() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (!scrollToTopBtn) return;
    
    function toggleScrollToTop() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }
    
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        announceToScreenReader('Scrolled to top');
    });
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        toggleScrollToTop();
        updateScrollProgress();
    }, { passive: true });
    
    // Initial check
    toggleScrollToTop();
}

// Enhanced smooth scroll for anchor links with offset
document.addEventListener('DOMContentLoaded', () => {
    initScrollToTop();
    
    // Handle anchor links with smooth scroll and offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#!') return;
            
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                const navbar = document.querySelector('.navbar');
                const navbarHeight = navbar ? navbar.offsetHeight : 100;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update URL without jumping
                history.pushState(null, '', href);
                
                // Focus target for keyboard users
                targetElement.setAttribute('tabindex', '-1');
                targetElement.focus();
                setTimeout(() => targetElement.removeAttribute('tabindex'), 1000);
            }
        });
    });
    
    // Apply stagger animations to list items
    if (!prefersReducedMotion) {
        const lists = document.querySelectorAll('.highlight-list, .role-list, .value-grid, .projects-grid');
        lists.forEach(list => {
            const items = Array.from(list.children);
            items.forEach((item, index) => {
                if (index < 8) { // Limit to first 8 items
                    item.classList.add('stagger-item');
                }
            });
        });
    }
});

// ============================================
// MOBILE UX - SWIPE GESTURES
// ============================================
// Adds swipe gesture support for sliders and carousels

// Swipe detection for weekly highlights slider
function initSwipeGestures() {
    const weeklyCard = document.getElementById('weekly-highlights');
    if (!weeklyCard) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;
    
    weeklyCard.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    weeklyCard.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            const prevBtn = document.getElementById('prev-week-btn');
            const nextBtn = document.getElementById('next-week-btn');
            
            if (diff > 0 && nextBtn && !nextBtn.disabled) {
                // Swipe left - next week
                nextBtn.click();
            } else if (diff < 0 && prevBtn && !prevBtn.disabled) {
                // Swipe right - previous week
                prevBtn.click();
            }
        }
    }, { passive: true });
    
    // Swipe for timeline
    const timelineScroll = document.querySelector('.timeline-scroll');
    if (timelineScroll) {
        let timelineTouchStartX = 0;
        let timelineTouchStartY = 0;
        
        timelineScroll.addEventListener('touchstart', (e) => {
            timelineTouchStartX = e.changedTouches[0].screenX;
            timelineTouchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        timelineScroll.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const diffX = timelineTouchStartX - touchEndX;
            const diffY = Math.abs(timelineTouchStartY - touchEndY);
            
            // Only handle horizontal swipes (ignore vertical scrolling)
            if (Math.abs(diffX) > swipeThreshold && diffY < 50) {
                if (diffX > 0) {
                    // Swipe left - scroll right
                    timelineScroll.scrollBy({ left: 320, behavior: 'smooth' });
                } else {
                    // Swipe right - scroll left
                    timelineScroll.scrollBy({ left: -320, behavior: 'smooth' });
                }
            }
        }, { passive: true });
    }
    
    // Swipe for media carousels
    document.querySelectorAll('.carousel-track').forEach(carousel => {
        let carouselTouchStartX = 0;
        
        carousel.addEventListener('touchstart', (e) => {
            carouselTouchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        carousel.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = carouselTouchStartX - touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - next
                    const nextBtn = carousel.closest('.media-carousel')?.querySelector('.carousel-btn:last-of-type');
                    if (nextBtn && !nextBtn.disabled) nextBtn.click();
                } else {
                    // Swipe right - previous
                    const prevBtn = carousel.closest('.media-carousel')?.querySelector('.carousel-btn:first-of-type');
                    if (prevBtn && !prevBtn.disabled) prevBtn.click();
                }
            }
        }, { passive: true });
    });
}

// Initialize swipe gestures on load
document.addEventListener('DOMContentLoaded', initSwipeGestures);

// ============================================
// TESTIMONIALS
// ============================================

async function loadTestimonials() {
    const container = document.getElementById('testimonials-grid');
    if (!container) return;

    try {
        const response = await fetch('data/testimonials.json');
        if (!response.ok) {
            console.warn('Testimonials data not found');
            return;
        }

        const testimonials = await response.json();
        if (!Array.isArray(testimonials) || testimonials.length === 0) {
            container.innerHTML = '<p class="empty-message">No testimonials available.</p>';
            return;
        }

        container.innerHTML = testimonials.map(testimonial => {
            const initials = testimonial.author
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

            const avatar = testimonial.avatar 
                ? `<img src="${testimonial.avatar}" alt="${testimonial.author}" class="testimonial-avatar-img">`
                : `<div class="testimonial-avatar">${initials}</div>`;

            const projectInfo = testimonial.project 
                ? `<div class="testimonial-project">${testimonial.project}</div>`
                : '';

            const roleInfo = testimonial.company 
                ? `${testimonial.role}${testimonial.company ? ` • ${testimonial.company}` : ''}`
                : testimonial.role;

            return `
                <div class="testimonial-card glass-card reveal">
                    <p class="testimonial-quote">${escapeHtml(testimonial.quote)}</p>
                    <div class="testimonial-author">
                        ${avatar}
                        <div class="testimonial-info">
                            <div class="testimonial-name">${escapeHtml(testimonial.author)}</div>
                            <div class="testimonial-role">${escapeHtml(roleInfo)}</div>
                            ${projectInfo}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Trigger reveal animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1 });

        container.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    } catch (error) {
        console.error('Failed to load testimonials:', error);
        container.innerHTML = '<p class="empty-message">Unable to load testimonials.</p>';
    }
}

// Load testimonials on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTestimonials);
} else {
    loadTestimonials();
}

// ============================================
// VIDEO DEMO LAZY LOADING
// ============================================

function initVideoEmbeds() {
    // Handle YouTube/Vimeo embeds with lazy loading
    document.querySelectorAll('.video-placeholder[data-video-url]').forEach(placeholder => {
        const videoUrl = placeholder.getAttribute('data-video-url');
        const thumbnail = placeholder.querySelector('img');
        const playButton = placeholder.querySelector('.video-play-button');
        
        if (!videoUrl) return;

        // Create click handler
        const loadVideo = () => {
            if (placeholder.classList.contains('loaded')) return;
            
            placeholder.classList.add('loaded');
            let embedUrl = '';
            
            // Parse YouTube URL
            if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                let videoId = '';
                if (videoUrl.includes('youtu.be/')) {
                    videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                } else if (videoUrl.includes('youtube.com/watch?v=')) {
                    videoId = videoUrl.split('v=')[1].split('&')[0];
                } else if (videoUrl.includes('youtube.com/embed/')) {
                    videoId = videoUrl.split('embed/')[1].split('?')[0];
                }
                if (videoId) {
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
                }
            }
            // Parse Vimeo URL
            else if (videoUrl.includes('vimeo.com')) {
                const videoId = videoUrl.split('vimeo.com/')[1].split('?')[0];
                if (videoId) {
                    embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
                }
            }
            // Self-hosted video
            else if (videoUrl.match(/\.(mp4|webm|ogg)$/i)) {
                embedUrl = videoUrl;
            }
            
            if (embedUrl) {
                if (embedUrl.match(/\.(mp4|webm|ogg)$/i)) {
                    // Self-hosted video
                    placeholder.innerHTML = `
                        <video controls autoplay class="video-player">
                            <source src="${embedUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    `;
                } else {
                    // YouTube/Vimeo embed
                    placeholder.innerHTML = `
                        <div class="video-container lazy">
                            <iframe 
                                src="${embedUrl}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen
                                loading="lazy"
                                title="Video demo">
                            </iframe>
                        </div>
                    `;
                    
                    // Mark as loaded after iframe loads
                    const iframe = placeholder.querySelector('iframe');
                    if (iframe) {
                        iframe.addEventListener('load', () => {
                            const container = placeholder.querySelector('.video-container');
                            if (container) container.classList.add('loaded');
                        });
                    }
                }
            }
        };
        
        // Add click handler
        if (playButton) {
            playButton.addEventListener('click', loadVideo);
        }
        placeholder.addEventListener('click', loadVideo);
        
        // Lazy load thumbnail if provided
        if (thumbnail && thumbnail.dataset.src) {
            const imgObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        thumbnail.src = thumbnail.dataset.src;
                        thumbnail.removeAttribute('data-src');
                        imgObserver.unobserve(thumbnail);
                    }
                });
            }, { rootMargin: '50px' });
            
            imgObserver.observe(thumbnail);
        }
    });
}

// Initialize video embeds
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoEmbeds);
} else {
    initVideoEmbeds();
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
// Shows toast notifications for user feedback

function createToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'info', duration = 5000) {
    const container = createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" aria-label="Close notification">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
        </button>
    `;
    
    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    };
    
    closeBtn.addEventListener('click', removeToast);
    
    container.appendChild(toast);
    announceToScreenReader(message);
    
    if (duration > 0) {
        setTimeout(removeToast, duration);
    }
    
    return toast;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}
} else {
    initMediaCarousels();
}
