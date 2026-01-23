// LunarWeb - Modern Tech Portfolio JavaScript

// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
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
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            
            // Close mobile menu if open
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        }
    });
});

// Consolidated Scroll Handler with Throttling
let lastScroll = 0;
let ticking = false;
const navbar = document.querySelector('.navbar');
const floatingCards = document.querySelectorAll('.floating-card');
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

function handleScroll() {
    const currentScroll = window.pageYOffset;
    
    // Navbar effect
    if (currentScroll <= 0) {
        navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    } else {
        navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    }
    
    // Parallax effect for hero visual
    floatingCards.forEach((card, index) => {
        const speed = 0.5 + (index * 0.1);
        card.style.transform = `translateY(${currentScroll * speed}px)`;
    });
    
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

// Intersection Observer for Fade-in Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observer all cards and sections
const observeElements = document.querySelectorAll('.project-card, .leader-card, .stat-item, .feature');
observeElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
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

// Leader Card Hover Effect
const leaderCards = document.querySelectorAll('.leader-card');

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

// Anonymous Suggestion Box (Formspree)
const suggestionForm = document.querySelector('#suggestion-form');
if (suggestionForm) {
    const statusEl = document.querySelector('#suggestion-status');
    const submitButton = suggestionForm.querySelector('button[type="submit"]');

    const setStatus = (message, state) => {
        if (!statusEl) return;
        statusEl.textContent = message || '';
        statusEl.classList.remove('is-success', 'is-error', 'is-pending');
        if (state) statusEl.classList.add(state);
    };

    suggestionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const endpoint = suggestionForm.dataset.endpoint || suggestionForm.action || '';
        if (!endpoint || endpoint.includes('REPLACE_ME')) {
            setStatus('Suggestion box is not configured yet.', 'is-error');
            return;
        }

        if (submitButton) submitButton.disabled = true;
        suggestionForm.setAttribute('aria-busy', 'true');
        setStatus('Sending…', 'is-pending');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: new FormData(suggestionForm),
                headers: { Accept: 'application/json' }
            });

            if (response.ok) {
                suggestionForm.reset();
                setStatus('Thanks — your anonymous suggestion was sent.', 'is-success');
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
            if (submitButton) submitButton.disabled = false;
            suggestionForm.removeAttribute('aria-busy');
        }
    });
}

// Cursor Follow Effect (Optional - for enhanced UX)
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

// Console Message
console.log('%c🌙 LunarWeb ', 'background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 8px 16px; border-radius: 4px; font-size: 16px; font-weight: bold;');
console.log('%cBuilding the future, one line of code at a time.', 'color: #a0a0a0; font-size: 12px;');

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
