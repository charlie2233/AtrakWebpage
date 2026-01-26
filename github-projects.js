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
const CACHED_META_PATH = SITE_BASE_URL ? `${SITE_BASE_URL}data/github-meta.json` : 'data/github-meta.json'; // Updated by GitHub Actions

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
