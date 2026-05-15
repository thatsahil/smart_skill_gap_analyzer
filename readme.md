# Skill Gap Analyzer for Job Seekers

## Overview
The Skill Gap Analyzer is an intelligent, multi-role platform designed to help job seekers identify missing skills needed to land their dream roles. By leveraging **SBERT (Sentence-BERT)** for semantic analysis and the **Google Gemini API** for AI-powered recommendations, the application bridges the gap between a candidate's current profile and a target job description — all within a unified dashboard for Candidates, Companies, and an Admin.

---

## Key Features

### Candidate
1. **Semantic Resume Analysis** — Upload a PDF resume + job description (text / PDF / posted job) and get an SBERT-powered semantic skill gap analysis with a match score ring.
2. **AI-Powered Recommendations** — Gemini API generates targeted learning resources for every identified skill gap.
3. **100% Match Detection** — When SBERT finds zero semantic gaps, the results page displays a **Perfect Match** callout with a full green ring.
4. **Personalized Learning Roadmaps** — Step-by-step AI-generated roadmaps for any skill, with curated resources and progress tracking.
5. **My Saved Roadmaps** — All previously generated roadmaps are displayed on the Roadmap page. Click **▶ Resume Roadmap** to instantly reload any saved roadmap without regenerating it.
6. **My Reports (inline)** — Saved analysis reports displayed directly on the Analyze page. Reports can be deleted individually.
7. **AI Career Coach** — Interactive chat widget for interview prep, resume tips, and career advice (candidates only).
8. **Job Board + Apply** — Browse all job openings and apply with one click.
9. **Deadline Enforcement** — Jobs past their application deadline show a **CLOSED** badge; the Apply button is disabled.
10. **Interview Coaching Tools (Self-Intro)** — On the Profile page, generate a customized AI self-introduction script based on your experience. Listen to the script using customizable Text-to-Speech (Indian-English accents, male/female voices, speed control), and practice delivery via microphone to get real-time AI feedback. Scripts can be saved directly to your profile.
### Company
1. **Post Jobs** — Create job openings with Title, Description, Required Skills, and Last Date to Apply.
2. **Manage Postings** — Edit or delete your job listings from the dashboard.
3. **View Applications (2-Step Modal)** — Click "View Applications" → see your jobs with applicant counts → select a job to see each applicant's name, email, skills, applied date, and resume PDF download.
4. **📊 ATS Score Analysis** — Inside the applicants modal, click **ATS Score** next to any candidate who has uploaded a resume to see:
   - Their heuristic ATS score (0–100) based on resume quality (length, skills, sections, contact info).
   - Job-fit percentage and skill gap percentage (SBERT-powered, if available).
   - Top detected skills from their resume.
5. **Restricted Navigation** — Company accounts see only Dashboard and Profile in the nav bar. Chatbot, Analyze, and Roadmap are hidden.

### Admin
1. **Platform Overview** — Live stats: total users, candidates, companies, jobs posted, applications, reports.
2. **Seed Demo Users** — One-click button to populate 12 demo candidates + 4 demo companies.
3. **User Management** — View, search, and delete any user account.
4. **Job Management** — View and delete any job posting platform-wide.
5. **Application Management** — View all applications with resume download links.
6. **🎯 Cluster Resumes** — Group all candidates by tech role (Frontend Developer, Backend Developer, DevOps, AI/ML, etc.) using keyword matching on skills, experience, and role fields.

---

## How Role-Based Views Work

The app uses a **client-side role switching** pattern with `localStorage`:

### 1. Role Stored at Signup (Backend)
```python
# models/auth.py
user_data = { "name": name, "email": email, "user_type": user_type }  # "candidate" | "company" | "admin"
```

### 2. Role Returned at Login → Saved to localStorage (Frontend)
```js
localStorage.setItem('user_id',   data.user_id);
localStorage.setItem('username',  data.username);
localStorage.setItem('user_type', data.user_type);
```

### 3. Dashboard HTML Has All Three Sections, Hidden by Default
```html
<div id="candidate-dashboard" style="display:none;"> … </div>
<div id="company-dashboard"   style="display:none;"> … </div>
<div id="admin-dashboard"     style="display:none;"> … </div>
```

