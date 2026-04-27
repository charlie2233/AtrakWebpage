// ============================================
// BLOG RENDERING & FILTERING
// ============================================

const BLOG_DATA_VERSION = '20260427';
const BLOG_POSTS_PREVIEW_PATH = `data/blog-posts-preview.json?v=${BLOG_DATA_VERSION}`;
const BLOG_POSTS_DIR = 'data/blog-posts/';
const TEAM_MEMBERS_PATH = 'data/team-members.json';
let allBlogPosts = [];
let filteredPosts = [];
let teamMembers = [];
let blogPreviewLastModified = null;

/**
 * Content moderation - checks for inappropriate content
 */
const CONTENT_MODERATION = {
    // Adult content keywords (UK 18+)
    adultKeywords: [
        'porn', 'pornography', 'xxx', 'nsfw', 'explicit', 'sexual', 'nude', 'naked',
        'adult content', '18+', 'mature content', 'erotic', 'sex', 'intimate'
    ],
    
    // Illegal activity keywords
    illegalKeywords: [
        'hack', 'hacking', 'crack', 'cracking', 'pirate', 'piracy', 'warez',
        'illegal download', 'stolen', 'fraud', 'scam', 'phishing', 'malware',
        'virus', 'trojan', 'drug', 'drugs', 'cocaine', 'heroin', 'marijuana',
        'weapon', 'weapons', 'gun', 'guns', 'bomb', 'terrorism', 'terrorist'
    ],
    
    // Other red flag content
    redFlagKeywords: [
        'violence', 'violent', 'gore', 'blood', 'kill', 'murder', 'suicide',
        'self-harm', 'harmful', 'dangerous', 'illegal', 'unlawful'
    ]
};

/**
 * Check if blog post content violates moderation rules
 * Works with preview data (title, excerpt) or full post (with content)
 */
function checkContentModeration(post) {
    const violations = [];
    const content = post.content 
        ? `${post.title} ${post.excerpt} ${post.content}`.toLowerCase()
        : `${post.title} ${post.excerpt}`.toLowerCase();
    
    // Check for adult content
    const adultMatches = CONTENT_MODERATION.adultKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
    );
    if (adultMatches.length > 0) {
        violations.push({
            type: 'adult',
            severity: 'high',
            message: 'UK 18+ Content Detected',
            keywords: adultMatches
        });
    }
    
    // Check for illegal content
    const illegalMatches = CONTENT_MODERATION.illegalKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
    );
    if (illegalMatches.length > 0) {
        violations.push({
            type: 'illegal',
            severity: 'critical',
            message: 'Illegal Content Detected',
            keywords: illegalMatches
        });
    }
    
    // Check for other red flags
    const redFlagMatches = CONTENT_MODERATION.redFlagKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
    );
    if (redFlagMatches.length > 0 && violations.length === 0) {
        violations.push({
            type: 'redflag',
            severity: 'medium',
            message: 'Content Review Required',
            keywords: redFlagMatches
        });
    }
    
    return violations.length > 0 ? violations : null;
}

/**
 * Calculate reading time from content
 */
function calculateReadingTime(content) {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
}


/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const dateOnlyMatch = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = dateOnlyMatch
        ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
        : new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function toValidDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function getBlogFreshnessMeta(dateValue, thresholds = { freshDays: 14, agingDays: 45 }) {
    const date = toValidDate(dateValue);
    if (!date) return { state: 'unknown', label: 'Unknown' };
    const ageDays = Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays <= thresholds.freshDays) return { state: 'fresh', label: 'Fresh' };
    if (ageDays <= thresholds.agingDays) return { state: 'aging', label: 'Aging' };
    return { state: 'stale', label: 'Stale' };
}

function formatUtcStamp(dateValue) {
    const date = toValidDate(dateValue);
    if (!date) return '';
    try {
        return date.toUTCString().replace('GMT', 'UTC');
    } catch (e) {
        return '';
    }
}

