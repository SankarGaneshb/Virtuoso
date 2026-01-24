document.addEventListener('DOMContentLoaded', () => {
    fetchContributorData('1'); // Use ID 1 for test user
});

async function fetchContributorData(id) {
    try {
        const response = await fetch(`/api/contributor/${id}`);
        const data = await response.json();
        renderProfile(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('user-info').innerHTML = '<p class="error">Failed to load profile.</p>';
    }
}

// Pagination State
let allContributions = [];
let currentPage = 1;
const itemsPerPage = 10;

function renderProfile(data) {
    const userInfo = document.getElementById('user-info');
    userInfo.innerHTML = `
        <div class="profile-header">
            <h3>${data.name}</h3>
            <p>ID: ${data.id}</p>
        </div>
    `;

    // Render Badges
    renderNextBadgeProgress(data.badges, data.contributions.length); // Add Progress Bar

    const badgesGrid = document.getElementById('badges-grid');
    if (data.badges && data.badges.length > 0) {
        badgesGrid.innerHTML = data.badges.map(badge => `
            <div class="badge-item">
                <div class="badge-icon">🏆</div> <!-- Placeholder icon -->
                <div class="badge-name">${badge.name}</div>
            </div>
        `).join('');
    } else {
        badgesGrid.innerHTML = '<p class="empty-state">No badges earned yet.</p>';
    }

    // Setup Journey Pagination
    allContributions = data.contributions || [];
    currentPage = 1;
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = ''; // Clear existing

    if (allContributions.length > 0) {
        renderTimelineNextPage(); // Render first page
        setupPaginationControl();
        renderAnalytics(allContributions);
    } else {
        timeline.innerHTML = '<p class="empty-state">No contributions recorded yet.</p>';
    }
}

function renderAnalytics(contributions) {
    // 1. Calculate Stats
    const total = contributions.length;
    const prs = contributions.filter(c => c.type === 'pull_request').length;
    const issues = contributions.filter(c => c.type === 'issue').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-prs').textContent = prs;
    document.getElementById('stat-issues').textContent = issues;

    // Real Streak Calculation
    const streak = calculateStreak(contributions);
    document.getElementById('stat-streak').textContent = `${streak} 🔥`;

    // 2. Prepare Chart Data (Daily Activity)
    const days = {};
    const today = new Date();
    // Initialize last 14 days with 0
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days[dateStr] = { pr: 0, issue: 0, other: 0 };
    }

    contributions.forEach(c => {
        if (days[c.date]) {
            if (c.type === 'pull_request') days[c.date].pr++;
            else if (c.type === 'issue') days[c.date].issue++;
            else days[c.date].other++;
        }
    });

    const labels = Object.keys(days);
    const prData = labels.map(d => days[d].pr);
    const issueData = labels.map(d => days[d].issue);
    const otherData = labels.map(d => days[d].other);

    const ctx = document.getElementById('dailyActivityChart').getContext('2d');

    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => l.slice(5)), // Show MM-DD
            datasets: [
                {
                    label: 'Pull Requests',
                    data: prData,
                    backgroundColor: '#8b5cf6', // Violet
                    borderRadius: 4
                },
                {
                    label: 'Issues',
                    data: issueData,
                    backgroundColor: '#ec4899', // Pink
                    borderRadius: 4
                },
                {
                    label: 'Others',
                    data: otherData,
                    backgroundColor: '#10b981', // Emerald
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false, color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { stacked: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            },
            plugins: {
                legend: { labels: { color: '#cbd5e1' } }
            }
        }
    });
}

function calculateStreak(contributions) {
    if (!contributions || contributions.length === 0) return 0;

    // Get unique dates
    const uniqueDates = [...new Set(contributions.map(c => c.date))].sort((a, b) => new Date(b) - new Date(a));

    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Check if the most recent contribution was today or yesterday to keep streak alive
    const lastContribDate = new Date(uniqueDates[0]);
    const diffTime = Math.abs(today - lastContribDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If last contribution was more than 1 day ago (yesterday), streak is broken (0), unless we want to show "longest streak"
    // For "Current Streak", if they haven't contributed today or yesterday, it's 0.
    // Actually, let's be lenient: if they contributed today, streak counts today. If yesterday, it counts.

    let currentDate = new Date(uniqueDates[0]);

    // Iterate backwards
    for (let i = 0; i < uniqueDates.length; i++) {
        const d = new Date(uniqueDates[i]);
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1); // Expected previous day

        // Handling the first item (start of check)
        if (i === 0) {
            streak = 1;
            continue;
        }

        // Check if d is exactly 1 day before currentDate
        if (d.toISOString().split('T')[0] === prevDate.toISOString().split('T')[0]) {
            streak++;
            currentDate = d;
        } else {
            break; // Gap found
        }
    }

    return streak;
}

function renderNextBadgeProgress(currentBadges, totalCount) {
    // defined tiers from engine.js (replicated here or passed from API)
    // Ideally API sends "nextBadge" info. For now, let's hardcode the tiers for UI.
    const tiers = [
        { name: 'Copper', threshold: 1 },
        { name: 'Bronze', threshold: 10 },
        { name: 'Silver', threshold: 50 },
        { name: 'Gold', threshold: 100 },
        { name: 'Platinum', threshold: 250 },
        { name: 'Diamond', threshold: 500 },
        { name: 'Rhodium', threshold: 1000 }
    ];

    const nextTier = tiers.find(t => t.threshold > totalCount);

    const container = document.getElementById('user-info');
    if (!nextTier) {
        // Max level reached
        const p = document.createElement('div');
        p.innerHTML = `<div class="progress-label">🎉 Maximum Virtuoso Level Reached!</div>`;
        container.appendChild(p);
        return;
    }

    const prevThreshold = tiers[tiers.indexOf(nextTier) - 1]?.threshold || 0;
    const progress = Math.min(100, Math.max(0, ((totalCount - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100));

    const progressHTML = `
        <div class="xp-container">
            <div class="progress-label">
                <span>Next: <strong>${nextTier.name} Virtuoso</strong></span>
                <span>${totalCount} / ${nextTier.threshold} XP</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', progressHTML);
}

function renderTimelineNextPage() {
    const timeline = document.getElementById('timeline');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const items = allContributions.slice(start, end);

    const html = items.map(item => `
        <li class="timeline-item">
            <span class="date">${item.date}</span>
            <span class="activity">${item.description}</span>
        </li>
    `).join('');

    timeline.insertAdjacentHTML('beforeend', html);
    updateLoadMoreVisibility();
}

function setupPaginationControl() {
    // Check if button exists, if not create it
    let loadMoreBtn = document.getElementById('load-more-btn');
    if (!loadMoreBtn) {
        const journeySection = document.getElementById('journey-section');
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.onclick = () => {
            currentPage++;
            renderTimelineNextPage();
        };
        journeySection.appendChild(loadMoreBtn);
    }
    updateLoadMoreVisibility();
}

function updateLoadMoreVisibility() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        const totalShown = currentPage * itemsPerPage;
        if (totalShown >= allContributions.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.textContent = `Load More (${allContributions.length - totalShown} remaining)`;
        }
    }
}
