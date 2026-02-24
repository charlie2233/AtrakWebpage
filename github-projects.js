// GitHub Projects - Dynamic project loading from GitHub API
// Fetches repositories for the user and displays them in the "More Projects" section
// Can use pre-cached data from GitHub Actions or fetch live from API

const GITHUB_USERNAME = 'charlie2233';
const GITHUB_API_BASE = 'https://api.github.com';
const SITE_BASE_URL = (() => {
    const currentScript = document.currentScript;
    if (currentScript && currentScript.src) {
        try {
            return new URL('.', currentScript.src).toString();
        } catch (_) {
            // fall through
        }
    }

    if (window.location && window.location.origin && window.location.origin !== 'null') {
        return `${window.location.origin}/`;
    }

    return '';
})();

const CACHED_DATA_PATH = SITE_BASE_URL ? `${SITE_BASE_URL}data/github-repos.json` : 'data/github-repos.json'; // Updated by GitHub Actions
const CACHED_EVENTS_PATH = SITE_BASE_URL ? `${SITE_BASE_URL}data/github-events.json` : 'data/github-events.json'; // Updated by GitHub Actions
const CACHED_META_PATH = SITE_BASE_URL ? `${SITE_BASE_URL}data/github-meta.json` : 'data/github-meta.json'; // Updated by GitHub Actions
const CACHED_RELEASES_PATH = SITE_BASE_URL ? `${SITE_BASE_URL}data/github-releases.json` : 'data/github-releases.json'; // Updated by GitHub Actions
const CACHED_WEEKLY_PATH = SITE_BASE_URL ? `${SITE_BASE_URL}data/github-weekly.json` : 'data/github-weekly.json'; // Updated by GitHub Actions
const WEEKLY_LOG_PATH = SITE_BASE_URL ? `${SITE_BASE_URL}WeeklyLog.txt` : 'WeeklyLog.txt';

// Known featured/pinned projects to exclude from "More Projects" section
const FEATURED_PROJECT_REPOS = [
    'rork-guide-pup--vision-assistant',
    'Basketball_action_recoginition_sever',
    'AI-predator-simulation',
    'LunarWeb',
    'Easy_Java_Ide-for-competitions',
    'rork-ten-seconds-vip-manager',
    'ai-hoops-board',
    'lunar'
];

// Cache for GitHub data
let githubProjectsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastGitHubFetchSource = null; // 'cache' | 'api'
let weeklyLogArchiveCache = null;

/**
 * Try to load pre-cached data from GitHub Actions
 */
async function loadCachedData() {
    try {
        const response = await fetch(CACHED_DATA_PATH);
        if (response.ok) {
            const repos = await response.json();
            if (Array.isArray(repos) && repos.length > 0) {
                console.log('Using pre-cached GitHub data');
                return repos;
            }
        }
    } catch (e) {
        // Cached data not available, will fetch from API
    }
    return null;
}

async function loadCachedMeta() {
    try {
        const response = await fetch(CACHED_META_PATH);
        if (!response.ok) return null;
        const meta = await response.json();
        if (!meta || typeof meta !== 'object') return null;
        if (typeof meta.updatedAt !== 'string') return null;
        return meta;
    } catch (e) {
        return null;
    }
}

async function loadCachedReleases() {
    try {
        const response = await fetch(CACHED_RELEASES_PATH);
        if (!response.ok) return null;
        const releases = await response.json();
        if (!Array.isArray(releases)) return null;
        return releases;
    } catch (e) {
        return null;
    }
}

async function loadCachedWeeklyStats() {
    try {
        const response = await fetch(CACHED_WEEKLY_PATH);
        if (!response.ok) return null;
        const stats = await response.json();
        if (!stats || typeof stats !== 'object') return null;
        if (typeof stats.updatedAt !== 'string') return null;
        return stats;
    } catch (e) {
        return null;
    }
}

function setMoreProjectsMeta(message) {
    const metaEl = document.getElementById('more-projects-meta');
    if (metaEl) {
        metaEl.textContent = message || '';
    }
}

function setFooterSyncStatus(message) {
    const footerEl = document.getElementById('footer-sync-status');
    if (footerEl) {
        footerEl.textContent = message || '';
    }
}

