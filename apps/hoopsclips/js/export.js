// Export Tab - Export clips in various formats
class ExportTab {
    constructor() {
        this.reelOrder = [];
        this.init();
    }

    init() {
        this.setupExportButtons();
        this.setupReelControls();
        this.updateExportQueue();
        
        // Subscribe to store updates
        Store.subscribe(() => this.updateExportQueue());
    }

    setupExportButtons() {
        const exportMetadataBtn = document.getElementById('exportMetadata');
        const exportQueueBtn = document.getElementById('exportQueue');

        exportMetadataBtn.addEventListener('click', () => {
            this.exportMetadata();
        });

        exportQueueBtn?.addEventListener('click', () => {
            this.showExportQueue();
        });
    }

    quickExport(format, keepOnly = false) {
        const clips = keepOnly ? Store.getClipsByStatus('keep') : Store.getClips();
        if (clips.length === 0) {
            alert('No clips to export');
            return;
        }

        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify(clips, null, 2);
                filename = keepOnly ? 'hoops-clips-keep.json' : 'hoops-clips-all.json';
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.generateCSV(clips);
                filename = keepOnly ? 'hoops-clips-keep.csv' : 'hoops-clips-all.csv';
                mimeType = 'text/csv';
                break;
            default:
                alert('Unsupported format');
                return;
        }

