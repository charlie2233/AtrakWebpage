// GitHub Projects - Dynamic project loading from GitHub API
// Fetches repositories for the user and displays them in the "More Projects" section

const GITHUB_USERNAME = 'charlie2233';
const GITHUB_API_BASE = 'https://api.github.com';

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

/**
 * Fetch repositories from GitHub API
 */
async function fetchGitHubRepositories() {
    // Check cache first
    if (githubProjectsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
        return githubProjectsCache;
    }

    try {
        const response = await fetch(`${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`);
        
        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}`);
        }
        
        const repos = await response.json();
        
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
    } catch (error) {
        console.error('Failed to fetch GitHub repositories:', error);
        return [];
    }
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

    try {
        const projects = await fetchGitHubRepositories();
        
        if (projects.length === 0) {
            container.innerHTML = '<p class="empty-message">No additional projects found.</p>';
            return;
        }

        // Limit to top 6 most recently updated projects
        const displayProjects = projects.slice(0, 6);
        
        container.innerHTML = displayProjects.map(project => createProjectCard(project)).join('');
        
        // Re-trigger reveal animations for new elements
        const revealElements = container.querySelectorAll('.reveal');
        if (window.revealObserver) {
            revealElements.forEach(el => window.revealObserver.observe(el));
        }
        
    } catch (error) {
        console.error('Failed to render projects:', error);
        container.innerHTML = '<p class="error-message">Failed to load projects. Please try again later.</p>';
    }
}

/**
 * Get project details for the detail page
 */
async function getProjectDetails(fullRepoName) {
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

// Export functions for use in other scripts
window.GitHubProjects = {
    renderMoreProjects,
    getProjectDetails,
    fetchGitHubRepositories,
    getTechStack,
    formatDate,
    formatDisplayName,
    GITHUB_USERNAME
};

// Auto-initialize if the More Projects section exists and is visible
// Note: With tabbed interface, we don't auto-load on page load since the tab may be hidden
// The renderMoreProjects function will be called when the tab is activated
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const moreProjectsGrid = document.getElementById('more-projects-grid');
        const moreTab = document.getElementById('more-tab');
        // Only auto-load if the tab is active (visible) on page load
        if (moreProjectsGrid && moreTab && moreTab.classList.contains('active')) {
            renderMoreProjects();
        }
    });
} else {
    const moreProjectsGrid = document.getElementById('more-projects-grid');
    const moreTab = document.getElementById('more-tab');
    // Only auto-load if the tab is active (visible) on page load
    if (moreProjectsGrid && moreTab && moreTab.classList.contains('active')) {
        renderMoreProjects();
    }
}
