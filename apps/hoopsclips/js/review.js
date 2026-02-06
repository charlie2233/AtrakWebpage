// Review Tab - Review and tag clips
class ReviewTab {
    constructor() {
        this.init();
    }

    init() {
        this.updateReviewClips();
        
        // Subscribe to store updates
        Store.subscribe(() => this.updateReviewClips());
    }

    updateReviewClips() {
        const reviewClips = document.getElementById('reviewClips');
        const clips = Store.getClips();

        if (clips.length === 0) {
            reviewClips.innerHTML = `
                <div class="empty-state">
                    <p>No clips to review. Add clips in the Player tab.</p>
                </div>
            `;
            return;
        }

        reviewClips.innerHTML = clips.map(clip => this.renderReviewCard(clip)).join('');
    }

    renderReviewCard(clip) {
        const statusClass = `status-${clip.status}`;
        const statusLabel = clip.status === 'keep' ? 'Keep' : 
                           clip.status === 'discard' ? 'Discard' : 'Unreviewed';

        return `
            <div class="review-card" data-clip-id="${clip.id}">
                <div class="review-card-header">
                    <h4>${clip.title}</h4>
                    <span class="status-pill ${statusClass}">${statusLabel}</span>
                </div>
                <div class="review-card-body">
                    <p>${this.formatTime(clip.startTime)} - ${this.formatTime(clip.endTime)}</p>
                    <p class="clip-time">Duration: ${this.formatTime(clip.duration)}</p>
                    ${clip.type === 'ai' ? `<p><small>🤖 AI Detected: ${clip.action}</small></p>` : ''}
                    ${clip.team ? `<p><small>Team: ${clip.team}</small></p>` : ''}
                </div>
                <div class="review-card-actions">
                    <button class="btn-control ${clip.status === 'keep' ? 'active' : ''}" 
                            onclick="window.reviewTab.setStatus(${clip.id}, 'keep')">
                        ✓ Keep
                    </button>
                    <button class="btn-control ${clip.status === 'discard' ? 'active' : ''}"
                            onclick="window.reviewTab.setStatus(${clip.id}, 'discard')">
                        ✗ Discard
                    </button>
                </div>
                <div class="team-buttons">
                    <button class="btn-team ${clip.team === 'A' ? 'active' : ''}"
                            onclick="window.reviewTab.setTeam(${clip.id}, 'A')">
                        Team A
                    </button>
                    <button class="btn-team ${clip.team === 'B' ? 'active' : ''}"
                            onclick="window.reviewTab.setTeam(${clip.id}, 'B')">
                        Team B
                    </button>
                </div>
            </div>
        `;
    }

    setStatus(clipId, status) {
        Store.updateClip(clipId, { status });
    }

    setTeam(clipId, team) {
        const clip = Store.getClip(clipId);
        // Toggle team selection
        const newTeam = clip.team === team ? null : team;
        Store.updateClip(clipId, { team: newTeam });
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }
}

// Initialize review tab
let reviewTab;
document.addEventListener('DOMContentLoaded', () => {
    reviewTab = new ReviewTab();
    window.reviewTab = reviewTab; // Make it globally accessible
});
