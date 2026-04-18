// frontend/js/manageResume.js
// ──────────────────────────────────────────────────────────────────────────────
// Manage Resume page logic
// Pipeline: Upload PDF → ATS Score + Skill Extraction + Location + Summary
// ──────────────────────────────────────────────────────────────────────────────

const API = 'http://127.0.0.1:5000';

// ── Toast ──────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    let tc = document.getElementById('mr-toast-container');
    if (!tc) {
        tc = document.createElement('div');
        tc.id = 'mr-toast-container';
        tc.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(tc);
    }
    const palette = {
        success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#34d399', icon: '✅' },
        error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#fca5a5', icon: '⚠️' },
        info:    { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', text: '#a5b4fc', icon: 'ℹ️' },
        warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fcd34d', icon: '⚡' },
    };
    const c = palette[type] || palette.info;
    const t = document.createElement('div');
    t.style.cssText = `display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:10px;min-width:260px;max-width:380px;background:${c.bg};border:1px solid ${c.border};color:${c.text};font-family:'Inter',sans-serif;font-size:0.9rem;font-weight:500;backdrop-filter:blur(12px);pointer-events:all;box-shadow:0 8px 24px rgba(0,0,0,0.4);`;
    t.innerHTML = `<span>${c.icon}</span><span style="flex:1">${message}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:${c.text};cursor:pointer;font-size:1rem;padding:0;opacity:0.7;">✕</button>`;
    if (!document.getElementById('mr-toast-kf')) {
        const s = document.createElement('style');
        s.id = 'mr-toast-kf';
        s.textContent = '@keyframes mrSlideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(s);
    }
    t.style.animation = 'mrSlideIn 0.3s ease';
    tc.appendChild(t);
    setTimeout(() => t.remove(), 6000);
}

// ── Pipeline step helpers ──────────────────────────────────────────────────────
function pipeActivate(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('done'); el.classList.add('active'); }
}
function pipeDone(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active'); el.classList.add('done'); }
}

// ── Loading step helpers ───────────────────────────────────────────────────────
function stepActivate(n) {
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById(`mr-step-${i}`);
        if (!el) continue;
        el.classList.remove('active', 'done');
        if (i < n) el.classList.add('done');
        if (i === n) el.classList.add('active');
    }
}

