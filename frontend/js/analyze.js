// =============================================
//  Analyze Page — Skill Gap Analysis JS (Phase 2)
// =============================================

const BACKEND = 'http://127.0.0.1:5000';
const _userId   = localStorage.getItem('user_id');
const _userType = localStorage.getItem('user_type');

// ── Auth guard & boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!_userId) { window.location.href = 'login.html'; return; }

    // Active nav highlighting
    const current = window.location.pathname.split('/').pop() || 'analyze.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href !== '#' && current.includes(href.replace('.html', ''))) {
            a.style.color = 'var(--accent-light, #a78bfa)';
            a.style.fontWeight = '700';
        }
    });

    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!confirm('Are you sure you want to log out?')) return;
        localStorage.clear();
        window.location.href = 'index.html';
    });

    initDropZones();
    initTabs();
    loadJobPostings();
    checkStoredResume();
    loadMyReports();

    document.getElementById('analyze-btn').addEventListener('click', runAnalysis);
    document.getElementById('new-analysis-btn')?.addEventListener('click', resetPage);
    document.getElementById('save-report-btn')?.addEventListener('click', saveReport);
    document.getElementById('export-btn')?.addEventListener('click', () => window.print());
    document.getElementById('refresh-reports-btn')?.addEventListener('click', loadMyReports);
});

// ── Auto-fill stored resume ────────────────────────────────────────────
async function checkStoredResume() {
    if (!_userId) return;
    try {
        const res  = await fetch(`${BACKEND}/api/resume?user_id=${_userId}`);
        const data = await res.json();
        if (data.exists) showStoredResumeState();
    } catch (_) { /* silent */ }
}

function showStoredResumeState() {
    const content = document.getElementById('resume-drop-content');
    const info    = document.getElementById('resume-file-info');
    const nameEl  = document.getElementById('resume-file-name');
    const sizeEl  = document.getElementById('resume-file-size');
    if (!content || !info) return;
    nameEl.textContent = 'Stored resume (from profile)';
    sizeEl.textContent = 'Click Browse to replace with a different file';
    content.classList.add('hidden');
    info.classList.remove('hidden');
    document.getElementById('resume-drop').dataset.useStored = 'true';
}

// ── Drag & Drop ────────────────────────────────────────────────────────
function initDropZones() {
    setupDrop('resume-drop', 'resume-input', 'resume-drop-content', 'resume-file-info',
        'resume-file-name', 'resume-file-size', 'resume-remove', '.pdf');
    setupDrop('jd-drop', 'jd-input', 'jd-drop-content', 'jd-file-info',
        'jd-file-name', 'jd-file-size', 'jd-remove', '.pdf');

    const ta = document.getElementById('jd-textarea');
    const cc = document.getElementById('jd-char-count');
    ta?.addEventListener('input', () => { cc.textContent = ta.value.length; });
}

function setupDrop(zoneId, inputId, contentId, infoId, nameId, sizeId, removeId, ext) {
    const zone     = document.getElementById(zoneId);
    const input    = document.getElementById(inputId);
    const content  = document.getElementById(contentId);
    const info     = document.getElementById(infoId);
    const nameEl   = document.getElementById(nameId);
    const sizeEl   = document.getElementById(sizeId);
    const removeBtn= document.getElementById(removeId);

    if (!zone || !input) return;

    zone.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-btn')) input.click();
    });

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) applyFile(file, input, content, info, nameEl, sizeEl, ext);
    });

    input.addEventListener('change', () => {
        if (input.files[0]) applyFile(input.files[0], input, content, info, nameEl, sizeEl, ext);
    });

    removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = '';
        content.classList.remove('hidden');
        info.classList.add('hidden');
        // If removing from resume zone, clear stored flag too
        if (zoneId === 'resume-drop') {
            delete zone.dataset.useStored;
        }
    });
}

