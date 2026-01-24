# LunarWeb

A modern, minimal tech team website + project hub featuring a clean startup aesthetic inspired by Vercel and Cursor. Built with pure HTML5, CSS3, and JavaScript.

## ✨ Features

### Design
- 🌑 **Dark Theme**: Professional black background with blue-purple gradient accents
- 🎨 **Glass Morphism**: Modern glassmorphic effects on cards and UI elements
- 💫 **Smooth Animations**: Intersection Observer-based scroll animations and hover effects
- 📱 **Fully Responsive**: Mobile-first design that works on all devices
- ♿ **Accessible**: Semantic HTML with proper ARIA labels

### Sections
- 🏠 **Hero Section**: Eye-catching landing with gradient text and floating card animations
- 📊 **Stats Display**: Animated counter showing key metrics
- 🚀 **Projects Showcase**: Notable technical projects with modern card layouts
- 📖 **About Section**: Company information with interactive code preview
- 👥 **Leadership Team**: Team member profiles with social links
- 📬 **Anonymous Suggestion Box**: Visitors can send feedback without sharing identity
- 🔗 **Footer**: Comprehensive navigation and information

### Performance
- ⚡ **Optimized Scrolling**: RequestAnimationFrame-based scroll throttling
- 🚀 **Cached DOM Queries**: Minimal reflow and repaint
- 💨 **Smooth Parallax**: Hardware-accelerated CSS transforms
- 🎯 **Lazy Loading**: Intersection Observer for on-demand animations

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/charlie2233/LunarWeb.git
   cd LunarWeb
   ```

2. **Open in browser**
   ```bash
   # Using Python
   python3 -m http.server 8080
   
   # Using Node.js
   npx http-server -p 8080
   
   # Or simply open index.html in your browser
   ```

3. **Visit** `http://localhost:8080`

## 📬 Suggestion Box Setup (Anonymous Email)

The site includes an anonymous suggestion form that posts to a backend endpoint (recommended: Formspree) so your email address is not displayed on the page.

1. Create a form at `https://formspree.io` and set the recipient to your inbox.
2. Copy your Formspree endpoint URL (looks like `https://formspree.io/f/xxxxxx`).
3. Update `index.html` and replace `REPLACE_ME` in the `#suggestion-form` `action` and `data-endpoint` attributes.

## 📁 Project Structure

```
LunarWeb/
├── index.html      # Main HTML structure
├── styles.css      # All styles with CSS variables
├── script.js       # Interactive functionality
├── projects/       # Project detail pages
│   ├── guidepup.html
│   ├── hoops-clips.html
│   ├── lunar.html
│   └── ten-seconds-vip-manager.html
└── README.md       # This file
```

## 🎨 Color Palette

- **Background**: `#000000`, `#0a0a0a`, `#111111`
- **Text**: `#ffffff`, `#a0a0a0`, `#666666`
- **Accent**: `#3b82f6` (Blue) to `#8b5cf6` (Purple)
- **Borders**: `rgba(255, 255, 255, 0.1)`

## 🛠️ Technologies

- **HTML5**: Semantic markup
- **CSS3**: Modern features (Grid, Flexbox, CSS Variables, Animations)
- **JavaScript ES6+**: Vanilla JS with modern APIs
- **No Dependencies**: Zero external libraries or frameworks

## 📱 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

## 🔒 Security

- ✅ CodeQL scanned: 0 vulnerabilities
- ✅ No unsafe DOM manipulation
- ✅ CSP-friendly (no inline scripts)

## 📝 License

MIT License - feel free to use this template for your own projects!

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

**Built with ❤️ by the LunarWeb Team**

*Building tomorrow's technology today* 🌙