// ── Non-resume client-side heuristic ──────────────────────────────────────────
// Basic check: only PDFs are allowed (server validates content further)
function isValidPdfFile(file) {
    return file && (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf');
}

// ── Main ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) { window.location.href = 'login.html'; return; }

    // ── Element refs ──
    const fileInput      = document.getElementById('mr-file-input');
    const dropZone       = document.getElementById('mr-drop-zone');
    const dropContent    = document.getElementById('mr-drop-content');
    const fileInfo       = document.getElementById('mr-file-info');
    const fileName       = document.getElementById('mr-file-name');
    const fileSize       = document.getElementById('mr-file-size');
    const removeBtn      = document.getElementById('mr-remove-btn');
    const browseBtn      = document.getElementById('mr-browse-btn');
    const analyseBtn     = document.getElementById('mr-analyse-btn');
    const analyseText    = document.getElementById('mr-analyse-text');
    const loadingOverlay = document.getElementById('mr-loading-overlay');
    const loadingStatus  = document.getElementById('mr-loading-status');
    const resultsSection = document.getElementById('mr-results-section');
    const storedBanner   = document.getElementById('mr-stored-banner');
    const storedName     = document.getElementById('mr-stored-name');
    const storedMeta     = document.getElementById('mr-stored-meta');
    const downloadBtn    = document.getElementById('mr-download-btn');
    const deleteStoredBtn= document.getElementById('mr-delete-stored-btn');
    const newBtn         = document.getElementById('mr-new-btn');

    let selectedFile = null;

    // ── Check for stored resume ──────────────────────────────────────────
    (async () => {
        try {
            const r = await fetch(`${API}/api/resume?user_id=${userId}`);
            const d = await r.json();
            if (d.exists) {
                storedBanner.classList.remove('hidden');
                storedName.textContent = d.filename || `${userId}.pdf`;
                storedMeta.textContent = 'Stored on server · click "Analyse" to run analysis on stored resume';
                downloadBtn.href = `${API}/api/resume/download?user_id=${userId}`;
                analyseBtn.disabled = false;
                analyseText.textContent = 'Analyse Stored Resume';
            }
        } catch { /* server offline */ }
    })();

    // ── File selection helpers ───────────────────────────────────────────
    function showFile(file) {
        selectedFile = file;
        dropContent.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        fileName.textContent = file.name;
        fileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
        analyseBtn.disabled = false;
        analyseText.textContent = 'Analyse Resume';
        pipeActivate('pipe-upload');
    }

    function clearFile() {
        selectedFile = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        dropContent.classList.remove('hidden');
        const hasStored = !storedBanner.classList.contains('hidden');
        analyseBtn.disabled = !hasStored;
        if (!hasStored) analyseText.textContent = 'Analyse Resume';
        else analyseText.textContent = 'Analyse Stored Resume';
    }

    browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        if (!isValidPdfFile(file)) {
            showToast('Please upload a resume PDF file only.', 'error');
            fileInput.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('File exceeds 10 MB limit. Please choose a smaller PDF.', 'error');
            fileInput.value = '';
            return;
        }
        showFile(file);
    });

    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); clearFile(); });

    // Drag & drop
    ['dragenter', 'dragover'].forEach(ev => {
        dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
        dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
    });
    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (!isValidPdfFile(file)) {
            showToast('Please upload a resume PDF file only.', 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('File exceeds 10 MB limit.', 'error');
            return;
        }
        showFile(file);
    });

    // ── Delete stored resume ─────────────────────────────────────────────
    if (deleteStoredBtn) {
        deleteStoredBtn.addEventListener('click', () => {
            storedBanner.classList.add('hidden');
            analyseBtn.disabled = true;
            analyseText.textContent = 'Analyse Resume';
            showToast('Stored resume removed from view. Upload a new one to continue.', 'info');
        });
    }

    // ── New analysis ─────────────────────────────────────────────────────
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            resultsSection.classList.add('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            clearFile();
            // Reset pipeline steps
            ['pipe-upload','pipe-ats','pipe-skills','pipe-summary'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('active', 'done');
            });
        });
    }

    // ── Analyse ───────────────────────────────────────────────────────────
    analyseBtn.addEventListener('click', async () => {
        analyseBtn.disabled = true;
        loadingOverlay.classList.remove('hidden');
        resultsSection.classList.add('hidden');

        // Reset pipeline
        ['pipe-upload','pipe-ats','pipe-skills','pipe-summary'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active', 'done');
        });

        try {
            // ── Step 1: Upload ────────────────────────────────────────────
            stepActivate(1);
            loadingStatus.textContent = 'Reading resume PDF…';
            pipeActivate('pipe-upload');

            if (selectedFile) {
                // Upload the file to server first
                const fd = new FormData();
                fd.append('user_id', userId);
                fd.append('resume', selectedFile);
                const upR = await fetch(`${API}/api/upload-resume`, { method: 'POST', body: fd });
                const upD = await upR.json();
                if (!upR.ok) {
                    showToast(upD.message || 'Upload failed. Please try again.', 'error');
                    return;
                }
                storedBanner.classList.remove('hidden');
                storedName.textContent = selectedFile.name;
                storedMeta.textContent = 'Just uploaded · stored on server';
                downloadBtn.href = `${API}/api/resume/download?user_id=${userId}`;
            }

            pipeDone('pipe-upload');

            // ── Step 2: ATS + Skills ─────────────────────────────────────
            stepActivate(2);
            loadingStatus.textContent = 'Computing ATS score & extracting skills…';
            pipeActivate('pipe-ats');

            const scanFd = new FormData();
            scanFd.append('user_id', userId);
            if (selectedFile) scanFd.append('resume', selectedFile);

            const scanR = await fetch(`${API}/api/resume-scan`, { method: 'POST', body: scanFd });
            const scanD = await scanR.json();

            if (!scanR.ok) {
                // Non-resume or extraction failure — show clear message
                const msg = scanD.message || 'Analysis failed. Please upload a valid resume PDF.';
                showToast(msg, 'error');
                loadingOverlay.classList.add('hidden');
                analyseBtn.disabled = false;
                return;
            }

            pipeDone('pipe-ats');

            // ── Step 3: Skills & Summary ─────────────────────────────────
            stepActivate(3);
            loadingStatus.textContent = 'Generating professional summary…';
            pipeActivate('pipe-skills');
            await new Promise(r => setTimeout(r, 300));
            pipeDone('pipe-skills');
            pipeActivate('pipe-summary');
            await new Promise(r => setTimeout(r, 300));
            pipeDone('pipe-summary');

            // ── Render results ────────────────────────────────────────────
            renderResults({
                ats:      scanD.ats_score,
                skills:   scanD.resume_skills || [],
                location: scanD.location || 'Not specified',
                summary:  scanD.summary  || '',
            });

        } catch (err) {
            console.error(err);
            showToast('Analysis failed: ' + err.message, 'error');
        } finally {
            loadingOverlay.classList.add('hidden');
            analyseBtn.disabled = false;
        }
    });

    // ── Logout ────────────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!confirm('Log out?')) return;
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});

