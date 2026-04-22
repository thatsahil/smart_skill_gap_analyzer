// =============================================
//  Skill Gap Reports — Interactive Roadmap JS
// =============================================

const BACKEND_URL = 'http://127.0.0.1:5000';

let currentSkill = '';
let currentLevel = '';
let roadmapSteps = [];   // [{title, description, resources:[{label,url}]}]
let progressMap = {};    // { "Step Title": "todo"|"progress"|"done" }

// ── State cycle when user clicks a node ─────────────────
const STATE_CYCLE = ['todo', 'progress', 'done'];
const STATE_LABELS = { todo: 'Not Started', progress: 'In Progress', done: 'Completed' };

// ── Boot ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('skill-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('reset-btn').addEventListener('click', handleReset);
    document.getElementById('toast-close').addEventListener('click', hideToast);

    // Active nav highlighting
    const current = window.location.pathname.split('/').pop() || '';
    document.querySelectorAll('.nav-links a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href !== '#' && current.includes(href.replace('.html', ''))) {
            a.style.color = 'var(--accent-light, #a78bfa)';
            a.style.fontWeight = '700';
        }
    });

    // Pre-fill skill from analyze page (when user clicks a skill card there)
    const prefill = sessionStorage.getItem('roadmap_prefill');
    if (prefill) {
        const skillInput = document.getElementById('skill-input');
        if (skillInput) skillInput.value = prefill;
        sessionStorage.removeItem('roadmap_prefill');
    }
});

// ── Form submission ──────────────────────────────────────
async function handleFormSubmit(e) {
    e.preventDefault();

    const skillInput = document.getElementById('skill-input').value.trim();
    const levelSelect = document.getElementById('level-select').value;

    if (!skillInput || !levelSelect) return;

    currentSkill = skillInput;
    currentLevel = levelSelect;
    progressMap = {};

    // Load saved progress from localStorage
    loadProgressFromStorage();

    showLoading(true);
    setButtonDisabled(true);

    try {
        const steps = await fetchRoadmapFromBackend(currentSkill, currentLevel);
        roadmapSteps = steps;
        renderRoadmap();
    } catch (err) {
        showToast(err.message || 'Failed to generate roadmap. Is the backend running?');
    } finally {
        showLoading(false);
        setButtonDisabled(false);
    }
}

// ── Call backend proxy ────────────────────────────────────
async function fetchRoadmapFromBackend(skill, level) {
    const response = await fetch(`${BACKEND_URL}/api/generate-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, level })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.error || `Server error ${response.status}`);
    }

    if (!Array.isArray(data.steps) || data.steps.length === 0) {
        throw new Error('Gemini returned an empty roadmap. Try a different skill.');
    }

    return data.steps;
}

// ── Render the roadmap ───────────────────────────────────
function renderRoadmap() {
    const section = document.getElementById('roadmap-section');
    const nodesContainer = document.getElementById('roadmap-nodes');

    // Update titles
    const skillLabel = capitalize(currentSkill);
    const levelLabel = capitalize(currentLevel);
    document.getElementById('roadmap-title').textContent = `${skillLabel} Roadmap`;
    document.getElementById('roadmap-subtitle').textContent =
        `${levelLabel} level · ${roadmapSteps.length} steps · Click any step to update your progress`;

    // Clear and build nodes
    nodesContainer.innerHTML = '';

    roadmapSteps.forEach((step, index) => {
        const state = progressMap[step.title] || 'todo';
        const nodeEl = buildNode(step, index, state);
        nodesContainer.appendChild(nodeEl);
    });

    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    updateProgressUI();
}

// ── Build a single node element ──────────────────────────
function buildNode(step, index, state) {
    const node = document.createElement('div');
    node.className = `roadmap-node state-${state}`;
    node.id = `node-${index}`;
    node.style.animationDelay = `${index * 60}ms`;

    // Resources HTML
    const resourcesHTML = (step.resources || []).map(r =>
        `<a class="resource-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.label)}</a>`
    ).join('');

    node.innerHTML = `
        <div class="node-bubble" title="Click to update progress">${index + 1}</div>
        <div class="node-card">
            <div class="node-card-top">
                <span class="node-title">${escapeHtml(step.title)}</span>
                <span class="node-status-badge">${STATE_LABELS[state]}</span>
            </div>
            <p class="node-description">${escapeHtml(step.description)}</p>
            ${resourcesHTML ? `<div class="node-resources">${resourcesHTML}</div>` : ''}
            <span class="node-click-hint">Click to cycle: Not Started → In Progress → Completed</span>
        </div>
    `;

    // Click on bubble OR card toggles state (but not clicking resource links)
    node.querySelector('.node-bubble').addEventListener('click', () => cycleState(index));
    node.querySelector('.node-card').addEventListener('click', (e) => {
        if (!e.target.closest('.resource-link')) cycleState(index);
    });

    return node;
}