### 4. JavaScript Reads `user_type` and Switches the View
```js
const userType = localStorage.getItem('user_type');

if (userType === 'company') {
    companySection.style.display = 'block';
    document.getElementById('nav-analyze')?.remove();   // strip nav links
    document.getElementById('nav-roadmap')?.remove();
} else if (userType === 'admin') {
    window.location.href = 'admin.html';                // full redirect
} else {
    candidateSection.style.display = 'block';
}
```

### 5. Job Cards Also Render Differently Per Role
```js
const isOwner     = userType === 'company' && job.company_id === userId;
const isCandidate = userType !== 'company';

if (isCandidate) { /* render Apply button */ }
if (isOwner)     { /* render Edit / Delete / View Applicants */ }
```

> **Security note:** All sensitive API actions (delete, edit, apply) are also validated server-side — the backend checks `company_id` ownership before allowing mutations.

---

## How SBERT Semantic Gap Analysis Works

SBERT (Sentence-BERT) is a transformer model that converts text into dense numerical vectors called **embeddings**, which capture *meaning*, not just keywords.

### Step-by-Step Pipeline

```
Resume PDF  ──► Text Extraction (pdfplumber)  ──► Resume Text
Job Description ──────────────────────────────► JD Text
                                                     │
                              ┌──────────────────────┘
                              ▼
                 Extract Skill Terms from JD
                 (NLTK noun chunks + known tech keyword list)
                              │
                              ▼
                 For each JD skill term:
                   • Encode skill with SBERT  →  skill_embedding
                   • Encode resume text with SBERT  →  resume_embedding
                   • Compute cosine similarity between them
                              │
                              ▼
                 similarity < 0.55 threshold?
                   YES → skill is a GAP (underrepresented in resume)
                   NO  → skill is adequately covered
                              │
                              ▼
                 Gap skills passed to Gemini API
                 → generates "why needed" + learning resources
                              │
                              ▼
                 Results returned: gap skills, similarity scores,
                 ATS score, match % ring, skill cards with links
```

### Cosine Similarity Explained

Given two embedding vectors **A** (resume) and **B** (skill term):

```
cosine_similarity = (A · B) / (|A| × |B|)
```

- Result is between **0** (no semantic relation) and **1** (identical meaning).
- A skill scoring **< 0.55** means the resume doesn't discuss that concept closely enough → flagged as a gap.

### Why SBERT Over Keyword Matching?

| Keyword Matching | SBERT Semantic Matching |
|---|---|
| Misses synonyms ("ML" ≠ "Machine Learning") | Understands synonyms and context |
| Fails for paraphrased skills | Captures meaning, not exact words |
| No notion of relevance strength | Returns a similarity *score* (0–1) |
| Binary match / no-match | Graded — shows *how big* the gap is |

### Match Score Callout

The match score ring shown after analysis is computed as:

```
match_score = average cosine similarity across all detected gap skills × 100
```

- **100%** → SBERT found zero gaps (Perfect Match)
- **≥ 70%** → Great Match
- **≥ 50%** → Good Match
- **≥ 35%** → Partial Match
- **< 35%** → Low Match

### ATS Score (Heuristic)

A separate heuristic score (0–100) rates resume quality for Applicant Tracking Systems:

| Factor | Max Points |
|--------|-----------|
| Word count (ideal: 300–700 words) | 25 |
| Number of skills detected | 35 |
| Standard section headings present | 25 |
| Contact info (email, phone, LinkedIn, GitHub) | 15 |

---

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript
- **Backend**: Python 3.10+, Flask, Flask-CORS
- **Database**: MongoDB (via PyMongo)
- **AI/NLP**: Google Gemini API (`gemini-2.5-flash`), `sentence-transformers` (SBERT `all-MiniLM-L6-v2`), `nltk`
- **PDF Processing**: `pdfplumber`

---

## Setup and Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/skill-gap-analyzer.git
cd skill-gap-analyzer
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Do not commit `.env` to version control)*

### 3. Setup the Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Backend runs at `http://127.0.0.1:5000`

### 4. Access the Frontend
Open `http://127.0.0.1:5000` in your browser (Flask serves the frontend).

### 5. Create the Admin Account (first time only)
```bash
curl -X POST http://127.0.0.1:5000/api/admin/seed
```

### 6. Seed Demo Users & Companies
Log in as admin → Overview panel → click **🪄 Seed Demo Users & Companies**, or:
```bash
curl -X POST "http://127.0.0.1:5000/api/admin/seed-demo?admin_id=<YOUR_ADMIN_ID>"
```

