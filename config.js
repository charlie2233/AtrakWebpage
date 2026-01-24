// Atrak runtime config (safe to commit — no emails stored here).
// Replace the URLs below with your own form endpoints (e.g., Formspree).
window.ATRAK_CONFIG = {
    forms: {
        default: 'https://formspree.io/f/REPLACE_ME',
        suggestion: '',
        contact: ''
    },
    
    // Project links for dynamic rendering
    projects: {
        guidepup: {
            repo: 'https://github.com/charlie2233/rork-guide-pup--vision-assistant',
            demo: '', // Add demo link when available
            details: 'projects/guidepup.html'
        },
        hoopsClips: {
            repo: 'https://github.com/charlie2233/Basketball_action_recoginition_sever',
            demo: '', // Add demo link when available
            details: 'projects/hoops-clips.html'
        },
        lunar: {
            repo: '', // Add repo link when available
            demo: '', // Add demo link when available
            details: 'projects/lunar.html'
        },
        tenSecondsVip: {
            repo: '', // Add repo link when available
            demo: '', // Add demo link when available (private deployment)
            details: 'projects/ten-seconds-vip-manager.html'
        }
    }
};

// Backwards compatibility (old name)
window.LUNARWEB_CONFIG = window.ATRAK_CONFIG;