// ── Cycle state of a node ─────────────────────────────────
function cycleState(index) {
    const step = roadmapSteps[index];
    const currentState = progressMap[step.title] || 'todo';
    const nextStateIndex = (STATE_CYCLE.indexOf(currentState) + 1) % STATE_CYCLE.length;
    const nextState = STATE_CYCLE[nextStateIndex];

    progressMap[step.title] = nextState;

    // Update node DOM
    const node = document.getElementById(`node-${index}`);
    node.className = `roadmap-node state-${nextState}`;
    node.querySelector('.node-status-badge').textContent = STATE_LABELS[nextState];

    updateProgressUI();
    saveProgressToStorage();
    if (localStorage.getItem('user_id')) saveProgressToBackend();
}

// ── Update the progress ring & text ──────────────────────
function updateProgressUI() {
    const total = roadmapSteps.length;
    const done = roadmapSteps.filter(s => progressMap[s.title] === 'done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    document.getElementById('progress-text').textContent = `${done} of ${total} completed`;
    document.getElementById('progress-ring-label').textContent = `${pct}%`;

    // SVG ring: circumference = 2π × 26 ≈ 163.36
    const circumference = 163.36;
    const offset = circumference - (pct / 100) * circumference;
    document.getElementById('progress-ring-fill').style.strokeDashoffset = offset;
}

// ── Reset all progress ────────────────────────────────────
function handleReset() {
    if (!roadmapSteps.length) return;
    progressMap = {};
    renderRoadmap();
    saveProgressToStorage();
    if (localStorage.getItem('user_id')) saveProgressToBackend();
}

// ── localStorage persistence ─────────────────────────────
function storageKey() {
    return `roadmap_${currentSkill.toLowerCase()}_${currentLevel}`;
}

function saveProgressToStorage() {
    localStorage.setItem(storageKey(), JSON.stringify(progressMap));
}

function loadProgressFromStorage() {
    const saved = localStorage.getItem(storageKey());
    progressMap = saved ? JSON.parse(saved) : {};
}

// ── Backend progress persistence (optional, when logged in) ─
async function saveProgressToBackend() {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    try {
        await fetch(`${BACKEND_URL}/api/save-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                skill: currentSkill,
                level: currentLevel,
                progress: progressMap
            })
        });
    } catch (_) { /* silent — localStorage already saved */ }
}

// ── UI helpers ───────────────────────────────────────────
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
        animateLoadingTips();
    } else {
        overlay.classList.add('hidden');
    }
}

const LOADING_TIPS = [
    'Gemini AI is designing your personalized learning path…',
    'Sourcing the best resources for your level…',
    'Structuring a clear, step-by-step curriculum…',
    'Almost ready — tailoring the roadmap to you…'
];
let tipInterval;

function animateLoadingTips() {
    let i = 0;
    const el = document.getElementById('loading-tip');
    clearInterval(tipInterval);
    tipInterval = setInterval(() => {
        i = (i + 1) % LOADING_TIPS.length;
        el.style.opacity = 0;
        setTimeout(() => {
            el.textContent = LOADING_TIPS[i];
            el.style.opacity = 1;
        }, 300);
    }, 2500);
}

function setButtonDisabled(disabled) {
    const btn = document.getElementById('generate-btn');
    btn.disabled = disabled;
    btn.querySelector('.btn-text').textContent = disabled
        ? 'Generating…'
        : 'Generate My Roadmap';
}

function showToast(message) {
    document.getElementById('error-message').textContent = message;
    const toast = document.getElementById('error-toast');
    toast.classList.remove('hidden');
    setTimeout(hideToast, 8000);
}

function hideToast() {
    document.getElementById('error-toast').classList.add('hidden');
}

function handleLogout(e) {
    if (e) e.preventDefault();
    if(!confirm('Are you sure you want to log out?')) return;
    localStorage.removeItem('user_id');
    window.location.href = 'index.html';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