---

## Demo Credentials

### Admin Account
| Email | Password |
|-------|----------|
| `admin@skillgap.io` | `Admin@12345` |

### Demo Candidates (12 users)
**All passwords:** `Demo@12345`

| Name | Email | Role / Skills |
|------|-------|---------------|
| Aisha Khan | `aisha.khan@demo.com` | Frontend Developer — React, JS, CSS, Next.js |
| Rohan Mehta | `rohan.mehta@demo.com` | Backend Developer — Node.js, Express, MongoDB |
| Priya Sharma | `priya.sharma@demo.com` | Backend Developer — Python, Django, Flask |
| Arjun Nair | `arjun.nair@demo.com` | Full Stack Developer — React, Node, AWS, Docker |
| Sneha Patel | `sneha.patel@demo.com` | AI/ML Engineer — TensorFlow, PyTorch, NLP |
| Vikram Singh | `vikram.singh@demo.com` | DevOps Engineer — AWS, Kubernetes, Terraform |
| Meera Iyer | `meera.iyer@demo.com` | Mobile Developer — Flutter, Android, iOS |
| Rahul Gupta | `rahul.gupta@demo.com` | Data Engineer — Spark, Kafka, Airflow, BigQuery |
| Divya Reddy | `divya.reddy@demo.com` | Database Administrator — MySQL, PostgreSQL, Oracle |
| Karan Bhatt | `karan.bhatt@demo.com` | Cybersecurity — Pen Testing, SIEM, SOC |
| Anjali Verma | `anjali.verma@demo.com` | Frontend Developer — Vue.js, Angular, Figma |
| Siddharth Joshi | `siddharth.joshi@demo.com` | QA Engineer — Selenium, Cypress, Pytest |

### Demo Companies (4 accounts)
**All passwords:** `Demo@12345`

| Company | Email | Industry |
|---------|-------|----------|
| TechNova Solutions | `hr@technova.demo` | Software Development |
| DataPulse Analytics | `careers@datapulse.demo` | Data & Analytics |
| FinSecure Corp | `jobs@finsecure.demo` | FinTech & Cybersecurity |
| MobileCraft Studio | `talent@mobilecraft.demo` | Mobile Applications |

### Demo Job Postings (8 jobs — pre-seeded)

| Job Title | Company | Required Skills | Deadline |
|-----------|---------|-----------------|----------|
| Senior React Developer | TechNova Solutions | React, TypeScript, Redux | 2026-06-30 |
| DevOps Engineer | TechNova Solutions | Docker, Kubernetes, AWS | 2026-05-31 |
| Backend Python Developer | TechNova Solutions | Python, Flask, PostgreSQL | 2026-06-15 |
| Data Engineer - Spark & Kafka | DataPulse Analytics | Spark, Kafka, Airflow | 2026-06-20 |
| ML Engineer | DataPulse Analytics | TensorFlow, PyTorch, NLP | 2026-07-01 |
| Cybersecurity Analyst | FinSecure Corp | SIEM, SOC, Pen Testing | 2026-05-25 |
| QA Automation Engineer | FinSecure Corp | Selenium, Cypress, Pytest | 2026-07-15 |
| Flutter Mobile Developer | MobileCraft Studio | Flutter, Dart, Firebase | 2026-06-10 |

---

## Admin Panel

### Access
URL: `/admin.html` — only accessible to admin accounts.

### Capabilities
- 📊 **Overview** — Platform stats + **🪄 Seed Demo Users & Companies** button
- 👥 **Users** — Search, view, and delete all user accounts
- 💼 **Jobs** — View all job postings with applicant count, delete any
- 📄 **Applications** — All applications with candidate details and resume links
- 🎯 **Cluster Resumes** — Role-based clustering of all candidates

### Resume Clustering
The admin Cluster Resumes panel categorises all candidate profiles into tech domains:

| Cluster | Keywords Matched |
|---------|-----------------|
| Frontend Developer | React, Vue, Angular, HTML, CSS, Next.js |
| Backend Developer | Node.js, Django, Flask, Express, REST API |
| Full Stack Developer | MERN, MEAN, Full Stack |
| Data Scientist | ML, TensorFlow, PyTorch, Pandas, Jupyter |
| Data Engineer | Spark, Kafka, Airflow, ETL, BigQuery |
| DevOps Engineer | Docker, Kubernetes, AWS, Terraform, CI/CD |
| Mobile Developer | Flutter, Android, iOS, React Native |
| AI/ML Engineer | NLP, LLM, Computer Vision, BERT, GPT |
| Cybersecurity | SIEM, SOC, Pen Testing, Firewall |
| QA Engineer | Selenium, Cypress, Pytest, Automation Testing |
| Database Administrator | MySQL, PostgreSQL, MongoDB, Oracle |
| Cloud Engineer | AWS, Azure, GCP, Serverless |

