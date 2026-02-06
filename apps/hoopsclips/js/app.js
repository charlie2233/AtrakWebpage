// Main App - Tab navigation and initialization
class App {
    constructor() {
        this.currentTab = 'player';
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupModal();
        this.loadSettings();
        this.setupStyleSelection();
        
        // Subscribe to store updates
        Store.subscribe(() => this.updateUI());
        
        // Initial UI update
        this.updateUI();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === tabName);
        });

        this.currentTab = tabName;
        
        // Trigger tab-specific updates
        if (tabName === 'review') {
            window.reviewTab?.updateReviewClips();
        } else if (tabName === 'export') {
            window.exportTab?.updateExportQueue();
        }
    }

    setupModal() {
        const modal = document.getElementById('aiModal');
        const closeBtn = modal.querySelector('.modal-close');
        
        closeBtn.addEventListener('click', () => {
            this.closeModal(true);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(true);
            }
        });
    }

    showModal() {
        document.getElementById('aiModal').classList.add('active');
    }

    closeModal(userInitiated = false) {
        if (userInitiated && window.playerTab?.cancelAIAnalysis) {
            window.playerTab.cancelAIAnalysis();
        }
        document.getElementById('aiModal').classList.remove('active');
    }

    loadSettings() {
        const settings = Store.getSettings();
        
        // Load settings into UI
        const aiWorkerUrlInput = document.getElementById('aiWorkerUrl');
        const enableAIInput = document.getElementById('enableAI');
        const clipPaddingInput = document.getElementById('clipPadding');
        const darkModeInput = document.getElementById('darkMode');

        if (aiWorkerUrlInput) aiWorkerUrlInput.value = settings.aiWorkerUrl;
        if (enableAIInput) enableAIInput.checked = settings.enableAI;
        if (clipPaddingInput) clipPaddingInput.value = settings.clipPadding;
        if (darkModeInput) darkModeInput.checked = settings.darkMode;

        // Setup settings listeners
        aiWorkerUrlInput?.addEventListener('change', (e) => {
            Store.updateSettings({ aiWorkerUrl: e.target.value });
        });

        enableAIInput?.addEventListener('change', (e) => {
            Store.updateSettings({ enableAI: e.target.checked });
        });

        clipPaddingInput?.addEventListener('change', (e) => {
            Store.updateSettings({ clipPadding: parseInt(e.target.value) });
        });

        darkModeInput?.addEventListener('change', (e) => {
            Store.updateSettings({ darkMode: e.target.checked });
            document.body.classList.toggle('light-mode', !e.target.checked);
        });

        // Clear storage button
        document.getElementById('clearStorage')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                Store.clear();
                alert('All data cleared successfully');
                location.reload();
            }
        });
    }

    setupStyleSelection() {
        const styleButtons = Array.from(document.querySelectorAll('.btn-style'));
        if (!styleButtons.length) return;

        const setSelected = (style) => {
            styleButtons.forEach(button => {
                const card = button.closest('.style-card');
                if (!card) return;
                const isActive = button.dataset.style === style;
                card.classList.toggle('is-selected', isActive);
            });
        };

        styleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const style = button.dataset.style;
                if (!style) return;
                Store.updateSettings({ defaultStyle: style });
                setSelected(style);
            });
        });

        setSelected(Store.getSettings().defaultStyle || 'classic');
    }

    updateUI() {
        // Update clips count in player tab
        const clipsCount = Store.getClips().length;
        const clipsCountEl = document.getElementById('clipsCount');
        if (clipsCountEl) {
            clipsCountEl.textContent = clipsCount;
        }

        // Update review stats
        const keepClips = Store.getClipsByStatus('keep').length;
        const discardClips = Store.getClipsByStatus('discard').length;
        const unreviewedClips = Store.getClipsByStatus('unreviewed').length;
        
        const keepClipsEl = document.getElementById('keepClips');
        const discardClipsEl = document.getElementById('discardClips');
        const unreviewedClipsEl = document.getElementById('unreviewedClips');
        const totalClipsEl = document.getElementById('totalClips');

        if (keepClipsEl) keepClipsEl.textContent = keepClips;
        if (discardClipsEl) discardClipsEl.textContent = discardClips;
        if (unreviewedClipsEl) unreviewedClipsEl.textContent = unreviewedClips;
        if (totalClipsEl) totalClipsEl.textContent = clipsCount;
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${m}:${String(s).padStart(2, '0')}`;
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app;
});
