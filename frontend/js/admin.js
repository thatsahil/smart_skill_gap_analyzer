// frontend/js/admin.js — Master Admin Panel Logic

const API = 'http://127.0.0.1:5000';
let adminId = null;

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const tc = document.getElementById('admin-toast-container');
    const c = {
        success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#34d399', icon: '✅' },
        error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#fca5a5', icon: '⚠️' },
        info:    { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', text: '#a5b4fc', icon: 'ℹ️' },
    }[type] || {};
    const t = document.createElement('div');
    t.style.cssText = `display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:10px;min-width:260px;max-width:380px;
        background:${c.bg};border:1px solid ${c.border};color:${c.text};font-family:'Inter',sans-serif;font-size:0.9rem;font-weight:500;
        backdrop-filter:blur(12px);pointer-events:all;box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:slideInToast 0.3s ease;`;
    t.innerHTML = `<span>${c.icon}</span><span style="flex:1">${msg}</span><button onclick="this.closest('div').remove()" style="background:none;border:none;color:${c.text};cursor:pointer;font-size:1rem;">✕</button>`;
    tc.appendChild(t);
    setTimeout(() => t.remove(), 4500);
}

// ── Confirm Modal ─────────────────────────────────────────────────────────
function showConfirm(msg, onConfirm) {
    const overlay = document.getElementById('admin-confirm-overlay');
    document.getElementById('admin-confirm-msg').textContent = msg;
    overlay.classList.add('show');
    const ok     = document.getElementById('admin-confirm-ok');
    const cancel = document.getElementById('admin-confirm-cancel');
    const close  = () => { overlay.classList.remove('show'); ok.onclick = null; cancel.onclick = null; };
    cancel.onclick = close;
    ok.onclick = () => { close(); onConfirm(); };
}

// ── Escape ────────────────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Panel Navigation ──────────────────────────────────────────────────────
const panelTitles = {
    'panel-overview': ['Overview', 'Platform-wide statistics'],
    'panel-users':    ['Users',    'Manage all user accounts'],
    'panel-jobs':     ['Jobs',     'Manage all job postings'],
    'panel-apps':     ['Applications', 'All candidate applications'],
};

function switchPanel(panelId) {
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));

    document.getElementById(panelId)?.classList.add('active');
    document.querySelector(`[data-panel="${panelId}"]`)?.classList.add('active');

    const [title, sub] = panelTitles[panelId] || ['', ''];
    document.getElementById('panel-title').textContent = title;
    document.getElementById('panel-subtitle').textContent = sub;

    // Lazy-load data on first open
    if (panelId === 'panel-users') loadUsers();
    if (panelId === 'panel-jobs')  loadJobs();
    if (panelId === 'panel-apps')  loadApps();
}

// ── Stats ─────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const r = await fetch(`${API}/api/admin/stats?admin_id=${adminId}`);
        const d = await r.json();
        if (!r.ok) return;
        document.getElementById('stat-users').textContent      = d.total_users ?? '—';
        document.getElementById('stat-candidates').textContent = d.candidates ?? '—';
        document.getElementById('stat-companies').textContent  = d.companies ?? '—';
        document.getElementById('stat-jobs').textContent       = d.total_jobs ?? '—';
        document.getElementById('stat-apps').textContent       = d.total_applications ?? '—';
        document.getElementById('stat-reports').textContent    = d.total_reports ?? '—';
    } catch { /* silent */ }
}

// ── Users ─────────────────────────────────────────────────────────────────
let allUsers = [];
async function loadUsers() {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Loading…</td></tr>';
    try {
        const r = await fetch(`${API}/api/admin/users?admin_id=${adminId}`);
        allUsers = await r.json();
        renderUsers(allUsers);
    } catch {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color:#fca5a5;">Failed to load users.</td></tr>';
    }
}

function renderUsers(list) {
    const tbody = document.getElementById('users-tbody');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No users found.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(u => `
        <tr>
            <td style="font-weight:600;color:#f1f5f9;">${esc(u.name)}</td>
            <td style="color:#94a3b8;">${esc(u.email)}</td>
            <td><span class="badge badge-${u.user_type}">${u.user_type}</span></td>
            <td>${u.has_resume
                ? `<a class="btn-tbl-view" href="${API}/api/resume/download?user_id=${u._id}" target="_blank">📄 Resume</a>`
                : '<span style="color:#475569;font-size:0.78rem;">None</span>'
            }</td>
            <td>${u.user_type !== 'admin'
                ? `<button class="btn-tbl-delete" onclick="deleteUser('${u._id}', '${esc(u.name)}')">Delete</button>`
                : '<span style="color:#475569;font-size:0.78rem;">—</span>'
            }</td>
        </tr>
    `).join('');
}

async function deleteUser(userId, name) {
    showConfirm(`Delete user "${name}"? This will also remove their jobs/resume.`, async () => {
        try {
            const r = await fetch(`${API}/api/admin/users/${userId}?admin_id=${adminId}`, { method: 'DELETE' });
            const d = await r.json();
            if (r.ok) {
                showToast('User deleted.', 'success');
                loadUsers();
                loadStats();
            } else {
                showToast(d.message || 'Delete failed.', 'error');
            }
        } catch { showToast('Server error.', 'error'); }
    });
}