function applyFile(file, input, content, info, nameEl, sizeEl, ext) {
    if (!file.name.toLowerCase().endsWith(ext)) {
        showError(`Only ${ext.toUpperCase()} files are accepted.`);
        return;
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;

    nameEl.textContent = file.name;
    sizeEl.textContent = formatBytes(file.size);
    content.classList.add('hidden');
    info.classList.remove('hidden');

    input.closest('.drop-zone').style.borderColor = '#10b981';
    input.closest('.drop-zone').style.background  = 'rgba(16, 185, 129, 0.05)';
    showError('✅ PDF uploaded successfully: ' + file.name, true);

    // Clear stored-resume flag if user manually picks a file
    input.closest('.drop-zone').dataset.useStored = 'false';
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Tabs ───────────────────────────────────────────────────────────────
function initTabs() {
    const tabs = document.querySelectorAll('.jd-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.jd-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
        });
    });
}

// ── Load Job Postings ──────────────────────────────────────────────────
async function loadJobPostings() {
    const info      = document.querySelector('.job-select-info');
    const container = document.getElementById('job-list-container');
    try {
        const res  = await fetch(`${BACKEND}/api/jobs`);
        const jobs = await res.json();
        if (!res.ok || !Array.isArray(jobs) || jobs.length === 0) {
            info.textContent = 'No job postings available yet.';
            return;
        }
        info.classList.add('hidden');
        container.classList.remove('hidden');
        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className  = 'job-option';
            div.dataset.id = job._id;
            div.innerHTML  = `<h4>${job.title}</h4><p>${job.company_name || 'Unknown Company'}</p>`;
            div.addEventListener('click', () => {
                document.querySelectorAll('.job-option').forEach(o => o.classList.remove('selected'));
                div.classList.add('selected');
                document.getElementById('selected-job-id').value = job._id;
            });
            container.appendChild(div);
        });
    } catch {
        info.textContent = 'Could not load job postings.';
    }
}

// ── Run Analysis ───────────────────────────────────────────────────────
let _lastAnalysisData = null;

async function runAnalysis() {
    const resumeInput = document.getElementById('resume-input');
    const resumeDrop  = document.getElementById('resume-drop');
    const useStored   = resumeDrop?.dataset.useStored === 'true';

    if (!resumeInput.files[0] && !useStored) {
        showError('Please upload your resume PDF first.');
        return;
    }

    const activeTab = document.querySelector('.jd-tab.active')?.dataset.tab;
    let hasJD = false;
    let jdSnippet = '';
    if (activeTab === 'text' && document.getElementById('jd-textarea').value.trim()) {
        hasJD     = true;
        jdSnippet = document.getElementById('jd-textarea').value.trim().slice(0, 160);
    }
    if (activeTab === 'pdf' && document.getElementById('jd-input').files[0])        hasJD = true;
    if (activeTab === 'job' && document.getElementById('selected-job-id').value)    hasJD = true;

    if (!hasJD) {
        showError('Please provide a job description (text, PDF, or select a posted job).');
        return;
    }

    showLoading(true);
    setStep(1);

    const formData = new FormData();

    if (resumeInput.files[0]) {
        formData.append('resume', resumeInput.files[0]);
    } else if (useStored && _userId) {
        try {
            const r = await fetch(`${BACKEND}/api/resume/download?user_id=${_userId}`);
            if (!r.ok) throw new Error();
            const blob = await r.blob();
            formData.append('resume', new File([blob], 'stored_resume.pdf', { type: 'application/pdf' }));
        } catch {
            showError('Could not load stored resume. Please upload manually.');
            showLoading(false);
            return;
        }
    }

    if (activeTab === 'text') {
        formData.append('jd_text', document.getElementById('jd-textarea').value.trim());
    } else if (activeTab === 'pdf') {
        formData.append('jd_file', document.getElementById('jd-input').files[0]);
    } else {
        formData.append('job_id', document.getElementById('selected-job-id').value);
    }

    const step2Timer = setTimeout(() => setStep(2), 3500);
    const step3Timer = setTimeout(() => setStep(3), 8000);

    try {
        const res  = await fetch(`${BACKEND}/api/analyze`, { method: 'POST', body: formData });
        const data = await res.json();
        clearTimeout(step2Timer);
        clearTimeout(step3Timer);

        if (!res.ok || !data.success) {
            showError(data.error || 'Analysis failed. Please try again.');
            showLoading(false);
            return;
        }

        data._jdSnippet   = jdSnippet;
        _lastAnalysisData = data;
        showLoading(false);
        renderResults(data);
    } catch (err) {
        clearTimeout(step2Timer);
        clearTimeout(step3Timer);
        console.error('Fetch API error:', err);
        showError('Could not reach the server. Make sure you are accessing the site via http://127.0.0.1:5000/ and the backend is running.');
        showLoading(false);
    }
}



