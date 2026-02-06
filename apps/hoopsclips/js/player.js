// Player Tab - Video player and clip marking
class PlayerTab {
    constructor() {
        this.video = null;
        this.markInTime = null;
        this.markOutTime = null;
        this.currentObjectUrl = null;
        this.sequenceListener = null;
        this.sequenceTimer = null;
        this.aiInterval = null;
        this.aiButton = null;
        this.init();
    }

    init() {
        this.setupVideoUpload();
        this.setupVideoControls();
        this.updateClipsList();
        
        // Subscribe to store updates
        Store.subscribe(() => this.updateClipsList());
    }

    setupVideoUpload() {
        const uploadInput = document.getElementById('videoUpload');
        const videoPlayer = document.getElementById('videoPlayer');
        const videoSource = document.getElementById('videoSource');
        const placeholder = document.getElementById('videoPlaceholder');
        const wrapper = document.querySelector('.video-wrapper');

        const handleFile = (file) => {
            if (!file) return;
            if (!file.type.startsWith('video/')) {
                alert('Please choose a video file.');
                return;
            }
            this.loadVideoFile(file, { videoPlayer, videoSource, placeholder });
        };

        uploadInput.addEventListener('change', (e) => {
            handleFile(e.target.files[0]);
        });

        if (wrapper) {
            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                wrapper.classList.add('is-dragging');
            });

            wrapper.addEventListener('dragleave', () => {
                wrapper.classList.remove('is-dragging');
            });

            wrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                wrapper.classList.remove('is-dragging');
                handleFile(e.dataTransfer.files[0]);
            });
        }

        // Enable controls when video is loaded
        videoPlayer.addEventListener('loadstart', () => {
            this.setLoading(true, 'Loading video stream...');
        });

        videoPlayer.addEventListener('loadedmetadata', () => {
            this.video = videoPlayer;
            this.enableControls();
            this.setLoading(false);
            this.updateVideoMeta();
            this.updateMarkButtons();
        });

        videoPlayer.addEventListener('canplay', () => {
            this.setLoading(false);
        });

        videoPlayer.addEventListener('error', () => {
            this.setLoading(false, 'Failed to load video.');
            placeholder.classList.remove('hidden');
        });
    }

    loadVideoFile(file, { videoPlayer, videoSource, placeholder }) {
        if (this.currentObjectUrl) {
            URL.revokeObjectURL(this.currentObjectUrl);
        }

        this.stopReelPreview();
        this.markInTime = null;
        this.markOutTime = null;
        this.updateMarkButtons();

        const url = URL.createObjectURL(file);
        this.currentObjectUrl = url;
        videoSource.src = url;
        videoPlayer.load();
        placeholder.classList.add('hidden');
        this.setLoading(true, `Decoding ${file.name}`);

        // Store video info
        Store.setCurrentVideo({
            name: file.name,
            size: file.size,
            type: file.type,
            url: url
        });

        this.updateVideoMeta(file);
    }

    setupVideoControls() {
        const markInBtn = document.getElementById('markIn');
        const markOutBtn = document.getElementById('markOut');
        const addClipBtn = document.getElementById('addClip');
        const aiAnalyzeBtn = document.getElementById('aiAnalyze');
        const reviewBtn = document.getElementById('reviewClipsBtn');
        const previewReelBtn = document.getElementById('previewReelBtn');

        markInBtn.addEventListener('click', () => {
            if (this.video) {
                this.markInTime = this.video.currentTime;
                this.updateMarkButtons();
                console.log('Mark In:', this.markInTime);
            }
        });

        markOutBtn.addEventListener('click', () => {
            if (this.video) {
                this.markOutTime = this.video.currentTime;
                this.updateMarkButtons();
                console.log('Mark Out:', this.markOutTime);
            }
        });

        addClipBtn.addEventListener('click', () => {
            this.addClip();
        });

        aiAnalyzeBtn.addEventListener('click', () => {
            this.runAIAnalysis();
        });

        reviewBtn?.addEventListener('click', () => {
            this.openReview();
        });

        previewReelBtn?.addEventListener('click', () => {
            this.previewReel();
        });
    }

    enableControls() {
        document.getElementById('markIn').disabled = false;
        document.getElementById('markOut').disabled = false;
        document.getElementById('aiAnalyze').disabled = false;
    }

    updateMarkButtons() {
        const addClipBtn = document.getElementById('addClip');
        const markInChip = document.getElementById('markInChip');
        const markOutChip = document.getElementById('markOutChip');
        const markInValue = this.markInTime !== null ? this.formatTime(this.markInTime) : '—';
        const markOutValue = this.markOutTime !== null ? this.formatTime(this.markOutTime) : '—';

        if (markInChip) {
            markInChip.textContent = `IN ${markInValue}`;
            markInChip.classList.toggle('active', this.markInTime !== null);
        }

        if (markOutChip) {
            markOutChip.textContent = `OUT ${markOutValue}`;
            markOutChip.classList.toggle('active', this.markOutTime !== null);
        }
        
        if (this.markInTime !== null && this.markOutTime !== null && this.markInTime < this.markOutTime) {
            addClipBtn.disabled = false;
        } else {
            addClipBtn.disabled = true;
        }
    }

    addClip() {
        if (this.markInTime === null || this.markOutTime === null) {
            alert('Please mark both in and out points');
            return;
        }

        if (this.markInTime >= this.markOutTime) {
            alert('Mark In must be before Mark Out');
            return;
        }

        const duration = this.markOutTime - this.markInTime;
        const clip = {
            title: `Clip ${Store.getClips().length + 1}`,
            startTime: this.markInTime,
            endTime: this.markOutTime,
            duration: duration,
            type: 'manual'
        };

        Store.addClip(clip);
        
        // Reset marks
        this.markInTime = null;
        this.markOutTime = null;
        this.updateMarkButtons();
    }

    updateClipsList() {
        const clipsItems = document.getElementById('clipsItems');
        const clips = Store.getClips();
        const reviewBtn = document.getElementById('reviewClipsBtn');
        const previewReelBtn = document.getElementById('previewReelBtn');

        if (reviewBtn) reviewBtn.disabled = clips.length === 0;
        if (previewReelBtn) previewReelBtn.disabled = clips.length === 0;

        if (clips.length === 0) {
            clipsItems.innerHTML = `
                <div class="empty-state">
                    <p>No clips yet. Mark in/out points and add clips, or use AI detection.</p>
                </div>
            `;
            return;
        }

        clipsItems.innerHTML = clips.map(clip => {
            const status = clip.status || 'unreviewed';
            const type = clip.type || 'manual';
            return `
            <div class="clip-item" data-clip-id="${clip.id}">
                <div class="clip-info">
                    <div class="clip-title">${clip.title}</div>
                    <div class="clip-time">
                        ${this.formatTime(clip.startTime)} - ${this.formatTime(clip.endTime)} 
                        (${this.formatTime(clip.duration)})
                    </div>
                    <div class="clip-badges">
                        <span class="clip-badge ${type === 'ai' ? 'ai' : 'manual'}">${type === 'ai' ? 'AI' : 'Manual'}</span>
                        <span class="clip-badge status-${status}">${status}</span>
                    </div>
                </div>
                <div class="clip-actions">
                    <button class="btn-icon" onclick="window.playerTab.playClip('${clip.id}')" title="Play">
                        ▶️
                    </button>
                    <button class="btn-icon" onclick="window.playerTab.seekToClip('${clip.id}')" title="Jump to">
                        ⏭️
                    </button>
                    <button class="btn-icon" onclick="window.playerTab.openReview('${clip.id}')" title="Review">
                        📝
                    </button>
                    <button class="btn-icon" onclick="window.playerTab.deleteClip('${clip.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    playClip(clipId) {
        const clip = Store.getClip(clipId);
        if (clip && this.video) {
            this.stopReelPreview();
            this.video.currentTime = clip.startTime;
            this.video.play();
            
            // Clean up any existing listener before adding new one
            if (this._clipPlayListener) {
                this.video.removeEventListener('timeupdate', this._clipPlayListener);
            }
            
            // Stop at end time
            this._clipPlayListener = () => {
                if (this.video.currentTime >= clip.endTime) {
                    this.video.pause();
                    this.video.removeEventListener('timeupdate', this._clipPlayListener);
                    this._clipPlayListener = null;
                }
            };
            
            this.video.addEventListener('timeupdate', this._clipPlayListener);
        }
    }

    seekToClip(clipId) {
        const clip = Store.getClip(clipId);
        if (clip && this.video) {
            this.stopReelPreview();
            this.video.currentTime = clip.startTime;
        }
    }

    deleteClip(clipId) {
        if (confirm('Are you sure you want to delete this clip?')) {
            Store.deleteClip(clipId);
        }
    }

    openReview(clipId = null) {
        if (window.app?.switchTab) {
            window.app.switchTab('review');
        }
        if (clipId && window.reviewTab?.focusClip) {
            window.reviewTab.focusClip(clipId);
        }
    }

    previewReel() {
        const keepClips = Store.getClipsByStatus('keep');
        const clips = keepClips.length ? keepClips : Store.getClips();
        this.playReelPreview(clips);
    }

    playReelPreview(clips) {
        if (!this.video) {
            alert('Load a video first to preview the reel.');
            return;
        }
        if (!clips || clips.length === 0) {
            alert('No clips to preview yet.');
            return;
        }

        this.stopReelPreview();

        const padding = Store.getSettings()?.clipPadding || 0;
        const maxDuration = Number.isFinite(this.video.duration) ? this.video.duration : Infinity;
        const ordered = clips.map(clip => ({
            ...clip,
            startTime: Math.max(0, (clip.startTime || 0) - padding),
            endTime: Math.min(maxDuration, (clip.endTime || 0) + padding)
        }));
        let index = 0;

        const playClipAtIndex = () => {
            const current = ordered[index];
            if (!current) {
                this.stopReelPreview();
                return;
            }
            this.flashOverlay(`CLIP ${index + 1}/${ordered.length}`);
            this.video.currentTime = current.startTime;
            this.video.play();
        };

        this.sequenceListener = () => {
            const current = ordered[index];
            if (!current) return;
            if (this.video.currentTime >= current.endTime) {
                index += 1;
                if (index >= ordered.length) {
                    this.stopReelPreview();
                    return;
                }
                playClipAtIndex();
            }
        };

        this.video.addEventListener('timeupdate', this.sequenceListener);
        playClipAtIndex();
    }

    stopReelPreview() {
        if (this.video && this.sequenceListener) {
            this.video.removeEventListener('timeupdate', this.sequenceListener);
            this.sequenceListener = null;
        }
    }

    flashOverlay(message) {
        const overlay = document.getElementById('videoOverlay');
        const overlayMessage = document.getElementById('videoOverlayMessage');
        if (!overlay || !overlayMessage) return;

        overlayMessage.textContent = message;
        overlay.classList.add('show');
        clearTimeout(this.sequenceTimer);
        this.sequenceTimer = setTimeout(() => {
            overlay.classList.remove('show');
        }, 500);
    }

    async runAIAnalysis() {
        if (!this.video) {
            alert('Please load a video first');
            return;
        }

        const settings = Store.getSettings();
        if (!settings.enableAI) {
            alert('AI detection is disabled in settings');
            return;
        }

        // Show AI modal
        app.showModal();
        
        const progressBar = document.getElementById('aiProgress');
        const progressPercent = document.getElementById('aiProgressPercent');
        const progressETA = document.getElementById('aiProgressETA');
        const statusText = document.getElementById('aiStatus');

        // Simulate AI analysis (stub worker)
        const aiButton = document.getElementById('aiAnalyze');
        aiButton.classList.add('glowing');
        this.aiButton = aiButton;

        const PROGRESS_ANIMATION_STEP_MS = 50; // Animation step duration in milliseconds
        let progress = 0;
        const totalSteps = 100;

        this.aiInterval = setInterval(() => {
            progress += 1;
            progressBar.style.width = `${progress}%`;
            progressPercent.textContent = `${progress}%`;
            
            const remaining = ((totalSteps - progress) * PROGRESS_ANIMATION_STEP_MS) / 1000;
            progressETA.textContent = `~${Math.ceil(remaining)}s remaining`;

            if (progress >= 100) {
                clearInterval(this.aiInterval);
                this.aiInterval = null;
                this.completeAIAnalysis();
                aiButton.classList.remove('glowing');
            }
        }, PROGRESS_ANIMATION_STEP_MS);
    }

    completeAIAnalysis() {
        // Simulated highlight positions in video (percentage of total duration)
        const HIGHLIGHT_POSITIONS = [
            { type: 'Three-Pointer', position: 0.15, duration: 8 },
            { type: 'Dunk', position: 0.35, duration: 6 },
            { type: 'Block', position: 0.58, duration: 5 },
            { type: 'Steal', position: 0.72, duration: 7 },
            { type: 'Fast Break', position: 0.88, duration: 9 }
        ];

        const videoDuration = this.video.duration;
        
        HIGHLIGHT_POSITIONS.forEach(highlight => {
            const clip = {
                title: `${highlight.type} (AI)`,
                startTime: videoDuration * highlight.position,
                endTime: videoDuration * highlight.position + highlight.duration,
                duration: highlight.duration,
                type: 'ai',
                action: highlight.type
            };
            Store.addClip(clip);
        });

        // Update status
        document.getElementById('aiStatus').innerHTML = `
            <strong>✅ Analysis Complete!</strong><br>
            Found ${HIGHLIGHT_POSITIONS.length} highlight moments
        `;

        // Close modal after delay
        setTimeout(() => {
            app.closeModal();
            this.resetAIModal();
        }, 2000);
    }

    cancelAIAnalysis() {
        if (this.aiInterval) {
            clearInterval(this.aiInterval);
            this.aiInterval = null;
        }
        if (this.aiButton) {
            this.aiButton.classList.remove('glowing');
        }
        this.resetAIModal();
    }

    resetAIModal() {
        setTimeout(() => {
            const progress = document.getElementById('aiProgress');
            const percent = document.getElementById('aiProgressPercent');
            const eta = document.getElementById('aiProgressETA');
            const status = document.getElementById('aiStatus');

            if (progress) progress.style.width = '0%';
            if (percent) percent.textContent = '0%';
            if (eta) eta.textContent = 'Estimating...';
            if (status) status.textContent = 'Analyzing video for highlights...';
        }, 150);
    }

    formatTime(seconds) {
        if (!Number.isFinite(seconds)) {
            return '0:00';
        }
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    setLoading(isLoading, detail = '') {
        const loadingEl = document.getElementById('videoLoading');
        const detailEl = document.getElementById('videoLoadingDetail');
        if (!loadingEl) return;
        if (detailEl && detail) detailEl.textContent = detail;
        loadingEl.classList.toggle('hidden', !isLoading);
    }

    updateVideoMeta(file = null) {
        const nameEl = document.getElementById('videoFileName');
        const durationEl = document.getElementById('videoDuration');
        const resolutionEl = document.getElementById('videoResolution');

        if (file && nameEl) {
            nameEl.textContent = file.name;
        } else if (nameEl && Store.getCurrentVideo()?.name) {
            nameEl.textContent = Store.getCurrentVideo().name;
        }

        if (this.video && durationEl) {
            const duration = this.video.duration || 0;
            durationEl.textContent = this.formatTime(duration);
        }

        if (this.video && resolutionEl) {
            const width = this.video.videoWidth || 0;
            const height = this.video.videoHeight || 0;
            resolutionEl.textContent = width && height ? `${width}×${height}` : '—';
        }
    }
}

// Initialize player tab
let playerTab;
document.addEventListener('DOMContentLoaded', () => {
    playerTab = new PlayerTab();
    window.playerTab = playerTab; // Make it globally accessible
});
