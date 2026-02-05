// Blog post page logic
(() => {
    const contentEl = document.getElementById('blog-post-content');
    if (!contentEl) return;

    const withTimeout = (promise, ms) => {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), ms);
        });
        return Promise.race([
            promise.finally(() => clearTimeout(timer)),
            timeout
        ]);
    };

    const showNotFound = () => {
        contentEl.innerHTML = '<div class="container"><div class="glass-card"><h1>Post Not Found</h1><p>The blog post you\'re looking for doesn\'t exist.</p><a href="../blog.html" class="btn btn-primary">Back to Blog</a></div></div>';
    };

    const showError = () => {
        contentEl.innerHTML = '<div class="container"><div class="glass-card"><h1>Error</h1><p>Failed to load blog post. Please try again later.</p><a href="../blog.html" class="btn btn-primary">Back to Blog</a></div></div>';
    };

    const run = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug') || window.location.pathname.split('/').pop().replace('.html', '');

        if (!slug || slug === 'blog-post') {
            showNotFound();
            return;
        }

        try {
            const postResponse = await withTimeout(fetch(`../data/blog-posts/${slug}.json`), 8000);
            if (!postResponse.ok) throw new Error('Failed to load post');
            const post = await postResponse.json();
            if (!post) {
                showNotFound();
                return;
            }

            let teamMembers = [];
            try {
                const teamResponse = await withTimeout(fetch('../data/team-members.json'), 6000);
                if (teamResponse.ok) {
                    teamMembers = await teamResponse.json();
                }
            } catch (_) {
                // ignore team members failures
            }

            const authorInfo = teamMembers.find(m => m.name === post.author);
            const authorAvatar = authorInfo && authorInfo.avatar
                ? `<div class="blog-author-avatar" style="background: ${authorInfo.avatar.gradient || 'linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(139, 92, 246, 0.25))'};"><span>${authorInfo.avatar.initials || '?'}</span></div>`
                : '<div class="blog-author-avatar" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(139, 92, 246, 0.25));"><span>?</span></div>';

            const authorRole = authorInfo ? authorInfo.role : 'Team Member';

            let tocItems = [];

            function slugify(text) {
                return text.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .trim()
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-');
            }

            function markdownToHtml(text) {
                if (!text) return '';
                let html = text;

                const stripHtml = (value) => String(value || '').replace(/<[^>]+>/g, '');

                html = html.replace(/<br\s*\/>/gi, '\n');
                html = html.replace(/<\/p>\s*<p>/gi, '\n\n');
                html = html.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '');
                html = html.replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (match, level, title) => {
                    const cleanTitle = stripHtml(title);
                    return `${'#'.repeat(Number(level))} ${cleanTitle}`;
                });

                const codeBlocks = [];
                html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                    const escaped = escapeHtml(code.trim());
                    const language = lang ? `language-${lang}` : '';
                    const block = `<pre><code class="${language}">${escaped}</code></pre>`;
                    const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
                    codeBlocks.push(block);
                    return token;
                });

                const paragraphs = html.split(/\n\n+/);

                html = paragraphs.map(para => {
                    if (!para.trim()) return '';

                    const codeMatch = para.trim().match(/^@@CODEBLOCK_(\d+)@@$/);
                    if (codeMatch) {
                        const idx = Number(codeMatch[1]);
                        return codeBlocks[idx] || '';
                    }

                    para = para.replace(/^### (.*)$/gm, (m, title) => {
                        const id = slugify(title);
                        tocItems.push({ level: 3, id, title });
                        return `<h3 id="${id}">${title}</h3>`;
                    });
                    para = para.replace(/^## (.*)$/gm, (m, title) => {
                        const id = slugify(title);
                        tocItems.push({ level: 2, id, title });
                        return `<h2 id="${id}">${title}</h2>`;
                    });
                    para = para.replace(/^# (.*)$/gm, (m, title) => {
                        const id = slugify(title);
                        tocItems.push({ level: 1, id, title });
                        return `<h1 id="${id}">${title}</h1>`;
                    });

                    if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
                        const items = para.split(/\n(?=[-*])/).map(item => {
                            const content = item.replace(/^[-*]\s+/, '').trim();
                            return `<li>${formatInlineMarkdown(content)}</li>`;
                        }).join('');
                        return `<ul>${items}</ul>`;
                    }

                    if (!para.trim().startsWith('- ') && /\n[-*]\s+/.test(para)) {
                        const splitIndex = para.search(/\n[-*]\s+/);
                        const intro = para.slice(0, splitIndex).trim();
                        const listPart = para.slice(splitIndex).trim();
                        const introHtml = intro ? `<p>${formatInlineMarkdown(intro).replace(/\n/g, '<br>')}</p>` : '';
                        const items = listPart.split(/\n(?=[-*]\s)/).map(item => {
                            const content = item.replace(/^[-*]\s+/, '').trim();
                            return `<li>${formatInlineMarkdown(content)}</li>`;
                        }).join('');
                        return `${introHtml}<ul>${items}</ul>`;
                    }

                    if (/^\d+\.\s/.test(para.trim())) {
                        const items = para.split(/\n(?=\d+\.\s)/).map(item => {
                            const content = item.replace(/^\d+\.\s+/, '').trim();
                            return `<li>${formatInlineMarkdown(content)}</li>`;
                        }).join('');
                        return `<ol>${items}</ol>`;
                    }

                    if (!/^\d+\.\s/.test(para.trim()) && /\n\d+\.\s/.test(para)) {
                        const splitIndex = para.search(/\n\d+\.\s/);
                        const intro = para.slice(0, splitIndex).trim();
                        const listPart = para.slice(splitIndex).trim();
                        const introHtml = intro ? `<p>${formatInlineMarkdown(intro).replace(/\n/g, '<br>')}</p>` : '';
                        const items = listPart.split(/\n(?=\d+\.\s)/).map(item => {
                            const content = item.replace(/^\d+\.\s+/, '').trim();
                            return `<li>${formatInlineMarkdown(content)}</li>`;
                        }).join('');
                        return `${introHtml}<ol>${items}</ol>`;
                    }

                    if (para.trim().startsWith('> ')) {
                        const quote = para.replace(/^>\s?/gm, '').trim();
                        const formattedQuote = formatInlineMarkdown(quote).replace(/\n/g, '<br>');
                        return `<blockquote><p>${formattedQuote}</p></blockquote>`;
                    }

                    if (para.trim() === '---') {
                        return '<hr>';
                    }

                    const formatted = formatInlineMarkdown(para).replace(/\n/g, '<br>');
                    return `<p>${formatted}</p>`;
                }).join('');

                return html;
            }

            function formatInlineMarkdown(text) {
                if (!text) return '';
                let html = escapeHtml(text);
                html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
                html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
                html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" decoding="async">');
                html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
                return html;
            }

            const contentHtml = markdownToHtml(post.content);
            const tags = Array.isArray(post.tags) ? post.tags.map(tag => `<span class="tag blog-tag">${escapeHtml(tag)}</span>`).join('') : '';

            contentEl.innerHTML = `
                <div class="container">
                    <nav class="breadcrumb" aria-label="Breadcrumb" style="margin-bottom: 24px;">
                        <ol>
                            <li><a href="../index.html">Home</a></li>
                            <li><a href="../blog.html">Blog</a></li>
                            <li>${escapeHtml(post.title)}</li>
                        </ol>
                    </nav>
                    
                    <article class="blog-post-article glass-card">
                        <div class="blog-post-layout">
                            <div class="blog-post-main">
                                <header class="blog-post-header">
                                    <div class="blog-post-meta-top">
                                        <span class="blog-post-date">Published ${formatDate(post.date)}</span>
                                        <span class="blog-post-reading-time">${post.readingTime || calculateReadingTime(post.content)} min read</span>
                                        <span class="blog-post-views">👁️ <span id="view-count">0</span> views</span>
                                    </div>
                                    <h1 class="blog-post-title-main">${escapeHtml(post.title)}</h1>
                                    <div class="blog-post-author-section">
                                        ${authorAvatar}
                                        <div class="blog-author-details">
                                            <span class="blog-post-author-name">${escapeHtml(post.author)}</span>
                                            <span class="blog-post-author-role">${escapeHtml(authorRole)}</span>
                                        </div>
                                    </div>
                                    <div class="blog-post-tags-main">
                                        ${tags}
                                    </div>
                                </header>
                                
                                <div class="blog-post-body">
                                    ${contentHtml}
                                </div>
                                
                                <footer class="blog-post-footer-main">
                                    <a href="../blog.html" class="btn btn-secondary">← Back to Blog</a>
                                </footer>
                            </div>
                            <aside class="blog-post-aside">
                                <div class="blog-post-toc" id="blog-post-toc">
                                    <h3>On this page</h3>
                                    <div class="blog-post-toc-list"></div>
                                </div>
                                <div class="blog-post-related" id="blog-post-related">
                                    <h3>Related posts</h3>
                                    <div class="blog-post-related-list"></div>
                                </div>
                            </aside>
                        </div>
                    </article>
                    
                    <section class="blog-comments-section glass-card" style="margin-top: 40px;">
                        <h2 class="comments-title">Comments</h2>
                        <div id="comments-list" class="comments-list"></div>
                        <form id="comment-form" class="comment-form">
                            <h3>Add a Comment</h3>
                            <div class="form-group">
                                <label for="comment-name">Name *</label>
                                <input type="text" id="comment-name" name="name" required placeholder="Your name">
                            </div>
                            <div class="form-group">
                                <label for="comment-email">Email (optional)</label>
                                <input type="email" id="comment-email" name="email" placeholder="your@email.com">
                            </div>
                            <div class="form-group">
                                <label for="comment-text">Comment *</label>
                                <textarea id="comment-text" name="text" required rows="4" placeholder="Share your thoughts..."></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Post Comment</button>
                        </form>
                    </section>
                </div>
            `;

            document.title = `${escapeHtml(post.title)} — Atrak Blog`;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.content = escapeHtml(post.excerpt);
            }

            const viewCount = incrementViewCount(slug);
            const viewCountEl = document.getElementById('view-count');
            if (viewCountEl) {
                viewCountEl.textContent = viewCount;
            }

            const tocRoot = document.getElementById('blog-post-toc');
            const tocList = tocRoot ? tocRoot.querySelector('.blog-post-toc-list') : null;
            if (tocList && tocItems.length > 0) {
                tocList.innerHTML = tocItems
                    .filter(item => item.level > 1)
                    .map(item => `
                        <a class="blog-post-toc-link toc-level-${item.level}" href="#${item.id}">
                            ${escapeHtml(item.title)}
                        </a>
                    `).join('');
            } else if (tocRoot) {
                tocRoot.style.display = 'none';
            }

            try {
                const previewResponse = await withTimeout(fetch('../data/blog-posts-preview.json'), 6000);
                if (previewResponse.ok) {
                    const previews = await previewResponse.json();
                    const related = previews
                        .filter(p => p.slug !== post.slug)
                        .map(p => ({
                            ...p,
                            score: (p.tags || []).filter(tag => (post.tags || []).includes(tag)).length
                        }))
                        .filter(p => p.score > 0)
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 3);

                    const relatedList = document.querySelector('.blog-post-related-list');
                    if (relatedList) {
                        if (related.length === 0) {
                            relatedList.innerHTML = '<p class="empty-message">No related posts yet.</p>';
                        } else {
                            relatedList.innerHTML = related.map(item => `
                                <a class="blog-related-card" href="../blog/${encodeURIComponent(item.slug)}.html">
                                    <div class="blog-related-title">${escapeHtml(item.title)}</div>
                                    <div class="blog-related-meta">${escapeHtml(formatDate(item.date))}</div>
                                </a>
                            `).join('');
                        }
                    }
                }
            } catch (_) {
                // ignore related errors
            }

            highlightCodeBlocks();
            loadComments(slug);
            setupCommentForm(slug);
        } catch (error) {
            console.error('Error loading blog post:', error);
            showError();
        }
    };

    run();

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function calculateReadingTime(content) {
        const wordsPerMinute = 200;
        const words = content.split(/\s+/).length;
        return Math.ceil(words / wordsPerMinute);
    }

    function highlightCodeBlocks() {
        const blocks = document.querySelectorAll('.blog-post-body pre code');
        blocks.forEach(block => {
            const raw = block.textContent || '';
            let html = escapeHtml(raw);

            html = html.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g, '<span class="token-string">$1</span>');
            html = html.replace(/(\/\/.*?$)/gm, '<span class="token-comment">$1</span>');
            html = html.replace(/(#.*?$)/gm, '<span class="token-comment">$1</span>');
            html = html.replace(/\b(const|let|var|function|return|if|else|for|while|class|new|try|catch|await|async|import|from|def|lambda|include|using|namespace|template|public|private|protected)\b/g, '<span class="token-keyword">$1</span>');
            html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>');

            block.innerHTML = html;
        });
    }

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

    function getComments(slug) {
        try {
            const comments = JSON.parse(localStorage.getItem('blog_comments') || '{}');
            return comments[slug] || [];
        } catch (e) {
            return [];
        }
    }

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

    function loadComments(slug) {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;

        const comments = getComments(slug);

        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
            return;
        }

        const sortedComments = [...comments].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        commentsList.innerHTML = sortedComments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <div class="comment-author">
                        <span class="comment-author-name">${escapeHtml(comment.name)}</span>
                        <span class="comment-date">${formatDate(comment.date)}</span>
                    </div>
                </div>
                <div class="comment-body">
                    ${escapeHtml(comment.text).replace(/\n/g, '<br>')}
                </div>
            </div>
        `).join('');
    }

    function setupCommentForm(slug) {
        const form = document.getElementById('comment-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('comment-name').value.trim();
            const email = document.getElementById('comment-email').value.trim();
            const text = document.getElementById('comment-text').value.trim();

            if (!name || !text) {
                alert('Please fill in all required fields.');
                return;
            }

            const comment = {
                name,
                email: email || null,
                text
            };

            addComment(slug, comment);
            form.reset();
            loadComments(slug);

            const successMsg = document.createElement('div');
            successMsg.className = 'comment-success';
            successMsg.textContent = 'Comment posted successfully!';
            form.insertBefore(successMsg, form.firstChild);
            setTimeout(() => successMsg.remove(), 3000);
        });
    }
})();