// ── Save Report ────────────────────────────────────────────────────────
async function saveReport() {
    if (!_lastAnalysisData) { showError('Run an analysis first before saving.'); return; }
    if (!_userId)           { showError('You must be logged in to save reports.'); return; }

    const btn = document.getElementById('save-report-btn');
    btn.textContent = '🔄 Saving…';
    btn.disabled = true;

    try {
        const res = await fetch(`${BACKEND}/api/save-report`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                user_id:     _userId,
                skills:      _lastAnalysisData.skills,
                sbert_gaps:  _lastAnalysisData.sbert_gaps,
                gap_count:   _lastAnalysisData.gap_count,
                job_snippet: _lastAnalysisData._jdSnippet || '',
            })
        });
        if (res.ok) {
            showError('✅ Report saved!', true);
            btn.textContent = '✅ Saved';
            // Reload the My Reports section
            await loadMyReports();
        } else {
            const d = await res.json();
            showError(d.message || 'Failed to save report.');
            btn.textContent = '💾 Save Report';
            btn.disabled = false;
        }
    } catch (_) {
        showError('Could not connect to server.');
        btn.textContent = '💾 Save Report';
        btn.disabled = false;
    }
}

// ── My Reports (inline) ────────────────────────────────────────────────
function _esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function loadMyReports() {
    const loadingEl = document.getElementById('reports-loading');
    const emptyEl   = document.getElementById('reports-empty');
    const gridEl    = document.getElementById('reports-grid');
    if (!loadingEl) return;

    loadingEl.classList.remove('hidden');
    gridEl.classList.add('hidden');
    emptyEl.classList.add('hidden');
    gridEl.innerHTML = '';

    try {
        const res     = await fetch(`${BACKEND}/api/reports?user_id=${_userId}`);
        const reports = await res.json();
        loadingEl.classList.add('hidden');

        if (!Array.isArray(reports) || reports.length === 0) {
            emptyEl.classList.remove('hidden');
            return;
        }
        gridEl.classList.remove('hidden');
        reports.forEach((report, idx) => {
            const card = buildReportCard(report, idx);
            gridEl.appendChild(card);
        });
    } catch {
        loadingEl.innerHTML = '<p style="color:#fca5a5;">⚠️ Could not load reports.</p>';
    }
}

function buildReportCard(report, idx) {
    const card      = document.createElement('div');
    card.className  = 'report-card';
    card.style.animationDelay = (idx * 60) + 'ms';

    const date     = _formatDate(report.created_at);
    const gapCount = report.gap_count || 0;
    const skills   = report.skills || [];
    const snippet  = report.job_snippet || '';

    const badgeClass = gapCount >= 6 ? 'high' : gapCount >= 3 ? 'medium' : 'low';
    const badgeLabel = gapCount === 1 ? '1 gap' : `${gapCount} gaps`;

    const SHOW = 5;
    const visible = skills.slice(0, SHOW);
    const extra   = skills.length - SHOW;
    const skillTagsHTML = visible.map(s =>
        `<span class="skill-tag" title="Click to build roadmap"
              onclick="sessionStorage.setItem('roadmap_prefill','${_esc(s.skill)}');window.location.href='skill-gap-reports.html'">
            ${_esc(s.skill)}
        </span>`
    ).join('') + (extra > 0 ? `<span class="skill-tag skill-tag-more">+${extra} more</span>` : '');

    card.innerHTML = `
        <div class="report-card-header">
            <span class="report-date">📅 ${date}</span>
            <span class="gap-badge ${badgeClass}">⚡ ${badgeLabel}</span>
        </div>
        ${snippet ? `<p class="report-snippet">"${_esc(snippet)}"</p>` : ''}
        <div class="report-skills-label">Skills to develop</div>
        <div class="report-skills-tags">${skillTagsHTML || '<span class="skill-tag skill-tag-more" style="cursor:default">No skills recorded</span>'}</div>
        <div class="report-card-footer">
            <a href="analyze.html">Run a new analysis →</a>
            <button class="delete-report-btn" data-id="${report._id}">🗑 Delete</button>
        </div>
    `;

    card.querySelector('.delete-report-btn')?.addEventListener('click', async () => {
        if (!confirm('Delete this report? This cannot be undone.')) return;
        try {
            const r = await fetch(`${BACKEND}/api/reports/${report._id}?user_id=${_userId}`, { method: 'DELETE' });
            if (r.ok) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(async () => { await loadMyReports(); }, 320);
            } else {
                showError('Could not delete report.');
            }
        } catch { showError('Server error.'); }
    });

    return card;
}

