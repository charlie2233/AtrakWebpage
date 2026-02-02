// Atrak runtime config (safe to commit — no emails stored here).
// To make your forms work, follow these steps:
// 1. Sign up for a free account at https://formspree.io/
// 2. Create a "New Form" and name it (e.g., "Atrak Suggestion Box").
// 3. Copy the "Form ID" (it looks like a random string, e.g., "mqkowpqz").
// 4. Paste that ID into the endpoints below.

window.ATRAK_CONFIG = {
    forms: {
        // You can use one ID for everything, or separate ones to keep emails organized.
        // Replace 'REPLACE_ME' with your actual Formspree ID.
        default: 'https://formspree.io/f/REPLACE_ME',
        suggestion: 'https://formspree.io/f/REPLACE_ME',
        join: 'https://formspree.io/f/REPLACE_ME',
        security: 'https://formspree.io/f/REPLACE_ME',
        sponsor: 'https://formspree.io/f/REPLACE_ME'
    }
};

// Backwards compatibility (old name)
window.LUNARWEB_CONFIG = window.ATRAK_CONFIG;
