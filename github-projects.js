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
const WEEKLY_LOG_PATH = SITE_BASE_URL ? `${SITE_BASE_URL}WeeklyLog.txt` : 'WeeklyLog.txt';

// Known featured projects to exclude from "More Projects" section
const FEATURED_PROJECT_REPOS = [
    'rork-guide-pup--vision-assistant',
    'Basketball_action_recoginition_sever',
    'AI-predator-simulation',
    'LunarWeb'
];

// Cache for GitHub data
let githubProjectsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastGitHubFetchSource = null; // 'cache' | 'api'

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

const INTERNAL_PROJECT_PAGES = {
    'rork-guide-pup--vision-assistant': 'projects/guidepup.html',
    'Basketball_action_recoginition_sever': 'projects/hoops-clips.html',
    'AI-predator-simulation': 'projects/ai-predator-simulation.html',
    'rork-ten-seconds-vip-manager': 'projects/ten-seconds-vip-manager.html',
    'LunarWeb': 'index.html',
};

function parseWeeklyLog(text) {
    const content = String(text || '');
    if (!content) return null;

    const matches = [];
    const re = /^##\s+Week of\s+(.+)$/gm;
    let m;
    while ((m = re.exec(content)) !== null) {
        matches.push({ index: m.index, weekOf: (m[1] || '').trim() });
    }
    if (!matches.length) return null;

    const last = matches[matches.length - 1];
    const nextIndex = matches.length >= 2 ? matches[matches.length - 1].index : content.length;
    // Find the end of the last "Week of" block by searching for the next "## Week of" after it.
    const after = content.slice(last.index + 1);
    const nextMatch = after.match(/^##\s+Week of\s+/m);
    const end = nextMatch ? last.index + 1 + nextMatch.index : content.length;
    const sectionText = content.slice(last.index, end);

    const titleMatch = content.match(/^#\s+(.+)$/m);
    const rawTitle = titleMatch ? titleMatch[1].trim() : 'Weekly Dev News';
    const projectTitle = rawTitle.replace(/\s+—\s+Weekly Dev News.*$/i, '').trim();

    const headlineMatch = sectionText.match(/^###\s+(.+)$/m);
    const headline = headlineMatch ? headlineMatch[1].trim().replace(/^["“]|["”]$/g, '') : '';

    const lines = sectionText.split(/\r?\n/);
    const blocks = {};
    let currentKey = null;
    let current = null;

    const commitMetrics = {};

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

    // Parse metrics from a "Metrics" block if present.
    if (blocks.Metrics) {
        const all = [...blocks.Metrics.bullets, ...blocks.Metrics.paragraphs];
        all.forEach(entry => {
            const mm = String(entry).match(/^([A-Za-z ]+):\s*(.+)$/);
            if (!mm) return;
            commitMetrics[mm[1].trim()] = mm[2].trim();
        });
    }

    return {
        projectTitle: projectTitle || 'Weekly Dev News',
        weekOf: last.weekOf || '',
        headline,
        blocks,
        metrics: commitMetrics
    };
}

async function loadLatestWeeklyLogEntry() {
    try {
        const response = await fetch(WEEKLY_LOG_PATH);
        if (!response.ok) return null;
        const text = await response.text();
        return parseWeeklyLog(text);
    } catch (_) {
        return null;
    }
}

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
    const displayName = formatDisplayName(project.name);
    
    const tagsHTML = techStack.length > 0
        ? techStack.map(tech => `<span class="tag">${tech}</span>`).join('')
        : '<span class="tag">General</span>';
    
    return `
        <div class="project-card reveal glass-card">
            <div class="project-image">
                <div class="project-icon">📦</div>
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
                    <a href="projects/github-project.html?repo=${encodeURIComponent(project.fullName)}" class="btn btn-secondary btn-sm">Details</a>
                    <a href="${project.url}" class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">Access</a>
                    <a href="${project.url}/releases" class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">Download</a>
                    ${project.homepage ? `<a href="${project.homepage}" class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">Demo</a>` : ''}
                </div>
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

    // Skip if already loaded (has children other than loading/error messages)
    const hasProjectCards = container.querySelector('.project-card');
    if (hasProjectCards) {
        return;
    }

    // Show loading state
    container.innerHTML = '<p class="loading-message">Loading projects from GitHub...</p>';
    setMoreProjectsMeta('Loading GitHub data…');

    try {
        const projects = await fetchGitHubRepositories();
        
        if (projects.length === 0) {
            container.innerHTML = '<p class="empty-message">No additional projects found.</p>';
            setMoreProjectsMeta('');
            return;
        }

        // Limit to top 6 most recently updated projects
        const displayProjects = projects.slice(0, 6);
        
        container.innerHTML = displayProjects.map(project => createProjectCard(project)).join('');

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
        
        // Re-trigger reveal animations for new elements
        const revealElements = container.querySelectorAll('.reveal');
        if (window.revealObserver) {
            revealElements.forEach(el => window.revealObserver.observe(el));
        }
        
    } catch (error) {
        console.error('Failed to render projects:', error);
        container.innerHTML = '<p class="error-message">Failed to load projects. Please try again later.</p>';
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
    
    if (!container) return;
    
    try {
        const response = await fetch(CACHED_EVENTS_PATH);
        if (!response.ok) throw new Error('Events not found');
        
        const rawEvents = await response.json();
        const events = Array.isArray(rawEvents) ? rawEvents : [];
        
        // Filter last 7 days (weekly digest)
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const weeklyEvents = events
            .filter(e => e && typeof e === 'object' && typeof e.created_at === 'string')
            .filter(e => {
                const created = new Date(e.created_at);
                return !Number.isNaN(created.getTime()) && created >= weekAgo && created <= now;
            });
        
        if (dateRangeEl) {
            dateRangeEl.textContent = `${formatShortDate(weekAgo)} - ${formatShortDate(now)}`;
        }
        
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
        const kickoff = totalCommits
            ? `We clocked <strong>${escapeHtml(totalCommits)}</strong> commits across <strong>${escapeHtml(activeRepos.size)}</strong> active repos.`
            : `Quiet week on public repos — but we might have been building in private 👀`;

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

        const [weeklyLog, cachedRepos] = await Promise.all([
            loadLatestWeeklyLogEntry(),
            loadCachedData()
        ]);

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
                        <a class="btn btn-secondary btn-sm" href="${safeExternalUrl(githubUrl.replace(/\\/$/, '') + '/releases')}" target="_blank" rel="noopener noreferrer">Releases</a>
                    </div>
                </section>
            `;
        })() : '';
        const diaryBlocks = weeklyLog ? weeklyLog.blocks : {};
        const diaryHighlights = diaryBlocks.Highlights && diaryBlocks.Highlights.bullets ? diaryBlocks.Highlights.bullets.slice(0, 6) : [];
        const diaryShipped = diaryBlocks.Shipped && diaryBlocks.Shipped.bullets ? diaryBlocks.Shipped.bullets.slice(0, 6) : [];
        const diaryFixes = diaryBlocks.Fixes && diaryBlocks.Fixes.bullets ? diaryBlocks.Fixes.bullets.slice(0, 6) : [];
        const diaryNext = diaryBlocks.Next && diaryBlocks.Next.bullets ? diaryBlocks.Next.bullets.slice(0, 6) : [];
        const diaryEngineering = diaryBlocks.Engineering && diaryBlocks.Engineering.bullets ? diaryBlocks.Engineering.bullets.slice(0, 6) : [];
        const diaryChallenges = diaryBlocks.Challenges && diaryBlocks.Challenges.bullets ? diaryBlocks.Challenges.bullets.slice(0, 6) : [];
        const diaryVibe = diaryBlocks.Vibe && diaryBlocks.Vibe.paragraphs ? diaryBlocks.Vibe.paragraphs.join(' ') : '';
        const diaryMetrics = weeklyLog && weeklyLog.metrics ? weeklyLog.metrics : {};
        const diaryMetricLine = Object.keys(diaryMetrics).length
            ? Object.entries(diaryMetrics).slice(0, 4).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`).join(' • ')
            : '';

        const diarySection = weeklyLog
            ? `
                <section class="weekly-section weekly-section-wide weekly-diary" id="weekly-diary-${escapeHtml(slugify(weeklyLog.weekOf || weeklyLog.projectTitle))}">
                    <div class="weekly-section-header">
                        <h4 class="weekly-section-title"><span class="weekly-section-icon">📝</span>Dev Diary Spotlight</h4>
                        <span class="weekly-section-meta">${escapeHtml(weeklyLog.projectTitle)} • ${escapeHtml(weeklyLog.weekOf || '')}</span>
                    </div>
                    ${weeklyLog.headline ? `<div class="weekly-diary-headline">${escapeHtml(weeklyLog.headline)}</div>` : ''}
                    <div class="weekly-diary-grid">
                        <div class="weekly-diary-card">
                            <div class="weekly-diary-card-title">Highlights</div>
                            <ul class="weekly-list">
                                ${(diaryHighlights.length ? diaryHighlights : ['No highlights logged.']).map(item => li(escapeHtml(item))).join('')}
                            </ul>
                        </div>
                        <div class="weekly-diary-card">
                            <div class="weekly-diary-card-title">Shipped</div>
                            <ul class="weekly-list">
                                ${(diaryShipped.length ? diaryShipped : ['No shipped items logged.']).map(item => li(escapeHtml(item))).join('')}
                            </ul>
                        </div>
                        <div class="weekly-diary-card">
                            <div class="weekly-diary-card-title">Fixes</div>
                            <ul class="weekly-list">
                                ${(diaryFixes.length ? diaryFixes : ['No fixes logged.']).map(item => li(escapeHtml(item))).join('')}
                            </ul>
                        </div>
                        <div class="weekly-diary-card">
                            <div class="weekly-diary-card-title">Next</div>
                            <ul class="weekly-list">
                                ${(diaryNext.length ? diaryNext : ['No next steps logged.']).map(item => li(escapeHtml(item))).join('')}
                            </ul>
                        </div>
                    </div>
                    ${diaryVibe ? `
                        <div class="weekly-diary-vibe">
                            <div class="weekly-diary-card-title">Vibe Check</div>
                            <p class="weekly-diary-vibe-text">${escapeHtml(diaryVibe)}</p>
                        </div>
                    ` : ''}
                    ${(diaryEngineering.length || diaryChallenges.length) ? `
                        <details class="weekly-diary-more">
                            <summary>More technical notes</summary>
                            <div class="weekly-diary-more-grid">
                                ${diaryEngineering.length ? `
                                    <div class="weekly-diary-card">
                                        <div class="weekly-diary-card-title">Engineering</div>
                                        <ul class="weekly-list">
                                            ${diaryEngineering.map(item => li(escapeHtml(item))).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                                ${diaryChallenges.length ? `
                                    <div class="weekly-diary-card">
                                        <div class="weekly-diary-card-title">Challenges</div>
                                        <ul class="weekly-list">
                                            ${diaryChallenges.map(item => li(escapeHtml(item))).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                            </div>
                        </details>
                    ` : ''}
                    <div class="weekly-diary-footer">
                        ${diaryMetricLine ? `<span class="weekly-diary-metrics">${diaryMetricLine}</span>` : ''}
                        <a class="weekly-link" href="WeeklyLog.txt" target="_blank" rel="noopener">Read full log</a>
                    </div>
                </section>
            `
            : '';

        container.innerHTML = `
            <div class="weekly-digest">
                <div class="weekly-kpis">
                    ${kpi(totalCommits, 'Commits')}
                    ${kpi(totalPushes, 'Pushes')}
                    ${kpi(activeRepos.size, 'Repos Active')}
                    ${kpi(starsGained, 'Stars')}
                </div>

                <div class="weekly-sections">
                    <section class="weekly-section weekly-section-wide weekly-briefing">
                        <div class="weekly-section-header">
                            <h4 class="weekly-section-title"><span class="weekly-section-icon">🎙️</span>Weekly Briefing</h4>
                            <span class="weekly-section-meta">${mostRecentEventAt ? `Last ping: ${escapeHtml(formatShortDate(mostRecentEventAt))}` : 'Last 7d'}</span>
                        </div>
                        <p class="weekly-briefing-text">${escapeHtml(intro)}</p>
                        <p class="weekly-briefing-text">${kickoff}</p>
                        <p class="weekly-briefing-text">
                            Want in? <a class="weekly-inline-link" href="#contact" data-open-contact-tab="apply">Apply / Contact</a> — we’re always looking for builders.
                        </p>
                    </section>

                    ${spotlightHtml}
                    ${diarySection}

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
                            <h4 class="weekly-section-title"><span class="weekly-section-icon">🧱</span>Build Log</h4>
                            <span class="weekly-section-meta">Top repos</span>
                        </div>
                        <ul class="weekly-list">
                            ${buildList}
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
                            <h4 class="weekly-section-title"><span class="weekly-section-icon">🚀</span>Releases</h4>
                            <span class="weekly-section-meta">${escapeHtml(releases.length ? `${releases.length}` : '0')}</span>
                        </div>
                        <ul class="weekly-list">
                            ${releasesList}
                        </ul>
                    </section>

                    <section class="weekly-section">
                        <div class="weekly-section-header">
                            <h4 class="weekly-section-title"><span class="weekly-section-icon">✨</span>Patch Notes</h4>
                            <span class="weekly-section-meta">New stuff</span>
                        </div>
                        <ul class="weekly-list">
                            ${featureList}
                        </ul>
                    </section>

                    <section class="weekly-section">
                        <div class="weekly-section-header">
                            <h4 class="weekly-section-title"><span class="weekly-section-icon">🪲</span>Bug Squash Report</h4>
                            <span class="weekly-section-meta">Fixes</span>
                        </div>
                        <ul class="weekly-list">
                            ${fixList}
                        </ul>
                    </section>
                </div>

                <div class="weekly-footer">
                    <a class="btn btn-secondary btn-sm" href="releases.html">Read Release Notes</a>
                    <a class="btn btn-secondary btn-sm" href="${safeExternalUrl('https://github.com/' + GITHUB_USERNAME)}" target="_blank" rel="noopener noreferrer">GitHub</a>
                    <a class="btn btn-secondary btn-sm" href="#updates">Open Build Log</a>
                </div>
            </div>
        `;
        
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

// Export functions for use in other scripts
window.GitHubProjects = {
    renderMoreProjects,
    renderLiveActivity,
    renderWeeklyHighlights,
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
    // Always load sync status
    loadSyncStatus();
    
    // Always render live activity if element exists
    renderLiveActivity();
    renderWeeklyHighlights();
    
    // Only auto-load More Projects if the tab is active (visible) on page load
    const moreProjectsGrid = document.getElementById('more-projects-grid');
    const moreTab = document.getElementById('more-tab');
    if (moreProjectsGrid && moreTab && moreTab.classList.contains('active')) {
        renderMoreProjects();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGitHubFeatures);
} else {
    initGitHubFeatures();
}
