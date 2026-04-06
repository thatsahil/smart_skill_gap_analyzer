// =============================================
//  My Reports Page — JS
// =============================================

const BACKEND_REPORTS = 'http://127.0.0.1:5000';
const _uid = localStorage.getItem('user_id');

document.addEventListener('DOMContentLoaded', () => {
    if (!_uid) { window.location.href = 'login.html'; return; }

    // Active nav highlight
    document.querySelectorAll('.nav-links a').forEach(a => {
        if (a.getAttribute('href') === 'reports.html') {
            a.style.color = 'var(--accent-light, #a78bfa)';
            a.style.fontWeight = '700';
        }
    });

    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        if(!confirm('Are you sure you want to log out?')) return;
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'index.html';
    });

    loadReports();
});

async function loadReports() {
    try {
        const res     = await fetch(`${BACKEND_REPORTS}/api/reports?user_id=${_uid}`);
        const reports = await res.json();

        document.getElementById('reports-loading').classList.add('hidden');

        if (!Array.isArray(reports) || reports.length === 0) {
            document.getElementById('reports-empty').classList.remove('hidden');
            return;
        }

        const grid = document.getElementById('reports-grid');
        grid.classList.remove('hidden');

        reports.forEach((report, idx) => {
            const card = buildReportCard(report, idx);
            grid.appendChild(card);
        });

    } catch (err) {
        console.error('Failed to load reports:', err);
        document.getElementById('reports-loading').innerHTML =
            '<p style="color:#fca5a5;">⚠️ Could not load reports. Make sure the backend is running.</p>';
    }
}

function buildReportCard(report, idx) {
    const card      = document.createElement('div');
    card.className  = 'report-card';
    card.style.animationDelay = (idx * 60) + 'ms';

    const date     = formatDate(report.created_at);
    const gapCount = report.gap_count || 0;
    const skills   = report.skills || [];
    const snippet  = report.job_snippet || '';

    const badgeClass = gapCount >= 6 ? 'high' : gapCount >= 3 ? 'medium' : 'low';
    const badgeLabel = gapCount === 1 ? '1 gap' : `${gapCount} gaps`;

    // Show up to 6 skill tags, then +N more
    const SHOW = 5;
    const visible = skills.slice(0, SHOW);
    const extra   = skills.length - SHOW;

    const skillTagsHTML = visible.map(s =>
        `<span class="skill-tag" title="Click to build roadmap for ${escapeHtml(s.skill)}"
              onclick="sessionStorage.setItem('roadmap_prefill','${escapeHtml(s.skill)}');window.location.href='skill-gap-reports.html'">
            ${escapeHtml(s.skill)}
        </span>`
    ).join('') + (extra > 0 ? `<span class="skill-tag skill-tag-more">+${extra} more</span>` : '');

    card.innerHTML = `
        <div class="report-card-header">
            <span class="report-date">📅 ${date}</span>
            <span class="gap-badge ${badgeClass}">⚡ ${badgeLabel}</span>
        </div>
        ${snippet ? `<p class="report-snippet">"${escapeHtml(snippet)}"</p>` : ''}
        <div class="report-skills-label">Skills to develop</div>
        <div class="report-skills-tags">${skillTagsHTML || '<span class="skill-tag-more" style="cursor:default">No skills recorded</span>'}</div>
        <div class="report-card-footer">
            <a href="analyze.html">Run a new analysis →</a>
            <button class="delete-report-btn" data-id="${report._id}">🗑 Delete</button>
        </div>
    `;

    card.querySelector('.delete-report-btn')?.addEventListener('click', () => {
        showConfirm('Delete this saved report? This cannot be undone.', async () => {
            // No delete endpoint yet — remove from DOM optimistically
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.remove(), 300);
            // Check if grid is now empty
            const remaining = document.querySelectorAll('.report-card');
            if (remaining.length === 0) {
                document.getElementById('reports-grid').classList.add('hidden');
                document.getElementById('reports-empty').classList.remove('hidden');
            }
            showToast('Report removed.', 'info');
        });
    });

    return card;
}

function formatDate(isoString) {
    if (!isoString) return 'Unknown date';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
               ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return isoString; }
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Toast & Confirm (same pattern) ─────────────────────────────────────
function showToast(message, type = 'info') {
    let tc = document.getElementById('toast-container');
    if (!tc) {
        tc = document.createElement('div');
        tc.id = 'toast-container';
        tc.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(tc);
    }
    const c = {
        success: { bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.4)', text:'#34d399', icon:'✅' },
        error:   { bg:'rgba(239,68,68,0.15)',  border:'rgba(239,68,68,0.4)',  text:'#fca5a5', icon:'⚠️' },
        info:    { bg:'rgba(99,102,241,0.15)', border:'rgba(99,102,241,0.4)', text:'#a5b4fc', icon:'ℹ️' },
    }[type] || { bg:'rgba(99,102,241,0.15)', border:'rgba(99,102,241,0.4)', text:'#a5b4fc', icon:'ℹ️' };

    const toast = document.createElement('div');
    toast.style.cssText = `display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:10px;
        min-width:260px;max-width:380px;background:${c.bg};border:1px solid ${c.border};color:${c.text};
        font-family:'Inter',sans-serif;font-size:0.9rem;font-weight:500;backdrop-filter:blur(12px);
        pointer-events:all;box-shadow:0 8px 24px rgba(0,0,0,0.4);`;
    toast.innerHTML = `<span>${c.icon}</span><span style="flex:1">${message}</span>
        <button onclick="this.closest('div').remove()" style="background:none;border:none;color:${c.text};cursor:pointer;font-size:1rem;padding:0;opacity:0.7;">✕</button>`;
    tc.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

function showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#0f1320;border:1px solid rgba(255,255,255,0.12);border-radius:14px;
            padding:32px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
            <p style="color:#f1f5f9;font-size:1rem;font-family:'Inter',sans-serif;line-height:1.6;margin-bottom:24px;">${message}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button id="c-cancel" style="padding:10px 22px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                    background:transparent;color:#94a3b8;font-family:'Inter',sans-serif;cursor:pointer;">Cancel</button>
                <button id="c-ok" style="padding:10px 22px;border-radius:8px;border:none;
                    background:linear-gradient(135deg,#ef4444,#dc2626);color:white;
                    font-family:'Inter',sans-serif;cursor:pointer;font-weight:600;">Delete</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#c-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#c-ok').onclick = () => { overlay.remove(); onConfirm(); };
}

