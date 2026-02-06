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
        this.audioPeaks = null;
        this.init();
    }

    init() {
        this.setupVideoUpload();
        this.setupVideoControls();
        this.setupVideoUrlInput();
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

    setupVideoUrlInput() {
        const urlInput = document.getElementById('videoUrlInput');
        const loadBtn = document.getElementById('loadVideoUrl');
        if (!urlInput || !loadBtn) return;

        const load = () => {
            const url = urlInput.value.trim();
            if (!url) {
                alert('Paste a video URL first.');
                return;
            }
            this.loadVideoUrl(url);
        };

        loadBtn.addEventListener('click', load);
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                load();
            }
        });
    }

    loadVideoFile(file, { videoPlayer, videoSource, placeholder }) {
        if (this.currentObjectUrl) {
            URL.revokeObjectURL(this.currentObjectUrl);
        }

        this.stopReelPreview();
        this.markInTime = null;
        this.markOutTime = null;
        this.audioPeaks = null;
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
            url: url,
            remoteUrl: null
        });

        this.updateVideoMeta(file);
        this.computeAudioPeaks(file);
    }

    loadVideoUrl(url) {
        const videoPlayer = document.getElementById('videoPlayer');
        const videoSource = document.getElementById('videoSource');
        const placeholder = document.getElementById('videoPlaceholder');

        this.stopReelPreview();
        this.markInTime = null;
        this.markOutTime = null;
        this.audioPeaks = null;
        this.updateMarkButtons();

        videoSource.src = url;
        videoPlayer.load();
        placeholder.classList.add('hidden');
        this.setLoading(true, 'Loading remote video...');

        Store.setCurrentVideo({
            name: this.formatUrlName(url),
            size: null,
            type: 'remote',
            url: url,
            remoteUrl: url
        });

        this.updateVideoMeta();
        const urlInput = document.getElementById('videoUrlInput');
        if (urlInput) urlInput.value = url;
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
            const score = Number.isFinite(clip.score) ? clip.score.toFixed(2) : null;
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
                        ${score ? `<span class="clip-badge ai">score ${score}</span>` : ''}
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

        const backendUrl = this.getBackendUrl();
        const videoUrl = this.getVideoUrlForAI();

        // Show AI modal
        app.showModal();

        if (!backendUrl || !videoUrl) {
            this.runStubAIAnalysis();
            return;
        }

        try {
            await this.runBackendAIAnalysis(backendUrl, videoUrl);
        } catch (err) {
            console.error(err);
            this.runStubAIAnalysis('Backend unreachable. Running demo mode.');
        }
    }

    runStubAIAnalysis(message = '') {
        const statusText = document.getElementById('aiStatus');
        if (statusText && message) {
            statusText.textContent = message;
        }

        const progressBar = document.getElementById('aiProgress');
        const progressPercent = document.getElementById('aiProgressPercent');
        const progressETA = document.getElementById('aiProgressETA');

        // Simulate AI analysis (stub worker)
        const aiButton = document.getElementById('aiAnalyze');
        aiButton.classList.add('glowing');
        this.aiButton = aiButton;

        const PROGRESS_ANIMATION_STEP_MS = 50; // Animation step duration in milliseconds
        let progress = 0;
        const totalSteps = 100;

        this.aiInterval = setInterval(() => {
            progress += 1;
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (progressPercent) progressPercent.textContent = `${progress}%`;
            
            const remaining = ((totalSteps - progress) * PROGRESS_ANIMATION_STEP_MS) / 1000;
            if (progressETA) progressETA.textContent = `~${Math.ceil(remaining)}s remaining`;

            if (progress >= 100) {
                clearInterval(this.aiInterval);
                this.aiInterval = null;
                this.completeAIAnalysis();
                aiButton.classList.remove('glowing');
            }
        }, PROGRESS_ANIMATION_STEP_MS);
    }

    async runBackendAIAnalysis(backendUrl, videoUrl) {
        const progressBar = document.getElementById('aiProgress');
        const progressPercent = document.getElementById('aiProgressPercent');
        const progressETA = document.getElementById('aiProgressETA');
        const statusText = document.getElementById('aiStatus');
        const aiButton = document.getElementById('aiAnalyze');
        aiButton.classList.add('glowing');
        this.aiButton = aiButton;

        if (statusText) {
            statusText.textContent = 'Sending video to AI backend...';
        }

        const analyzeRes = await fetch(`${backendUrl}/api/ai/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl })
        });

        if (!analyzeRes.ok) {
            throw new Error(`AI backend error: ${analyzeRes.status}`);
        }

        const analyzeData = await analyzeRes.json();
        const jobId = analyzeData.jobId;
        if (!jobId) {
            throw new Error('AI backend did not return a jobId.');
        }

        let progress = 10;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressPercent) progressPercent.textContent = `${progress}%`;
        if (progressETA) progressETA.textContent = 'Processing...';

        this.aiInterval = setInterval(async () => {
            try {
                const res = await fetch(`${backendUrl}/api/ai/result/${jobId}`);
                if (!res.ok) {
                    throw new Error(`AI backend error: ${res.status}`);
                }
                const data = await res.json();
                progress = Math.min(100, data.progress || progress + 10);
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressPercent) progressPercent.textContent = `${progress}%`;
                if (statusText) statusText.textContent = data.message || 'Processing...';

                if (data.status === 'done') {
                    clearInterval(this.aiInterval);
                    this.aiInterval = null;
                    this.aiButton?.classList.remove('glowing');
                    this.handleBackendEvents(data.events || []);
                    this.finishAIFlow(`✅ Analysis Complete! Found ${data.events?.length || 0} events`);
                } else if (data.status === 'error') {
                    clearInterval(this.aiInterval);
                    this.aiInterval = null;
                    this.aiButton?.classList.remove('glowing');
                    this.finishAIFlow(data.message || 'AI backend error');
                }
            } catch (err) {
                clearInterval(this.aiInterval);
                this.aiInterval = null;
                this.aiButton?.classList.remove('glowing');
                this.finishAIFlow('AI backend unreachable');
            }
        }, 1500);
    }

    handleBackendEvents(events) {
        if (!Array.isArray(events) || events.length === 0) return;
        events.forEach((event, index) => {
            const start = Number(event.start) || 0;
            const end = Number(event.end) || Math.max(start + 1, start);
            const duration = Math.max(0, end - start);
            const aiConfidence = Number(event.confidence) || 0;
            const audioPeak = this.getAudioPeakScore(start, end) || 0;
            const score = (0.9 * aiConfidence) + (0.1 * audioPeak);

            const clip = {
                title: `${this.formatEventType(event.type)} (AI)`,
                startTime: start,
                endTime: end,
                duration: duration,
                type: 'ai',
                action: event.type,
                aiConfidence,
                audioPeak,
                score
            };
            Store.addClip(clip);
        });
    }

    finishAIFlow(message) {
        const statusText = document.getElementById('aiStatus');
        if (statusText) {
            statusText.innerHTML = `<strong>${message}</strong>`;
        }

        setTimeout(() => {
            app.closeModal();
            this.resetAIModal();
        }, 1600);
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
            const audioPeak = this.getAudioPeakScore(videoDuration * highlight.position, videoDuration * highlight.position + highlight.duration) || 0;
            const aiConfidence = 0.78;
            const score = (0.9 * aiConfidence) + (0.1 * audioPeak);
            const clip = {
                title: `${highlight.type} (AI)`,
                startTime: videoDuration * highlight.position,
                endTime: videoDuration * highlight.position + highlight.duration,
                duration: highlight.duration,
                type: 'ai',
                action: highlight.type,
                aiConfidence,
                audioPeak,
                score
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
        const currentVideo = Store.getCurrentVideo();

        if (file && nameEl) {
            nameEl.textContent = file.name;
        } else if (nameEl && currentVideo?.name) {
            nameEl.textContent = currentVideo.name;
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

    getBackendUrl() {
        const settings = Store.getSettings();
        if (settings.aiWorkerUrl) return settings.aiWorkerUrl.replace(/\/$/, '');
        return window.ATRAK_CONFIG?.backends?.hoopsClips?.replace(/\/$/, '') || '';
    }

    getVideoUrlForAI() {
        const currentVideo = Store.getCurrentVideo();
        if (currentVideo?.remoteUrl) return currentVideo.remoteUrl;

        const input = document.getElementById('videoUrlInput');
        const url = input?.value?.trim();
        if (url) return url;

        return '';
    }

    formatEventType(type) {
        if (!type) return 'Highlight';
        return String(type)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    async computeAudioPeaks(file) {
        if (!file || !window.AudioContext) return;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

            const channelData = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;
            const bucketSize = 0.5; // seconds
            const bucketSamples = Math.max(1, Math.floor(sampleRate * bucketSize));
            const peaks = [];

            for (let i = 0; i < channelData.length; i += bucketSamples) {
                let sum = 0;
                const end = Math.min(channelData.length, i + bucketSamples);
                for (let j = i; j < end; j += 1) {
                    const value = channelData[j];
                    sum += value * value;
                }
                const rms = Math.sqrt(sum / Math.max(1, end - i));
                peaks.push(rms);
            }

            const max = Math.max(...peaks, 0.00001);
            this.audioPeaks = {
                bucketSize,
                peaks: peaks.map(value => value / max),
                duration: audioBuffer.duration
            };
        } catch (err) {
            console.warn('Audio analysis failed', err);
            this.audioPeaks = null;
        }
    }

    getAudioPeakScore(start, end) {
        if (!this.audioPeaks || !Number.isFinite(start) || !Number.isFinite(end)) return 0;
        const { bucketSize, peaks } = this.audioPeaks;
        const startIndex = Math.max(0, Math.floor(start / bucketSize));
        const endIndex = Math.min(peaks.length - 1, Math.ceil(end / bucketSize));
        if (endIndex < startIndex) return 0;
        let sum = 0;
        let count = 0;
        for (let i = startIndex; i <= endIndex; i += 1) {
            sum += peaks[i];
            count += 1;
        }
        return count ? sum / count : 0;
    }

    formatUrlName(url) {
        try {
            const parsed = new URL(url);
            const name = parsed.pathname.split('/').pop();
            return name || parsed.hostname;
        } catch (err) {
            return url.slice(0, 32);
        }
    }
}

// Initialize player tab
let playerTab;
document.addEventListener('DOMContentLoaded', () => {
    playerTab = new PlayerTab();
    window.playerTab = playerTab; // Make it globally accessible
});
