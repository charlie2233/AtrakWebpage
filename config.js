// Atrak runtime config (safe to commit — no emails stored here).
// Replace the URLs below with your own form endpoints (e.g., Formspree).
window.ATRAK_CONFIG = {
    forms: {
        default: 'https://formspree.io/f/REPLACE_ME',
        suggestion: '',
        contact: ''
    }
};

// Backwards compatibility (old name)
window.LUNARWEB_CONFIG = window.ATRAK_CONFIG;
