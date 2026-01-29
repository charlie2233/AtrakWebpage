// ============================================
// BLOG RENDERING & FILTERING
// ============================================

const BLOG_POSTS_PATH = 'data/blog-posts.json';
let allBlogPosts = [];
let filteredPosts = [];

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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
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

    return `
        <article class="blog-post-card glass-card reveal">
            <a href="blog/${post.slug}.html" class="blog-post-link">
                <div class="blog-post-image-wrapper">
                    ${featuredImage}
                </div>
                <div class="blog-post-content">
                    <div class="blog-post-meta">
                        <span class="blog-post-date">${formatDate(post.date)}</span>
                        <span class="blog-post-reading-time">${post.readingTime || calculateReadingTime(post.content)} min read</span>
                    </div>
                    <h3 class="blog-post-title">${escapeHtml(post.title)}</h3>
                    <p class="blog-post-excerpt">${escapeHtml(post.excerpt)}</p>
                    <div class="blog-post-footer">
                        <div class="blog-post-tags">
                            ${tags}
                        </div>
                        <span class="blog-post-author">By ${escapeHtml(post.author)}</span>
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
            const searchableText = `${post.title} ${post.excerpt} ${post.tags?.join(' ') || ''} ${post.author || ''}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    });

    // Sort by date (newest first)
    filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    renderBlogPosts(filteredPosts);
}

/**
 * Initialize blog
 */
async function initBlog() {
    try {
        const response = await fetch(BLOG_POSTS_PATH);
        if (!response.ok) {
            console.warn('Blog posts data not found');
            document.getElementById('blog-posts-grid').innerHTML = '<p class="empty-message">No blog posts available.</p>';
            return;
        }

        allBlogPosts = await response.json();
        if (!Array.isArray(allBlogPosts) || allBlogPosts.length === 0) {
            document.getElementById('blog-posts-grid').innerHTML = '<p class="empty-message">No blog posts available.</p>';
            return;
        }

        // Calculate reading times if not provided
        allBlogPosts.forEach(post => {
            if (!post.readingTime && post.content) {
                post.readingTime = calculateReadingTime(post.content);
            }
        });

        // Render tag filters
        renderTagFilters(allBlogPosts);

        // Initial render
        filteredPosts = [...allBlogPosts];
        filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderBlogPosts(filteredPosts);

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
        const postUrl = `${siteUrl}/blog/${post.slug}.html`;
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

