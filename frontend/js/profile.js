// frontend/js/profile.js — Extended profile with experience, internships, certifications

const BACKEND_PROFILE = 'http://127.0.0.1:5000';

// ── Toast ─────────────────────────────────────────────────────────────────────
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
    toast.style.cssText = `display:flex;align-items:center;gap:12px;padding:13px 18px;border-radius:10px;
        min-width:260px;max-width:380px;background:${c.bg};border:1px solid ${c.border};color:${c.text};
        font-family:'Inter',sans-serif;font-size:0.875rem;font-weight:500;backdrop-filter:blur(12px);
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
            padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
            <p style="color:#f1f5f9;font-size:1rem;font-family:'Inter',sans-serif;line-height:1.6;margin-bottom:24px;">${message}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button id="c-cancel" style="padding:10px 22px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                    background:transparent;color:#94a3b8;font-family:'Inter',sans-serif;cursor:pointer;font-size:0.9rem;">Cancel</button>
                <button id="c-ok" style="padding:10px 22px;border-radius:8px;border:none;
                    background:linear-gradient(135deg,#ef4444,#dc2626);color:white;
                    font-family:'Inter',sans-serif;cursor:pointer;font-size:0.9rem;font-weight:600;">Delete My Account</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#c-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#c-ok').onclick = () => { overlay.remove(); onConfirm(); };
}

// ── Sidebar Navigation ────────────────────────────────────────────────────────
function initSidebarNav() {
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.profile-section-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const sectionId = 'section-' + btn.dataset.section;
            document.getElementById(sectionId)?.classList.add('active');
        });
    });
}

// ── Entry Builders ────────────────────────────────────────────────────────────
function buildExperienceEntry(data = {}) {
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
        <button type="button" class="entry-remove" title="Remove">✕</button>
        <div class="fg"><label>Job Title</label>
            <input type="text" name="exp_title" placeholder="Software Engineer" value="${escStr(data.title||'')}"></div>
        <div class="fg"><label>Company</label>
            <input type="text" name="exp_company" placeholder="Google" value="${escStr(data.company||'')}"></div>
        <div class="fg"><label>Start Date</label>
            <input type="month" name="exp_start" value="${escStr(data.start||'')}"></div>
        <div class="fg"><label>End Date (leave blank if current)</label>
            <input type="month" name="exp_end" value="${escStr(data.end||'')}"></div>
        <div class="fg span-2"><label>Description</label>
            <textarea name="exp_desc" rows="2" placeholder="Key achievements and responsibilities…">${escStr(data.description||'')}</textarea></div>`;
    div.querySelector('.entry-remove').onclick = () => div.remove();
    return div;
}

function buildInternshipEntry(data = {}) {
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
        <button type="button" class="entry-remove" title="Remove">✕</button>
        <div class="fg"><label>Role</label>
            <input type="text" name="int_role" placeholder="Frontend Intern" value="${escStr(data.role||'')}"></div>
        <div class="fg"><label>Organization</label>
            <input type="text" name="int_org" placeholder="Startup XYZ" value="${escStr(data.organization||'')}"></div>
        <div class="fg"><label>Duration</label>
            <input type="text" name="int_duration" placeholder="Jun 2024 – Aug 2024" value="${escStr(data.duration||'')}"></div>
        <div class="fg"><label>Type</label>
            <select name="int_type">
                <option value="">Select…</option>
                ${['On-site','Remote','Hybrid'].map(o=>`<option${data.type===o?' selected':''}>${o}</option>`).join('')}
            </select></div>
        <div class="fg span-2"><label>What You Did</label>
            <textarea name="int_desc" rows="2" placeholder="Key tasks and learnings…">${escStr(data.description||'')}</textarea></div>`;
    div.querySelector('.entry-remove').onclick = () => div.remove();
    return div;
}

function buildCertificationEntry(data = {}) {
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
        <button type="button" class="entry-remove" title="Remove">✕</button>
        <div class="fg"><label>Certificate Name</label>
            <input type="text" name="cert_name" placeholder="AWS Certified Developer" value="${escStr(data.name||'')}"></div>
        <div class="fg"><label>Issuing Organization</label>
            <input type="text" name="cert_org" placeholder="Amazon Web Services" value="${escStr(data.organization||'')}"></div>
        <div class="fg"><label>Issue Date</label>
            <input type="month" name="cert_date" value="${escStr(data.date||'')}"></div>
        <div class="fg"><label>Credential ID / URL</label>
            <input type="text" name="cert_url" placeholder="Credential ID or verify URL" value="${escStr(data.credential||'')}"></div>`;
    div.querySelector('.entry-remove').onclick = () => div.remove();
    return div;
}