document.getElementById('user-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderUsers(allUsers.filter(u =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ));
});

// ── Jobs ──────────────────────────────────────────────────────────────────
let allJobs = [];
async function loadJobs() {
    const tbody = document.getElementById('jobs-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Loading…</td></tr>';
    try {
        const r = await fetch(`${API}/api/admin/jobs?admin_id=${adminId}`);
        allJobs = await r.json();
        renderJobs(allJobs);
    } catch {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color:#fca5a5;">Failed to load jobs.</td></tr>';
    }
}

function renderJobs(list) {
    const tbody = document.getElementById('jobs-tbody');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No jobs found.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(j => `
        <tr>
            <td style="font-weight:600;color:#f1f5f9;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(j.title)}</td>
            <td style="color:#94a3b8;">${esc(j.company_name)}</td>
            <td style="color:#64748b;font-size:0.8rem;">${new Date(j.created_at).toLocaleDateString()}</td>
            <td><span style="color:#a78bfa;font-weight:600;">${j.applicant_count}</span></td>
            <td><button class="btn-tbl-delete" onclick="deleteJobAdmin('${j._id}', '${esc(j.title)}')">Delete</button></td>
        </tr>
    `).join('');
}

async function deleteJobAdmin(jobId, title) {
    showConfirm(`Delete job "${title}"? All applications for this job will also be removed.`, async () => {
        try {
            const r = await fetch(`${API}/api/admin/jobs/${jobId}?admin_id=${adminId}`, { method: 'DELETE' });
            const d = await r.json();
            if (r.ok) {
                showToast('Job deleted.', 'success');
                loadJobs();
                loadStats();
            } else {
                showToast(d.message || 'Delete failed.', 'error');
            }
        } catch { showToast('Server error.', 'error'); }
    });
}

document.getElementById('job-search-admin')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderJobs(allJobs.filter(j =>
        j.title.toLowerCase().includes(q) || j.company_name.toLowerCase().includes(q)
    ));
});

// ── Applications ──────────────────────────────────────────────────────────
let allApps = [];
async function loadApps() {
    const tbody = document.getElementById('apps-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Loading…</td></tr>';
    try {
        const r = await fetch(`${API}/api/admin/applications?admin_id=${adminId}`);
        allApps = await r.json();
        renderApps(allApps);
    } catch {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color:#fca5a5;">Failed to load applications.</td></tr>';
    }
}

function renderApps(list) {
    const tbody = document.getElementById('apps-tbody');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No applications found.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(a => `
        <tr>
            <td style="font-weight:600;color:#f1f5f9;">${esc(a.candidate_name || 'Unknown')}</td>
            <td style="color:#94a3b8;font-size:0.8rem;">${esc(a.candidate_email || '—')}</td>
            <td style="color:#64748b;font-size:0.78rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(a.job_id)}">${esc(a.job_id)}</td>
            <td style="color:#64748b;font-size:0.8rem;">${new Date(a.applied_at).toLocaleDateString()}</td>
            <td>${a.has_resume
                ? `<a class="btn-tbl-view" href="${API}/api/resume/download?user_id=${a.user_id}" target="_blank">📄 Resume</a>`
                : '<span style="color:#475569;font-size:0.78rem;">None</span>'
            }</td>
            <td><button class="btn-tbl-delete" onclick="deleteApp('${a._id}', '${esc(a.candidate_name)}')">Delete</button></td>
        </tr>
    `).join('');
}

async function deleteApp(appId, name) {
    showConfirm(`Remove application from "${name}"?`, async () => {
        try {
            const r = await fetch(`${API}/api/admin/applications/${appId}?admin_id=${adminId}`, { method: 'DELETE' });
            const d = await r.json();
            if (r.ok) {
                showToast('Application removed.', 'success');
                loadApps();
                loadStats();
            } else {
                showToast(d.message || 'Delete failed.', 'error');
            }
        } catch { showToast('Server error.', 'error'); }
    });
}

document.getElementById('app-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderApps(allApps.filter(a =>
        (a.candidate_name || '').toLowerCase().includes(q) ||
        (a.candidate_email || '').toLowerCase().includes(q)
    ));
});

// ── Sidebar Nav ───────────────────────────────────────────────────────────
document.querySelectorAll('[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});

// ── Logout ────────────────────────────────────────────────────────────────
document.getElementById('admin-logout-btn').addEventListener('click', () => {
    if (!confirm('Log out of admin panel?')) return;
    localStorage.clear();
    window.location.href = 'login.html';
});

// ── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    adminId = localStorage.getItem('user_id');
    const userType = localStorage.getItem('user_type');

    if (!adminId || userType !== 'admin') {
        // Not an admin — redirect
        window.location.href = 'login.html';
        return;
    }

    const username = localStorage.getItem('username') || 'Admin';
    document.getElementById('admin-username-label').textContent = `Signed in as ${username}`;

    loadStats();
});