        this.downloadFile(content, filename, mimeType);
    }

    setupReelControls() {
        const previewBtn = document.getElementById('reelPreview');
        const shuffleBtn = document.getElementById('reelShuffle');

        previewBtn?.addEventListener('click', () => {
            this.previewReel();
        });

        shuffleBtn?.addEventListener('click', () => {
            this.shuffleReel();
        });
    }

    exportMetadata() {
        const format = document.querySelector('input[name="exportFormat"]:checked').value;
        const keepOnly = document.getElementById('exportKeepOnly').checked;

        let clips = Store.getClips();
        if (keepOnly) {
            clips = Store.getClipsByStatus('keep');
        }

        if (clips.length === 0) {
            alert('No clips to export');
            return;
        }

        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify(clips, null, 2);
                filename = 'hoops-clips-export.json';
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.generateCSV(clips);
                filename = 'hoops-clips-export.csv';
                mimeType = 'text/csv';
                break;
            case 'edl':
                content = this.generateEDL(clips);
                filename = 'hoops-clips-export.edl';
                mimeType = 'text/plain';
                break;
            default:
                alert('Unknown format');
                return;
        }

        this.downloadFile(content, filename, mimeType);
    }

    generateCSV(clips) {
        const headers = ['ID', 'Title', 'Start Time', 'End Time', 'Duration', 'Status', 'Team', 'Style', 'Type', 'Action'];
        const rows = clips.map(clip => [
            clip.id,
            `"${(clip.title || '').replace(/"/g, '""')}"`, // Escape quotes properly
            this.formatTime(clip.startTime),
            this.formatTime(clip.endTime),
            this.formatTime(clip.duration),
            clip.status,
            clip.team || 'N/A',
            clip.style,
            clip.type,
            clip.action || 'N/A'
        ]);
        
        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }

    generateEDL(clips) {
        let edl = 'TITLE: Hoops Clips Export\n';
        edl += 'FCM: NON-DROP FRAME\n\n';
        
        clips.forEach((clip, index) => {
            const eventNum = String(index + 1).padStart(3, '0');
            const startTC = this.secondsToTimecode(clip.startTime);
            const endTC = this.secondsToTimecode(clip.endTime);
            
            edl += `${eventNum}  AX       V     C        ${startTC} ${endTC} ${startTC} ${endTC}\n`;
            edl += `* FROM CLIP NAME: ${clip.title}\n`;
            edl += `* STATUS: ${clip.status}\n`;
            if (clip.team) {
                edl += `* TEAM: ${clip.team}\n`;
            }
            edl += `\n`;
        });
        
        return edl;
    }

    secondsToTimecode(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const f = Math.floor((seconds % 1) * 30); // Assuming 30fps
        
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    updateExportQueue() {
        const queueList = document.getElementById('exportQueueList');
        const keepClips = Store.getClipsByStatus('keep');

        if (keepClips.length === 0) {
            queueList.innerHTML = `
                <div class="empty-state">
                    <p>No clips in export queue. Mark clips as "Keep" in the Review tab.</p>
                </div>
            `;
            this.updateReel([]);
            return;
        }

        queueList.innerHTML = `
            <div class="clips-items">
                ${keepClips.map(clip => `
                    <div class="clip-item">
                        <div class="clip-info">
                            <div class="clip-title">${clip.title}</div>
                            <div class="clip-time">
                                ${this.formatTime(clip.startTime)} - ${this.formatTime(clip.endTime)}
                                ${clip.team ? `• Team ${clip.team}` : ''}
                            </div>
                        </div>
                        <span class="status-pill status-keep">Keep</span>
                    </div>
                `).join('')}
            </div>
        `;

        this.updateReel(keepClips);
    }

    updateReel(keepClips) {
        const timeline = document.getElementById('reelTimeline');
        const totalEl = document.getElementById('reelTotal');
        const countEl = document.getElementById('reelCount');

        if (!timeline || !totalEl || !countEl) return;

        this.syncReelOrder(keepClips);
        const ordered = this.getReelClips(keepClips);

        if (ordered.length === 0) {
            timeline.innerHTML = `
                <div class="empty-state">
                    <p>No keep clips yet. Mark clips as "Keep" to build a reel.</p>
                </div>
            `;
            totalEl.textContent = '0:00';
            countEl.textContent = '0';
            return;
        }

        const padding = Store.getSettings()?.clipPadding || 0;
        const totalDuration = ordered.reduce((sum, clip) => sum + (clip.duration || 0) + (padding * 2), 0);
        totalEl.textContent = this.formatTime(totalDuration);
        countEl.textContent = ordered.length;

        timeline.innerHTML = ordered.map((clip, index) => `
            <div class="reel-segment ${clip.type === 'ai' ? 'ai' : 'manual'}" style="flex: ${Math.max((clip.duration || 1) + (padding * 2), 1)}"
                 title="${clip.title} • ${this.formatTime((clip.duration || 0) + (padding * 2))}">
                <span>${index + 1}</span>
            </div>
        `).join('');
    }

    syncReelOrder(clips) {
        const ids = clips.map(clip => clip.id);

        if (this.reelOrder.length === 0) {
            this.reelOrder = ids.slice();
            return;
        }

        this.reelOrder = this.reelOrder.filter(id => ids.includes(id));
        ids.forEach(id => {
            if (!this.reelOrder.includes(id)) {
                this.reelOrder.push(id);
            }
        });
    }

    getReelClips(clips) {
        if (!clips || clips.length === 0) return [];
        const map = new Map(clips.map(clip => [clip.id, clip]));
        return this.reelOrder.map(id => map.get(id)).filter(Boolean);
    }

    previewReel() {
        const keepClips = Store.getClipsByStatus('keep');
        if (keepClips.length === 0) {
            alert('No keep clips to preview yet.');
            return;
        }

        if (window.app?.switchTab) {
            window.app.switchTab('player');
        }

        setTimeout(() => {
            const ordered = this.getReelClips(keepClips);
            window.playerTab?.playReelPreview(ordered);
        }, 200);
    }

    shuffleReel() {
        if (this.reelOrder.length <= 1) return;
        for (let i = this.reelOrder.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.reelOrder[i], this.reelOrder[j]] = [this.reelOrder[j], this.reelOrder[i]];
        }
        this.updateReel(Store.getClipsByStatus('keep'));
    }

    showExportQueue() {
        const keepClips = Store.getClipsByStatus('keep');
        if (keepClips.length === 0) {
            alert('No clips in export queue');
            return;
        }

        alert(`Export Queue:\n\n${keepClips.map((c, i) => `${i + 1}. ${c.title}`).join('\n')}`);
    }

    formatTime(seconds) {
        if (!Number.isFinite(seconds)) {
            return '0:00';
        }
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }
}

// Initialize export tab
let exportTab;
document.addEventListener('DOMContentLoaded', () => {
    exportTab = new ExportTab();
    window.exportTab = exportTab; // Make it globally accessible
});