API: `GET /api/admin/cluster-candidates?admin_id=<id>&role=Frontend Developer`

---

## Backend API Reference

### Auth & Profile
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/signup` | Register a new user |
| `POST` | `/api/login` | Login and get user session data |
| `GET`  | `/api/profile` | Get user profile |
| `POST` | `/api/profile` | Update user profile |
| `DELETE` | `/api/delete-account` | Delete own account |
| `POST` | `/api/save-progress` | Save roadmap progress to DB |
| `GET`  | `/api/load-progress` | Load roadmap progress from DB |
| `GET`  | `/api/my-roadmaps` | List all saved roadmaps for a user |
| `POST` | `/api/generate-intro` | Generate an AI self-introduction script |
| `POST` | `/api/evaluate-intro` | Analyze practice audio transcript vs ideal script |

### Resume & Analysis
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/upload-resume` | Upload candidate PDF resume |
| `GET`  | `/api/resume` | Check if stored resume exists |
| `GET`  | `/api/resume/download` | Download a resume PDF |
| `POST` | `/api/analyze` | Run SBERT + Gemini skill gap analysis |
| `POST` | `/api/resume-scan` | ATS score + skills scan (no JD needed) |
| `POST` | `/api/ats-score` | Company: get candidate ATS score + job-fit % |
| `POST` | `/api/generate-roadmap` | Generate an AI learning roadmap |

### Reports
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/save-report` | Save an analysis report |
| `GET`  | `/api/reports` | List saved reports for a user |
| `DELETE` | `/api/reports/<id>` | Delete a saved report |

### Jobs & Applications
| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/api/jobs` | List all jobs (with `is_expired` flag) |
| `GET`  | `/api/jobs/company/<id>` | List jobs by company with applicant counts |
| `POST` | `/api/post-job` | Post a new job |
| `PUT`  | `/api/edit-job/<id>` | Edit a job posting |
| `DELETE` | `/api/delete-job/<id>` | Delete a job |
| `POST` | `/api/apply` | Apply to a job (deadline-enforced) |
| `GET`  | `/api/applications` | List applications by job_id or user_id |

### Admin
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/admin/seed` | Create the admin account |
| `POST` | `/api/admin/seed-demo` | Seed 12 demo candidates + 4 companies |
| `GET`  | `/api/admin/stats` | Platform-wide statistics |
| `GET`  | `/api/admin/users` | List all users |
| `DELETE` | `/api/admin/users/<id>` | Delete a user |
| `PATCH` | `/api/admin/users/<id>` | Update a user |
| `GET`  | `/api/admin/jobs` | All jobs with applicant counts (admin) |
| `DELETE` | `/api/admin/jobs/<id>` | Delete any job |
| `GET`  | `/api/admin/applications` | All applications (admin) |
| `GET`  | `/api/admin/cluster-candidates` | Cluster candidates by role |

### Other
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/chatbot` | AI career coach (candidates only) |

---

## Project Structure

