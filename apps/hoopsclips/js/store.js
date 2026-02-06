// Store - State management using localStorage
const Store = {
    data: {
        clips: [],
        currentVideo: null,
        settings: {
            aiWorkerUrl: '',
            enableAI: true,
            clipPadding: 2,
            darkMode: true,
            defaultStyle: 'classic'
        }
    },

    init() {
        this.load();
    },

    load() {
        const saved = localStorage.getItem('hoopsClipsData');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.data = { ...this.data, ...parsed };
                if (parsed.settings && typeof parsed.settings === 'object') {
                    this.data.settings = { ...this.data.settings, ...parsed.settings };
                }
                if (Array.isArray(this.data.clips)) {
                    this.data.clips = this.data.clips.map(clip => ({
                        status: clip.status || 'unreviewed',
                        team: clip.team ?? null,
                        style: clip.style || 'classic',
                        type: clip.type || 'manual',
                        ...clip
                    }));
                }
            } catch (e) {
                console.error('Failed to load data:', e);
            }
        }
    },

    save() {
        try {
            localStorage.setItem('hoopsClipsData', JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    },

    // Clips
    addClip(clip) {
        // Generate unique ID using timestamp and counter
        clip.id = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        clip.status = 'unreviewed';
        clip.team = null;
        clip.style = this.data.settings.defaultStyle || 'classic';
        clip.createdAt = new Date().toISOString();
        this.data.clips.push(clip);
        this.save();
        this.notifyUpdate();
    },

    updateClip(id, updates) {
        const clip = this.data.clips.find(c => c.id === id);
        if (clip) {
            Object.assign(clip, updates);
            this.save();
            this.notifyUpdate();
        }
    },

    deleteClip(id) {
        this.data.clips = this.data.clips.filter(c => c.id !== id);
        this.save();
        this.notifyUpdate();
    },

    clearClips() {
        this.data.clips = [];
        this.save();
        this.notifyUpdate();
    },

    getClip(id) {
        return this.data.clips.find(c => c.id === id);
    },

    getClips() {
        return this.data.clips;
    },

    getClipsByStatus(status) {
        return this.data.clips.filter(c => c.status === status);
    },

    // Video
    setCurrentVideo(video) {
        this.data.currentVideo = video;
        this.save();
    },

    getCurrentVideo() {
        return this.data.currentVideo;
    },

    // Settings
    updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this.save();
        this.notifyUpdate();
    },

    getSettings() {
        return this.data.settings;
    },

    // Clear all data
    clear() {
        this.data = {
            clips: [],
            currentVideo: null,
            settings: {
                aiWorkerUrl: '',
                enableAI: true,
                clipPadding: 2,
                darkMode: true,
                defaultStyle: 'classic'
            }
        };
        this.save();
        this.notifyUpdate();
    },

    // Observers
    observers: [],
    
    subscribe(callback) {
        this.observers.push(callback);
    },

    notifyUpdate() {
        this.observers.forEach(callback => callback());
    },

    // Export
    exportJSON() {
        return JSON.stringify(this.data.clips, null, 2);
    },

    exportCSV() {
        if (this.data.clips.length === 0) {
            return 'No clips to export';
        }
        
        const headers = ['ID', 'Title', 'Start Time', 'End Time', 'Duration', 'Status', 'Team', 'Style', 'Created At'];
        const rows = this.data.clips.map(clip => [
            clip.id,
            clip.title,
            clip.startTime,
            clip.endTime,
            clip.duration,
            clip.status,
            clip.team || 'N/A',
            clip.style,
            clip.createdAt
        ]);
        
        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    },

    exportEDL() {
        if (this.data.clips.length === 0) {
            return 'No clips to export';
        }
        
        let edl = 'TITLE: Hoops Clips Export\n';
        edl += 'FCM: NON-DROP FRAME\n\n';
        
        this.data.clips.forEach((clip, index) => {
            const eventNum = String(index + 1).padStart(3, '0');
            const startTC = this.secondsToTimecode(clip.startTime);
            const endTC = this.secondsToTimecode(clip.endTime);
            
            edl += `${eventNum}  AX       V     C        ${startTC} ${endTC} ${startTC} ${endTC}\n`;
            edl += `* FROM CLIP NAME: ${clip.title}\n`;
            edl += `* STATUS: ${clip.status}\n\n`;
        });
        
        return edl;
    },

    secondsToTimecode(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const f = Math.floor((seconds % 1) * 30); // Assuming 30fps
        
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
    }
};

// Initialize store
Store.init();