function _formatDate(iso) {
    if (!iso) return 'Unknown date';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })
             + ' · ' + d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    } catch { return iso; }
}

// ── Results Renderer ───────────────────────────────────────────────────
function renderResults(data) {
    const { skills, gap_count, sbert_used, sbert_gaps = [] } = data;

    // Reset save button
    const saveBtn = document.getElementById('save-report-btn');
    if (saveBtn) { saveBtn.textContent = '💾 Save Report'; saveBtn.disabled = false; }

    // ── Meta line
    document.getElementById('results-meta').textContent =
        `${skills.length} skill gaps identified · ` +
        (sbert_used
            ? `${gap_count} semantic mismatches detected via SBERT`
            : 'AI-powered analysis (SBERT not available)');

    // ── Match score callout (computed from SBERT gap similarities)
    renderMatchScore(sbert_gaps, sbert_used);

    // ── SBERT Semantic Mismatches Panel
    const sbertPanel = document.getElementById('sbert-panel');
    if (sbertPanel) {
        sbertPanel.innerHTML = '';
        if (sbert_used && sbert_gaps.length > 0) {
            sbertPanel.classList.remove('hidden');
            const header = document.createElement('div');
            header.className = 'sbert-header';
            header.innerHTML = `
                <span class="sbert-badge">🔬 SBERT</span>
                <h3>Semantic Mismatches Detected</h3>
                <p>These skills appear in the job description but are absent or weakly represented in your resume (cosine similarity &lt; 0.55).</p>
            `;
            sbertPanel.appendChild(header);

            const list = document.createElement('div');
            list.className = 'sbert-gap-list';
            sbert_gaps.forEach((gap, i) => {
                const pct   = Math.round((1 - gap.similarity) * 100);
                const sim   = Math.round(gap.similarity * 100);
                const color = sim < 25 ? '#ef4444' : sim < 45 ? '#f97316' : '#eab308';
                const item  = document.createElement('div');
                item.className = 'sbert-gap-item';
                item.style.animationDelay = (i * 60) + 'ms';
                item.innerHTML = `
                    <div class="sbert-gap-info">
                        <span class="sbert-gap-skill">${escapeHtml(gap.skill)}</span>
                        <span class="sbert-gap-label">Gap severity: ${pct}%</span>
                    </div>
                    <div class="sbert-gap-bar-wrap">
                        <div class="sbert-gap-bar" style="width:${pct}%; background:${color};"></div>
                    </div>
                    <span class="sbert-similarity" style="color:${color};">${sim}% match</span>
                `;
                list.appendChild(item);
            });
            sbertPanel.appendChild(list);
        } else if (sbert_used && sbert_gaps.length === 0) {
            sbertPanel.classList.remove('hidden');
            sbertPanel.innerHTML = `
                <div class="sbert-header">
                    <span class="sbert-badge">🔬 SBERT</span>
                    <h3>No Direct Semantic Mismatches</h3>
                    <p>Your resume's vocabulary closely matches the job description's tech terms. Skill gaps below were inferred by Gemini from context.</p>
                </div>`;
        } else {
            sbertPanel.classList.add('hidden');
        }
    }

    // ── Enriched skill cards
    const grid = document.getElementById('skills-grid');
    grid.innerHTML = '';

    const gridTitle = document.getElementById('skills-grid-title');
    if (gridTitle) {
        gridTitle.textContent = sbert_gaps.length > 0
            ? '📚 Skills to Work On (with Learning Resources)'
            : '📚 AI-Recommended Skills to Develop';
    }

    skills.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.style.animationDelay = (i * 80) + 'ms';

        const resources = (item.resources || []).map(r =>
            `<a class="resource-link" href="${r.url}" target="_blank" rel="noopener">${r.label}</a>`
        ).join('');

        const simBadge = (item.similarity !== null && item.similarity !== undefined)
            ? `<span class="skill-sim-badge">SBERT: ${Math.round(item.similarity * 100)}% match</span>`
            : '';

        card.innerHTML = `
            <div class="skill-number">${i + 1}</div>
            ${simBadge}
            <h3>${escapeHtml(item.skill)}</h3>
            <p class="skill-why">${escapeHtml(item.why_needed)}</p>
            <div class="skill-resources">${resources}</div>
            <p class="skill-roadmap-hint">Click to build a full roadmap →</p>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            sessionStorage.setItem('roadmap_prefill', item.skill);
            window.location.href = 'skill-gap-reports.html';
        });

        grid.appendChild(card);
    });

    document.querySelector('.analyze-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Match Score Ring Callout ───────────────────────────────────────────
function renderMatchScore(sbert_gaps, sbert_used) {
    const callout = document.getElementById('match-score-callout');
    if (!callout) return;

    if (!sbert_used || sbert_gaps.length === 0) {
        callout.classList.add('hidden');
        return;
    }

    // Average similarity of detected gaps = coverage score
    const avgSim  = sbert_gaps.reduce((s, g) => s + g.similarity, 0) / sbert_gaps.length;
    const scorePct = Math.max(0, Math.min(100, Math.round(avgSim * 100)));
    const label   = scorePct >= 70 ? 'Great Match' : scorePct >= 50 ? 'Good Match' : scorePct >= 35 ? 'Partial Match' : 'Low Match';
    const color   = scorePct >= 70 ? '#10b981' : scorePct >= 50 ? '#f59e0b' : scorePct >= 35 ? '#f97316' : '#ef4444';

    const circumference = 2 * Math.PI * 26; // ≈163.36
    const offset = circumference - (scorePct / 100) * circumference;

    const ring = document.getElementById('match-ring-fill');
    if (ring) {
        ring.style.strokeDasharray  = circumference;
        ring.style.strokeDashoffset = offset;
        ring.style.stroke           = color;
        ring.style.transition       = 'stroke-dashoffset 1s ease';
    }

    const ringLabel = document.getElementById('match-ring-label');
    if (ringLabel) ringLabel.textContent = scorePct + '%';

    const scoreLabel = document.getElementById('match-score-label');
    if (scoreLabel) { scoreLabel.textContent = label; scoreLabel.style.color = color; }

    callout.classList.remove('hidden');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Loading / Steps ────────────────────────────────────────────────────
let currentStep = 0;

function setStep(n) {
    const steps  = ['step-1', 'step-2', 'step-3'];
    const labels = ['Extracting text from PDF…', 'Running SBERT analysis…', 'Generating AI recommendations…'];
    document.getElementById('loading-status').textContent = labels[n - 1] || '';
    steps.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (idx + 1 < n)      { el.className = 'step done'; }
        else if (idx + 1 === n) { el.className = 'step active'; }
        else                   { el.className = 'step'; }
    });
    currentStep = n;
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) { overlay.classList.remove('hidden'); setStep(1); }
    else      { overlay.classList.add('hidden'); }
}

// ── Reset ──────────────────────────────────────────────────────────────
function resetPage() {
    document.querySelector('.analyze-section').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
    _lastAnalysisData = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Toast ──────────────────────────────────────────────────────────────
function showError(msg, isSuccess = false) {
    const toast = document.getElementById('error-toast');
    document.getElementById('error-msg').textContent = msg;

    if (isSuccess) {
        toast.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        toast.style.background  = 'rgba(16, 185, 129, 0.12)';
        toast.style.color       = '#34d399';
        toast.querySelector('.toast-icon').textContent = '✅';
    } else {
        toast.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        toast.style.background  = 'rgba(239, 68, 68, 0.12)';
        toast.style.color       = '#fca5a5';
        toast.querySelector('.toast-icon').textContent = '⚠️';
    }

    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