```
smart_skill_gap_analyzer/
├── backend/
│   ├── app.py                  ← Flask entry point, serves frontend
│   ├── .env                    ← GEMINI_API_KEY (gitignored)
│   ├── models/
│   │   ├── admin.py            ← Admin CRUD, stats, cluster, seed-demo
│   │   ├── auth.py             ← Login, signup, profile, roadmap progress, /api/my-roadmaps
│   │   ├── jobs.py             ← Jobs CRUD + deadline enforcement + company job list
│   │   ├── analyze.py          ← SBERT + Gemini analysis pipeline, ATS score heuristic
│   │   ├── resume.py           ← PDF upload/download, /api/ats-score for companies
│   │   ├── reports.py          ← Save/list/delete reports
│   │   ├── chatbot.py          ← Gemini career chat
│   │   ├── database.py         ← MongoDB connection + collection references
│   │   └── utils.py            ← SBERT semantic gap helpers, skill extraction
│   └── uploads/                ← Candidate resume PDFs (gitignored)
│
├── frontend/
│   ├── index.html              ← Public landing page
│   ├── login.html              ← Login page
│   ├── signup.html             ← Registration page
│   ├── dashboard.html          ← Multi-role dashboard (Candidate / Company / Admin)
│   ├── analyze.html            ← Skill gap analysis + My Reports (inline)
│   ├── skill-gap-reports.html  ← Learning roadmap generator + My Saved Roadmaps
│   ├── profile.html            ← User/company profile + resume scan
│   ├── manageResume.html       ← Dedicated resume management page
│   ├── admin.html              ← Admin panel (admin only)
│   ├── css/
│   │   ├── style.css
│   │   ├── analyze.css
│   │   ├── dashboard.css
│   │   └── skill-gap-reports.css
│   └── js/
│       ├── dashboard.js        ← Dashboard logic, job listings, applicants modal, ATS score
│       ├── analyze.js          ← Analysis pipeline, match score ring, inline My Reports
│       ├── skill-gap-reports.js ← Roadmap generator, saved roadmaps panel
│       ├── admin.js            ← Admin panel, cluster, seed
│       ├── profile.js          ← Profile management
│       ├── manageResume.js     ← Resume upload and ATS scan
│       └── chat-widget.js      ← AI career chatbot (candidates only)
│
├── documents/                  ← Project documentation
├── readme.md
└── .gitignore
```

---

## Changelog

### v3.0 — May 2026

#### Skill Gap Analysis
- **100% Match Display** — When SBERT detects zero semantic gaps, the match score callout now shows a full green ring with label **"Perfect Match"** instead of being hidden.
- **Meta line fix** — Results meta text correctly reflects the zero-gap state: *"✅ 100% semantic match — no skill gaps detected via SBERT"*.

#### Dashboard
- **Removed Check Fit** — The `⚡ Check Fit` button and score chip have been removed from job cards. Candidates now only see the **Apply** button.

#### Candidate Profile — Interview Coaching Tools
- **Self-Intro Generation** — Candidates can generate a customized self-introduction script tailored to their experience, internships, and certifications.
- **Voice Playback** — Integrated Text-to-Speech (TTS) with Indian-English accents, allowing candidates to select female/male voices and adjust playback speed to listen to the generated introduction.
- **Speech Practice & Feedback** — Added microphone integration (SpeechRecognition API) to let candidates practice their intro delivery. Evaluated by Gemini AI (`/api/evaluate-intro`) to provide constructive feedback on content coverage, clarity, and tips for improvement.
- **Persistent Storage** — Self-intro scripts can be saved to the candidate's profile.

#### Company — ATS Score
- **New `/api/ats-score` endpoint** — Companies click **📊 ATS Score** next to any applicant (who has a resume) to see:
  - Heuristic ATS score (0–100).
  - SBERT-based job-fit % and gap % against the current job.
  - Detected skills from the candidate's resume.

#### Roadmap Page — Saved Roadmaps
- **My Saved Roadmaps panel** — Displays all previously generated roadmaps as cards with a mini progress ring showing completion %.
- **▶ Resume Roadmap** — Instantly reloads a saved roadmap (no re-generation needed).
- **↺ Refresh** button to re-fetch the list from the backend.
- **New `/api/my-roadmaps` endpoint** — Returns all roadmaps stored in the user document as a flat list with skill, level, total steps, done count, and progress %.

### v2.0 — April 2026
- Added **Company: View Applications 2-step modal** with applicant counts per job.
- Added **Admin: Cluster Resumes** panel for role-based candidate grouping.
- Added **Required Skills** and **Last Date to Apply** fields to jobs.
- Added **Deadline enforcement** on Apply button (frontend + backend).
- Added **Admin: Seed Demo Users & Companies** (12 candidates, 4 companies, 8 jobs).
- Added **Roadmap progress persistence** to MongoDB (`/api/save-progress`, `/api/load-progress`).
- Added **My Reports inline** on the Analyze page.
- Restricted Company navigation (no Analyze / Roadmap / Chatbot).
- Added **Resume Scan** endpoint (`/api/resume-scan`) for profile page ATS preview.

### v1.0 — Initial Release
- SBERT + Gemini skill gap analysis pipeline.
- Candidate and Company role-based dashboards.
- Job board with Apply functionality.
- AI career chatbot for candidates.
- Admin panel with user/job/application management.
