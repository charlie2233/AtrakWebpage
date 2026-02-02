// Atrak runtime config (safe to commit — no emails stored here).
// To make your forms work, follow these steps:
// 1. Sign up for a free account at https://formspree.io/
// 2. Create a "New Form" and name it (e.g., "Atrak Suggestion Box").
// 3. Copy the "Form ID" (it looks like a random string, e.g., "mqkowpqz").
// 4. Paste that ID into the endpoints below.

window.ATRAK_CONFIG = {
    forms: {
        // Using the same Formspree form ID for all forms
        // You can create separate forms later if you want to organize emails differently
        default: 'https://formspree.io/f/mvzqdnov',
        suggestion: 'https://formspree.io/f/mvzqdnov',
        join: 'https://formspree.io/f/mvzqdnov',
        security: 'https://formspree.io/f/mvzqdnov',
        sponsor: 'https://formspree.io/f/mvzqdnov'
    }
};

// Backwards compatibility (old name)
window.LUNARWEB_CONFIG = window.ATRAK_CONFIG;