function escapeHtml(value) {
    const str = value == null ? '' : String(value);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeExternalUrl(url) {
    const str = (url || '').trim();
    if (!str) return '#';
    if (!/^https?:\/\//i.test(str)) return '#';
    try {
        return new URL(str).toString();
    } catch (_) {
        return '#';
    }
}

function formatShortDate(date) {
    try {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (_) {
        return '';
    }
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function classifyCommitMessage(message) {
    const msg = String(message || '').trim().toLowerCase();
    if (!msg) return 'other';

    if (msg.startsWith('fix') || msg.includes('bug') || msg.includes('hotfix') || msg.includes('patch')) return 'fix';
    if (msg.startsWith('feat') || msg.startsWith('add') || msg.includes('feature') || msg.includes('implement')) return 'feature';
    if (msg.startsWith('doc') || msg.includes('readme') || msg.includes('docs')) return 'docs';
    if (msg.startsWith('refactor') || msg.includes('cleanup') || msg.includes('clean up')) return 'refactor';
    if (msg.startsWith('chore') || msg.includes('deps') || msg.includes('bump ')) return 'chore';

    return 'other';
}

function parseWeeklyLogEntry(sectionText, projectTitle, weekOf) {
    const headlineMatch = sectionText.match(/^###\s+(.+)$/m);
    const headline = headlineMatch ? headlineMatch[1].trim().replace(/^["“]|["”]$/g, '') : '';

    const lines = sectionText.split(/\r?\n/);
    const blocks = {};
    let currentKey = null;
    let current = null;
    const metrics = {};

    const flush = () => {
        if (!currentKey || !current) return;
        if (!blocks[currentKey]) blocks[currentKey] = { bullets: [], paragraphs: [] };
        blocks[currentKey].bullets.push(...current.bullets);
        blocks[currentKey].paragraphs.push(...current.paragraphs);
        currentKey = null;
        current = null;
    };

    for (const lineRaw of lines) {
        const line = lineRaw.trim();
        if (!line) continue;

        const blockHeader = line.match(/^\*\*(.+?)\*\*$/);
        if (blockHeader) {
            flush();
            currentKey = blockHeader[1].trim();
            current = { bullets: [], paragraphs: [] };
            continue;
        }

        if (!currentKey) continue;

        const bullet = line.match(/^[-*]\s+(.+)$/);
        if (bullet) {
            current.bullets.push(bullet[1].trim());
            continue;
        }

        if (/^reply\b/i.test(line)) continue;
        if (/^coverage complete\b/i.test(line)) continue;
        if (/^part\s+\d+/i.test(line)) continue;

        current.paragraphs.push(line);
    }
    flush();

    if (blocks.Metrics) {
        const all = [...blocks.Metrics.bullets, ...blocks.Metrics.paragraphs];
        all.forEach(entry => {
            const mm = String(entry).match(/^([A-Za-z ]+):\s*(.+)$/);
            if (!mm) return;
            metrics[mm[1].trim()] = mm[2].trim();
        });
    }

    return {
        projectTitle: projectTitle || 'Weekly Dev News',
        weekOf: weekOf || '',
        headline,
        blocks,
        metrics,
    };
}

function parseWeeklyLogArchive(text) {
    const content = String(text || '');
    if (!content) return null;

    const titleMatch = content.match(/^#\s+(.+)$/m);
    const rawTitle = titleMatch ? titleMatch[1].trim() : 'Weekly Dev News';
    const projectTitle = rawTitle.replace(/\s+—\s+Weekly Dev News.*$/i, '').trim() || 'Weekly Dev News';

    const markers = [];
    const re = /^##\s+Week of\s+(.+)$/gm;
    let m;
    while ((m = re.exec(content)) !== null) {
        markers.push({ index: m.index, weekOf: (m[1] || '').trim() });
    }

    const entries = [];
    for (let i = 0; i < markers.length; i += 1) {
        const start = markers[i].index;
        const end = (i + 1 < markers.length) ? markers[i + 1].index : content.length;
        const sectionText = content.slice(start, end);
        entries.push(parseWeeklyLogEntry(sectionText, projectTitle, markers[i].weekOf));
    }

    return { projectTitle, entries };
}

async function loadWeeklyLogArchive() {
    if (weeklyLogArchiveCache) return weeklyLogArchiveCache;

    try {
        const response = await fetch(WEEKLY_LOG_PATH);
        if (!response.ok) return null;
        const text = await response.text();
        weeklyLogArchiveCache = parseWeeklyLogArchive(text);
        return weeklyLogArchiveCache;
    } catch (_) {
        return null;
    }
}

const INTERNAL_PROJECT_PAGES = {
    'rork-guide-pup--vision-assistant': 'projects/guidepup.html',
    'Basketball_action_recoginition_sever': 'projects/hoops-clips.html',
    'AI-predator-simulation': 'projects/ai-predator-simulation.html',
    'rork-ten-seconds-vip-manager': 'projects/ten-seconds-vip-manager.html',
    'Easy_Java_Ide-for-competitions': 'projects/compide.html',
    'LunarWeb': 'index.html',
};

function formatUTCDateTime(isoString) {
    try {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return isoString;
        return date.toUTCString().replace('GMT', 'UTC');
    } catch (_) {
        return isoString;
    }
}

/**
 * Fetch repositories from GitHub API
 */
async function fetchGitHubRepositories() {
    // Check memory cache first
    if (githubProjectsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
        return githubProjectsCache;
    }

    // Try pre-cached data from GitHub Actions first
    let repos = await loadCachedData();
    lastGitHubFetchSource = repos ? 'cache' : null;
    
    // If no cached data, fetch from API
    if (!repos) {
        try {
            const response = await fetch(`${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`);
            
            if (!response.ok) {
                throw new Error(`GitHub API returned ${response.status}`);
            }
            
            repos = await response.json();
            lastGitHubFetchSource = 'api';
        } catch (error) {
            console.error('Failed to fetch GitHub repositories:', error);
            lastGitHubFetchSource = null;
            return [];
        }
    }
    
    // Filter and sort repositories
    const projects = repos
        .filter(repo => {
            // Exclude featured projects and forks
            return !repo.fork && !FEATURED_PROJECT_REPOS.includes(repo.name);
        })
        .map(repo => ({
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description || 'No description available.',
            url: repo.html_url,
            homepage: repo.homepage,
            language: repo.language,
            topics: repo.topics || [],
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            createdAt: new Date(repo.created_at),
            updatedAt: new Date(repo.updated_at),
            pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt); // Sort by most recently updated

    githubProjectsCache = projects;
    cacheTimestamp = Date.now();
    
    return projects;
}

/**
 * Get tech stack display from language and topics
 */
function getTechStack(project) {
    const stack = [];
    
    // Add primary language
    if (project.language) {
        stack.push(project.language);
    }
    
    // Add topics (limit to 3 total including language)
    const remainingSlots = 3 - stack.length;
    if (project.topics.length > 0 && remainingSlots > 0) {
        stack.push(...project.topics.slice(0, remainingSlots));
    }
    
    return stack;
}

/**
 * Format date for display
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
    });
}

/**
 * Format repository name for display
 */
function formatDisplayName(name) {
    return name
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Create HTML for a project card
 */
function createProjectCard(project) {
    const techStack = getTechStack(project);
    const displayName = project.displayName || formatDisplayName(project.name);
    const icon = project.icon || '📦';
    const repoAttr = project.fullName ? ` data-repo="${project.fullName}"` : '';
    const internalPage = INTERNAL_PROJECT_PAGES[project.name] || '';
    
    const tagsHTML = techStack.length > 0
        ? techStack.map(tech => `<span class="tag">${tech}</span>`).join('')
        : '<span class="tag">General</span>';
    
    return `
        <div class="project-card reveal glass-card"${repoAttr}>
            <div class="project-image">
                <div class="project-icon">${icon}</div>
            </div>
	            <div class="project-content">
	                <h3 class="project-title">${displayName}</h3>
	                <p class="project-description">
	                    ${project.description}
	                </p>
	                <div class="project-meta">
	                    <span class="project-date">Updated: ${formatDate(project.updatedAt)}</span>
	                </div>
	                <div class="project-tags">
	                    ${tagsHTML}
	                </div>
	                <div class="project-actions">
                            <a href="${internalPage || `projects/github-project.html?repo=${encodeURIComponent(project.fullName)}`}" class="btn btn-secondary btn-sm">Details</a>
	                    <a href="${project.url}" class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">Repo</a>
	                    <a href="${project.url}#readme" class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">Docs</a>
	                    <a href="${project.url}/releases" class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">Releases</a>
	                    ${project.homepage
	                        ? `<a href="${project.homepage}" class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">Demo</a>`
	                        : `<button class="btn btn-secondary btn-sm" type="button" disabled aria-disabled="true">Demo</button>`
	                    }
	                </div>
	            </div>
        </div>
    `;
}

/**
 * Create skeleton loader for project card
 */
function createProjectSkeleton() {
    return `
        <div class="project-card glass-card skeleton-card">
            <div class="skeleton-image skeleton"></div>
            <div class="project-content">
                <div class="skeleton-title skeleton"></div>
                <div class="skeleton-description skeleton"></div>
                <div class="skeleton-description skeleton short"></div>
                <div class="skeleton-text skeleton" style="width: 40%; margin-top: 16px;"></div>
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <div class="skeleton-tag skeleton"></div>
                    <div class="skeleton-tag skeleton"></div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <div class="skeleton-button skeleton"></div>
                    <div class="skeleton-button skeleton"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create skeleton loader for weekly highlights
 */
function createWeeklyHighlightsSkeleton() {
    return `
        <div class="weekly-stats-row">
            <div class="fun-stat skeleton" style="width: 120px; height: 40px; border-radius: 8px;"></div>
            <div class="fun-stat skeleton" style="width: 120px; height: 40px; border-radius: 8px;"></div>
            <div class="fun-stat skeleton" style="width: 120px; height: 40px; border-radius: 8px;"></div>
        </div>
        <div class="weekly-sections-grid">
            <div class="weekly-section">
                <div class="skeleton-text skeleton" style="width: 100px; height: 14px; margin-bottom: 12px;"></div>
                <ul class="highlight-list">
                    <li class="highlight-item">
                        <span class="skeleton-text skeleton" style="width: 80%; height: 14px;"></span>
                    </li>
                    <li class="highlight-item">
                        <span class="skeleton-text skeleton" style="width: 70%; height: 14px;"></span>
                    </li>
                    <li class="highlight-item">
                        <span class="skeleton-text skeleton" style="width: 85%; height: 14px;"></span>
                    </li>
                </ul>
            </div>
            <div class="weekly-section">
                <div class="skeleton-text skeleton" style="width: 100px; height: 14px; margin-bottom: 12px;"></div>
                <ul class="highlight-list">
                    <li class="highlight-item">
                        <span class="skeleton-text skeleton" style="width: 75%; height: 14px;"></span>
                    </li>
                    <li class="highlight-item">
                        <span class="skeleton-text skeleton" style="width: 90%; height: 14px;"></span>
                    </li>
                </ul>
            </div>
        </div>
    `;
}

/**
 * Render the More Projects section
 */
async function renderMoreProjects() {
    const container = document.getElementById('more-projects-grid');
    if (!container) {
        console.warn('More projects container not found');
        return;
    }

    // Check if we already have loaded GitHub projects (excluding any pinned static cards)
    const existingProjectCards = container.querySelectorAll('.project-card:not(.skeleton-card)');
    const pinnedCards = container.querySelectorAll('.project-card[data-pinned-project="true"]:not(.skeleton-card)');
    const hasOtherProjects = existingProjectCards.length > pinnedCards.length;
    
    if (hasOtherProjects) {
        return; // Already loaded
    }

    // Show skeleton loading state (append after existing cards)
    const skeletonCount = 6;
    const skeletons = Array(skeletonCount).fill(0).map(() => createProjectSkeleton()).join('');
    container.insertAdjacentHTML('beforeend', skeletons);
    setMoreProjectsMeta('Loading GitHub data…');

    try {
        const projects = await fetchGitHubRepositories();
        
        // Limit to top 6 most recently updated projects
        const displayProjects = projects.slice(0, 6);
        const combinedHtml = displayProjects.map(project => createProjectCard(project)).join('');

        // Remove skeleton loaders
        container.querySelectorAll('.skeleton-card').forEach(skeleton => skeleton.remove());

        if (!combinedHtml.trim()) {
            // Only show empty message if there are no projects at all (including pinned cards)
            if (container.querySelectorAll('.project-card').length === 0) {
                container.innerHTML = '<p class="empty-message">No additional projects found.</p>';
            }
            setMoreProjectsMeta('');
            return;
        }

        // Append new projects (don't replace existing pinned cards)
        container.insertAdjacentHTML('beforeend', combinedHtml);

        // Re-trigger reveal animations for new elements
        const newElements = container.querySelectorAll('.reveal:not(.active)');
        if (window.revealObserver) {
            newElements.forEach(el => window.revealObserver.observe(el));
        } else {
            // Fallback: if observer isn't ready yet, just show them
            newElements.forEach(el => el.classList.add('active'));
        }
        
        if (lastGitHubFetchSource === 'cache') {
            const meta = await loadCachedMeta();
            if (meta && meta.updatedAt) {
                const updateMsg = `Synced via GitHub Actions • ${formatUTCDateTime(meta.updatedAt)}`;
                setMoreProjectsMeta(`Cached daily • Last updated ${formatUTCDateTime(meta.updatedAt)}`);
                setFooterSyncStatus(updateMsg);
            } else {
                setMoreProjectsMeta('Cached data loaded.');
                setFooterSyncStatus('GitHub data synced daily');
            }
        } else if (lastGitHubFetchSource === 'api') {
            setMoreProjectsMeta('Live from GitHub API');
            setFooterSyncStatus('Live GitHub data');
        } else {
            setMoreProjectsMeta('');
        }
        
    } catch (error) {
        console.error('Failed to render projects:', error);
        container.innerHTML = '<p class="error-message">Failed to load GitHub projects. Please try again later.</p>';
        setMoreProjectsMeta('');
    }
}

/**
 * Get project details for the detail page
 */
async function getProjectDetails(fullRepoName) {
    const normalizedFullName = (fullRepoName || '').trim().toLowerCase();

    // Prefer cached data (avoids GitHub API rate limits on the client).
    const cachedRepos = await loadCachedData();
    if (cachedRepos && normalizedFullName) {
        const cachedRepo = cachedRepos.find(repo => {
            const candidate = typeof repo.full_name === 'string' ? repo.full_name.trim().toLowerCase() : '';
            return candidate === normalizedFullName;
        });

        if (cachedRepo) {
            return {
                name: cachedRepo.name,
                fullName: cachedRepo.full_name,
                description: cachedRepo.description || 'No description available.',
                url: cachedRepo.html_url,
                homepage: cachedRepo.homepage,
                language: cachedRepo.language,
                topics: cachedRepo.topics || [],
                stars: cachedRepo.stargazers_count,
                forks: cachedRepo.forks_count,
                watchers: cachedRepo.watchers_count,
                createdAt: new Date(cachedRepo.created_at),
                updatedAt: new Date(cachedRepo.updated_at),
                pushedAt: cachedRepo.pushed_at ? new Date(cachedRepo.pushed_at) : null,
                license: cachedRepo.license ? cachedRepo.license.name : null
            };
        }
    }

    try {
        const response = await fetch(`${GITHUB_API_BASE}/repos/${fullRepoName}`);
        
        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}`);
        }
        
        const repo = await response.json();
        
        return {
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description || 'No description available.',
            url: repo.html_url,
            homepage: repo.homepage,
            language: repo.language,
            topics: repo.topics || [],
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            watchers: repo.watchers_count,
            createdAt: new Date(repo.created_at),
            updatedAt: new Date(repo.updated_at),
            pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
            license: repo.license ? repo.license.name : null
        };
    } catch (error) {
        console.error('Failed to fetch project details:', error);
        throw error;
    }
}

// ============================================
// WEEKLY HIGHLIGHTS
// ============================================

/**
 * Render Weekly Highlights from GitHub Events
 */
async function renderWeeklyHighlights() {
    const container = document.getElementById('weekly-content');
    const dateRangeEl = document.getElementById('weekly-date-range');
    const titleEl = document.getElementById('weekly-title');
    const iconEl = document.getElementById('weekly-icon');
    const syncPillEl = document.getElementById('weekly-sync-pill');
    const sourceNoteEl = document.getElementById('weekly-source-note');
    
    if (!container) return;
    
    // Show skeleton loader while fetching
    if (container.innerHTML.includes('weekly-loading') || container.innerHTML.trim() === '') {
        container.innerHTML = createWeeklyHighlightsSkeleton();
    }
    
    try {
        let events = [];
        try {
            const response = await fetch(CACHED_EVENTS_PATH);
            if (response.ok) {
                const rawEvents = await response.json();
                events = Array.isArray(rawEvents) ? rawEvents : [];
            } else {
                console.warn('GitHub events cache missing:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load GitHub events cache:', error);
        }
        
        // Filter last 7 days (weekly digest)
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        if (titleEl) titleEl.textContent = 'This Week at Atrak';
        if (iconEl) iconEl.textContent = '📰';
        if (dateRangeEl) dateRangeEl.textContent = `${formatShortDate(weekAgo)} – ${formatShortDate(now)}`;
        if (syncPillEl) {
            syncPillEl.textContent = 'Syncing';
            syncPillEl.dataset.state = 'loading';
            syncPillEl.removeAttribute('title');
        }
        if (sourceNoteEl) {
            sourceNoteEl.textContent = 'Live GitHub activity + weekly archive';
        }

        const weeklyEvents = events
            .filter(e => e && typeof e === 'object' && typeof e.created_at === 'string')
            .filter(e => {
                const created = new Date(e.created_at);
                return !Number.isNaN(created.getTime()) && created >= weekAgo && created <= now;
            });
        
        const repoActivity = new Map();
        const activeRepos = new Set();
        const createdRepos = [];
        const releases = [];
        const commitStream = [];
        const categorizedCommits = {
            feature: [],
            fix: [],
            docs: [],
            refactor: [],
            chore: [],
            other: []
        };
        let totalCommits = 0;
        let totalPushes = 0;
        let starsGained = 0;
        let mostRecentEventAt = null;

        for (const e of weeklyEvents) {
            const createdAt = e && typeof e.created_at === 'string' ? new Date(e.created_at) : null;
            if (createdAt && !Number.isNaN(createdAt.getTime())) {
                if (!mostRecentEventAt || createdAt > mostRecentEventAt) mostRecentEventAt = createdAt;
            }

            const type = e.type;
            const repoFull = e.repo && typeof e.repo.name === 'string' ? e.repo.name : '';
            const repoKey = repoFull ? repoFull.split('/')[1] || repoFull : '';

            if (repoKey) activeRepos.add(repoKey);

            if (type === 'PushEvent') {
                totalPushes += 1;
                const distinct = Number(e.payload && e.payload.distinct_size) || 0;
                totalCommits += distinct;

                if (repoKey) {
                    if (!repoActivity.has(repoKey)) {
                        repoActivity.set(repoKey, {
                            key: repoKey,
                            full: repoFull,
                            name: formatDisplayName(repoKey),
                            url: safeExternalUrl(`https://github.com/${repoFull}`),
                            commits: 0,
                            pushes: 0
                        });
                    }
                    const info = repoActivity.get(repoKey);
                    info.commits += distinct;
                    info.pushes += 1;
                }

                const commits = e.payload && Array.isArray(e.payload.commits) ? e.payload.commits : [];
                commits.forEach(c => {
                    const raw = c && typeof c.message === 'string' ? c.message : '';
                    const firstLine = raw.split('\n')[0].trim();
                    if (!firstLine) return;
                    if (/^merge\b/i.test(firstLine)) return;
                    const repoLabel = repoKey || repoFull || 'repo';
                    commitStream.push({ repo: repoLabel, message: firstLine });
                    const bucket = classifyCommitMessage(firstLine);
                    categorizedCommits[bucket].push({ repo: repoLabel, message: firstLine });
                });
            } else if (type === 'CreateEvent') {
                const refType = e.payload && e.payload.ref_type;
                if (refType === 'repository' && repoFull) {
                    createdRepos.push({
                        name: formatDisplayName(repoKey || repoFull),
                        url: safeExternalUrl(`https://github.com/${repoFull}`)
                    });
                }
            } else if (type === 'WatchEvent') {
                starsGained += 1;
            } else if (type === 'ReleaseEvent') {
                const tag = e.payload && e.payload.release && e.payload.release.tag_name ? e.payload.release.tag_name : 'new release';
                const releaseUrl = e.payload && e.payload.release && e.payload.release.html_url ? e.payload.release.html_url : `https://github.com/${repoFull}/releases`;
                releases.push({
                    repo: formatDisplayName(repoKey || repoFull || 'repo'),
                    tag,
                    url: safeExternalUrl(releaseUrl)
                });
            }
        }

        const uniqueCommitTexts = new Set();
        const notableCommits = [];
        for (const c of commitStream) {
            const msg = c.message.replace(/\s+/g, ' ').trim();
            if (!msg) continue;
            const combined = `${c.repo}: ${msg}`;
            if (uniqueCommitTexts.has(combined)) continue;
            uniqueCommitTexts.add(combined);
            notableCommits.push(combined.length > 96 ? `${combined.slice(0, 96)}…` : combined);
            if (notableCommits.length >= 6) break;
        }

        const topRepos = Array.from(repoActivity.values())
            .sort((a, b) => (b.commits - a.commits) || (b.pushes - a.pushes) || a.name.localeCompare(b.name))
            .slice(0, 5);

        const introPhrases = [
            'Welcome back. Grab a snack — this is the weekly drop.',
            'Another week, another pile of commits. Here’s the digest.',
            'Ship fast, break less. Here’s what the team has been up to.',
            'Weekly briefing time. Let’s get you caught up.'
        ];
        const intro = introPhrases[(totalCommits + totalPushes) % introPhrases.length];
        let kickoff = '';

        const kpi = (value, label) => `
            <div class="weekly-kpi">
                <div class="weekly-kpi-value">${escapeHtml(value)}</div>
                <div class="weekly-kpi-label">${escapeHtml(label)}</div>
            </div>
        `;

        const li = (textHtml) => `
            <li class="weekly-list-item">
                <span class="weekly-bullet"></span>
                <span>${textHtml}</span>
            </li>
        `;

        const startOfUtcWeek = (date) => {
            const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const day = d.getDay(); // Sunday = 0 (local time)
            d.setDate(d.getDate() - day);
            return d;
        };
        const formatWeekKey = (date) => {
            const p2 = (n) => String(n).padStart(2, '0');
            return `${date.getFullYear()}-${p2(date.getMonth() + 1)}-${p2(date.getDate())}`;
        };
        const summarizeGitHubWeek = (weekEvents, weekStart) => {
            const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
            const repoActivityMap = new Map();
            const activeRepoKeys = new Set();
            const notableMsgs = [];
            const uniqueMsgs = new Set();
            let commits = 0;
            let pushes = 0;
            let releasesCount = 0;
            let stars = 0;
            let lastEventAt = null;

            for (const event of weekEvents) {
                if (!event || typeof event !== 'object') continue;
                const type = event.type;
                const repoFull = event.repo && typeof event.repo.name === 'string' ? event.repo.name : '';
                const repoKey = repoFull ? (repoFull.split('/')[1] || repoFull) : '';
                if (repoKey) activeRepoKeys.add(repoKey);

                const createdAt = typeof event.created_at === 'string' ? new Date(event.created_at) : null;
                if (createdAt && !Number.isNaN(createdAt.getTime())) {
                    if (!lastEventAt || createdAt > lastEventAt) lastEventAt = createdAt;
                }

                if (type === 'PushEvent') {
                    pushes += 1;
                    const distinct = Math.max(0, Number(event.payload && event.payload.distinct_size) || 0);
                    commits += distinct;

                    if (repoKey) {
                        if (!repoActivityMap.has(repoKey)) {
                            repoActivityMap.set(repoKey, {
                                name: formatDisplayName(repoKey),
                                key: repoKey,
                                url: safeExternalUrl(`https://github.com/${repoFull}`),
                                commits: 0,
                                pushes: 0
                            });
                        }
                        const info = repoActivityMap.get(repoKey);
                        info.commits += distinct;
                        info.pushes += 1;
                    }

                    const commitsList = event.payload && Array.isArray(event.payload.commits) ? event.payload.commits : [];
                    commitsList.forEach(c => {
                        const raw = c && typeof c.message === 'string' ? c.message : '';
                        const firstLine = raw.split('\n')[0].trim();
                        if (!firstLine || /^merge\b/i.test(firstLine)) return;
                        const combined = `${repoKey || 'repo'}: ${firstLine}`;
                        if (uniqueMsgs.has(combined)) return;
                        uniqueMsgs.add(combined);
                        notableMsgs.push(combined.length > 96 ? `${combined.slice(0, 96)}…` : combined);
                    });
                } else if (type === 'ReleaseEvent') {
                    releasesCount += 1;
                } else if (type === 'WatchEvent') {
                    stars += 1;
                }
            }

            const topRepos = Array.from(repoActivityMap.values())
                .sort((a, b) => (b.commits - a.commits) || (b.pushes - a.pushes) || a.name.localeCompare(b.name))
                .slice(0, 3);

            return {
                weekKey: formatWeekKey(weekStart),
                weekStart,
                weekEnd,
                label: `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`,
                commits,
                pushes,
                releases: releasesCount,
                stars,
                activeRepos: activeRepoKeys.size,
                topRepos,
                notableMsgs: notableMsgs.slice(0, 4),
                lastEventAt
            };
        };

        const githubWeekSummaries = (() => {
            const buckets = new Map();
            for (const event of events) {
                if (!event || typeof event !== 'object' || typeof event.created_at !== 'string') continue;
                const createdAt = new Date(event.created_at);
                if (Number.isNaN(createdAt.getTime())) continue;
                const weekStart = startOfUtcWeek(createdAt);
                const key = formatWeekKey(weekStart);
                if (!buckets.has(key)) buckets.set(key, { weekStart, events: [] });
                buckets.get(key).events.push(event);
            }

            return Array.from(buckets.entries())
                .map(([key, bucket]) => ({ key, ...summarizeGitHubWeek(bucket.events, bucket.weekStart) }))
                .sort((a, b) => b.weekStart - a.weekStart)
                .slice(0, 10);
        })();

        const highlights = [];
        highlights.push(`${escapeHtml(totalCommits)} commits across ${escapeHtml(activeRepos.size)} repos`);
        if (topRepos[0]) {
            highlights.push(`Most active: <a class="weekly-inline-link" href="${topRepos[0].url}" target="_blank" rel="noopener">${escapeHtml(topRepos[0].name)}</a> (${escapeHtml(topRepos[0].commits)} commits)`);
        }
        if (createdRepos.length) {
            const names = createdRepos
                .slice(0, 3)
                .map(r => `<a class="weekly-inline-link" href="${r.url}" target="_blank" rel="noopener">${escapeHtml(r.name)}</a>`)
                .join(', ');
            highlights.push(`New repos: ${names}${createdRepos.length > 3 ? '…' : ''}`);
        } else {
            highlights.push('New repos: none this week');
        }
        if (starsGained) {
            highlights.push(`Stars: +${escapeHtml(starsGained)}`);
        }

        const releasesList = releases.length
            ? releases.slice(0, 5).map(r => li(`<a class="weekly-inline-link" href="${r.url}" target="_blank" rel="noopener">${escapeHtml(r.repo)}</a> — ${escapeHtml(r.tag)}`)).join('')
            : li(`No GitHub releases this week. Check <a class="weekly-inline-link" href="releases.html">Release Notes</a>.`);

        const buildList = topRepos.length
            ? topRepos.map(r => {
                const meta = [];
                if (r.commits) meta.push(`${r.commits} commit${r.commits === 1 ? '' : 's'}`);
                if (r.pushes) meta.push(`${r.pushes} push${r.pushes === 1 ? '' : 'es'}`);
                return li(`<a class="weekly-inline-link" href="${r.url}" target="_blank" rel="noopener">${escapeHtml(r.name)}</a> — ${escapeHtml(meta.join(' • ') || 'active')}`);
            }).join('')
            : li('No repo updates found.');

        const notableList = notableCommits.length
            ? notableCommits.map(text => li(escapeHtml(text))).join('')
            : li('No notable commit messages (or all were merges).');

        const take = (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []);
        const formatCommit = (c) => `${escapeHtml(c.repo)}: ${escapeHtml(c.message)}`;
        const featureList = take(categorizedCommits.feature, 6).length
            ? take(categorizedCommits.feature, 6).map(c => li(formatCommit(c))).join('')
            : li('No obvious “feature” commits this week. (Commit messages were shy.)');
        const fixList = take(categorizedCommits.fix, 6).length
            ? take(categorizedCommits.fix, 6).map(c => li(formatCommit(c))).join('')
            : li('No obvious “fix/bug” commits this week. Either we’re perfect… or it’s hidden in private repos.');

        const [weeklyArchive, cachedRepos, cachedReleases, cachedWeeklyStats] = await Promise.all([
            loadWeeklyLogArchive(),
            loadCachedData(),
            loadCachedReleases(),
            loadCachedWeeklyStats()
        ]);

        const weeklyStatsSyncDate = (() => {
            const raw = cachedWeeklyStats && typeof cachedWeeklyStats.updatedAt === 'string'
                ? new Date(cachedWeeklyStats.updatedAt)
                : null;
            return raw && !Number.isNaN(raw.getTime()) ? raw : null;
        })();

        if (syncPillEl) {
            if (weeklyStatsSyncDate) {
                syncPillEl.textContent = `Synced ${getTimeAgo(weeklyStatsSyncDate)}`;
                syncPillEl.dataset.state = 'fresh';
                syncPillEl.title = `GitHub cache updated ${formatUTCDateTime(weeklyStatsSyncDate.toISOString())}`;
            } else {
                syncPillEl.textContent = 'Live digest';
                syncPillEl.dataset.state = 'neutral';
            }
        }

        const weeklyStatsCommits = (() => {
            const stats = cachedWeeklyStats && typeof cachedWeeklyStats === 'object' ? cachedWeeklyStats : null;
            const val = stats ? Number(stats.totalCommitContributions) : Number.NaN;
            return Number.isFinite(val) ? Math.max(0, Math.round(val)) : null;
        })();

        const commitTotalForKpi = weeklyStatsCommits != null ? weeklyStatsCommits : totalCommits;

        kickoff = commitTotalForKpi
            ? (weeklyStatsCommits != null
                ? `We clocked <strong>${escapeHtml(commitTotalForKpi)}</strong> commit contributions (7d). Public repos in the spotlight: <strong>${escapeHtml(activeRepos.size)}</strong>.`
                : `We clocked <strong>${escapeHtml(commitTotalForKpi)}</strong> commits across <strong>${escapeHtml(activeRepos.size)}</strong> active repos.`)
            : `Quiet week on public repos — but we might have been building in private 👀`;

        if (highlights.length) {
            highlights[0] = weeklyStatsCommits != null
                ? `${escapeHtml(commitTotalForKpi)} commit contributions (7d)`
                : `${escapeHtml(commitTotalForKpi)} commits across ${escapeHtml(activeRepos.size)} repos`;
        }

        const diaryEntries = weeklyArchive && Array.isArray(weeklyArchive.entries) ? weeklyArchive.entries : [];

        const requestedWeekKey = (() => {
            const hash = String(window.location.hash || '');
            const match = hash.match(/week=([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
            return match ? match[1] : '';
        })();

        const monthMap = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        const pad2 = (n) => String(n).padStart(2, '0');

        const parseWeekStart = (weekOf) => {
            const raw = String(weekOf || '').trim();
            if (!raw) return null;

            const startPart = raw
                .split(/[–—-]/)[0]
                .replace(/\s+/g, ' ')
                .trim();
            const m = startPart.match(/^([A-Za-z]{3,9})\s+(\d{1,2})/);
            if (!m) return null;
            const monthKey = m[1].slice(0, 3).toLowerCase();
            const month = Object.prototype.hasOwnProperty.call(monthMap, monthKey) ? monthMap[monthKey] : null;
            const day = Number.parseInt(m[2], 10);
            if (month == null || !Number.isFinite(day) || day <= 0 || day > 31) return null;
            return { month, day };
        };

        const applyWeekKeys = (entries) => {
            if (!Array.isArray(entries) || !entries.length) return;

            const startParts = entries.map(entry => parseWeekStart(entry && entry.weekOf));
            let year = now.getFullYear();

            for (let i = entries.length - 1; i >= 0; i -= 1) {
                const start = startParts[i];
                if (!start) continue;

                const nextStart = i + 1 < startParts.length ? startParts[i + 1] : null;
                if (nextStart && start.month > nextStart.month) {
                    year -= 1;
                }

                const key = `${year}-${pad2(start.month + 1)}-${pad2(start.day)}`;
                entries[i].weekKey = key;
            }
        };

        applyWeekKeys(diaryEntries);

        const latestDiaryEntry = diaryEntries.length ? diaryEntries[diaryEntries.length - 1] : null;
        const archiveProjectTitle = (weeklyArchive && typeof weeklyArchive.projectTitle === 'string' && weeklyArchive.projectTitle.trim())
            ? weeklyArchive.projectTitle.trim()
            : (latestDiaryEntry && latestDiaryEntry.projectTitle ? String(latestDiaryEntry.projectTitle).trim() : '');
        const latestDiaryDate = (() => {
            if (!latestDiaryEntry || !latestDiaryEntry.weekKey) return null;
            const dt = new Date(`${latestDiaryEntry.weekKey}T00:00:00`);
            return Number.isNaN(dt.getTime()) ? null : dt;
        })();
        const diaryArchiveAgeDays = latestDiaryDate
            ? Math.max(0, Math.floor((now.getTime() - latestDiaryDate.getTime()) / (1000 * 60 * 60 * 24)))
            : null;
        const diaryArchiveIsStale = Number.isFinite(diaryArchiveAgeDays) ? diaryArchiveAgeDays > 21 : false;
        const diaryArchiveLooksProjectSpecific = archiveProjectTitle
            ? /basketball|tactics|coach|board/i.test(archiveProjectTitle) && !/atrak|lunar/i.test(archiveProjectTitle)
            : false;
        const diaryArchiveShouldBeLegacy = Boolean(diaryEntries.length && (diaryArchiveIsStale || diaryArchiveLooksProjectSpecific));

        const renderDiaryArchiveNote = (entry) => {
            if (!entry || !entry.weekKey) return '';
            const entryDate = new Date(`${entry.weekKey}T00:00:00`);
            if (Number.isNaN(entryDate.getTime())) return '';

            const diffMs = Math.max(0, now.getTime() - entryDate.getTime());
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const weeksOld = diffDays > 21 ? Math.max(1, Math.round(diffDays / 7)) : 0;
            const syncCutoff = weeklyStatsSyncDate ? formatShortDate(weeklyStatsSyncDate) : formatShortDate(now);
            const parts = [];

            if (diaryArchiveShouldBeLegacy) {
                parts.push(`Legacy project diary${archiveProjectTitle ? ` (${archiveProjectTitle})` : ''}`);
            }
            if (weeksOld > 0) {
                parts.push(`Archive snapshot (${weeksOld}w old)`);
            }

            if (!parts.length) return '';
            return `${parts.join(' • ')}. Live GitHub activity above is current through ${syncCutoff}.`;
        };

        if (sourceNoteEl) {
            if (weeklyStatsSyncDate) {
                if (diaryArchiveShouldBeLegacy) {
                    sourceNoteEl.textContent = `GitHub cache • ${formatUTCDateTime(weeklyStatsSyncDate.toISOString())} • Real weekly log is GitHub-derived • Legacy project diary archived below`;
                } else if (diaryEntries.length) {
                    sourceNoteEl.textContent = `GitHub cache • ${formatUTCDateTime(weeklyStatsSyncDate.toISOString())} • Weekly notes include archive diary entries`;
                } else {
                    sourceNoteEl.textContent = `GitHub cache • ${formatUTCDateTime(weeklyStatsSyncDate.toISOString())} • Real weekly log is GitHub-derived`;
                }
            } else {
                sourceNoteEl.textContent = diaryArchiveShouldBeLegacy
                    ? 'Live GitHub activity + legacy project diary archive'
                    : 'Live GitHub activity + weekly archive';
            }
        }

        const requestedDiaryIndex = requestedWeekKey
            ? diaryEntries.findIndex(entry => entry && entry.weekKey === requestedWeekKey)
            : -1;
        const savedDiaryIndex = (() => {
            try {
                return Number.parseInt(window.localStorage.getItem('atrak_weekly_diary_index') || '', 10);
            } catch (_) {
                return Number.NaN;
            }
        })();
        const defaultDiaryIndex = diaryEntries.length ? diaryEntries.length - 1 : -1;
        const selectedDiaryIndex = requestedDiaryIndex >= 0
            ? requestedDiaryIndex
            : (Number.isFinite(savedDiaryIndex) && savedDiaryIndex >= 0 && savedDiaryIndex < diaryEntries.length
                ? savedDiaryIndex
                : defaultDiaryIndex);
        const selectedDiaryEntry = selectedDiaryIndex >= 0 ? diaryEntries[selectedDiaryIndex] : null;
        const diaryWeekCounter = selectedDiaryEntry && diaryEntries.length ? `${selectedDiaryIndex + 1}/${diaryEntries.length}` : '';

        const currentMonthLabel = (() => {
            try {
                return now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            } catch (_) {
                return 'This month';
            }
        })();

        const releasesThisMonth = (() => {
            const list = Array.isArray(cachedReleases) ? cachedReleases : [];
            const seen = new Set();
            const out = [];

            for (const rel of list) {
                if (!rel || typeof rel !== 'object') continue;
                if (rel.draft) continue;
                const publishedRaw = typeof rel.published_at === 'string' ? rel.published_at : '';
                const publishedAt = publishedRaw ? new Date(publishedRaw) : null;
                if (!publishedAt || Number.isNaN(publishedAt.getTime())) continue;
                if (publishedAt.getFullYear() !== now.getFullYear()) continue;
                if (publishedAt.getMonth() !== now.getMonth()) continue;

                const url = safeExternalUrl(rel.url);
                if (url === '#') continue;
                if (seen.has(url)) continue;
                seen.add(url);

                const repoFull = typeof rel.repo === 'string' ? rel.repo : '';
                const repoName = repoFull ? (repoFull.split('/')[1] || repoFull) : 'repo';
                out.push({
                    repo: repoName,
                    tag: typeof rel.tag === 'string' && rel.tag.trim() ? rel.tag.trim() : 'release',
                    name: typeof rel.name === 'string' ? rel.name.trim() : '',
                    url,
                    date: publishedAt
                });

                if (out.length >= 6) break;
            }

            return out;
        })();

        const spotlightRepo = (() => {
            const repos = Array.isArray(cachedRepos) ? cachedRepos : [];
            const bestKey = topRepos[0] ? topRepos[0].key : '';
            const best = bestKey ? repos.find(r => r && r.name === bestKey) : null;
            if (best) return best;

            // Fallback: most recently pushed repo (excluding the website repo itself if possible)
            const sorted = repos
                .filter(r => r && typeof r.pushed_at === 'string')
                .slice()
                .sort((a, b) => String(b.pushed_at).localeCompare(String(a.pushed_at)));
            const nonSite = sorted.find(r => r && r.name && r.name !== 'LunarWeb');
            return nonSite || sorted[0] || null;
        })();

        const spotlightHtml = spotlightRepo ? (() => {
            const key = String(spotlightRepo.name || '').trim();
            const display = formatDisplayName(key);
            const githubUrl = safeExternalUrl(spotlightRepo.html_url || ('https://github.com/' + (spotlightRepo.full_name || '')));
            const desc = (spotlightRepo.description || '').trim();
            const lang = spotlightRepo.language ? String(spotlightRepo.language) : '';
            const internal = INTERNAL_PROJECT_PAGES[key] || '';
            const pushed = spotlightRepo.pushed_at ? formatShortDate(new Date(spotlightRepo.pushed_at)) : '';

            return `
                <section class="weekly-section weekly-section-wide weekly-spotlight">
                    <div class="weekly-section-header">
                        <h4 class="weekly-section-title"><span class="weekly-section-icon">🔦</span>Spotlight</h4>
                        <span class="weekly-section-meta">${escapeHtml(lang || 'Project')}${pushed ? ` • Updated ${escapeHtml(pushed)}` : ''}</span>
                    </div>
                    <p class="weekly-briefing-text">
                        <strong>${escapeHtml(display)}</strong>${desc ? ` — ${escapeHtml(desc)}` : ''}
                    </p>
                    <div class="weekly-spotlight-actions">
                        ${internal ? `<a class="btn btn-secondary btn-sm" href="${escapeHtml(internal)}">Project Page</a>` : ''}
                        <a class="btn btn-secondary btn-sm" href="${githubUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a class="btn btn-secondary btn-sm" href="${safeExternalUrl((githubUrl.endsWith('/') ? githubUrl.slice(0, -1) : githubUrl) + '/releases')}" target="_blank" rel="noopener noreferrer">Releases</a>
                    </div>
                </section>
            `;
        })() : '';
        const renderDiaryBody = (entry) => {
            if (!entry) return '';

            const blocks = entry.blocks || {};
            const highlights = blocks.Highlights && blocks.Highlights.bullets ? blocks.Highlights.bullets.slice(0, 6) : [];
            const shipped = blocks.Shipped && blocks.Shipped.bullets ? blocks.Shipped.bullets.slice(0, 6) : [];
            const fixes = blocks.Fixes && blocks.Fixes.bullets ? blocks.Fixes.bullets.slice(0, 6) : [];
            const next = blocks.Next && blocks.Next.bullets ? blocks.Next.bullets.slice(0, 6) : [];
            const engineering = blocks.Engineering && blocks.Engineering.bullets ? blocks.Engineering.bullets.slice(0, 6) : [];
            const challenges = blocks.Challenges && blocks.Challenges.bullets ? blocks.Challenges.bullets.slice(0, 6) : [];
            const vibe = blocks.Vibe && blocks.Vibe.paragraphs ? blocks.Vibe.paragraphs.join(' ') : '';

            return `
                ${entry.headline ? `<div class="weekly-diary-headline" id="weekly-diary-headline">${escapeHtml(entry.headline)}</div>` : ''}
                <div class="weekly-diary-grid">
                    <div class="weekly-diary-card">
                        <div class="weekly-diary-card-title">Highlights</div>
                        <ul class="weekly-list">
                            ${(highlights.length ? highlights : ['No highlights logged.']).map(item => li(escapeHtml(item))).join('')}
                        </ul>
                    </div>
                    <div class="weekly-diary-card">
                        <div class="weekly-diary-card-title">Shipped</div>
                        <ul class="weekly-list">
                            ${(shipped.length ? shipped : ['No shipped items logged.']).map(item => li(escapeHtml(item))).join('')}
                        </ul>
                    </div>
                    <div class="weekly-diary-card">
                        <div class="weekly-diary-card-title">Fixes</div>
                        <ul class="weekly-list">
                            ${(fixes.length ? fixes : ['No fixes logged.']).map(item => li(escapeHtml(item))).join('')}
                        </ul>
                    </div>
                    <div class="weekly-diary-card">
                        <div class="weekly-diary-card-title">Next</div>
                        <ul class="weekly-list">
                            ${(next.length ? next : ['No next steps logged.']).map(item => li(escapeHtml(item))).join('')}
                        </ul>
                    </div>
                </div>
                ${vibe ? `
                    <div class="weekly-diary-vibe">
                        <div class="weekly-diary-card-title">Vibe Check</div>
                        <p class="weekly-diary-vibe-text">${escapeHtml(vibe)}</p>
                    </div>
                ` : ''}
                ${(engineering.length || challenges.length) ? `
                    <details class="weekly-diary-more">
                        <summary>More technical notes</summary>
                        <div class="weekly-diary-more-grid">
                            ${engineering.length ? `
                                <div class="weekly-diary-card">
                                    <div class="weekly-diary-card-title">Engineering</div>
                                    <ul class="weekly-list">
                                        ${engineering.map(item => li(escapeHtml(item))).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            ${challenges.length ? `
                                <div class="weekly-diary-card">
                                    <div class="weekly-diary-card-title">Challenges</div>
                                    <ul class="weekly-list">
                                        ${challenges.map(item => li(escapeHtml(item))).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    </details>
                ` : ''}
            `;
        };

        const renderDiaryMetrics = (entry) => {
            if (!entry || !entry.metrics) return '';
            const metrics = entry.metrics;
            if (!metrics || typeof metrics !== 'object') return '';
            const keys = Object.keys(metrics);
            if (!keys.length) return '';
            return Object.entries(metrics).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(' • ');
        };

        const renderDiaryPreview = (entry) => {
            if (!entry) return '<div class="weekly-empty">No weekly posts yet.</div>';
            const blocks = entry.blocks || {};
            const highlights = blocks.Highlights && blocks.Highlights.bullets ? blocks.Highlights.bullets.slice(0, 3) : [];
            const shipped = blocks.Shipped && blocks.Shipped.bullets ? blocks.Shipped.bullets.slice(0, 3) : [];

            return `
                <div class="weekly-diary-grid weekly-diary-grid-compact">
                    <div class="weekly-diary-card">
                        <div class="weekly-diary-card-title">Highlights</div>
                        <ul class="weekly-list">
                            ${(highlights.length ? highlights : ['No highlights logged.']).map(item => li(escapeHtml(item))).join('')}
                        </ul>
                    </div>
                    <div class="weekly-diary-card">
                        <div class="weekly-diary-card-title">Shipped</div>
                        <ul class="weekly-list">
                            ${(shipped.length ? shipped : ['No shipped items logged.']).map(item => li(escapeHtml(item))).join('')}
                        </ul>
                    </div>
                </div>
            `;
        };

        const weekChips = diaryEntries.length
            ? diaryEntries
                .map((entry, idx) => ({ entry, idx }))
                .slice()
                .reverse()
                .map(({ entry, idx }) => {
                    const label = entry.weekOf ? `Week of ${entry.weekOf}` : `Week #${idx + 1}`;
                    const shortLabel = entry.weekOf ? entry.weekOf.replace(/\s+/g, ' ') : `Week ${idx + 1}`;
                    const weekKey = entry && entry.weekKey ? String(entry.weekKey) : '';
                    const active = idx === selectedDiaryIndex;
                    return `<button class="weekly-week-chip" type="button" data-weekly-week="${idx}" data-weekly-key="${escapeHtml(weekKey)}" ${active ? 'aria-current="true"' : ''} aria-label="${escapeHtml(label)}">${escapeHtml(shortLabel)}</button>`;
                })
                .join('')
            : '';

        const renderGitHubWeekWindowCard = (week, idx) => {
            const metricChips = [
                `${week.commits} commits`,
                `${week.pushes} pushes`,
                `${week.activeRepos} repos`,
                `${week.releases} rel`,
                week.stars ? `+${week.stars} stars` : '0 stars'
            ].map(text => `<span class="weekly-live-log-chip">${escapeHtml(text)}</span>`).join('');

            const topRepoSummary = (() => {
                const top = week.topRepos[0];
                if (!top) return 'No repo activity in cache for this week.';
                const parts = [];
                if (top.commits) parts.push(`${top.commits} commit${top.commits === 1 ? '' : 's'}`);
                if (top.pushes) parts.push(`${top.pushes} push${top.pushes === 1 ? '' : 'es'}`);
                return `<a class="weekly-inline-link" href="${top.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(top.name)}</a> • ${escapeHtml(parts.join(' • ') || 'activity')}`;
            })();

            const topReposHtml = week.topRepos.length
                ? week.topRepos.slice(0, 2).map(r => {
                    const parts = [];
                    if (r.commits) parts.push(`${r.commits}c`);
                    if (r.pushes) parts.push(`${r.pushes}p`);
                    return li(`<a class="weekly-inline-link" href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.name)}</a> — ${escapeHtml(parts.join(' • ') || 'activity')}`);
                }).join('')
                : li('No repo activity in cache for this week.');

            const notableSummary = week.notableMsgs.length
                ? escapeHtml(week.notableMsgs[0])
                : 'No notable commit messages.';
            const notableHtml = week.notableMsgs.length
                ? week.notableMsgs.slice(0, 2).map(msg => li(escapeHtml(msg))).join('')
                : li('No notable commit messages.');

            return `
                <article class="weekly-gh-window-card" data-gh-window-card="${idx}" aria-label="GitHub week ${escapeHtml(week.label)}">
                    <div class="weekly-section-header weekly-gh-window-header">
                        <h5 class="weekly-section-title"><span class="weekly-section-icon">📦</span>${escapeHtml(week.label)}</h5>
                        <span class="weekly-section-meta">${week.lastEventAt ? `Last event ${escapeHtml(formatShortDate(week.lastEventAt))}` : 'No events'}</span>
                    </div>
                    <div class="weekly-live-log-chips" aria-label="GitHub week metrics">
                        ${metricChips}
                    </div>
                    <div class="weekly-gh-window-summary">
                        <div class="weekly-gh-window-row">
                            <span class="weekly-gh-window-label">Top</span>
                            <span class="weekly-gh-window-text">${topRepoSummary}</span>
                        </div>
                        <div class="weekly-gh-window-row">
                            <span class="weekly-gh-window-label">Note</span>
                            <span class="weekly-gh-window-text">${notableSummary}</span>
                        </div>
                    </div>
                    <details class="weekly-more weekly-gh-window-more">
                        <summary>Details</summary>
                        <div class="weekly-gh-window-grid">
                            <div class="weekly-diary-card">
                                <div class="weekly-diary-card-title">Top Repos</div>
                                <ul class="weekly-list">${topReposHtml}</ul>
                            </div>
                            <div class="weekly-diary-card">
                                <div class="weekly-diary-card-title">Changes</div>
                                <ul class="weekly-list">${notableHtml}</ul>
                            </div>
                        </div>
                    </details>
                </article>
            `;
        };

        const githubWeekWindowCards = githubWeekSummaries.length
            ? githubWeekSummaries.map((week, idx) => renderGitHubWeekWindowCard(week, idx)).join('')
            : '';
        const githubWeekHistorySection = githubWeekSummaries.length
            ? `
                <section class="weekly-section weekly-section-wide weekly-github-week-history" id="weekly-github-week-history">
                    <div class="weekly-section-header">
                        <h4 class="weekly-section-title"><span class="weekly-section-icon">🧭</span>Past Week Logs (GitHub)</h4>
                        <div class="weekly-section-actions">
                            <span class="weekly-section-meta">Real history • cache-backed</span>
                            <button class="weekly-diary-nav" type="button" id="weekly-gh-prev-btn" aria-label="Previous GitHub week window">‹</button>
                            <button class="weekly-diary-nav" type="button" id="weekly-gh-next-btn" aria-label="Next GitHub week window">›</button>
                        </div>
                    </div>
                    <p class="weekly-briefing-text weekly-live-log-note">Swipe or use arrows to slide through cached GitHub week windows.</p>
                    <div class="weekly-gh-window-shell">
                        <div class="weekly-gh-window-track" id="weekly-gh-window-track" role="region" aria-label="Past GitHub week windows">
                            ${githubWeekWindowCards}
                        </div>
                    </div>
                </section>
            `
            : '';

        const liveLogHighlightsList = (highlights.length ? highlights.slice(0, 2) : ['No public GitHub event highlights this week.']).map(h => li(h)).join('');
        const liveLogSignalChips = (() => {
            const chips = [];
            chips.push(weeklyStatsSyncDate ? `Synced ${getTimeAgo(weeklyStatsSyncDate)}` : 'Cache sync unknown');
            chips.push(mostRecentEventAt ? `Last activity ${formatShortDate(mostRecentEventAt)}` : 'No recent public activity');
            chips.push(`${releases.length} release${releases.length === 1 ? '' : 's'} this week`);
            if (diaryArchiveShouldBeLegacy && diaryEntries.length) {
                chips.push('Legacy diary archived');
            }
            return chips.map(text => `<span class="weekly-live-log-chip">${escapeHtml(text)}</span>`).join('');
        })();
        const liveLogSummaryLine = [
            `${commitTotalForKpi} commit${commitTotalForKpi === 1 ? '' : 's'} (7d)`,
            `${totalPushes} push${totalPushes === 1 ? '' : 'es'}`,
            `${activeRepos.size} repo${activeRepos.size === 1 ? '' : 's'} active`,
            `${releases.length} release${releases.length === 1 ? '' : 's'}`
        ].join(' • ');
        const liveWeeklyLogSection = `
            <section class="weekly-section weekly-section-wide weekly-live-log" id="weekly-live-log">
                <div class="weekly-section-header">
                    <h4 class="weekly-section-title"><span class="weekly-section-icon">🗞️</span>Weekly Log</h4>
                    <span class="weekly-section-meta">GitHub • Last 7d</span>
                </div>
                <p class="weekly-briefing-text weekly-live-log-note">Built from GitHub events/cache (real activity), not hand-written mock notes.</p>
                <p class="weekly-briefing-text weekly-live-log-summary">${escapeHtml(liveLogSummaryLine)}</p>
                <div class="weekly-live-log-chips" aria-label="Weekly log status">
                    ${liveLogSignalChips}
                </div>
                <ul class="weekly-list">
                    ${liveLogHighlightsList}
                </ul>
            </section>
        `;

        const diarySection = `
            <section class="weekly-section weekly-section-wide weekly-diary" id="weekly-diary">
                <div class="weekly-section-header">
                    <h4 class="weekly-section-title"><span class="weekly-section-icon">${diaryArchiveShouldBeLegacy ? '🗂️' : '🗞️'}</span>${diaryArchiveShouldBeLegacy ? 'Legacy Weekly Diary' : 'Weekly Log'}</h4>
                    <div class="weekly-section-actions">
                        <span class="weekly-section-meta" id="weekly-news-meta">${selectedDiaryEntry && selectedDiaryEntry.weekOf ? escapeHtml(selectedDiaryEntry.weekOf) : (diaryArchiveShouldBeLegacy ? 'Archive' : escapeHtml(currentMonthLabel))}</span>
                        <button class="weekly-share-btn" type="button" id="weekly-share-btn" aria-label="Copy link to this week">Share</button>
                    </div>
                </div>
                ${weekChips ? `<div class="weekly-week-strip" role="navigation" aria-label="Browse weekly posts">${weekChips}</div>` : ''}
                <div class="weekly-diary-meta" id="weekly-diary-meta">${selectedDiaryEntry ? `${escapeHtml(selectedDiaryEntry.projectTitle)} • ${escapeHtml(selectedDiaryEntry.weekOf || '')}${diaryWeekCounter ? ` • ${escapeHtml(diaryWeekCounter)}` : ''}` : 'No weekly posts loaded.'}</div>
                <div class="weekly-diary-note" id="weekly-diary-archive-note">${escapeHtml(renderDiaryArchiveNote(selectedDiaryEntry))}</div>
                <div id="weekly-diary-preview">
                    ${renderDiaryPreview(selectedDiaryEntry)}
                </div>
                ${selectedDiaryEntry && !diaryArchiveShouldBeLegacy ? `
                    <details class="weekly-more weekly-post-more" id="weekly-post-more">
                        <summary>Open full week</summary>
                        <div id="weekly-diary-body" class="weekly-diary-body" role="region" aria-label="Weekly post" aria-live="polite">
                            ${renderDiaryBody(selectedDiaryEntry)}
                        </div>
                    </details>
                ` : ''}
                ${selectedDiaryEntry && diaryArchiveShouldBeLegacy ? `
                    <div class="weekly-diary-compact-note">Homepage shows a legacy preview only. Open the log file for the full week write-up.</div>
                ` : ''}
                <div class="weekly-diary-footer">
                    <span class="weekly-diary-metrics" id="weekly-diary-metrics">${escapeHtml(selectedDiaryEntry ? (renderDiaryMetrics(selectedDiaryEntry) || '') : '')}</span>
                    <a class="weekly-link" href="WeeklyLog.txt" target="_blank" rel="noopener">${diaryArchiveShouldBeLegacy ? 'Open legacy log file' : 'Read full log'}</a>
                </div>
            </section>
        `;

        const legacyArchiveSection = (diaryEntries.length && diaryArchiveShouldBeLegacy) ? `
            <details class="weekly-more weekly-legacy-archive-shell" id="weekly-legacy-archive-shell">
                <summary>Legacy Weekly Diary (Project Archive)</summary>
                <div class="weekly-legacy-archive-note">
                    Older project-specific write-ups are kept here as reference. Current weekly updates above come from live GitHub activity.
                </div>
                <div class="weekly-legacy-archive-body">
                    ${diarySection}
                </div>
            </details>
        ` : '';

        const primaryWeeklyLogSection = (diaryEntries.length && !diaryArchiveShouldBeLegacy)
            ? diarySection
            : liveWeeklyLogSection;

	        const topReposThisWeekList = topRepos.length
	            ? topRepos.slice(0, 4).map(r => {
	                const meta = [];
	                if (r.commits) meta.push(`${r.commits} commit${r.commits === 1 ? '' : 's'}`);
	                if (r.pushes) meta.push(`${r.pushes} push${r.pushes === 1 ? '' : 'es'}`);
	                return li(`<a class="weekly-inline-link" href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.name)}</a> — ${escapeHtml(meta.join(' • ') || 'active')}`);
	            }).join('')
	            : li('No repo updates found (or cache not ready).');

            const monthReleasesList = releasesThisMonth.length
                ? releasesThisMonth.slice(0, 4).map(r => {
                    const nameSuffix = r.name ? ` <span class="weekly-muted">(${escapeHtml(r.name)})</span>` : '';
                    return li(`<a class="weekly-inline-link" href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.repo)}</a> — <code>${escapeHtml(r.tag)}</code>${nameSuffix}`);
                }).join('')
                : li(`No releases cached for ${escapeHtml(currentMonthLabel)} yet.`);

            const thisWeekDetailsSection = `
                <details class="weekly-more weekly-this-week-details" id="weekly-this-week-details">
                    <summary>This Week Details (repos + releases)</summary>
                    <div class="weekly-sections weekly-this-week-details-grid">
                        <section class="weekly-section">
                            <div class="weekly-section-header">
                                <h4 class="weekly-section-title"><span class="weekly-section-icon">🔥</span>Top Repos (This Week)</h4>
                                <span class="weekly-section-meta">Public</span>
                            </div>
                            <ul class="weekly-list">
                                ${topReposThisWeekList}
                            </ul>
                        </section>

                        <section class="weekly-section">
                            <div class="weekly-section-header">
                                <h4 class="weekly-section-title"><span class="weekly-section-icon">🚀</span>Latest Releases</h4>
                                <span class="weekly-section-meta">${escapeHtml(currentMonthLabel)}</span>
                            </div>
                            <ul class="weekly-list">
                                ${monthReleasesList}
                            </ul>
                        </section>
                    </div>
                </details>
            `;

            const moreGitHubDetails = `
                <details class="weekly-more" id="weekly-github-more">
                    <summary>More from GitHub (last 7 days)</summary>
                    <div class="weekly-sections">
                        <section class="weekly-section weekly-section-wide weekly-briefing">
                            <div class="weekly-section-header">
                                <h4 class="weekly-section-title"><span class="weekly-section-icon">🎙️</span>Weekly Briefing</h4>
                                <span class="weekly-section-meta">${mostRecentEventAt ? `Last ping: ${escapeHtml(formatShortDate(mostRecentEventAt))}` : 'Last 7d'}</span>
                            </div>
                            <p class="weekly-briefing-text">${escapeHtml(intro)} ${kickoff}</p>
                            <p class="weekly-briefing-text">
                                Want in? <a class="weekly-inline-link" href="#contact" data-open-contact-tab="apply">Apply / Contact</a>
                            </p>
                        </section>
                        ${spotlightHtml}
                        <section class="weekly-section">
                            <div class="weekly-section-header">
                                <h4 class="weekly-section-title"><span class="weekly-section-icon">📌</span>Highlights</h4>
                                <span class="weekly-section-meta">Last 7d</span>
                            </div>
                            <ul class="weekly-list">
                                ${highlights.map(h => li(h)).join('')}
                            </ul>
                        </section>
                        <section class="weekly-section">
                            <div class="weekly-section-header">
                                <h4 class="weekly-section-title"><span class="weekly-section-icon">📝</span>Notable Changes</h4>
                                <span class="weekly-section-meta">Commits</span>
                            </div>
                            <ul class="weekly-list">
                                ${notableList}
                            </ul>
                        </section>
                        <section class="weekly-section">
                            <div class="weekly-section-header">
                                <h4 class="weekly-section-title"><span class="weekly-section-icon">🚀</span>Releases (This Week)</h4>
                                <span class="weekly-section-meta">${escapeHtml(releases.length ? `${releases.length}` : '0')}</span>
                            </div>
                            <ul class="weekly-list">
                                ${releasesList}
                            </ul>
                        </section>
                        <section class="weekly-section">
                            <div class="weekly-section-header">
                                <h4 class="weekly-section-title"><span class="weekly-section-icon">✨</span>Patch Notes</h4>
                                <span class="weekly-section-meta">Features</span>
                            </div>
                            <ul class="weekly-list">
                                ${featureList}
                            </ul>
                        </section>
                        <section class="weekly-section">
                            <div class="weekly-section-header">
                                <h4 class="weekly-section-title"><span class="weekly-section-icon">🪲</span>Bug Squash</h4>
                                <span class="weekly-section-meta">Fixes</span>
                            </div>
                            <ul class="weekly-list">
                                ${fixList}
                            </ul>
                        </section>
                    </div>
                </details>
            `;

	        container.innerHTML = `
	            <div class="weekly-digest weekly-digest-v2">
                    <div class="weekly-kpis">
                        ${kpi(commitTotalForKpi, 'Commits (7d)')}
                        ${kpi(totalPushes, 'Pushes')}
                        ${kpi(activeRepos.size, 'Repos Active')}
                        ${kpi(starsGained, 'Stars')}
                    </div>

                    ${primaryWeeklyLogSection}

                    ${thisWeekDetailsSection}

                    ${githubWeekHistorySection}

                    ${moreGitHubDetails}

                    ${legacyArchiveSection}

                    <div class="weekly-footer">
                        <a class="btn btn-secondary btn-sm" href="releases.html">Read Release Notes</a>
                        <a class="btn btn-secondary btn-sm" href="${safeExternalUrl('https://github.com/' + GITHUB_USERNAME)}" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a class="btn btn-secondary btn-sm" href="#updates">Build Log</a>
                    </div>
	            </div>
	        `;

            if (diaryEntries.length || githubWeekSummaries.length) {
                const headerPrevBtn = document.getElementById('prev-week-btn');
                const headerNextBtn = document.getElementById('next-week-btn');
                const previewEl = document.getElementById('weekly-diary-preview');
                const bodyEl = document.getElementById('weekly-diary-body');
                const metaEl = document.getElementById('weekly-diary-meta');
                const metricsEl = document.getElementById('weekly-diary-metrics');
                const newsMetaEl = document.getElementById('weekly-news-meta');
                const archiveNoteEl = document.getElementById('weekly-diary-archive-note');
                const shareBtn = document.getElementById('weekly-share-btn');
                const weekButtons = Array.from(document.querySelectorAll('[data-weekly-week]'));
                const ghWindowTrackEl = document.getElementById('weekly-gh-window-track');
                const ghWindowPrevBtn = document.getElementById('weekly-gh-prev-btn');
                const ghWindowNextBtn = document.getElementById('weekly-gh-next-btn');
                const useHeaderWeekNav = diaryEntries.length > 0 && !diaryArchiveShouldBeLegacy;

                let currentIndex = selectedDiaryIndex;

                const setControls = () => {
                    if (!useHeaderWeekNav) {
                        if (headerPrevBtn) headerPrevBtn.disabled = true;
                        if (headerNextBtn) headerNextBtn.disabled = true;
                        return;
                    }
                    if (headerPrevBtn) headerPrevBtn.disabled = currentIndex <= 0;
                    if (headerNextBtn) headerNextBtn.disabled = currentIndex >= (diaryEntries.length - 1);
                };

                const animateContent = (direction) => {
                    container.classList.remove('slide-left', 'slide-right');
                    void container.offsetWidth;
                    container.classList.add(direction === 'left' ? 'slide-left' : 'slide-right');
                    window.setTimeout(() => container.classList.remove('slide-left', 'slide-right'), 420);
                };

                const setActiveChip = () => {
                    weekButtons.forEach(btn => {
                        const idx = Number.parseInt(String(btn.dataset.weeklyWeek || ''), 10);
                        if (idx === currentIndex) {
                            btn.setAttribute('aria-current', 'true');
                        } else {
                            btn.removeAttribute('aria-current');
                        }
                    });
                };

                const updateWeek = (idx, direction) => {
                    const safeIndex = Number.parseInt(String(idx), 10);
                    if (!Number.isFinite(safeIndex) || safeIndex < 0 || safeIndex >= diaryEntries.length) return;

                    currentIndex = safeIndex;

                    try {
                        window.localStorage.setItem('atrak_weekly_diary_index', String(safeIndex));
                    } catch (_) {
                        // ignore storage errors
                    }

                    const entry = diaryEntries[safeIndex];
                    if (newsMetaEl) newsMetaEl.textContent = entry.weekOf || currentMonthLabel;

                    if (metaEl) {
                        const metaParts = [];
                        if (entry.projectTitle) metaParts.push(entry.projectTitle);
                        if (entry.weekOf) metaParts.push(entry.weekOf);
                        metaParts.push(`${safeIndex + 1}/${diaryEntries.length}`);
                        metaEl.textContent = metaParts.join(' • ');
                    }
                    if (archiveNoteEl) archiveNoteEl.textContent = renderDiaryArchiveNote(entry) || '';

                    if (previewEl) previewEl.innerHTML = renderDiaryPreview(entry);
                    if (bodyEl) bodyEl.innerHTML = renderDiaryBody(entry);
                    if (metricsEl) metricsEl.textContent = renderDiaryMetrics(entry) || '';

                    if (entry && entry.weekKey) {
                        try {
                            window.history.replaceState(null, '', `#week=${entry.weekKey}`);
                        } catch (_) {
                            // ignore URL update errors
                        }
                    }

                    setActiveChip();
                    setControls();
                    animateContent(direction || 'right');
                };

                setControls();
                setActiveChip();

                if (useHeaderWeekNav && headerPrevBtn && !headerPrevBtn.dataset.bound) {
                    headerPrevBtn.dataset.bound = 'true';
                    headerPrevBtn.addEventListener('click', () => updateWeek(currentIndex - 1, 'left'));
                }
                if (useHeaderWeekNav && headerNextBtn && !headerNextBtn.dataset.bound) {
                    headerNextBtn.dataset.bound = 'true';
                    headerNextBtn.addEventListener('click', () => updateWeek(currentIndex + 1, 'right'));
                }

                weekButtons.forEach(btn => {
                    if (btn.dataset.bound) return;
                    btn.dataset.bound = 'true';
                    btn.addEventListener('click', () => {
                        const idx = Number.parseInt(String(btn.dataset.weeklyWeek || ''), 10);
                        const direction = idx < currentIndex ? 'left' : 'right';
                        updateWeek(idx, direction);
                    });
                });

                if (ghWindowTrackEl) {
                    const ghCards = Array.from(ghWindowTrackEl.querySelectorAll('[data-gh-window-card]'));
                    let currentGhWindow = 0;

                    const getCardStep = () => {
                        if (!ghCards.length) return ghWindowTrackEl.clientWidth || 320;
                        const first = ghCards[0];
                        const cardRect = first.getBoundingClientRect();
                        const trackRect = ghWindowTrackEl.getBoundingClientRect();
                        const firstLeft = cardRect.left - trackRect.left + ghWindowTrackEl.scrollLeft;
                        if (ghCards.length > 1) {
                            const second = ghCards[1];
                            const secondRect = second.getBoundingClientRect();
                            const secondLeft = secondRect.left - trackRect.left + ghWindowTrackEl.scrollLeft;
                            return Math.max(220, Math.round(secondLeft - firstLeft));
                        }
                        return Math.max(220, Math.round(cardRect.width) + 12);
                    };

                    const setActiveGhWindow = (index) => {
                        currentGhWindow = Math.max(0, Math.min(index, ghCards.length - 1));
                        ghCards.forEach((card, idx) => {
                            if (idx === currentGhWindow) {
                                card.setAttribute('aria-current', 'true');
                            } else {
                                card.removeAttribute('aria-current');
                            }
                        });
                        if (ghWindowPrevBtn) ghWindowPrevBtn.disabled = currentGhWindow <= 0;
                        if (ghWindowNextBtn) ghWindowNextBtn.disabled = currentGhWindow >= ghCards.length - 1;
                    };

                    const scrollToGhWindow = (index) => {
                        if (!ghCards.length) return;
                        const safeIndex = Math.max(0, Math.min(index, ghCards.length - 1));
                        const step = getCardStep();
                        ghWindowTrackEl.scrollTo({ left: safeIndex * step, behavior: 'smooth' });
                        setActiveGhWindow(safeIndex);
                    };

                    const bindBtn = (btn, direction) => {
                        if (!btn || btn.dataset.bound) return;
                        btn.dataset.bound = 'true';
                        btn.addEventListener('click', () => scrollToGhWindow(currentGhWindow + direction));
                    };

                    bindBtn(ghWindowPrevBtn, -1);
                    bindBtn(ghWindowNextBtn, 1);

                    if (!ghWindowTrackEl.dataset.bound) {
                        ghWindowTrackEl.dataset.bound = 'true';
                        let syncTimer = 0;
                        ghWindowTrackEl.addEventListener('scroll', () => {
                            window.clearTimeout(syncTimer);
                            syncTimer = window.setTimeout(() => {
                                const step = getCardStep();
                                if (!step) return;
                                const idx = Math.round(ghWindowTrackEl.scrollLeft / step);
                                setActiveGhWindow(idx);
                            }, 90);
                        }, { passive: true });
                    }

                    setActiveGhWindow(0);
                }

                if (shareBtn && !shareBtn.dataset.bound) {
                    shareBtn.dataset.bound = 'true';
                    const originalLabel = shareBtn.textContent || 'Share';

                    const getShareUrl = () => {
                        const entry = diaryEntries[currentIndex];
                        const key = entry && entry.weekKey ? String(entry.weekKey) : '';
                        const url = new URL(window.location.href);
                        url.hash = key ? `week=${key}` : 'updates';
                        return url.toString();
                    };

                    shareBtn.addEventListener('click', async () => {
                        const shareUrl = getShareUrl();
                        let ok = false;

                        try {
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                await navigator.clipboard.writeText(shareUrl);
                                ok = true;
                            }
                        } catch (_) {
                            ok = false;
                        }

                        if (!ok) {
                            window.prompt('Copy this link:', shareUrl);
                        }

                        shareBtn.textContent = ok ? 'Copied!' : 'Copy link';
                        window.setTimeout(() => {
                            shareBtn.textContent = originalLabel;
                        }, 1200);
                    });
                }

                if (requestedWeekKey && requestedDiaryIndex >= 0) {
                    const legacyArchiveShellEl = document.getElementById('weekly-legacy-archive-shell');
                    if (legacyArchiveShellEl && !legacyArchiveShellEl.open) {
                        legacyArchiveShellEl.open = true;
                    }
                    const weeklyCard = document.getElementById('weekly-highlights');
                    if (weeklyCard) {
                        window.setTimeout(() => {
                            weeklyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 150);
                    }
                }
            } else {
                const headerPrevBtn = document.getElementById('prev-week-btn');
                const headerNextBtn = document.getElementById('next-week-btn');
                if (headerPrevBtn) headerPrevBtn.disabled = true;
                if (headerNextBtn) headerNextBtn.disabled = true;
            }
	        
	    } catch (e) {
	        console.error('Failed to render weekly highlights', e);
	        container.innerHTML = '<div class="weekly-empty">Unable to load highlights.</div>';
	    }
}

// ============================================
// LIVE ACTIVITY FEED
// ============================================

/**
 * Get relative time string
 */
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Create HTML for a live activity item
 */
function createLiveActivityItem(repo) {
    const displayName = formatDisplayName(repo.name);
    const timeAgo = getTimeAgo(new Date(repo.pushed_at));
    const icon = repo.language === 'TypeScript' ? '📘' : 
                 repo.language === 'Python' ? '🐍' :
                 repo.language === 'JavaScript' ? '📙' :
                 repo.language === 'Jupyter Notebook' ? '📓' : '📦';
    
    return `
        <div class="live-item">
            <span class="live-item-icon">${icon}</span>
            <div class="live-item-content">
                <div class="live-item-title">
                    <a href="${repo.html_url}" target="_blank" rel="noopener">${displayName}</a>
                </div>
                <div class="live-item-meta">
                    <span class="live-item-time">Updated ${timeAgo}</span>
                    ${repo.language ? `
                        <span class="live-item-lang">
                            <span class="lang-dot" data-lang="${repo.language}"></span>
                            ${repo.language}
                        </span>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render the live activity feed from cached repo data
 */
async function renderLiveActivity() {
    const feedEl = document.getElementById('live-activity-feed');
    const syncEl = document.getElementById('timeline-sync-status');
    
    if (!feedEl) return;
    
    try {
        // Load cached repos
        const repos = await loadCachedData();
        const meta = await loadCachedMeta();
        
        if (!repos || repos.length === 0) {
            feedEl.innerHTML = '<div class="live-activity-empty">No activity data available</div>';
            if (syncEl) syncEl.textContent = 'Unable to load';
            return;
        }
        
        // Sort by pushed_at (most recent first) and take top 5
        const recentRepos = repos
            .filter(r => r.pushed_at)
            .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
            .slice(0, 5);
        
        if (recentRepos.length === 0) {
            feedEl.innerHTML = '<div class="live-activity-empty">No recent activity</div>';
        } else {
            feedEl.innerHTML = recentRepos.map(createLiveActivityItem).join('');
        }
        
        // Update sync status
        if (syncEl && meta && meta.updatedAt) {
            const syncTime = getTimeAgo(new Date(meta.updatedAt));
            syncEl.textContent = `Synced ${syncTime} • ${meta.repoCount || repos.length} repos tracked`;
        } else if (syncEl) {
            syncEl.textContent = `${repos.length} repos tracked`;
        }
        
    } catch (error) {
        console.error('Failed to render live activity:', error);
        feedEl.innerHTML = '<div class="live-activity-empty">Failed to load activity</div>';
    }
}

// ============================================
// PROJECT ANALYTICS (UPDATES SECTION)
// ============================================

async function renderProjectAnalytics() {
    const gridEl = document.getElementById('project-analytics-grid');
    const metaEl = document.getElementById('project-analytics-meta');
    if (!gridEl) return;

    try {
        const [repos, meta, weekly] = await Promise.all([
            loadCachedData(),
            loadCachedMeta(),
            loadCachedWeeklyStats()
        ]);

        const repoList = Array.isArray(repos) ? repos : [];
        const repoCount = meta && typeof meta.repoCount === 'number' ? meta.repoCount : repoList.length;
        const totalStars = meta && typeof meta.totalStars === 'number'
            ? meta.totalStars
            : repoList.reduce((sum, r) => sum + (Number(r.stargazers_count) || 0), 0);
        const totalForks = meta && typeof meta.totalForks === 'number'
            ? meta.totalForks
            : repoList.reduce((sum, r) => sum + (Number(r.forks_count) || 0), 0);

        const mostRecentPush = (meta && meta.mostRecentPush)
            ? new Date(meta.mostRecentPush)
            : repoList.reduce((latest, r) => {
                if (!r.pushed_at) return latest;
                const date = new Date(r.pushed_at);
                if (!latest || date > latest) return date;
                return latest;
            }, null);

        const languageCounts = repoList.reduce((acc, r) => {
            if (r.language) acc[r.language] = (acc[r.language] || 0) + 1;
            return acc;
        }, {});
        const topLang = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0];

        const weeklyCommits = weekly && typeof weekly.totalCommitContributions === 'number'
            ? weekly.totalCommitContributions
            : null;

        const cards = [
            { label: 'Repos tracked', value: repoCount },
            { label: 'Total stars', value: totalStars },
            { label: 'Total forks', value: totalForks },
            { label: 'Commits (7d)', value: weeklyCommits != null ? weeklyCommits : '—' },
            { label: 'Top language', value: topLang ? topLang[0] : '—' },
            { label: 'Last push', value: mostRecentPush ? getTimeAgo(mostRecentPush) : '—' }
        ];

        gridEl.innerHTML = cards.map(card => `
            <div class="project-analytics-card">
                <div class="project-analytics-value">${escapeHtml(card.value)}</div>
                <div class="project-analytics-label">${escapeHtml(card.label)}</div>
            </div>
        `).join('');

        if (metaEl) {
            metaEl.textContent = meta && meta.updatedAt
                ? `Synced ${getTimeAgo(new Date(meta.updatedAt))} • ${repoCount} repos`
                : 'Tracking GitHub activity and repos.';
        }
    } catch (error) {
        console.error('Failed to render project analytics:', error);
        gridEl.innerHTML = '<div class="project-analytics-loading">Unable to load analytics right now.</div>';
        if (metaEl) metaEl.textContent = 'Analytics unavailable.';
    }
}

// ============================================
// RELEASES FEED (CACHED FROM GITHUB ACTIONS)
// ============================================

function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const idx = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    const value = n / (1024 ** idx);
    return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatLongDate(isoString) {
    try {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
        return '';
    }
}

function getMonthKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function formatMonthLabel(monthKey) {
    const m = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
    if (!m) return monthKey;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey;
    try {
        return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (_) {
        return monthKey;
    }
}

async function renderReleasesFeed() {
    const listEl = document.getElementById('releases-live-list');
    const controlsEl = document.getElementById('releases-live-controls');
    const metaEl = document.getElementById('releases-live-meta');

    if (!listEl || !controlsEl) return;

    listEl.innerHTML = '<div class="releases-live-empty">Loading releases…</div>';

    const [rawReleases, meta] = await Promise.all([
        loadCachedReleases(),
        loadCachedMeta()
    ]);

    const releases = Array.isArray(rawReleases) ? rawReleases : [];
    if (!releases.length) {
        listEl.innerHTML = '<div class="releases-live-empty">No cached releases yet.</div>';
        if (metaEl) metaEl.textContent = 'Set up GitHub Actions caching to populate this feed.';
        return;
    }

    const normalized = releases
        .filter(r => r && typeof r === 'object')
        .filter(r => !r.draft)
        .map(r => {
            const publishedRaw = typeof r.published_at === 'string' ? r.published_at : '';
            const publishedAt = publishedRaw ? new Date(publishedRaw) : null;
            const repoFull = typeof r.repo === 'string' ? r.repo : '';
            const repoShort = repoFull ? (repoFull.split('/')[1] || repoFull) : 'repo';
            const url = safeExternalUrl(r.url);
            const repoUrl = safeExternalUrl(repoFull ? `https://github.com/${repoFull}` : '');
            const monthKey = publishedAt && !Number.isNaN(publishedAt.getTime()) ? getMonthKey(publishedAt) : '';

            const assetsRaw = Array.isArray(r.assets) ? r.assets : [];
            const assets = assetsRaw
                .filter(a => a && typeof a === 'object')
                .map(a => ({
                    name: typeof a.name === 'string' ? a.name : '',
                    downloadUrl: safeExternalUrl(a.download_url),
                    size: Number(a.size) || 0,
                    downloads: Number(a.download_count) || 0,
                }))
                .filter(a => a.name && a.downloadUrl !== '#')
                .slice(0, 6);

            return {
                repoFull,
                repoShort,
                name: typeof r.name === 'string' ? r.name : '',
                tag: typeof r.tag === 'string' ? r.tag : '',
                url,
                repoUrl,
                publishedAt,
                monthKey,
                prerelease: Boolean(r.prerelease),
                zipballUrl: safeExternalUrl(typeof r.zipball_url === 'string' ? r.zipball_url : ''),
                tarballUrl: safeExternalUrl(typeof r.tarball_url === 'string' ? r.tarball_url : ''),
                assets,
            };
        })
        .filter(r => r.url !== '#')
        .sort((a, b) => {
            const da = a.publishedAt ? a.publishedAt.getTime() : 0;
            const db = b.publishedAt ? b.publishedAt.getTime() : 0;
            return db - da;
        });

    const months = Array.from(new Set(normalized.map(r => r.monthKey).filter(Boolean)));
    const repos = Array.from(new Set(normalized.map(r => r.repoShort).filter(Boolean))).sort((a, b) => a.localeCompare(b));

    const currentMonthKey = getMonthKey(new Date());
    let selectedMonth = months.includes(currentMonthKey) ? currentMonthKey : (months[0] || '');
    let selectedRepo = '';

    const renderControls = () => {
        const monthOptions = [
            `<option value="">All months</option>`,
            ...months.map(mk => `<option value="${escapeHtml(mk)}" ${mk === selectedMonth ? 'selected' : ''}>${escapeHtml(formatMonthLabel(mk))}</option>`)
        ].join('');

        const repoOptions = [
            `<option value="">All projects</option>`,
            ...repos.map(repo => `<option value="${escapeHtml(repo)}" ${repo === selectedRepo ? 'selected' : ''}>${escapeHtml(formatDisplayName(repo))}</option>`)
        ].join('');

        controlsEl.innerHTML = `
            <div class="releases-filter">
                <label for="releases-month">Month</label>
                <select id="releases-month">${monthOptions}</select>
            </div>
            <div class="releases-filter">
                <label for="releases-project">Project</label>
                <select id="releases-project">${repoOptions}</select>
            </div>
        `;

        const monthEl = document.getElementById('releases-month');
        const projectEl = document.getElementById('releases-project');

        if (monthEl) {
            monthEl.addEventListener('change', () => {
                selectedMonth = String(monthEl.value || '');
                renderList();
            });
        }

        if (projectEl) {
            projectEl.addEventListener('change', () => {
                selectedRepo = String(projectEl.value || '');
                renderList();
            });
        }
    };

    const renderList = () => {
        const filtered = normalized
            .filter(r => !selectedMonth || r.monthKey === selectedMonth)
            .filter(r => !selectedRepo || r.repoShort === selectedRepo);

        const maxItems = 20;
        const shown = filtered.slice(0, maxItems);

        if (!shown.length) {
            listEl.innerHTML = '<div class="releases-live-empty">No releases match those filters.</div>';
            return;
        }

        const cards = shown.map(rel => {
            const dateLabel = rel.publishedAt ? formatLongDate(rel.publishedAt.toISOString()) : '';
            const title = rel.name || rel.tag || 'Release';
            const badges = [
                rel.prerelease ? `<span class="releases-live-badge prerelease">Prerelease</span>` : ''
            ].filter(Boolean).join('');

            const assetsHtml = rel.assets.length
                ? `
                    <div class="releases-live-assets">
                        <div class="releases-live-assets-title">Download assets</div>
                        <ul class="releases-live-assets-list">
                            ${rel.assets.map(a => `
                                <li class="releases-live-assets-item">
                                    <a href="${a.downloadUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.name)}</a>
                                    <span class="releases-live-assets-meta">${escapeHtml(formatBytes(a.size))}${a.downloads ? ` • ${escapeHtml(a.downloads)} dl` : ''}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `
                : `
                    <div class="releases-live-assets">
                        <div class="releases-live-assets-title">Downloads</div>
                        <div class="releases-live-empty">No release assets uploaded — source only.</div>
                    </div>
                `;

            const sourceLinks = [
                rel.zipballUrl !== '#' ? `<a class="btn btn-secondary btn-sm" href="${rel.zipballUrl}" target="_blank" rel="noopener noreferrer">Source (zip)</a>` : '',
                rel.tarballUrl !== '#' ? `<a class="btn btn-secondary btn-sm" href="${rel.tarballUrl}" target="_blank" rel="noopener noreferrer">Source (tar)</a>` : '',
            ].filter(Boolean).join('');

            return `
                <article class="releases-live-item">
                    <div class="releases-live-item-header">
                        <div>
                            <div class="releases-live-repo">${escapeHtml(formatDisplayName(rel.repoShort))}</div>
                            <div class="releases-live-name">${escapeHtml(title)}</div>
                            <div class="releases-live-tag">
                                ${rel.tag ? `<code>${escapeHtml(rel.tag)}</code>` : ''}
                                <span class="releases-live-badges">${badges}</span>
                            </div>
                        </div>
                        <div class="releases-live-date">${escapeHtml(dateLabel)}</div>
                    </div>

                    <div class="releases-live-actions">
                        <a class="btn btn-primary btn-sm" href="${rel.url}" target="_blank" rel="noopener noreferrer">View</a>
                        ${rel.repoUrl !== '#' ? `<a class="btn btn-secondary btn-sm" href="${rel.repoUrl}" target="_blank" rel="noopener noreferrer">Repo</a>` : ''}
                        ${sourceLinks}
                    </div>
                    ${assetsHtml}
                </article>
            `;
        }).join('');

        const truncated = filtered.length > maxItems
            ? `<div class="releases-live-empty">Showing ${escapeHtml(maxItems)} of ${escapeHtml(filtered.length)} releases. Narrow filters to see more.</div>`
            : '';

        listEl.innerHTML = cards + truncated;
    };

    if (metaEl) {
        metaEl.textContent = meta && meta.updatedAt ? `Cached daily • Updated ${formatUTCDateTime(meta.updatedAt)}` : 'Cached daily via GitHub Actions';
    }

    renderControls();
    renderList();
}

// Export functions for use in other scripts
window.GitHubProjects = {
    renderMoreProjects,
    renderLiveActivity,
    renderProjectAnalytics,
    renderWeeklyHighlights,
    renderReleasesFeed,
    getProjectDetails,
    fetchGitHubRepositories,
    getTechStack,
    formatDate,
    formatDisplayName,
    getTimeAgo,
    GITHUB_USERNAME
};

// Load sync status on page load (even if More Projects tab is hidden)
async function loadSyncStatus() {
    try {
        const meta = await loadCachedMeta();
        if (meta && meta.updatedAt) {
            setFooterSyncStatus(`GitHub data synced • ${formatUTCDateTime(meta.updatedAt)}`);
        }
    } catch (e) {
        // Ignore errors loading sync status
    }
}

// Auto-initialize
function initGitHubFeatures() {
    const schedule = (fn) => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(() => fn(), { timeout: 1200 });
        } else {
            setTimeout(fn, 0);
        }
    };

    // Always load sync status (cheap)
    loadSyncStatus();
    
    // Defer heavier rendering to idle time so core interactions feel instant
    schedule(renderLiveActivity);
    schedule(renderWeeklyHighlights);
    schedule(renderReleasesFeed);
    schedule(renderProjectAnalytics);
    
    // Only auto-load More Projects if the tab is active (visible) on page load
    const moreProjectsGrid = document.getElementById('more-projects-grid');
    const moreTab = document.getElementById('more-tab');
    if (moreProjectsGrid && moreTab && moreTab.classList.contains('active')) {
        schedule(renderMoreProjects);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGitHubFeatures);
} else {
    initGitHubFeatures();
}
