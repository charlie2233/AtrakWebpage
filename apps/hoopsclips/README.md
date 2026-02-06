# Hoops Clips - Web Version

Basketball video editor for capturing, reviewing, styling, and exporting game clips with optional AI highlight detection.

## Features

- **Video Player**: Load and play basketball game videos
- **Manual Clip Marking**: Mark in/out points to create clips manually
- **AI Highlight Detection**: Automatically detect exciting plays (dunks, three-pointers, blocks, steals, fast breaks)
- **Review System**: Tag clips as Keep/Discard with team assignments (Team A/B)
- **Clip Styles**: Apply visual styles to clips (Classic, Vibrant, Neon, Highlight)
- **Export Formats**: Export clip metadata as JSON, CSV, or EDL (Edit Decision List)
- **Local Storage**: All data persists in browser's localStorage

## Tech Stack

- **Pure HTML5, CSS3, JavaScript**: No external dependencies
- **LocalStorage API**: Client-side data persistence
- **HTML5 Video API**: Video playback and control
- **Dark Theme**: Purple accent (#7C5CFF) on dark background

## Usage

1. **Load Video**: Click "Load Video" in the Player tab and select a basketball game video
2. **Mark Clips**: 
   - Play video and click "Mark In" at the start of a play
   - Click "Mark Out" at the end
   - Click "Add Clip" to save
3. **AI Detection**: Click "AI Detect" to automatically find highlights (uses stub worker in demo mode)
4. **Review**: Switch to Review tab to tag clips as Keep/Discard and assign teams
5. **Export**: Go to Export tab and download clips metadata in your preferred format

## Settings

- **AI Worker URL**: Configure URL for real TimeSformer AI worker (optional)
- **Clip Padding**: Set extra seconds before/after clips
- **Dark Mode**: Toggle dark/light theme
- **Clear Storage**: Reset all data

## File Structure

```
apps/hoopsclips/
├── index.html          # Main app page
├── css/
│   └── styles.css      # All styles with CSS variables
├── js/
│   ├── app.js          # Main app and tab navigation
│   ├── store.js        # State management with localStorage
│   ├── player.js       # Video player and clip marking
│   ├── review.js       # Review and tagging
│   └── export.js       # Export functionality
└── README.md           # This file
```

## AI Worker (Optional)

By default, the app uses a stub worker that simulates AI detection for demo purposes. To use real AI detection:

1. Set up the Python TimeSformer worker (see main project README)
2. Start the worker on a local server (e.g., `http://localhost:9000`)
3. Enter the worker URL in Settings tab
4. Enable AI detection and click "AI Detect"

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- Requires HTML5 video support

## Data Storage

All clips and settings are stored in browser's localStorage. Data persists between sessions but is browser-specific. Use the Export feature to save your work permanently.

## Known Limitations

- No actual video clip export (only metadata) - use EDL in professional video editing software
- AI detection is simulated (stub worker) unless connected to real AI worker
- Video files must be browser-compatible formats (MP4, WebM)
- No cloud sync - data is local to browser

## Future Enhancements

- Real video clip extraction
- Cloud storage integration
- Collaborative review features
- Advanced AI models
- Mobile-optimized interface

---

**Built by Atrak Team**
