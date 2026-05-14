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
    document.getElementById('refresh-roadmaps-btn')?.addEventListener('click', loadSavedRoadmaps);
    document.getElementById('save-roadmap-btn')?.addEventListener('click', handleSaveRoadmap);

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

    // Load saved roadmaps
    loadSavedRoadmaps();
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
    roadmapSteps = [];

    // Load saved progress from localStorage
    loadProgressFromStorage();
    
    let loadedFromBackend = false;
    const userId = localStorage.getItem('user_id');
    
    if (roadmapSteps.length === 0 && userId) {
        try {
            const res = await fetch(`${BACKEND_URL}/api/load-progress?user_id=${userId}&skill=${currentSkill}&level=${currentLevel}`);
            const data = await res.json();
            if (data.steps && data.steps.length > 0) {
                roadmapSteps = data.steps;
                if (data.progress) progressMap = data.progress;
                loadedFromBackend = true;
                saveProgressToStorage();
            }
        } catch (e) {}
    }

    if (roadmapSteps.length > 0) {
        renderRoadmap();
        return;
    }

    showLoading(true);
    setButtonDisabled(true);

    try {
        const steps = await fetchRoadmapFromBackend(currentSkill, currentLevel);
        roadmapSteps = steps;
        saveProgressToStorage();
        if (userId) saveProgressToBackend();
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

// ── Explicit Save Roadmap button ─────────────────────
async function handleSaveRoadmap() {
    if (!roadmapSteps.length) {
        showToast('Generate a roadmap first before saving.');
        return;
    }
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        showToast('You must be logged in to save roadmaps.');
        return;
    }

    const btn = document.getElementById('save-roadmap-btn');
    const original = btn.textContent;
    btn.textContent = 'Saving…';
    btn.disabled = true;
    btn.style.opacity = '0.6';

    try {
        const res = await fetch(`${BACKEND_URL}/api/save-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id:  userId,
                skill:    currentSkill,
                level:    currentLevel,
                progress: progressMap,
                steps:    roadmapSteps
            })
        });
        if (res.ok) {
            btn.textContent = '✅ Saved!';
            btn.style.opacity = '1';
            // Refresh the saved roadmaps panel so the new one appears
            await loadSavedRoadmaps();
            // Scroll up to show the saved list
            document.getElementById('saved-roadmaps-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => {
                btn.textContent = original;
                btn.disabled = false;
            }, 2500);
        } else {
            throw new Error('Server error');
        }
    } catch (_) {
        showToast('Could not save roadmap. Make sure you are logged in and the server is running.');
        btn.textContent = original;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
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
    localStorage.setItem(storageKey(), JSON.stringify({ progressMap, roadmapSteps }));
}

function loadProgressFromStorage() {
    const saved = localStorage.getItem(storageKey());
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.progressMap) {
                progressMap = parsed.progressMap;
                roadmapSteps = parsed.roadmapSteps || [];
            } else {
                progressMap = parsed; // backwards compatibility
                roadmapSteps = [];
            }
        } catch(e) {
            progressMap = {};
            roadmapSteps = [];
        }
    } else {
        progressMap = {};
        roadmapSteps = [];
    }
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
                progress: progressMap,
                steps: roadmapSteps
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

// ── Load & Render saved roadmaps ────────────────────────
async function loadSavedRoadmaps() {
    const userId = localStorage.getItem('user_id');
    const listEl  = document.getElementById('saved-roadmaps-list');
    const emptyEl = document.getElementById('saved-roadmaps-empty');
    if (!listEl || !userId) return;

    // Show skeleton
    listEl.innerHTML = `<div style="grid-column:1/-1;color:#64748b;font-size:0.85rem;">Loading saved roadmaps…</div>`;

    try {
        const res  = await fetch(`${BACKEND_URL}/api/my-roadmaps?user_id=${userId}`);
        const list = await res.json();

        listEl.innerHTML = '';

        if (!Array.isArray(list) || list.length === 0) {
            listEl.appendChild(emptyEl);
            emptyEl.style.display = 'block';
            return;
        }

        emptyEl.style.display = 'none';

        list.forEach((rm, idx) => {
            const pct   = rm.pct || 0;
            const color = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#a78bfa';
            const circ  = 2 * Math.PI * 18;  // r=18 small ring
            const offset = circ - (pct / 100) * circ;
            const card  = document.createElement('div');
            card.style.cssText = `
                background:rgba(255,255,255,0.04);
                border:1px solid rgba(255,255,255,0.1);
                border-radius:14px;
                padding:18px 20px;
                display:flex;
                flex-direction:column;
                gap:10px;
                animation:slideInSaved 0.3s ease ${idx*60}ms both;
            `;
            card.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;">
                    <svg width="44" height="44" viewBox="0 0 44 44" style="flex-shrink:0;">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
                        <circle cx="22" cy="22" r="18" fill="none" stroke="${color}" stroke-width="3"
                            stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
                            transform="rotate(-90 22 22)" style="transition:stroke-dashoffset 0.8s ease;"/>
                        <text x="22" y="27" text-anchor="middle" font-size="9" fill="${color}" font-family="Inter,sans-serif" font-weight="700">${pct}%</text>
                    </svg>
                    <div style="flex:1;min-width:0;">
                        <p style="color:#f1f5f9;font-weight:700;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(capitalize(rm.skill))}</p>
                        <p style="color:#94a3b8;font-size:0.78rem;margin-top:2px;text-transform:capitalize;">${escapeHtml(rm.level)} level &middot; ${rm.done}/${rm.total} steps</p>
                    </div>
                </div>
                <button class="resume-roadmap-btn" style="
                    width:100%;padding:8px 0;border-radius:9px;
                    background:linear-gradient(135deg,rgba(124,106,247,0.2),rgba(99,102,241,0.15));
                    border:1px solid rgba(124,106,247,0.35);color:#a78bfa;
                    font-family:Inter,sans-serif;font-size:0.85rem;font-weight:600;
                    cursor:pointer;transition:background 0.15s;
                ">▶ Resume Roadmap</button>
            `;

            const resumeBtn = card.querySelector('.resume-roadmap-btn');
            resumeBtn.addEventListener('click', () => {
                // Pre-fill form inputs
                const skillInput  = document.getElementById('skill-input');
                const levelSelect = document.getElementById('level-select');
                if (skillInput)  skillInput.value  = rm.skill;
                if (levelSelect) levelSelect.value = rm.level;

                // Load the stored roadmap directly
                currentSkill  = rm.skill;
                currentLevel  = rm.level;
                roadmapSteps  = rm.steps;
                progressMap   = rm.progress || {};
                renderRoadmap();
            });

            listEl.appendChild(card);
        });

        // Inject keyframes if not present
        if (!document.getElementById('saved-slide-kf')) {
            const s = document.createElement('style');
            s.id = 'saved-slide-kf';
            s.textContent = `@keyframes slideInSaved { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:none; } }`;
            document.head.appendChild(s);
        }

    } catch (err) {
        listEl.innerHTML = `<p style="color:#fca5a5;font-size:0.85rem;grid-column:1/-1;">Could not load saved roadmaps.</p>`;
    }
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

