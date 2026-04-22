// frontend/js/dashboard.js

// ── Toast Notification System (replaces all alert() calls) ─────────────────
function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 9999;
            display: flex; flex-direction: column; gap: 10px; pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    const colors = {
        success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#34d399', icon: '✅' },
        error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#fca5a5', icon: '⚠️' },
        info:    { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', text: '#a5b4fc', icon: 'ℹ️' },
        warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fcd34d', icon: '⚡' },
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        display: flex; align-items: center; gap: 12px;
        padding: 14px 18px; border-radius: 10px; min-width: 260px; max-width: 380px;
        background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
        font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 500;
        backdrop-filter: blur(12px); pointer-events: all;
        animation: slideInToast 0.3s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    `;
    toast.innerHTML = `<span>${c.icon}</span><span style="flex:1">${message}</span><button onclick="this.closest('[style]').remove()" style="background:none;border:none;color:${c.text};cursor:pointer;font-size:1rem;padding:0;opacity:0.7;">✕</button>`;

    if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.textContent = `@keyframes slideInToast { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`;
        document.head.appendChild(style);
    }

    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

// ── Confirm Modal (replaces confirm() calls) ────────────────────────────────
function showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);
        z-index:10000; display:flex; align-items:center; justify-content:center;
    `;
    overlay.innerHTML = `
        <div style="background:#0f1320;border:1px solid rgba(255,255,255,0.12);border-radius:14px;
            padding:32px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
            <p style="color:#f1f5f9;font-size:1rem;font-family:'Inter',sans-serif;line-height:1.6;margin-bottom:24px;">${message}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button id="confirm-cancel" style="padding:10px 22px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                    background:transparent;color:#94a3b8;font-family:'Inter',sans-serif;cursor:pointer;font-size:0.9rem;">Cancel</button>
                <button id="confirm-ok" style="padding:10px 22px;border-radius:8px;border:none;
                    background:linear-gradient(135deg,#ef4444,#dc2626);color:white;
                    font-family:'Inter',sans-serif;cursor:pointer;font-size:0.9rem;font-weight:600;">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); onConfirm(); };
}

// ── Active Nav Highlight ────────────────────────────────────────────────────
function setActiveNav() {
    const current = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href !== '#' && current.includes(href.replace('.html', ''))) {
            a.style.color = 'var(--accent-light, #a78bfa)';
            a.style.fontWeight = '700';
        }
    });
}

// ── Main ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    const userId      = localStorage.getItem('user_id');
    const storedUsername = localStorage.getItem('username');
    const userType    = localStorage.getItem('user_type');

    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    setActiveNav();

    // Companies: only show Dashboard + Profile in nav, no chatbot
    if (userType === 'company') {
        document.getElementById('nav-analyze')?.remove();
        document.getElementById('nav-roadmap')?.remove();
        // Suppress chatbot for companies by setting a flag the widget reads
        window._suppressChatbot = true;
    }
    // Admin: redirect to admin panel immediately
    if (userType === 'admin') {
        window.location.href = 'admin.html';
        return;
    }

    // Welcome message
    const welcomeEl = document.getElementById('welcome-message');
    if (welcomeEl && storedUsername) {
        welcomeEl.textContent = `Welcome back, ${storedUsername}!`;
    }

    // Toggle dashboard sections by user type
    const candidateSection = document.getElementById('candidate-dashboard');
    const companySection   = document.getElementById('company-dashboard');
    const adminSection     = document.getElementById('admin-dashboard');

    if (userType === 'company') {
        if (companySection)   companySection.style.display = 'block';
        if (candidateSection) candidateSection.style.display = 'none';
        if (adminSection)     adminSection.style.display = 'none';
    } else if (userType === 'admin') {
        if (adminSection)     adminSection.style.display = 'block';
        if (candidateSection) candidateSection.style.display = 'none';
        if (companySection)   companySection.style.display = 'none';
    } else {
        if (candidateSection) candidateSection.style.display = 'block';
        if (companySection)   companySection.style.display = 'none';
        if (adminSection)     adminSection.style.display = 'none';
    }

    // ── Candidate feature cards ─────────────────────────────────────────
    const analyzeJobsCard = document.getElementById('analyze-jobs-card');
    if (analyzeJobsCard) {
        analyzeJobsCard.style.cursor = 'pointer';
        analyzeJobsCard.addEventListener('click', () => window.location.href = 'analyze.html');
    }

    const manageResumesCard = document.getElementById('manage-resumes-card');
    if (manageResumesCard) {
        manageResumesCard.style.cursor = 'pointer';
        manageResumesCard.addEventListener('click', () => {
            window.location.href = 'manageResume.html';
        });
    }

    const skillGapReportsCard = document.getElementById('skill-gap-reports-card');
    if (skillGapReportsCard) {
        skillGapReportsCard.style.cursor = 'pointer';
        skillGapReportsCard.addEventListener('click', () => window.location.href = 'skill-gap-reports.html');
    }

    const exploreJobsCardCand = document.getElementById('explore-jobs-card-cand');
    if (exploreJobsCardCand) {
        exploreJobsCardCand.style.cursor = 'pointer';
        exploreJobsCardCand.addEventListener('click', () => {
            document.getElementById('job-listings-card')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ── Company feature cards ───────────────────────────────────────────
    const postJobCard = document.getElementById('post-job-card');
    if (postJobCard) {
        postJobCard.style.cursor = 'pointer';
        postJobCard.addEventListener('click', () => {
            const section = document.getElementById('post-job-section');
            if (section) {
                section.style.display = 'block';
                section.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    const managePostingsCard = document.getElementById('manage-postings-card');
    if (managePostingsCard) {
        managePostingsCard.style.cursor = 'pointer';
        managePostingsCard.addEventListener('click', () => {
            document.getElementById('job-listings-card')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ── View Applications (company) — 2-step modal ─────────────────────
    const viewAppsBtn  = document.getElementById('view-apps-btn');
    const viewAppsCard = document.getElementById('view-apps-card');
    if (viewAppsBtn) {
        viewAppsBtn.addEventListener('click', (e) => { e.preventDefault(); openViewAppsModal(); });
    }
    if (viewAppsCard) {
        viewAppsCard.style.cursor = 'pointer';
        viewAppsCard.addEventListener('click', () => openViewAppsModal());
    }

    const viewAppsModal    = document.getElementById('view-apps-modal');
    const closeViewAppsBtn = document.getElementById('close-view-apps-modal');
    const vaStepJobs       = document.getElementById('va-step-jobs');
    const vaStepApps       = document.getElementById('va-step-apps');
    const vaJobsList       = document.getElementById('va-jobs-list');
    const vaAppsList       = document.getElementById('va-apps-list');
    const vaBackBtn        = document.getElementById('va-back-btn');
    const vaTitle          = document.getElementById('view-apps-modal-title');
    const vaSub            = document.getElementById('view-apps-modal-sub');

    closeViewAppsBtn?.addEventListener('click', () => { viewAppsModal.style.display = 'none'; });
    viewAppsModal?.addEventListener('click', (e) => { if (e.target === viewAppsModal) viewAppsModal.style.display = 'none'; });
    vaBackBtn?.addEventListener('click', () => {
        vaStepApps.style.display = 'none';
        vaStepJobs.style.display = 'block';
        vaTitle.textContent = 'Your Job Postings';
        vaSub.textContent   = 'Select a job to see its applicants';
    });

    async function openViewAppsModal() {
        if (!viewAppsModal) return;
        viewAppsModal.style.display = 'block';
        vaStepJobs.style.display   = 'block';
        vaStepApps.style.display   = 'none';
        vaTitle.textContent = 'Your Job Postings';
        vaSub.textContent   = 'Select a job to see its applicants';
        vaJobsList.innerHTML = '<p style="color:#64748b;padding:16px 0;">Loading your jobs…</p>';

        try {
            const r    = await fetch(`http://127.0.0.1:5000/api/jobs/company/${userId}`);
            const jobs = await r.json();
            if (!Array.isArray(jobs) || jobs.length === 0) {
                vaJobsList.innerHTML = '<p style="color:#94a3b8;padding:16px 0;">You have not posted any jobs yet.</p>';
                return;
            }
            vaJobsList.innerHTML = '';
            jobs.forEach(job => {
                const expiredBadge = job.is_expired
                    ? '<span style="background:rgba(239,68,68,0.15);color:#fca5a5;border-radius:6px;padding:2px 8px;font-size:0.7rem;font-weight:700;margin-left:8px;">EXPIRED</span>'
                    : '';
                const deadline = job.last_date
                    ? `<span style="color:#64748b;font-size:0.75rem;"> · Deadline: ${new Date(job.last_date).toLocaleDateString()}</span>`
                    : '';
                const skillsPill = job.required_skills
                    ? `<span style="color:#a78bfa;font-size:0.75rem;display:block;margin-top:4px;">🔍 ${escapeHtml(job.required_skills)}</span>`
                    : '';

                const card = document.createElement('div');
                card.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:18px 20px;cursor:pointer;transition:border-color 0.15s;';
                card.onmouseover = () => card.style.borderColor = 'rgba(124,106,247,0.4)';
                card.onmouseout  = () => card.style.borderColor = 'rgba(255,255,255,0.1)';
                card.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                        <div style="flex:1;">
                            <span style="font-weight:600;color:#f1f5f9;font-size:0.95rem;">${escapeHtml(job.title)}</span>${expiredBadge}
                            ${deadline}
                            ${skillsPill}
                        </div>
                        <span style="background:rgba(124,106,247,0.15);color:#a78bfa;border-radius:8px;padding:4px 12px;font-size:0.78rem;font-weight:700;white-space:nowrap;">${job.applicant_count || 0} applicant${job.applicant_count !== 1 ? 's' : ''}</span>
                    </div>`;
                card.addEventListener('click', () => loadJobApplicantsModal(job._id, job.title));
                vaJobsList.appendChild(card);
            });
        } catch {
            vaJobsList.innerHTML = '<p style="color:#fca5a5;padding:16px 0;">Could not load jobs. Make sure the server is running.</p>';
        }
    }

    async function loadJobApplicantsModal(jobId, jobTitle) {
        vaStepJobs.style.display = 'none';
        vaStepApps.style.display = 'block';
        vaTitle.textContent = jobTitle;
        vaSub.textContent   = 'Applicants for this opening';
        vaAppsList.innerHTML = '<p style="color:#64748b;">Loading applicants…</p>';

        try {
            const r    = await fetch(`http://127.0.0.1:5000/api/applications?job_id=${jobId}`);
            const apps = await r.json();
            if (!Array.isArray(apps) || apps.length === 0) {
                vaAppsList.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:24px;">No applications received yet for this job.</p>';
                return;
            }
            vaAppsList.innerHTML = '';
            apps.forEach((app, idx) => {
                const card = document.createElement('div');
                card.style.cssText = `background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;animation:slideInToast 0.3s ease ${idx*50}ms both;`;
                card.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                        <div>
                            <p style="color:#f1f5f9;font-weight:600;font-size:0.95rem;margin-bottom:4px;">${escapeHtml(app.candidate_name || 'Unknown')}</p>
                            <p style="color:#94a3b8;font-size:0.82rem;">${escapeHtml(app.candidate_email || '')}</p>
                            ${app.candidate_skills ? `<p style="color:#a78bfa;font-size:0.78rem;margin-top:4px;">Skills: ${escapeHtml(app.candidate_skills)}</p>` : ''}
                            <p style="color:#64748b;font-size:0.75rem;margin-top:6px;">Applied: ${new Date(app.applied_at).toLocaleDateString()}</p>
                        </div>
                        <div style="flex-shrink:0;">
                            ${app.has_resume
                                ? `<a href="http://127.0.0.1:5000/api/resume/download?user_id=${app.user_id}" target="_blank" style="padding:8px 14px;border-radius:8px;background:rgba(124,106,247,0.15);border:1px solid rgba(124,106,247,0.3);color:#a78bfa;font-size:0.82rem;font-weight:600;text-decoration:none;white-space:nowrap;display:inline-block;">📄 View Resume</a>`
                                : `<span style="padding:8px 14px;border-radius:8px;background:rgba(255,255,255,0.05);color:#64748b;font-size:0.82rem;">No Resume</span>`}
                        </div>
                    </div>`;
                vaAppsList.appendChild(card);
            });
        } catch {
            vaAppsList.innerHTML = '<p style="color:#fca5a5;">Failed to load applicants.</p>';
        }
    }

    // ── Applicants Modal ────────────────────────────────────────────────
    const applicantsModal = document.getElementById('applicants-modal');
    const closeApplicantsBtn = document.getElementById('close-applicants-modal');
    if (closeApplicantsBtn) {
        closeApplicantsBtn.addEventListener('click', () => {
            applicantsModal.style.display = 'none';
        });
    }
    applicantsModal?.addEventListener('click', (e) => {
        if (e.target === applicantsModal) applicantsModal.style.display = 'none';
    });

    async function openApplicantsModal(jobId, jobTitle) {
        const modal = document.getElementById('applicants-modal');
        const title = document.getElementById('applicants-modal-title');
        const list  = document.getElementById('applicants-list');
        title.textContent = `Applicants for: ${jobTitle}`;
        list.innerHTML = '<p style="color:#94a3b8;">Loading…</p>';
        modal.style.display = 'block';

        try {
            const r = await fetch(`http://127.0.0.1:5000/api/applications?job_id=${jobId}`);
            const apps = await r.json();
            if (!Array.isArray(apps) || apps.length === 0) {
                list.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No applications yet for this job.</p>';
                return;
            }
            list.innerHTML = '';
            apps.forEach((app, idx) => {
                const card = document.createElement('div');
                card.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;';
                card.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                        <div>
                            <p style="color:#f1f5f9;font-weight:600;font-size:0.95rem;margin-bottom:4px;">${escapeHtml(app.candidate_name || 'Unknown')}</p>
                            <p style="color:#94a3b8;font-size:0.82rem;">${escapeHtml(app.candidate_email || '')}</p>
                            ${app.candidate_skills ? `<p style="color:#a78bfa;font-size:0.8rem;margin-top:4px;">Skills: ${escapeHtml(app.candidate_skills)}</p>` : ''}
                            <p style="color:#64748b;font-size:0.78rem;margin-top:6px;">Applied: ${new Date(app.applied_at).toLocaleDateString()}</p>
                        </div>
                        <div style="display:flex;gap:8px;flex-shrink:0;">
                            ${app.has_resume
                                ? `<a href="http://127.0.0.1:5000/api/resume/download?user_id=${app.user_id}" target="_blank"
                                    style="padding:8px 14px;border-radius:8px;background:rgba(124,106,247,0.15);border:1px solid rgba(124,106,247,0.3);
                                    color:#a78bfa;font-size:0.82rem;font-weight:600;text-decoration:none;white-space:nowrap;">📄 View Resume</a>`
                                : `<span style="padding:8px 14px;border-radius:8px;background:rgba(255,255,255,0.05);color:#64748b;font-size:0.82rem;">No Resume</span>`
                            }
                        </div>
                    </div>
                `;
                list.appendChild(card);
            });
        } catch {
            list.innerHTML = '<p style="color:#fca5a5;">Failed to load applicants. Please try again.</p>';
        }
    }

    // ── Edit Job Modal ──────────────────────────────────────────────────
    const editJobModal = document.getElementById('edit-job-modal');
    const closeEditBtn = document.getElementById('close-edit-modal');
    if (closeEditBtn) {
        closeEditBtn.addEventListener('click', () => {
            editJobModal.style.display = 'none';
        });
    }
    editJobModal?.addEventListener('click', (e) => {
        if (e.target === editJobModal) editJobModal.style.display = 'none';
    });

    function openEditModal(job) {
        document.getElementById('edit-job-id').value         = job._id;
        document.getElementById('edit-job-title').value      = job.title;
        document.getElementById('edit-job-desc').value       = job.description;
        const skillsEl    = document.getElementById('edit-job-skills');
        const lastDateEl  = document.getElementById('edit-job-last-date');
        if (skillsEl)   skillsEl.value   = job.required_skills || '';
        if (lastDateEl) lastDateEl.value = job.last_date ? job.last_date.substring(0, 10) : '';
        editJobModal.style.display = 'flex';
    }

    const editJobForm = document.getElementById('edit-job-form');
    if (editJobForm) {
        editJobForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const jobId = document.getElementById('edit-job-id').value;
            const title = document.getElementById('edit-job-title').value.trim();
            const desc  = document.getElementById('edit-job-desc').value.trim();
            const skills    = document.getElementById('edit-job-skills')?.value.trim() || '';
            const lastDate  = document.getElementById('edit-job-last-date')?.value || '';
            const submitBtn = editJobForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Saving…';
            submitBtn.disabled = true;
            try {
                const r = await fetch(`http://127.0.0.1:5000/api/edit-job/${jobId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ company_id: userId, title, description: desc, required_skills: skills, last_date: lastDate }),
                });
                const d = await r.json();
                if (r.ok) {
                    showToast('Job updated successfully!', 'success');
                    editJobModal.style.display = 'none';
                    await loadAllJobs();
                } else {
                    showToast(d.message || 'Could not update job.', 'error');
                }
            } catch {
                showToast('Server error.', 'error');
            } finally {
                submitBtn.textContent = 'Save Changes';
                submitBtn.disabled = false;
            }
        });
    }

    // ── Jobs list with filtering and sorting ───────────────────────────
    let allJobs = [];

    async function loadAllJobs() {
        const jobsList = document.getElementById('jobs-list');
        if (!jobsList) return;

        // Show skeleton loading
        jobsList.innerHTML = Array(3).fill('').map(() => `
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
                border-radius:12px;padding:20px;animation:pulse 1.5s ease infinite;">
                <div style="height:16px;background:rgba(255,255,255,0.08);border-radius:4px;margin-bottom:10px;width:65%;"></div>
                <div style="height:12px;background:rgba(255,255,255,0.05);border-radius:4px;margin-bottom:8px;width:40%;"></div>
                <div style="height:48px;background:rgba(255,255,255,0.04);border-radius:4px;"></div>
            </div>
        `).join('');

        if (!document.getElementById('pulse-keyframes')) {
            const s = document.createElement('style');
            s.id = 'pulse-keyframes';
            s.textContent = `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`;
            document.head.appendChild(s);
        }

        try {
            const response = await fetch('http://127.0.0.1:5000/api/jobs');
            allJobs = await response.json();
            if (response.ok) renderJobs(allJobs);
        } catch (error) {
            console.error('Error loading jobs:', error);
            jobsList.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:30px;">Could not load job postings. Make sure the server is running.</p>';
        }
    }

    function renderJobs(jobsToRender) {
        const jobsList = document.getElementById('jobs-list');
        if (!jobsList) return;

        if (jobsToRender.length === 0) {
            jobsList.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:30px;">No jobs found matching your criteria.</p>';
            return;
        }

        jobsList.innerHTML = '';

        jobsToRender.forEach(job => {
            const isOwner = userType === 'company' && job.company_id === userId;
            const isCandidate = userType !== 'company';
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            jobCard.dataset.jobId = job._id;

            // Deadline & skills meta
            const expiredBadge = job.is_expired
                ? '<span style="background:rgba(239,68,68,0.15);color:#fca5a5;border-radius:6px;padding:2px 8px;font-size:0.7rem;font-weight:700;margin-left:8px;">CLOSED</span>'
                : '';
            const deadlineMeta = job.last_date
                ? `<span style="display:inline-block;margin-top:6px;font-size:0.75rem;color:${job.is_expired ? '#fca5a5' : '#64748b'};">📅 Deadline: ${new Date(job.last_date).toLocaleDateString()}</span>`
                : '';
            const skillsMeta = job.required_skills
                ? `<span style="display:block;margin-top:4px;font-size:0.75rem;color:#a78bfa;">🔍 ${escapeHtml(job.required_skills)}</span>`
                : '';

            jobCard.innerHTML = `
                <h3>${escapeHtml(job.title)}${expiredBadge}</h3>
                <p class="company">${escapeHtml(job.company_name)}</p>
                ${deadlineMeta}${skillsMeta}
                <p style="margin-top:8px;">${escapeHtml(job.description)}</p>
                <div class="score-chip-area"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                    <button class="btn view-details-btn" data-id="${job._id}" style="width:auto;padding:7px 16px;font-size:0.82rem;">View Details</button>
                    ${isOwner ? `
                        <button class="btn edit-job-btn" data-id="${job._id}" style="width:auto;padding:7px 16px;font-size:0.82rem;background:rgba(124,106,247,0.15);border:1px solid rgba(124,106,247,0.3);color:#a78bfa;">✏️ Edit</button>
                        <button class="btn view-applicants-btn" data-id="${job._id}" data-title="${escapeHtml(job.title)}" style="width:auto;padding:7px 16px;font-size:0.82rem;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#34d399;">👥 View Applicants</button>
                        <button class="delete-btn" data-id="${job._id}">Delete</button>
                    ` : ''}
                </div>
            `;

            // Candidate-specific actions (Check Fit + Apply)
            if (isCandidate) {
                const actionsRow = document.createElement('div');
                actionsRow.className = 'job-card-actions';

                const fitBtn = document.createElement('button');
                fitBtn.className = 'btn-check-fit';
                fitBtn.textContent = '⚡ Check Fit';
                fitBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    fitBtn.textContent = 'Scoring…';
                    fitBtn.disabled = true;
                    const fd = new FormData();
                    fd.append('user_id', userId);
                    fd.append('job_id', job._id);
                    try {
                        const r = await fetch('http://127.0.0.1:5000/api/match-score', { method: 'POST', body: fd });
                        const d = await r.json();
                        if (r.ok) {
                            const chipArea = jobCard.querySelector('.score-chip-area');
                            const cls = d.score >= 70 ? 'great' : d.score >= 50 ? 'good' : d.score >= 35 ? 'partial' : 'low';
                            chipArea.innerHTML = `<span class="score-chip ${cls}">🎯 ${d.score}% — ${d.label}</span>`;
                            fitBtn.textContent = '⚡ Re-check';
                        } else {
                            showToast(d.error || 'Could not compute score. Upload a resume to your profile first.', 'error');
                            fitBtn.textContent = '⚡ Check Fit';
                        }
                    } catch {
                        showToast('Server error while computing match score.', 'error');
                        fitBtn.textContent = '⚡ Check Fit';
                    } finally {
                        fitBtn.disabled = false;
                    }
                });

                const applyBtn = document.createElement('button');
                applyBtn.dataset.jobId = job._id;

                if (job.is_expired) {
                    // Deadline passed — block application
                    applyBtn.className = 'btn-apply applied';
                    applyBtn.textContent = '🔒 Closed';
                    applyBtn.disabled = true;
                    applyBtn.title = 'The application deadline for this job has passed.';
                } else {
                    applyBtn.className = 'btn-apply';
                    applyBtn.textContent = '✉ Apply';
                    applyBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        applyBtn.textContent = 'Applying…';
                        applyBtn.disabled = true;
                        try {
                            const r = await fetch('http://127.0.0.1:5000/api/apply', {
                                method:  'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body:    JSON.stringify({ user_id: userId, job_id: job._id }),
                            });
                            const d = await r.json();
                            if (r.ok) {
                                showToast('Application submitted! 🎉', 'success');
                                applyBtn.textContent = '✅ Applied';
                                applyBtn.classList.add('applied');
                            } else if (r.status === 409) {
                                applyBtn.textContent = '✅ Already Applied';
                                applyBtn.classList.add('applied');
                            } else if (r.status === 403) {
                                showToast(d.message || 'Application deadline has passed.', 'warning');
                                applyBtn.textContent = '🔒 Closed';
                                applyBtn.classList.add('applied');
                            } else {
                                showToast(d.message || 'Application failed.', 'error');
                                applyBtn.textContent = '✉ Apply';
                                applyBtn.disabled = false;
                            }
                        } catch {
                            showToast('Server error.', 'error');
                            applyBtn.textContent = '✉ Apply';
                            applyBtn.disabled = false;
                        }
                    });
                }

                actionsRow.appendChild(fitBtn);
                actionsRow.appendChild(applyBtn);
                jobCard.insertBefore(actionsRow, jobCard.querySelector('.score-chip-area'));
            }

            // Owner-specific: applicant count chip
            if (isOwner) {
                fetch(`http://127.0.0.1:5000/api/applications?job_id=${job._id}`)
                    .then(r => r.json())
                    .then(apps => {
                        if (Array.isArray(apps) && apps.length > 0) {
                            const chip = document.createElement('span');
                            chip.className = 'applicant-chip';
                            chip.textContent = `👥 ${apps.length} applicant${apps.length > 1 ? 's' : ''}`;
                            chip.title = apps.map(a => a.candidate_name).join(', ');
                            jobCard.querySelector('.score-chip-area').appendChild(chip);
                        }
                    }).catch(() => {});
            }

            jobCard.querySelector('.view-details-btn')?.addEventListener('click', () => {
                showToast(`Viewing: ${job.title} at ${job.company_name}`, 'info');
            });

            if (isOwner) {
                // Edit button
                jobCard.querySelector('.edit-job-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(job);
                });
                // View Applicants button
                jobCard.querySelector('.view-applicants-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openApplicantsModal(job._id, job.title);
                });
                // Delete button
                jobCard.querySelector('.delete-btn')?.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    showConfirm(`Delete the job posting "<strong>${escapeHtml(job.title)}</strong>"? This cannot be undone.`, async () => {
                        await deleteJob(job._id);
                    });
                });
            }

            jobsList.appendChild(jobCard);
        });

        // Pre-mark already-applied jobs
        checkAppliedJobs(userType);
    }

    async function deleteJob(jobId) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/delete-job/${jobId}?company_id=${userId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showToast('Job posting deleted successfully!', 'success');
                allJobs = allJobs.filter(job => job._id !== jobId);
                applyFilterAndSort();
            } else {
                const result = await response.json();
                showToast(`Error: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting job:', error);
            showToast('An unexpected error occurred. Please try again.', 'error');
        }
    }

    // Pre-mark apply buttons for jobs the user has already applied to
    async function checkAppliedJobs(currentUserType) {
        if (currentUserType === 'company') return;
        try {
            const r    = await fetch(`http://127.0.0.1:5000/api/applications?user_id=${userId}`);
            const apps = await r.json();
            if (!Array.isArray(apps)) return;
            apps.forEach(app => {
                const btn = document.querySelector(`.btn-apply[data-job-id="${app.job_id}"]`);
                if (btn) {
                    btn.textContent = '✅ Applied';
                    btn.classList.add('applied');
                    btn.disabled = true;
                }
            });
        } catch { /* silent */ }
    }

    function applyFilterAndSort() {
        const searchTerm = document.getElementById('job-search')?.value.toLowerCase() || '';
        const sortValue  = document.getElementById('job-sort')?.value || 'newest';

        let filtered = allJobs.filter(job =>
            job.title.toLowerCase().includes(searchTerm) ||
            job.company_name.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm)
        );

        if (sortValue === 'title-asc')    filtered.sort((a, b) => a.title.localeCompare(b.title));
        else if (sortValue === 'title-desc')   filtered.sort((a, b) => b.title.localeCompare(a.title));
        else if (sortValue === 'company-asc')  filtered.sort((a, b) => a.company_name.localeCompare(b.company_name));

        renderJobs(filtered);
    }

    document.getElementById('job-search')?.addEventListener('input', applyFilterAndSort);
    document.getElementById('job-sort')?.addEventListener('change', applyFilterAndSort);

    loadAllJobs();

    // ── Post a New Job toggle ───────────────────────────────────────────
    const showPostJobBtn = document.getElementById('show-post-job-form');
    const postJobSection = document.getElementById('post-job-section');
    if (showPostJobBtn && postJobSection) {
        showPostJobBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isVisible = postJobSection.style.display !== 'none';
            postJobSection.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) postJobSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ── Post Job form submission ────────────────────────────────────────
    const postJobForm = document.getElementById('post-job-form');
    if (postJobForm) {
        postJobForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(postJobForm);
            const jsonData = {
                title:           formData.get('title'),
                description:     formData.get('description'),
                required_skills: formData.get('required_skills') || '',
                last_date:       formData.get('last_date') || '',
                company_id:      userId,
                company_name:    storedUsername
            };

            const submitBtn = postJobForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Publishing…';
            submitBtn.disabled = true;

            try {
                const response = await fetch('http://127.0.0.1:5000/api/post-job', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(jsonData),
                });
                const result = await response.json();
                if (response.ok) {
                    showToast('Job posted successfully! It is now visible to all candidates.', 'success');
                    postJobForm.reset();
                    postJobSection.style.display = 'none';
                    await loadAllJobs();
                } else {
                    showToast(`Error: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error('Error posting job:', error);
                showToast('An unexpected error occurred. Please try again.', 'error');
            } finally {
                submitBtn.textContent = 'Publish Job';
                submitBtn.disabled = false;
            }
        });
    }

    // ── Logout ─────────────────────────────────────────────────────────
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function (event) {
            event.preventDefault();
            if (!confirm('Are you sure you want to log out?')) return;
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            localStorage.removeItem('user_type');
            window.location.href = 'index.html';
        });
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

