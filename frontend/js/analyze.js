// =============================================
//  Analyze Page — Skill Gap Analysis JS
// =============================================

const BACKEND = 'http://127.0.0.1:5000';

// ── Auth guard ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) { window.location.href = 'login.html'; return; }

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'index.html';
    });

    initDropZones();
    initTabs();
    loadJobPostings();

    document.getElementById('analyze-btn').addEventListener('click', runAnalysis);
    document.getElementById('new-analysis-btn')?.addEventListener('click', resetPage);
});

// ── Drag & Drop ────────────────────────────────────────────────────────
function initDropZones() {
    setupDrop('resume-drop', 'resume-input', 'resume-drop-content', 'resume-file-info',
        'resume-file-name', 'resume-file-size', 'resume-remove', '.pdf');
    setupDrop('jd-drop', 'jd-input', 'jd-drop-content', 'jd-file-info',
        'jd-file-name', 'jd-file-size', 'jd-remove', '.pdf');

    // Character counter for textarea
    const ta = document.getElementById('jd-textarea');
    const cc = document.getElementById('jd-char-count');
    ta?.addEventListener('input', () => { cc.textContent = ta.value.length; });
}

function setupDrop(zoneId, inputId, contentId, infoId, nameId, sizeId, removeId, ext) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const content = document.getElementById(contentId);
    const info = document.getElementById(infoId);
    const nameEl = document.getElementById(nameId);
    const sizeEl = document.getElementById(sizeId);
    const removeBtn = document.getElementById(removeId);

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
    });
}

function applyFile(file, input, content, info, nameEl, sizeEl, ext) {
    if (!file.name.toLowerCase().endsWith(ext)) {
        showError(`Only ${ext.toUpperCase()} files are accepted.`);
        return;
    }
    // Transfer to a new DataTransfer so the input picks it up
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;

    nameEl.textContent = file.name;
    sizeEl.textContent = formatBytes(file.size);
    content.classList.add('hidden');
    info.classList.remove('hidden');

    // Visual feedback
    input.closest('.drop-zone').style.borderColor = '#10b981';
    input.closest('.drop-zone').style.background = 'rgba(16, 185, 129, 0.05)';
    showError('✅ PDF uploaded successfully: ' + file.name, true);
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
    const info = document.querySelector('.job-select-info');
    const container = document.getElementById('job-list-container');
    try {
        const res = await fetch(`${BACKEND}/api/jobs`);
        const jobs = await res.json();
        if (!res.ok || !Array.isArray(jobs) || jobs.length === 0) {
            info.textContent = 'No job postings available yet.';
            return;
        }
        info.classList.add('hidden');
        container.classList.remove('hidden');
        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'job-option';
            div.dataset.id = job._id;
            div.innerHTML = `<h4>${job.title}</h4><p>${job.company_name || 'Unknown Company'}</p>`;
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
async function runAnalysis() {
    const resumeInput = document.getElementById('resume-input');
    if (!resumeInput.files[0]) {
        showError('Please upload your resume PDF first.');
        return;
    }

    const activeTab = document.querySelector('.jd-tab.active')?.dataset.tab;
    let hasJD = false;
    if (activeTab === 'text' && document.getElementById('jd-textarea').value.trim()) hasJD = true;
    if (activeTab === 'pdf' && document.getElementById('jd-input').files[0]) hasJD = true;
    if (activeTab === 'job' && document.getElementById('selected-job-id').value) hasJD = true;

    if (!hasJD) {
        showError('Please provide a job description (text, PDF, or select a posted job).');
        return;
    }

    showLoading(true);
    setStep(1);

    const formData = new FormData();
    formData.append('resume', resumeInput.files[0]);

    if (activeTab === 'text') {
        formData.append('jd_text', document.getElementById('jd-textarea').value.trim());
    } else if (activeTab === 'pdf') {
        formData.append('jd_file', document.getElementById('jd-input').files[0]);
    } else {
        formData.append('job_id', document.getElementById('selected-job-id').value);
    }

    // Simulate step progress during request
    const step2Timer = setTimeout(() => setStep(2), 3500);
    const step3Timer = setTimeout(() => setStep(3), 8000);

    try {
        const res = await fetch(`${BACKEND}/api/analyze`, { method: 'POST', body: formData });
        const data = await res.json();

        clearTimeout(step2Timer);
        clearTimeout(step3Timer);

        if (!res.ok || !data.success) {
            showError(data.error || 'Analysis failed. Please try again.');
            showLoading(false);
            return;
        }

        showLoading(false);
        renderResults(data);
    } catch (err) {
        clearTimeout(step2Timer);
        clearTimeout(step3Timer);
        console.error("Fetch API error:", err);
        showError('Could not reach the server. Make sure you are accessing the site via http://127.0.0.1:5000/ and the backend is running.');
        showLoading(false);
    }
}

// ── Results Renderer ───────────────────────────────────────────────────
function renderResults(data) {
    const { skills, gap_count, sbert_used, sbert_gaps = [] } = data;

    // ── Meta line ──────────────────────────────────────────────────────
    document.getElementById('results-meta').textContent =
        `${skills.length} skill gaps identified · ` +
        (sbert_used
            ? `${gap_count} semantic mismatches detected via SBERT`
            : 'AI-powered analysis (SBERT not available)');

    // ── SBERT Semantic Mismatches Panel ───────────────────────────────
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
                const pct = Math.round((1 - gap.similarity) * 100);  // gap severity %
                const sim = Math.round(gap.similarity * 100);
                const color = sim < 25 ? '#ef4444' : sim < 45 ? '#f97316' : '#eab308';

                const item = document.createElement('div');
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

    // ── Enriched skill cards (Gemini) ─────────────────────────────────
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

        // Show similarity badge if available
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
    const steps = ['step-1', 'step-2', 'step-3'];
    const labels = ['Extracting text from PDF…', 'Running SBERT analysis…', 'Generating AI recommendations…'];
    document.getElementById('loading-status').textContent = labels[n - 1] || '';
    steps.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (idx + 1 < n) { el.className = 'step done'; }
        else if (idx + 1 === n) { el.className = 'step active'; }
        else { el.className = 'step'; }
    });
    currentStep = n;
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
        setStep(1);
    } else {
        overlay.classList.add('hidden');
    }
}

// ── Reset ──────────────────────────────────────────────────────────────
function resetPage() {
    document.querySelector('.analyze-section').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Toast ──────────────────────────────────────────────────────────────
function showError(msg, isSuccess = false) {
    const toast = document.getElementById('error-toast');
    document.getElementById('error-msg').textContent = msg;

    if (isSuccess) {
        toast.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        toast.style.background = 'rgba(16, 185, 129, 0.12)';
        toast.style.color = '#34d399';
        toast.querySelector('.toast-icon').textContent = '';
    } else {
        toast.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        toast.style.background = 'rgba(239, 68, 68, 0.12)';
        toast.style.color = '#fca5a5';
        toast.querySelector('.toast-icon').textContent = '⚠️';
    }

    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}
