// Player Tab - Video player and clip marking
class PlayerTab {
    constructor() {
        this.video = null;
        this.markInTime = null;
        this.markOutTime = null;
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

        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                videoSource.src = url;
                videoPlayer.load();
                placeholder.classList.add('hidden');
                
                // Enable controls
                this.enableControls();
                
                // Store video info
                Store.setCurrentVideo({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: url
                });
            }
        });

        // Enable controls when video is loaded
        videoPlayer.addEventListener('loadedmetadata', () => {
            this.video = videoPlayer;
            this.enableControls();
        });
    }

    setupVideoControls() {
        const markInBtn = document.getElementById('markIn');
        const markOutBtn = document.getElementById('markOut');
        const addClipBtn = document.getElementById('addClip');
        const aiAnalyzeBtn = document.getElementById('aiAnalyze');

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
    }

    enableControls() {
        document.getElementById('markIn').disabled = false;
        document.getElementById('markOut').disabled = false;
        document.getElementById('aiAnalyze').disabled = false;
    }

    updateMarkButtons() {
        const addClipBtn = document.getElementById('addClip');
        
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

        if (clips.length === 0) {
            clipsItems.innerHTML = `
                <div class="empty-state">
                    <p>No clips yet. Mark in/out points and add clips, or use AI detection.</p>
                </div>
            `;
            return;
        }

        clipsItems.innerHTML = clips.map(clip => `
            <div class="clip-item" data-clip-id="${clip.id}">
                <div class="clip-info">
                    <div class="clip-title">${clip.title}</div>
                    <div class="clip-time">
                        ${this.formatTime(clip.startTime)} - ${this.formatTime(clip.endTime)} 
                        (${this.formatTime(clip.duration)})
                    </div>
                </div>
                <div class="clip-actions">
                    <button class="btn-icon" onclick="window.playerTab.playClip(${clip.id})" title="Play">
                        ▶️
                    </button>
                    <button class="btn-icon" onclick="window.playerTab.seekToClip(${clip.id})" title="Jump to">
                        ⏭️
                    </button>
                    <button class="btn-icon" onclick="window.playerTab.deleteClip(${clip.id})" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    playClip(clipId) {
        const clip = Store.getClip(clipId);
        if (clip && this.video) {
            this.video.currentTime = clip.startTime;
            this.video.play();
            
            // Stop at end time
            const checkTime = () => {
                if (this.video.currentTime >= clip.endTime) {
                    this.video.pause();
                    this.video.removeEventListener('timeupdate', checkTime);
                }
            };
            
            this.video.addEventListener('timeupdate', checkTime);
        }
    }

    seekToClip(clipId) {
        const clip = Store.getClip(clipId);
        if (clip && this.video) {
            this.video.currentTime = clip.startTime;
        }
    }

    deleteClip(clipId) {
        if (confirm('Are you sure you want to delete this clip?')) {
            Store.deleteClip(clipId);
        }
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

        let progress = 0;
        const duration = this.video.duration;
        const totalSteps = 100;
        const stepDuration = 50; // ms per step

        const interval = setInterval(() => {
            progress += 1;
            progressBar.style.width = `${progress}%`;
            progressPercent.textContent = `${progress}%`;
            
            const remaining = ((totalSteps - progress) * stepDuration) / 1000;
            progressETA.textContent = `~${Math.ceil(remaining)}s remaining`;

            if (progress >= 100) {
                clearInterval(interval);
                this.completeAIAnalysis();
                aiButton.classList.remove('glowing');
            }
        }, stepDuration);
    }

    completeAIAnalysis() {
        // Simulate detected highlights
        const videoDuration = this.video.duration;
        const highlights = [
            { type: 'Three-Pointer', start: videoDuration * 0.15, duration: 8 },
            { type: 'Dunk', start: videoDuration * 0.35, duration: 6 },
            { type: 'Block', start: videoDuration * 0.58, duration: 5 },
            { type: 'Steal', start: videoDuration * 0.72, duration: 7 },
            { type: 'Fast Break', start: videoDuration * 0.88, duration: 9 }
        ];

        highlights.forEach(highlight => {
            const clip = {
                title: `${highlight.type} (AI)`,
                startTime: highlight.start,
                endTime: highlight.start + highlight.duration,
                duration: highlight.duration,
                type: 'ai',
                action: highlight.type
            };
            Store.addClip(clip);
        });

        // Update status
        document.getElementById('aiStatus').innerHTML = `
            <strong>✅ Analysis Complete!</strong><br>
            Found ${highlights.length} highlight moments
        `;

        // Close modal after delay
        setTimeout(() => {
            app.closeModal();
            // Reset modal for next use
            setTimeout(() => {
                document.getElementById('aiProgress').style.width = '0%';
                document.getElementById('aiProgressPercent').textContent = '0%';
                document.getElementById('aiProgressETA').textContent = 'Estimating...';
                document.getElementById('aiStatus').textContent = 'Analyzing video for highlights...';
            }, 300);
        }, 2000);
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }
}

// Initialize player tab
let playerTab;
document.addEventListener('DOMContentLoaded', () => {
    playerTab = new PlayerTab();
    window.playerTab = playerTab; // Make it globally accessible
});
