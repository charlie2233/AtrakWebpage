import re

new_js_logic = """
const WEEKLY_HISTORY_PATH = 'data/weekly-history.json';
let currentWeekIndex = 0;
let allWeeksData = [];

/**
 * Fetch historical weekly data
 */
async function loadWeeklyHistory() {
    try {
        const response = await fetch(WEEKLY_HISTORY_PATH);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        // console.warn('Weekly history not found:', e);
        return [];
    }
}

/**
 * Generate a fun theme title based on stats
 */
function generateWeeklyTheme(stats) {
    const { commits, pushes, releases, newRepos } = stats;
    
    if (releases > 0) return "🚀 Ship It!";
    if (newRepos > 0) return "✨ New Beginnings";
    if (commits > 30) return "🔥 Maximum Velocity";
    if (commits > 10) return "⚡ Building Momentum";
    if (pushes > 5) return "🏗️ Work in Progress";
    return "🌱 Planting Seeds";
}

/**
 * Process events into a structured week object
 */
function processEventsForWeek(events, startDate, endDate) {
    const weeklyEvents = events.filter(e => {
        const created = new Date(e.created_at);
        return !Number.isNaN(created.getTime()) && created >= startDate && created <= endDate;
    });

    if (weeklyEvents.length === 0) return null;

    const repoActivity = new Map();
    let totalCommits = 0;
    let totalPushes = 0;
    let totalReleases = 0;
    let newReposCount = 0;
    
    const commitMessages = [];
    const shippedItems = [];
    
    for (const e of weeklyEvents) {
        const repoFull = e.repo?.name || '';
        const repoKey = repoFull.split('/')[1] || repoFull;
        
        if (e.type === 'PushEvent') {
            totalPushes++;
            const distinct = e.payload?.distinct_size || 0;
            totalCommits += distinct;
            
            if (e.payload?.commits) {
                e.payload.commits.forEach(c => {
                    const msg = c.message.split('\\n')[0];
                    commitMessages.push(msg);
                });
            }
        } else if (e.type === 'ReleaseEvent') {
            totalReleases++;
            const tag = e.payload?.release?.tag_name || 'release';
            shippedItems.push(`Released ${repoKey} ${tag}`);
        } else if (e.type === 'CreateEvent' && e.payload?.ref_type === 'repository') {
            newReposCount++;
            shippedItems.push(`Created ${repoKey}`);
        }
    }

    // Pick top highlights
    const highlights = commitMessages
        .filter(m => m.length > 10 && !m.startsWith('Merge'))
        .slice(0, 4); // Top 4 commits

    const stats = { commits: totalCommits, pushes: totalPushes, releases: totalReleases, newRepos: newReposCount };
    const theme = generateWeeklyTheme(stats);

    return {
        dateRange: `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`,
        title: theme,
        highlights: highlights,
        shipped: shippedItems,
        engineering: [`${totalCommits} commits across ${weeklyEvents.length} events`],
        metrics: [`Commits: ${totalCommits}`, `Pushes: ${totalPushes}`],
        isLive: true
    };
}

/**
 * Render a specific week's card
 */
function renderWeeklySlide(index) {
    const container = document.getElementById('weekly-content');
    const titleEl = document.getElementById('weekly-title');
    const dateEl = document.getElementById('weekly-date-range');
    const prevBtn = document.getElementById('prev-week-btn');
    const nextBtn = document.getElementById('next-week-btn');

    if (!container || !allWeeksData[index]) return;

    const week = allWeeksData[index];
    
    // Update Header
    if (titleEl) titleEl.textContent = week.title || 'Weekly Update';
    if (dateEl) dateEl.textContent = week.dateRange;
    
    // Update content with animation
    container.innerHTML = `
        <div class="weekly-stats-row">
            ${week.metrics && week.metrics.length > 0 ? week.metrics.slice(0, 3).map(m => `
                <div class="fun-stat">
                    <span>📊</span> <strong>${m.replace ? m.replace(/^\\* /, '') : m}</strong>
                </div>
            `).join('') : ''}
            ${week.isLive ? `<div class="fun-stat" style="border-color: #22c55e;"><span>🔴</span> <strong style="color: #22c55e;">Live Data</strong></div>` : ''}
        </div>

        <div class="weekly-sections-grid">
            ${week.highlights && week.highlights.length > 0 ? `
                <div class="weekly-section">
                    <div class="weekly-section-title">Highlights</div>
                    <ul class="highlight-list">
                        ${week.highlights.slice(0, 5).map(h => `<li class="highlight-item"><span class="highlight-icon">✨</span> <span>${h.replace ? h.replace(/^\\* /, '') : h}</span></li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${week.shipped && week.shipped.length > 0 ? `
                <div class="weekly-section">
                    <div class="weekly-section-title">Shipped</div>
                    <ul class="highlight-list">
                        ${week.shipped.slice(0, 5).map(h => `<li class="highlight-item"><span class="highlight-icon">🚀</span> <span>${h.replace ? h.replace(/^\\* /, '') : h}</span></li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${week.engineering && week.engineering.length > 0 ? `
                <div class="weekly-section">
                    <div class="weekly-section-title">Engineering</div>
                    <ul class="highlight-list">
                        ${week.engineering.slice(0, 3).map(h => `<li class="highlight-item"><span class="highlight-icon">🛠️</span> <span>${h.replace ? h.replace(/^\\* /, '') : h}</span></li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;

    // Update buttons
    if (prevBtn) prevBtn.disabled = index === allWeeksData.length - 1;
    if (nextBtn) nextBtn.disabled = index === 0;
}

/**
 * Initialize Weekly Highlights
 */
async function renderWeeklyHighlights() {
    const container = document.getElementById('weekly-content');
    if (!container) return;

    try {
        // Load data
        const [history, eventsRes] = await Promise.all([
            loadWeeklyHistory(),
            fetch(CACHED_EVENTS_PATH).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);

        // Generate current week from live data
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days window for "current"
        const currentWeek = processEventsForWeek(eventsRes, weekAgo, now);
        
        // Combine: [Current, ...History]
        allWeeksData = [];
        if (currentWeek) allWeeksData.push(currentWeek);
        
        // History is ordered Oldest -> Newest in JSON based on parser?
        // Let's assume parsed JSON is array of weeks.
        // We want to prepend them in reverse order if they are chronological in file.
        // My parser: creates list top-down. WeeklyLog.txt is chronological?
        // No, Markdown logs are usually newest first or oldest first.
        // WeeklyLog.txt says "Week of Aug 31 - Sep 6" first.
        // So index 0 is oldest. We want newest first.
        if (history && Array.isArray(history)) {
            allWeeksData.push(...history.reverse());
        }

        if (allWeeksData.length === 0) {
            container.innerHTML = '<div class="weekly-empty">No updates available.</div>';
            return;
        }

        // Render first slide (newest)
        currentWeekIndex = 0;
        renderWeeklySlide(currentWeekIndex);

        // Attach listeners
        const prevBtn = document.getElementById('prev-week-btn');
        const nextBtn = document.getElementById('next-week-btn');

        if (prevBtn) {
            prevBtn.onclick = () => {
                if (currentWeekIndex < allWeeksData.length - 1) {
                    currentWeekIndex++;
                    const content = document.getElementById('weekly-content');
                    content.classList.remove('slide-left', 'slide-right');
                    void content.offsetWidth; // Trigger reflow
                    content.classList.add('slide-left');
                    renderWeeklySlide(currentWeekIndex);
                }
            };
        }

        if (nextBtn) {
            nextBtn.onclick = () => {
                if (currentWeekIndex > 0) {
                    currentWeekIndex--;
                    const content = document.getElementById('weekly-content');
                    content.classList.remove('slide-left', 'slide-right');
                    void content.offsetWidth; // Trigger reflow
                    content.classList.add('slide-right');
                    renderWeeklySlide(currentWeekIndex);
                }
            };
        }

    } catch (e) {
        console.error('Failed to init weekly highlights:', e);
        container.innerHTML = '<div class="weekly-empty">Unable to load updates.</div>';
    }
}
"""

with open('github-projects.js', 'r') as f:
    content = f.read()

start_marker = "// WEEKLY HIGHLIGHTS"
end_marker = "// LIVE ACTIVITY FEED"

# Create regex to match the block between markers
# We match everything from start marker line up to (but not including) end marker line
pattern = re.compile(r'(// =+ \n// ' + re.escape(start_marker) + r'.*?)(?=\n// =+ \n// LIVE ACTIVITY FEED)', re.DOTALL)

if pattern.search(content):
    new_content = pattern.sub("// ============================================\n// WEEKLY HIGHLIGHTS\n// ============================================\n" + new_js_logic, content)
    with open('github-projects.js', 'w') as f:
        f.write(new_content)
    print("JS updated successfully")
else:
    print("Could not find JS block to replace")