function renderBlogFreshness(posts) {
    const el = document.getElementById('blog-freshness-strip');
    if (!el) return;

    const list = Array.isArray(posts) ? posts : [];
    const latestPostDate = list
        .map(post => toValidDate(post && post.date))
        .filter(Boolean)
        .sort((a, b) => b - a)[0] || null;
    const dataFileDate = toValidDate(blogPreviewLastModified);
    const freshness = getBlogFreshnessMeta(latestPostDate || dataFileDate);

    const primaryText = latestPostDate
        ? `Latest post published ${formatDate(latestPostDate.toISOString().slice(0, 10))}`
        : 'No published posts found yet';
    const metaParts = [];
    if (list.length) metaParts.push(`${list.length} posts`);
    if (dataFileDate) metaParts.push(`Preview cache updated ${formatUtcStamp(dataFileDate)}`);

    el.innerHTML = `
        <span class="content-freshness-badge" data-state="${escapeHtml(freshness.state)}">${escapeHtml(freshness.label)}</span>
        <span class="content-freshness-text">${escapeHtml(primaryText)}</span>
        ${metaParts.length ? `<span class="content-freshness-meta">• ${escapeHtml(metaParts.join(' • '))}</span>` : ''}
    `;
}

/**
 * Get view count for a blog post
 */
function getViewCount(slug) {
    try {
        const views = JSON.parse(localStorage.getItem('blog_views') || '{}');
        return views[slug] || 0;
    } catch (e) {
        return 0;
    }
}

/**
 * Increment view count for a blog post
 */
function incrementViewCount(slug) {
    try {
        const views = JSON.parse(localStorage.getItem('blog_views') || '{}');
        views[slug] = (views[slug] || 0) + 1;
        localStorage.setItem('blog_views', JSON.stringify(views));
        return views[slug];
    } catch (e) {
        console.error('Error incrementing view count:', e);
        return 0;
    }
}

/**
 * Create moderation badge for flagged content
 */
function createModerationBadge(violations) {
    if (!violations || violations.length === 0) return '';
    
    // Get highest severity
    const severityOrder = { 'critical': 3, 'high': 2, 'medium': 1 };
    const highestViolation = violations.reduce((prev, curr) => 
        severityOrder[curr.severity] > severityOrder[prev.severity] ? curr : prev
    );
    
    const severityClass = `moderation-${highestViolation.severity}`;
    const icon = highestViolation.severity === 'critical' ? '🚨' : 
                 highestViolation.severity === 'high' ? '⚠️' : '🔍';
    
    return `
        <div class="moderation-flag ${severityClass}" title="${highestViolation.message}">
            <span class="moderation-icon">${icon}</span>
            <span class="moderation-text">${highestViolation.message}</span>
        </div>
    `;
}

/**
 * Get comments for a blog post
 */
function getComments(slug) {
    try {
        const comments = JSON.parse(localStorage.getItem('blog_comments') || '{}');
        return comments[slug] || [];
    } catch (e) {
        return [];
    }
}

/**
 * Add comment to a blog post
 */
