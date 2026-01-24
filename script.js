// Atrak - Modern Tech Team Website JavaScript

// Enable JS animations
document.body.classList.add('js-enabled');

const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const enableHoverEffects = hasFinePointer && !prefersReducedMotion;
const enableHeroParallax = enableHoverEffects;

// Custom Cursor
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

if (cursorDot && cursorOutline && !prefersReducedMotion && hasFinePointer) {
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

// Scroll Reveal
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            // Stop observing once revealed
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

// Select elements that should have reveal animation
const revealElements = document.querySelectorAll('.reveal');
revealElements.forEach(el => revealObserver.observe(el));

// Automatically add reveal class to cards if they don't have it
const autoRevealElements = document.querySelectorAll('.project-card, .leader-card, .stat-item, .feature');
autoRevealElements.forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
});

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

// Project Card Tilt Effect
const projectCards = document.querySelectorAll('.project-card');

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

        const endpoint = getFormEndpoint(form);
        if (!endpoint || endpoint.includes('REPLACE_ME')) {
            setStatus('This form is not available yet. Please try again later.', 'is-error');
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

// Cursor Follow Effect (Optional - for enhanced UX)
if (enableHoverEffects) {
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

// Timeline Interactive Features
const initTimeline = () => {
    const timelineItems = document.querySelectorAll('.timeline-item');
    const timelineNodes = document.querySelectorAll('.timeline-node');
    
    timelineNodes.forEach((node, index) => {
        const item = timelineItems[index];
        
        // Click handler for expanding/collapsing
        const toggleExpand = () => {
            const isExpanded = item.getAttribute('data-expanded') === 'true';
            item.setAttribute('data-expanded', !isExpanded);
            node.setAttribute('aria-expanded', !isExpanded);
            
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

// Dynamic timeline update function
window.addTimelineItem = function(data) {
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
    
    container.insertBefore(item, container.firstChild);
    
    // Re-initialize interactions for new item
    initTimeline();
    
    // Announce addition to screen readers
    announceToScreenReader(`New timeline item added: ${data.title}`);
    
    return item;
};

// Prevent default link behavior for demo links
document.querySelectorAll('a[href="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
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
