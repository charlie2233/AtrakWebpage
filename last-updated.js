(() => {
    const BADGE_ID = 'repo-last-updated-badge';
    const STYLE_ID = 'repo-last-updated-style';
    const CACHE_KEY = 'atrak-last-updated-v1';
    const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
    const API_URL = 'https://api.github.com/repos/charlie2233/LunarWeb/commits/main';

    if (document.getElementById(BADGE_ID)) return;

    const currentScript = document.currentScript;
    const fallbackMetaUrl = currentScript && currentScript.src
        ? new URL('data/github-meta.json', currentScript.src).toString()
        : 'data/github-meta.json';

    const badge = document.createElement('div');
    badge.id = BADGE_ID;
    badge.className = 'repo-last-updated-badge';
    badge.textContent = 'Last updated loading...';
    document.body.appendChild(badge);

    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .repo-last-updated-badge {
                position: fixed;
                left: 16px;
                bottom: 16px;
                z-index: 1200;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 14px;
                border-radius: 999px;
                border: 1px solid rgba(255, 255, 255, 0.16);
                background: rgba(7, 10, 18, 0.82);
                color: rgba(244, 247, 250, 0.92);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                box-shadow: 0 14px 40px rgba(0, 0, 0, 0.32);
                font-size: 12px;
                line-height: 1.25;
                letter-spacing: 0.02em;
                pointer-events: none;
                max-width: min(280px, calc(100vw - 32px));
            }

            .repo-last-updated-badge::before {
                content: '';
                width: 8px;
                height: 8px;
                border-radius: 999px;
                background: linear-gradient(135deg, #79e5d2, #8fa9ff);
                box-shadow: 0 0 0 4px rgba(121, 229, 210, 0.14);
                flex-shrink: 0;
            }

            @media (max-width: 720px) {
                .repo-last-updated-badge {
                    left: 12px;
                    right: 12px;
                    bottom: 12px;
                    max-width: none;
                    justify-content: center;
                    text-align: center;
                    font-size: 11px;
                    padding: 9px 12px;
                }
            }

            @media print {
                .repo-last-updated-badge {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function formatAbsolute(date) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    }

    function formatRelative(date) {
        const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
        const units = [
            ['year', 31536000],
            ['month', 2592000],
            ['day', 86400],
            ['hour', 3600],
            ['minute', 60],
        ];

        for (const [name, size] of units) {
            if (seconds >= size) {
                const value = Math.floor(seconds / size);
                return `${value} ${name}${value === 1 ? '' : 's'} ago`;
            }
        }

        return 'just now';
    }

    function setBadge(dateValue, sourceLabel, exactTitle) {
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) {
            badge.textContent = 'Last updated unavailable';
            badge.title = 'Update timestamp unavailable';
            return;
        }

        badge.textContent = `Last updated ${formatAbsolute(parsed)} (${formatRelative(parsed)})`;
        badge.title = `${exactTitle || parsed.toISOString()} • ${sourceLabel}`;
    }

    function readCache() {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const cached = JSON.parse(raw);
            if (!cached || !cached.date || !cached.savedAt) return null;
            if ((Date.now() - cached.savedAt) > CACHE_MAX_AGE_MS) return null;
            return cached;
        } catch (_) {
            return null;
        }
    }

    function writeCache(payload) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
        } catch (_) {
            // Ignore storage failures.
        }
    }

    async function loadFromGitHub() {
        const response = await fetch(API_URL, {
            headers: {
                'Accept': 'application/vnd.github+json'
            }
        });
        if (!response.ok) throw new Error(`GitHub API ${response.status}`);
        const data = await response.json();
        const date = data && data.commit && data.commit.committer && data.commit.committer.date;
        const sha = data && typeof data.sha === 'string' ? data.sha.slice(0, 7) : null;
        if (!date) throw new Error('Missing commit date');
        const payload = {
            date,
            source: 'GitHub main branch',
            title: sha ? `${date} • commit ${sha}` : date,
        };
        writeCache(payload);
        return payload;
    }

    async function loadFromFallbackMeta() {
        const response = await fetch(fallbackMetaUrl);
        if (!response.ok) throw new Error(`Fallback meta ${response.status}`);
        const data = await response.json();
        const date = data && (data.updatedAt || data.mostRecentPush);
        if (!date) throw new Error('Missing fallback date');
        return {
            date,
            source: 'Local cached metadata',
            title: data.updatedAt || data.mostRecentPush,
        };
    }

    async function init() {
        const cached = readCache();
        if (cached) {
            setBadge(cached.date, cached.source, cached.title);
        }

        try {
            const fresh = await loadFromGitHub();
            setBadge(fresh.date, fresh.source, fresh.title);
            return;
        } catch (_) {
            // Fall through to local metadata.
        }

        try {
            const fallback = await loadFromFallbackMeta();
            setBadge(fallback.date, fallback.source, fallback.title);
        } catch (_) {
            if (!cached) {
                badge.textContent = 'Last updated unavailable';
                badge.title = 'Could not load update metadata';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