function addComment(slug, comment) {
    try {
        const comments = JSON.parse(localStorage.getItem('blog_comments') || '{}');
        if (!comments[slug]) {
            comments[slug] = [];
        }
        comments[slug].push({
            ...comment,
            id: Date.now().toString(),
            date: new Date().toISOString()
        });
        localStorage.setItem('blog_comments', JSON.stringify(comments));
        return comments[slug];
    } catch (e) {
        console.error('Error adding comment:', e);
        return [];
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get author info from team members
 */
function getAuthorInfo(authorName) {
    if (!Array.isArray(teamMembers) || !authorName) return null;
    return teamMembers.find(member => member.name === authorName) || null;
}

/**
 * Create author avatar HTML
 */
function createAuthorAvatar(authorInfo) {
    if (!authorInfo || !authorInfo.avatar) {
        // Fallback avatar
        return `
            <div class="blog-author-avatar" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(139, 92, 246, 0.25));">
                <span>?</span>
            </div>
        `;
    }
    
    const initials = authorInfo.avatar.initials || '?';
    const gradient = authorInfo.avatar.gradient || 'linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(139, 92, 246, 0.25))';
    
    return `
        <div class="blog-author-avatar" style="background: ${gradient};">
            <span>${escapeHtml(initials)}</span>
        </div>
    `;
}

/**
 * Create blog post card HTML
 */
function createBlogPostCard(post) {
    const featuredImage = post.featuredImage 
        ? `<img src="${post.featuredImage}" alt="${escapeHtml(post.title)}" class="blog-post-image" loading="lazy">`
        : `<div class="blog-post-image-placeholder">
            <span class="blog-post-icon">📝</span>
        </div>`;

    const tags = post.tags.map(tag => 
        `<span class="tag blog-tag">${escapeHtml(tag)}</span>`
    ).join('');

    // Get author info
    const authorInfo = getAuthorInfo(post.author);
    const authorAvatar = createAuthorAvatar(authorInfo);
    const authorRole = authorInfo ? authorInfo.role : 'Team Member';
    
    // Check content moderation (using preview data - title, excerpt)
    const violations = checkContentModeration(post);
    const moderationBadge = violations ? createModerationBadge(violations) : '';

    return `
        <article class="blog-post-card glass-card reveal ${violations ? 'has-moderation-flag' : ''}">
            ${moderationBadge}
            <a href="blog/${encodeURIComponent(post.slug)}.html" class="blog-post-link">
                <div class="blog-post-image-wrapper">
                    ${featuredImage}
                </div>
                <div class="blog-post-content">
                    <div class="blog-post-meta">
                        <span class="blog-post-date">Published ${formatDate(post.date)}</span>
                        <span class="blog-post-reading-time">${post.readingTime || calculateReadingTime(post.content)} min read</span>
                        <span class="blog-post-views">👁️ ${getViewCount(post.slug)} views</span>
                    </div>
                    <h3 class="blog-post-title">${escapeHtml(post.title)}</h3>
                    <p class="blog-post-excerpt">${escapeHtml(post.excerpt)}</p>
                    <div class="blog-post-footer">
                        <div class="blog-post-tags">
                            ${tags}
                        </div>
                        <div class="blog-post-author-info">
                            ${authorAvatar}
                            <div class="blog-author-details">
                                <span class="blog-post-author-name">${escapeHtml(post.author)}</span>
                                <span class="blog-post-author-role">${escapeHtml(authorRole)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        </article>
    `;
}

/**
 * Render blog posts
 */
function renderBlogPosts(posts) {
    const container = document.getElementById('blog-posts-grid');
    const emptyState = document.getElementById('blog-empty');
    
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = posts.map(post => createBlogPostCard(post)).join('');

    // Trigger reveal animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    container.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/**
 * Get all unique tags from posts
 */
function getAllTags(posts) {
    const tagSet = new Set();
    posts.forEach(post => {
        if (Array.isArray(post.tags)) {
            post.tags.forEach(tag => tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort();
}

/**
 * Render tag filters
 */
function renderTagFilters(posts) {
    const container = document.getElementById('blog-tags-filter');
    if (!container) return;

    const tags = getAllTags(posts);
    const tagsHtml = tags.map(tag => 
        `<button class="tag filter-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
    ).join('');

    container.innerHTML = `<button class="tag filter-tag active" data-tag="all">All</button>${tagsHtml}`;

    // Add click handlers
    container.querySelectorAll('.filter-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const selectedTag = btn.dataset.tag;
            filterPosts(selectedTag === 'all' ? null : selectedTag);
        });
    });
}

/**
 * Filter posts by tag and search
 */
function filterPosts(selectedTag = null) {
    const searchInput = document.getElementById('blog-search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    filteredPosts = allBlogPosts.filter(post => {
        // Tag filter
        if (selectedTag && selectedTag !== 'all') {
            if (!post.tags || !post.tags.includes(selectedTag)) {
                return false;
            }
        }

        // Search filter
        if (searchTerm) {
            const tagsText = Array.isArray(post.tags) ? post.tags.join(' ') : '';
            const searchableText = `${post.title} ${post.excerpt} ${tagsText} ${post.author || ''}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    });

    // Sort by date (newest first)
    filteredPosts.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        return dateB - dateA; // Newest first
    });

    renderBlogPosts(filteredPosts);
    
    // Update moderation notice
    checkAndShowModerationNotice(filteredPosts);
}

/**
 * Check for moderated content and show notice
 */
function checkAndShowModerationNotice(posts) {
    const hasFlaggedContent = posts.some(post => checkContentModeration(post) !== null);
    const notice = document.getElementById('moderation-notice');
    
    if (notice) {
        notice.style.display = hasFlaggedContent ? 'block' : 'none';
    }
}

/**
 * Initialize blog
 */
async function initBlog() {
    try {
        // Load team members and blog posts preview in parallel
        const [postsResponse, teamResponse] = await Promise.all([
            fetch(BLOG_POSTS_PREVIEW_PATH),
            fetch(TEAM_MEMBERS_PATH)
        ]);
        blogPreviewLastModified = postsResponse && typeof postsResponse.headers?.get === 'function'
            ? postsResponse.headers.get('last-modified')
            : null;

        // Load team members
        if (teamResponse.ok) {
            teamMembers = await teamResponse.json();
            if (!Array.isArray(teamMembers)) {
                teamMembers = [];
            }
        }

        // Load blog posts preview (without full content)
        if (!postsResponse.ok) {
            console.warn('Blog posts preview data not found');
            document.getElementById('blog-posts-grid').innerHTML = '<p class="empty-message">No blog posts available.</p>';
            renderBlogFreshness([]);
            return;
        }

        allBlogPosts = await postsResponse.json();
        if (!Array.isArray(allBlogPosts) || allBlogPosts.length === 0) {
            document.getElementById('blog-posts-grid').innerHTML = '<p class="empty-message">No blog posts available.</p>';
            renderBlogFreshness([]);
            return;
        }

        // Note: Reading times should be in preview data
        // If not provided, we'll calculate when loading full post

        // Render tag filters
        renderTagFilters(allBlogPosts);

        // Sort all posts by date (newest first) before initial render
        allBlogPosts.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
            return dateB - dateA; // Newest first
        });
        
        // Initial render
        filteredPosts = [...allBlogPosts];
        renderBlogPosts(filteredPosts);
        renderBlogFreshness(allBlogPosts);
        
        // Check for moderation flags and show notice if needed
        checkAndShowModerationNotice(allBlogPosts);

        // Search input handler
        const searchInput = document.getElementById('blog-search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const activeTag = document.querySelector('.filter-tag.active');
                    const selectedTag = activeTag ? activeTag.dataset.tag : null;
                    filterPosts(selectedTag === 'all' ? null : selectedTag);
                }, 300);
            });
        }

    } catch (error) {
        console.error('Failed to load blog posts:', error);
        document.getElementById('blog-posts-grid').innerHTML = '<p class="empty-message">Unable to load blog posts.</p>';
        renderBlogFreshness([]);
    }
}

/**
 * Generate RSS feed XML
 */
function generateRSSFeed(posts) {
    const siteUrl = window.location.origin;
    const blogUrl = `${siteUrl}/blog.html`;
    const feedUrl = `${siteUrl}/blog/feed.xml`;
    
    const rssItems = posts.map(post => {
        const postUrl = `${siteUrl}/blog/${encodeURIComponent(post.slug)}.html`;
        const pubDate = new Date(post.date).toUTCString();
        const description = escapeHtml(post.excerpt);
        
        return `
    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeHtml(post.author)}</author>
      ${post.tags ? post.tags.map(tag => `<category>${escapeHtml(tag)}</category>`).join('\n      ') : ''}
    </item>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Atrak Blog</title>
    <link>${blogUrl}</link>
    <description>Insights, tutorials, and stories from building real products</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;
}

/**
 * Create and download RSS feed
 */
function createRSSFeed(posts) {
    const rssContent = generateRSSFeed(posts);
    const blob = new Blob([rssContent], { type: 'application/rss+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'feed.xml';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlog);
} else {
    initBlog();
}

// Export for potential use in other scripts
window.Blog = {
    generateRSSFeed,
    createRSSFeed
};