// ── Render results ─────────────────────────────────────────────────────────────
function renderResults({ ats, skills, location, summary }) {
    const resultsSection = document.getElementById('mr-results-section');

    // ATS ring animation
    renderAtsRing(ats);

    // Skills count stat
    document.getElementById('mr-stat-skills').textContent = skills.length || '0';

    // Location stat (may be long — truncate in CSS or use shorter display)
    const locEl = document.getElementById('mr-stat-location');
    if (locEl) locEl.textContent = location || 'Not specified';

    // Summary card
    const summaryCard = document.getElementById('mr-summary-card');
    const summaryText = document.getElementById('mr-summary-text');
    if (summary && summaryText) {
        summaryText.textContent = summary;
        summaryCard.classList.remove('hidden');
    } else if (summaryCard) {
        summaryCard.classList.add('hidden');
    }

    // Skills panel
    const skillsWrap = document.getElementById('mr-skills-wrap');
    const skillsBadge = document.getElementById('mr-skills-count-badge');
    skillsWrap.innerHTML = '';
    if (skillsBadge) skillsBadge.textContent = skills.length > 0 ? `${skills.length} found` : '';

    if (skills.length === 0) {
        skillsWrap.innerHTML = '<p style="color:var(--text-3);font-size:0.85rem;">No specific skills detected — try uploading a text-rich PDF.</p>';
    } else {
        skills.forEach((skill, i) => {
            const tag = document.createElement('span');
            tag.className = 'mr-skill-tag';
            tag.style.animationDelay = `${i * 0.04}s`;
            tag.textContent = skill;
            skillsWrap.appendChild(tag);
        });
    }

    resultsSection.classList.remove('hidden');
    window.scrollTo({ top: resultsSection.offsetTop - 72, behavior: 'smooth' });
}

function renderAtsRing(score) {
    const label   = document.getElementById('mr-ats-score-label');
    const ring    = document.getElementById('mr-ats-ring-fill');
    const atsText = document.querySelector('.mr-ats-text');
    const verdict = document.getElementById('mr-ats-verdict');
    const desc    = document.getElementById('mr-ats-desc');

    const circumference = 2 * Math.PI * 50; // r=50
    const offset = circumference * (1 - score / 100);

    label.textContent = score + '%';
    ring.style.strokeDasharray = `${circumference - offset} ${offset}`;

    // Colour & verdict
    if (atsText) atsText.classList.remove('ats-great', 'ats-good', 'ats-low');
    ring.classList.remove('ats-great', 'ats-good', 'ats-low');

    if (score >= 70) {
        ring.classList.add('ats-great');
        if (atsText) atsText.classList.add('ats-great');
        verdict.textContent = '✅ Strong ATS Match';
        desc.textContent = 'Your resume is well-optimised for ATS systems. Keep it up!';
    } else if (score >= 45) {
        ring.classList.add('ats-good');
        if (atsText) atsText.classList.add('ats-good');
        verdict.textContent = '⚡ Moderate ATS Score';
        desc.textContent = 'Your resume passes basic ATS filters. Add more skills and section headings to improve.';
    } else {
        ring.classList.add('ats-low');
        if (atsText) atsText.classList.add('ats-low');
        verdict.textContent = '⚠️ Low ATS Score';
        desc.textContent = 'Your resume may be filtered out by ATS. Add more relevant skills and section headings.';
    }
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
