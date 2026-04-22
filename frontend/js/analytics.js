document.addEventListener('DOMContentLoaded', () => {
    // 1. Ensure user is logged in
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    // Set active nav link highlighting (fallback just in case)
    const activeLink = document.querySelector('nav .nav-links a[href="analytics.html"]');
    if (activeLink) {
        activeLink.style.color = 'var(--accent-light, #a78bfa)';
        activeLink.style.fontWeight = '600';
    }

    // Logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(!confirm('Are you sure you want to log out?')) return;
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // 2. Fetch Data
    fetchAnalyticsData(userId);
});

async function fetchAnalyticsData(userId) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/reports?user_id=${userId}`);
        const data = await response.json();

        const loader = document.getElementById('analytics-loader');
        const emptyState = document.getElementById('analytics-empty');
        const dashboard = document.getElementById('analytics-dashboard');

        loader.classList.add('hidden');

        if (!response.ok || !data.reports || data.reports.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        dashboard.classList.remove('hidden');
        processAndRender(data.reports);

    } catch (error) {
        console.error('Error fetching analytics:', error);
        document.getElementById('analytics-loader').innerHTML = '<p style="color:var(--text-3)">Failed to load data. Please try again.</p>';
    }
}

function processAndRender(reports) {
    // Sort reports chronologically
    reports.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Calculate top-level stats
    const totalReports = reports.length;
    let totalScore = 0;
    const skillCounts = {};

    const trendLabels = [];
    const trendData = [];

    reports.forEach((rep, index) => {
        // Safe parsing for match score (which might be "85%" string or 85 int)
        let score = 0;
        if (typeof rep.match_score === 'string') {
            score = parseInt(rep.match_score.replace(/\D/g, ''), 10);
        } else if (typeof rep.match_score === 'number') {
            score = rep.match_score;
        }
        if (isNaN(score)) score = 0;
        
        totalScore += score;
        
        // Date formatting for chart X axis
        const date = new Date(rep.created_at);
        trendLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        trendData.push(score);

        // Count missing skills
        if (rep.analysis && rep.analysis.missing_skills) {
            rep.analysis.missing_skills.forEach(skillObj => {
                const skillName = skillObj.skill;
                if (skillCounts[skillName]) {
                    skillCounts[skillName]++;
                } else {
                    skillCounts[skillName] = 1;
                }
            });
        }
    });

    const avgScore = Math.round(totalScore / totalReports);
    const uniqueSkills = Object.keys(skillCounts).length;

    // Update DOM Stats
    document.getElementById('stat-total-reports').textContent = totalReports;
    document.getElementById('stat-avg-score').textContent = `${avgScore}%`;
    document.getElementById('stat-unique-gaps').textContent = uniqueSkills;

    // ----- Render Trend Chart -----
    renderTrendChart(trendLabels, trendData);

    // ----- Render Top Skills Chart -----
    renderSkillsChart(skillCounts);
}

// Chart.js Default Config adjustments for dark mode
Chart.defaults.color = '#a1a1aa'; // var(--text-2)
Chart.defaults.font.family = 'Inter, sans-serif';

function renderTrendChart(labels, data) {
    const ctx = document.getElementById('trend-chart').getContext('2d');
    
    // Create gradient
    let gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(124, 106, 247, 0.4)'); // accent with opacity
    gradient.addColorStop(1, 'rgba(124, 106, 247, 0.0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Match Score %',
                data: data,
                borderColor: '#7c6af7', // var(--accent)
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#09090b', // var(--bg-base)
                pointBorderColor: '#7c6af7',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111113', // var(--bg-surface)
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) { return `Score: ${context.parsed.y}%`; }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { callback: function(value) { return value + '%' } }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderSkillsChart(skillCountsMap) {
    // Convert object to array, sort by count descending, take top 7
    const sortedSkills = Object.keys(skillCountsMap)
        .map(key => ({ skill: key, count: skillCountsMap[key] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7);

    // Prepare arrays for Chart.js
    const labels = sortedSkills.map(item => {
        // truncate long skill names
        return item.skill.length > 20 ? item.skill.substring(0, 20) + '...' : item.skill;
    });
    const data = sortedSkills.map(item => item.count);

    const ctx = document.getElementById('skills-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Times Missing',
                data: data,
                backgroundColor: 'rgba(124, 106, 247, 0.8)', // accent
                hoverBackgroundColor: '#a78bfa', // accent-light
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            indexAxis: 'y', // Makes it a horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111113',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { precision: 0 } // whole integers only
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