function escStr(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Collect entry lists ───────────────────────────────────────────────────────
function collectExperience() {
    return [...document.querySelectorAll('#experience-list .entry-item')].map(el => ({
        title:       el.querySelector('[name=exp_title]')?.value.trim()||'',
        company:     el.querySelector('[name=exp_company]')?.value.trim()||'',
        start:       el.querySelector('[name=exp_start]')?.value||'',
        end:         el.querySelector('[name=exp_end]')?.value||'',
        description: el.querySelector('[name=exp_desc]')?.value.trim()||'',
    }));
}

function collectInternships() {
    return [...document.querySelectorAll('#internships-list .entry-item')].map(el => ({
        role:         el.querySelector('[name=int_role]')?.value.trim()||'',
        organization: el.querySelector('[name=int_org]')?.value.trim()||'',
        duration:     el.querySelector('[name=int_duration]')?.value.trim()||'',
        type:         el.querySelector('[name=int_type]')?.value||'',
        description:  el.querySelector('[name=int_desc]')?.value.trim()||'',
    }));
}

function collectCertifications() {
    return [...document.querySelectorAll('#certifications-list .entry-item')].map(el => ({
        name:         el.querySelector('[name=cert_name]')?.value.trim()||'',
        organization: el.querySelector('[name=cert_org]')?.value.trim()||'',
        date:         el.querySelector('[name=cert_date]')?.value||'',
        credential:   el.querySelector('[name=cert_url]')?.value.trim()||'',
    }));
}

// ── Populate entry lists from saved data ──────────────────────────────────────
function populateExperience(list) {
    const container = document.getElementById('experience-list');
    if (!container) return;
    container.innerHTML = '';
    (list||[]).forEach(item => container.appendChild(buildExperienceEntry(item)));
}

function populateInternships(list) {
    const container = document.getElementById('internships-list');
    if (!container) return;
    container.innerHTML = '';
    (list||[]).forEach(item => container.appendChild(buildInternshipEntry(item)));
}

function populateCertifications(list) {
    const container = document.getElementById('certifications-list');
    if (!container) return;
    container.innerHTML = '';
    (list||[]).forEach(item => container.appendChild(buildCertificationEntry(item)));
}

// ── Active Nav ────────────────────────────────────────────────────────────────
function setActiveNav() {
    const current = window.location.pathname.split('/').pop() || 'profile.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href !== '#' && current.includes(href.replace('.html', ''))) {
            a.style.color = 'var(--accent-light, #a78bfa)';
            a.style.fontWeight = '700';
        }
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    const userId   = localStorage.getItem('user_id');
    const userType = localStorage.getItem('user_type');

    if (!userId) { window.location.href = 'login.html'; return; }

    setActiveNav();
    if (userType === 'company') {
        document.getElementById('nav-analyze')?.remove();
        document.getElementById('nav-roadmap')?.remove();
        window._suppressChatbot = true;
    }

    const candidateProfile = document.getElementById('candidate-profile');
    const companyProfile   = document.getElementById('company-profile');

    if (userType === 'company') {
        if (companyProfile)   companyProfile.style.display = 'block';
        if (candidateProfile) candidateProfile.style.display = 'none';
        loadProfile(document.getElementById('company-profile-form'));
    } else {
        if (candidateProfile) candidateProfile.style.display = 'block';
        if (companyProfile)   companyProfile.style.display = 'none';
        initSidebarNav();
        loadProfile(document.getElementById('candidate-profile-form'));
        initResumeSection(userId);
        initEntryLists();
    }

    // ── Load profile ──────────────────────────────────────────────────────
    async function loadProfile(form) {
        try {
            const res  = await fetch(`${BACKEND_PROFILE}/api/profile?user_id=${userId}`);
            const data = await res.json();
            if (res.ok) {
                for (const key in data) {
                    const input = form?.elements[key];
                    if (input) input.value = data[key] || '';
                }
                // Populate dynamic lists
                populateExperience(data.experience_list || []);
                populateInternships(data.internships_list || []);
                populateCertifications(data.certifications_list || []);
            }
        } catch { showToast('Could not connect to the server.', 'error'); }
    }

    // ── Basic profile form submit ─────────────────────────────────────────
    async function handleProfileUpdate(event) {
        event.preventDefault();
        const form      = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const formData  = new FormData(form);
        const jsonData  = { user_id: userId };
        formData.forEach((v, k) => { jsonData[k] = v; });

        submitBtn.textContent = 'Saving…';
        submitBtn.disabled = true;
        try {
            const res    = await fetch(`${BACKEND_PROFILE}/api/profile`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonData),
            });
            const result = await res.json();
            if (res.ok) {
                showToast('Profile updated successfully!', 'success');
                if (jsonData.name) localStorage.setItem('username', jsonData.name);
            } else {
                showToast(`Error: ${result.message}`, 'error');
            }
        } catch { showToast('An unexpected error occurred.', 'error'); }
        finally {
            submitBtn.textContent = '💾 Save Profile';
            submitBtn.disabled = false;
        }
    }

    document.getElementById('candidate-profile-form')?.addEventListener('submit', handleProfileUpdate);
    document.getElementById('company-profile-form')?.addEventListener('submit', handleProfileUpdate);

    // ── Entry list buttons ────────────────────────────────────────────────
    function initEntryLists() {
        document.getElementById('add-experience-btn')?.addEventListener('click', () => {
            document.getElementById('experience-list').appendChild(buildExperienceEntry());
        });
        document.getElementById('add-internship-btn')?.addEventListener('click', () => {
            document.getElementById('internships-list').appendChild(buildInternshipEntry());
        });
        document.getElementById('add-certification-btn')?.addEventListener('click', () => {
            document.getElementById('certifications-list').appendChild(buildCertificationEntry());
        });

        // Save handlers for each section
        document.getElementById('save-experience-btn')?.addEventListener('click', () => saveDynamicSection('experience_list', collectExperience(), 'save-experience-btn'));
        document.getElementById('save-internships-btn')?.addEventListener('click', () => saveDynamicSection('internships_list', collectInternships(), 'save-internships-btn'));
        document.getElementById('save-certifications-btn')?.addEventListener('click', () => saveDynamicSection('certifications_list', collectCertifications(), 'save-certifications-btn'));
    }

    async function saveDynamicSection(key, value, btnId) {
        const btn = document.getElementById(btnId);
        if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
        try {
            const res = await fetch(`${BACKEND_PROFILE}/api/profile`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, [key]: value }),
            });
            const result = await res.json();
            if (res.ok) showToast('Saved successfully!', 'success');
            else showToast(`Error: ${result.message}`, 'error');
        } catch { showToast('An unexpected error occurred.', 'error'); }
        finally { if (btn) { btn.textContent = '💾 Save ' + key.replace('_list','').replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()); btn.disabled = false; } }
    }

    // ── Generate Intro ────────────────────────────────────────────────────
    document.getElementById('generate-intro-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('generate-intro-btn');
        const container = document.getElementById('intro-result-container');
        const scriptText = document.getElementById('intro-script-text');
        const adviceText = document.getElementById('intro-advice-text');

        btn.textContent = 'Generating... Please wait';
        btn.disabled = true;

        try {
            const profileRes = await fetch(`${BACKEND_PROFILE}/api/profile?user_id=${userId}`);
            const profileData = await profileRes.json();
            if (!profileRes.ok) throw new Error('Could not fetch profile');

            const expStr = (profileData.experience_list || []).map(e => `${e.title} at ${e.company} (${e.start} - ${e.end})`).join(', ');
            const intStr = (profileData.internships_list || []).map(i => `${i.role} at ${i.organization} (${i.duration})`).join(', ');
            const certStr = (profileData.certifications_list || []).map(c => c.name).join(', ');

            const payload = {
                name: profileData.name || '',
                headline: profileData.headline || '',
                location: profileData.location || '',
                education: profileData.education || '',
                skills: profileData.skills || '',
                bio: profileData.bio || '',
                experience: expStr,
                internships: intStr,
                certifications: certStr
            };

            const introRes = await fetch(`${BACKEND_PROFILE}/api/generate-intro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const introData = await introRes.json();

            if (introRes.ok && introData.success) {
                scriptText.textContent = introData.data.intro_script;
                adviceText.textContent = introData.data.speaking_advice;
                container.style.display = 'block';
                showToast('Self-intro generated successfully!', 'success');
            } else {
                showToast(`Error: ${introData.error || 'Failed to generate intro'}`, 'error');
            }
        } catch (err) {
            showToast('An unexpected error occurred.', 'error');
        } finally {
            btn.textContent = '✨ Generate Intro';
            btn.disabled = false;
        }
    });

    // ── Delete account ────────────────────────────────────────────────────
    document.querySelectorAll('#delete-account-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showConfirm('Are you absolutely sure? This will <strong>permanently delete</strong> your account and all data.', async () => {
                try {
                    const res = await fetch(`${BACKEND_PROFILE}/api/delete-account?user_id=${userId}`, { method: 'DELETE' });
                    if (res.ok) { localStorage.clear(); window.location.href = 'signup.html'; }
                    else { const r = await res.json(); showToast(`Error: ${r.message}`, 'error'); }
                } catch { showToast('An unexpected error occurred.', 'error'); }
            });
        });
    });

    // ── Logout ────────────────────────────────────────────────────────────
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!confirm('Are you sure you want to log out?')) return;
        localStorage.clear();
        window.location.href = 'index.html';
    });
});

// ── Resume Section ────────────────────────────────────────────────────────────
function initResumeSection(userId) {
    const storedState  = document.getElementById('resume-stored-state');
    const uploadState  = document.getElementById('resume-upload-state');
    const dropzone     = document.getElementById('profile-resume-drop');
    const fileInput    = document.getElementById('profile-resume-input');
    const dropContent  = document.getElementById('profile-drop-content');
    const fileSelected = document.getElementById('profile-file-selected');
    const fileNameEl   = document.getElementById('profile-file-name');
    const uploadBtn    = document.getElementById('upload-resume-btn');
    const downloadBtn  = document.getElementById('download-resume-btn');
    const replaceBtn   = document.getElementById('replace-resume-btn');

    if (!storedState || !uploadState) return;

    fetch(`http://127.0.0.1:5000/api/resume?user_id=${userId}`)
        .then(r => r.json())
        .then(data => { if (data.exists) showStoredResume(userId, data, storedState, uploadState, downloadBtn); })
        .catch(() => {});

    dropzone?.addEventListener('click', (e) => { if (!e.target.closest('#upload-resume-btn')) fileInput.click(); });
    dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault(); dropzone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) selectFile(file, fileInput, dropContent, fileSelected, fileNameEl);
    });
    fileInput?.addEventListener('change', () => {
        if (fileInput.files[0]) selectFile(fileInput.files[0], fileInput, dropContent, fileSelected, fileNameEl);
    });

    uploadBtn?.addEventListener('click', async () => {
        if (!fileInput.files[0]) return;
        uploadBtn.textContent = 'Uploading…'; uploadBtn.disabled = true;
        const fd = new FormData();
        fd.append('user_id', userId);
        fd.append('resume', fileInput.files[0]);
        try {
            const res  = await fetch('http://127.0.0.1:5000/api/upload-resume', { method: 'POST', body: fd });
            const data = await res.json();
            if (res.ok) {
                showToast('Resume uploaded successfully!', 'success');
                showStoredResume(userId, { exists: true }, storedState, uploadState, downloadBtn);
            } else { showToast(data.message || 'Upload failed.', 'error'); }
        } catch { showToast('Could not connect to server.', 'error'); }
        finally { uploadBtn.textContent = 'Upload Resume'; uploadBtn.disabled = false; }
    });

    replaceBtn?.addEventListener('click', () => {
        storedState.classList.add('hidden');
        uploadState.style.display = '';
        fileInput.value = '';
        dropContent.classList.remove('hidden');
        fileSelected.classList.add('hidden');
    });
}

function showStoredResume(userId, data, storedState, uploadState, downloadBtn) {
    storedState.classList.remove('hidden');
    uploadState.style.display = 'none';
    if (downloadBtn) {
        downloadBtn.href = `http://127.0.0.1:5000/api/resume/download?user_id=${userId}`;
        downloadBtn.target = '_blank';
    }
}

function selectFile(file, input, dropContent, fileSelected, fileNameEl) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Only PDF files are accepted.', 'error'); return;
    }
    const dt = new DataTransfer(); dt.items.add(file);
    input.files = dt.files;
    fileNameEl.textContent = file.name;
    dropContent.classList.add('hidden');
    fileSelected.classList.remove('hidden');
}
