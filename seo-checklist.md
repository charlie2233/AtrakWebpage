# SEO Checklist for atrak.dev

This document outlines steps to verify and improve search engine visibility for the Atrak website.

## ✅ Completed SEO Improvements

### 1. Meta Tags
- ✅ Unique `<title>` tags (≤60 chars) on all pages
- ✅ `<meta name="description">` (≤155 chars) on all pages
- ✅ Canonical URLs (`<link rel="canonical">`) on all pages
- ✅ Open Graph tags (og:title, og:description, og:url, og:image, og:type)
- ✅ Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
- ✅ Robots meta tag (`<meta name="robots" content="index,follow">`)

### 2. Structured Data (JSON-LD)
- ✅ Organization schema on homepage
- ✅ WebSite schema on homepage
- ✅ SoftwareApplication schema on project pages

### 3. Technical SEO
- ✅ `robots.txt` created (allows all, includes sitemap)
- ✅ `sitemap.xml` created with all pages
- ✅ Viewport meta tag present on all pages
- ✅ Lazy loading on non-critical images
- ✅ Proper heading hierarchy (h1, h2, h3)

### 4. Internal Linking
- ✅ Breadcrumbs added to project pages
- ✅ Standard anchor links (not JS-only)
- ✅ Descriptive anchor text

## 📋 Next Steps: Google Search Console

### 1. Submit Sitemap
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://atrak.dev`
3. Verify ownership (DNS, HTML file, or meta tag)
4. Navigate to **Sitemaps** in the left menu
5. Enter: `https://atrak.dev/sitemap.xml`
6. Click **Submit**

### 2. Request Indexing
1. In Search Console, use **URL Inspection** tool
2. Enter homepage URL: `https://atrak.dev/`
3. Click **Request Indexing**
4. Repeat for key pages:
   - `https://atrak.dev/handbook.html`
   - `https://atrak.dev/join.html`
   - `https://atrak.dev/releases.html`
   - `https://atrak.dev/projects/guidepup.html`
   - `https://atrak.dev/projects/hoops-clips.html`
   - `https://atrak.dev/projects/atrak-agent.html`

### 3. Monitor Coverage
- Check **Coverage** report weekly
- Fix any "Excluded" or "Error" pages
- Monitor **Performance** for search queries

## 🧪 Testing & Validation

### Test Indexing
1. **Site Query**: Search `site:atrak.dev` on Google
   - Should show all pages within 1-2 weeks
2. **URL Inspection**: Use Google Search Console URL Inspection
   - Verify "URL is on Google" status
3. **Mobile-Friendly Test**: [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
   - Enter any page URL

### Validate Structured Data
1. **Google Rich Results Test**: [Rich Results Test](https://search.google.com/test/rich-results)
   - Enter page URL or paste HTML
   - Should show Organization and WebSite schemas
2. **Schema.org Validator**: [Schema Markup Validator](https://validator.schema.org/)
   - Paste JSON-LD from page source

### Validate Open Graph Tags
1. **Facebook Sharing Debugger**: [Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - Enter URL and click "Debug"
   - Should show preview with image, title, description
2. **Twitter Card Validator**: [Card Validator](https://cards-dev.twitter.com/validator)
   - Enter URL to preview Twitter card

### Validate Meta Tags
1. **SEO Site Checkup**: [SEO Site Checkup](https://seositecheckup.com/)
   - Enter domain and run full audit
2. **Lighthouse**: Run Chrome DevTools Lighthouse
   - Check SEO score (should be 90+)

## 📊 Page-Specific Titles & Descriptions

### Homepage
- **Title**: Atrak — Tech Team (7 chars)
- **Description**: Atrak — student tech team building AI, accessibility, and real-world software projects (89 chars)

### Handbook
- **Title**: Team Handbook — Atrak (20 chars)
- **Description**: Atrak Team Handbook — How we work, our values, and what to expect (66 chars)

### Join
- **Title**: Join Atrak — Apply to Our Team (26 chars)
- **Description**: Join Atrak — student tech team building real projects (54 chars)

### Releases
- **Title**: Release Notes — Atrak (20 chars)
- **Description**: Atrak Release Notes — Monthly updates on what shipped, what broke, and what's next. (88 chars)

### GuidePup
- **Title**: GuidePup — AI Vision Assistant | Atrak (37 chars)
- **Description**: GuidePup — AI Vision Assistant for accessibility. Real-time camera analysis with voice feedback. (95 chars)

### Hoops Clips
- **Title**: Hoops Clips — AI Basketball Highlights | Atrak (42 chars)
- **Description**: Hoops Clips — AI-powered basketball highlight detection and clip generation system. (88 chars)

### Atrak Agent
- **Title**: Atrak Agent — Desktop AI Assistant | Atrak (38 chars)
- **Description**: Atrak Agent — Desktop AI Agent for macOS and Windows. OS-level assistant integrating LLMs and APIs to automate tasks. (120 chars)

### Ten Seconds VIP Manager
- **Title**: Ten Seconds VIP Manager — Restaurant Tool | Atrak (46 chars)
- **Description**: Ten Seconds VIP Manager — Internal tool for VIP tracking, balances, and operational workflows. (94 chars)

### AI Predator Simulation
- **Title**: AI Predator Simulation — Multi-Agent AI | Atrak (42 chars)
- **Description**: AI Predator Simulation — Multi-agent survival system with emergent hunting behaviors. (88 chars)

## 🔍 Ongoing Monitoring

### Weekly Checks
- [ ] Review Search Console for errors
- [ ] Check indexing status of new pages
- [ ] Monitor search performance metrics

### Monthly Checks
- [ ] Update sitemap if new pages added
- [ ] Review and refresh meta descriptions if needed
- [ ] Check for broken internal links
- [ ] Validate structured data still correct

### Quarterly Checks
- [ ] Full SEO audit with Lighthouse
- [ ] Review and update page titles/descriptions
- [ ] Check competitor SEO strategies
- [ ] Update structured data if organization changes

## 📝 Notes

- All pages use `https://atrak.dev` as canonical domain
- Images below the fold use `loading="lazy"`
- All pages have proper heading hierarchy
- Internal links use descriptive anchor text
- No JavaScript-only navigation (all links are standard `<a>` tags)

## 🚀 Additional Recommendations (Future)

1. **Blog Content**: Regular blog posts can improve SEO
2. **Backlinks**: Reach out to tech communities, GitHub, etc.
3. **Page Speed**: Monitor Core Web Vitals in Search Console
4. **HTTPS**: Ensure SSL certificate is valid (should already be)
5. **Analytics**: Set up Google Analytics for traffic insights

