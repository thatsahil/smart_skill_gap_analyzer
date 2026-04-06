// frontend/js/profile.js (Phase 2 — with resume upload)

const BACKEND_PROFILE = 'http://127.0.0.1:5000';

// ── Toast / Confirm (shared pattern) ──────────────────────────────────
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

// ── Main ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    const userId   = localStorage.getItem('user_id');
    const userType = localStorage.getItem('user_type');

    if (!userId) { window.location.href = 'login.html'; return; }

    setActiveNav();

    const candidateProfile = document.getElementById('candidate-profile');
    const companyProfile   = document.getElementById('company-profile');
    const candidateForm    = document.getElementById('candidate-profile-form');
    const companyForm      = document.getElementById('company-profile-form');

    if (userType === 'company') {
        if (companyProfile)   companyProfile.style.display = 'block';
        if (candidateProfile) candidateProfile.style.display = 'none';
        loadProfile(companyForm);
    } else {
        if (candidateProfile) candidateProfile.style.display = 'block';
        if (companyProfile)   companyProfile.style.display = 'none';
        loadProfile(candidateForm);
        initResumeSection(userId);
    }

    // ── Profile form submission ──────────────────────────────────────
    async function loadProfile(form) {
        try {
            const res  = await fetch(`${BACKEND_PROFILE}/api/profile?user_id=${userId}`);
            const data = await res.json();
            if (res.ok) {
                for (const key in data) {
                    const input = form?.elements[key];
                    if (input) input.value = data[key] || '';
                }
            } else {
                showToast('Error loading profile: ' + data.message, 'error');
            }
        } catch {
            showToast('Could not connect to the server.', 'error');
        }
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        const form       = event.target;
        const submitBtn  = form.querySelector('button[type="submit"]');
        const formData   = new FormData(form);
        const jsonData   = { user_id: userId };
        formData.forEach((value, key) => { jsonData[key] = value; });

        submitBtn.textContent = 'Saving…';
        submitBtn.disabled    = true;

        try {
            const res    = await fetch(`${BACKEND_PROFILE}/api/profile`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(jsonData),
            });
            const result = await res.json();
            if (res.ok) {
                showToast('Profile updated successfully!', 'success');
                if (jsonData.name) localStorage.setItem('username', jsonData.name);
            } else {
                showToast(`Error: ${result.message}`, 'error');
            }
        } catch {
            showToast('An unexpected error occurred. Please try again.', 'error');
        } finally {
            submitBtn.textContent = 'Update Profile';
            submitBtn.disabled    = false;
        }
    }

    if (candidateForm) candidateForm.addEventListener('submit', handleProfileUpdate);
    if (companyForm)   companyForm.addEventListener('submit', handleProfileUpdate);

    // ── Delete Account ───────────────────────────────────────────────
    document.getElementById('delete-account-btn')?.addEventListener('click', () => {
        showConfirm(
            'Are you absolutely sure? This will <strong>permanently delete</strong> your account and all your data. This cannot be undone.',
            async () => {
                try {
                    const res = await fetch(`${BACKEND_PROFILE}/api/delete-account?user_id=${userId}`, { method: 'DELETE' });
                    if (res.ok) { localStorage.clear(); window.location.href = 'signup.html'; }
                    else { const r = await res.json(); showToast(`Error: ${r.message}`, 'error'); }
                } catch { showToast('An unexpected error occurred.', 'error'); }
            }
        );
    });

    // ── Logout ───────────────────────────────────────────────────────
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        if(!confirm('Are you sure you want to log out?')) return;
        e.preventDefault();
        localStorage.removeItem('user_id');
        localStorage.removeItem('username');
        localStorage.removeItem('user_type');
        window.location.href = 'index.html';
    });
});

// ── Resume Section ─────────────────────────────────────────────────────
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

    // Check if resume exists
    fetch(`http://127.0.0.1:5000/api/resume?user_id=${userId}`)
        .then(r => r.json())
        .then(data => {
            if (data.exists) {
                showStoredResume(userId, data, storedState, uploadState, downloadBtn);
            }
        })
        .catch(() => { /* stay in upload state */ });

    // Drag & drop / click on dropzone
    dropzone?.addEventListener('click', (e) => {
        if (!e.target.closest('#upload-resume-btn')) fileInput.click();
    });
    dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) selectFile(file, fileInput, dropContent, fileSelected, fileNameEl);
    });

    fileInput?.addEventListener('change', () => {
        if (fileInput.files[0]) selectFile(fileInput.files[0], fileInput, dropContent, fileSelected, fileNameEl);
    });

    // Upload button
    uploadBtn?.addEventListener('click', async () => {
        if (!fileInput.files[0]) return;
        uploadBtn.textContent = 'Uploading…';
        uploadBtn.disabled    = true;

        const fd = new FormData();
        fd.append('user_id', userId);
        fd.append('resume', fileInput.files[0]);

        try {
            const res  = await fetch('http://127.0.0.1:5000/api/upload-resume', { method: 'POST', body: fd });
            const data = await res.json();
            if (res.ok) {
                showToast('Resume uploaded successfully!', 'success');
                showStoredResume(userId, { exists: true }, storedState, uploadState, downloadBtn);
            } else {
                showToast(data.message || 'Upload failed.', 'error');
            }
        } catch { showToast('Could not connect to server.', 'error'); }
        finally {
            uploadBtn.textContent = 'Upload';
            uploadBtn.disabled    = false;
        }
    });

    // Replace button — go back to upload state
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
        downloadBtn.removeAttribute('onclick');
    }
}

function selectFile(file, input, dropContent, fileSelected, fileNameEl) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Only PDF files are accepted.', 'error');
        return;
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    fileNameEl.textContent = file.name;
    dropContent.classList.add('hidden');
    fileSelected.classList.remove('hidden');
}

