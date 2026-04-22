# Skill Gap Analyzer for Job Seekers

## Overview
The Skill Gap Analyzer is an intelligent, multi-role platform designed to help job seekers identify missing skills needed to land their dream roles. By leveraging SBERT (Sentence-BERT) for semantic analysis and the Google Gemini API for AI-powered recommendations, the application bridges the gap between a candidate's current profile and a target job description — all within a unified dashboard for Candidates, Companies, and an Admin.

---

## Key Features

### Candidate
1. **Semantic Resume Analysis** — Upload a PDF resume + job description (text/PDF/posted job) and get an SBERT-powered semantic skill gap analysis.
2. **AI-Powered Recommendations** — Gemini API generates targeted learning resources for every identified skill gap.
3. **Personalized Learning Roadmaps** — Step-by-step roadmaps with curated resources for missing skills.
4. **My Reports (inline)** — Saved analysis reports displayed directly on the Analyze page, no separate page required. Reports can be deleted individually.
5. **AI Career Coach** — Interactive chat widget for interview prep, resume tips, and career advice (candidates only).
6. **Job Board + Apply** — Browse all job openings, check fit score vs your resume, and apply with one click.
7. **Deadline Enforcement** — Jobs past their application deadline show a "CLOSED" badge; the Apply button is disabled.

### Company
1. **Post Jobs** — Create job openings with Title, Description, Required Skills, and Last Date to Apply.
2. **Manage Postings** — Edit or delete your job listings from the dashboard.
3. **View Applications (2-Step Modal)** — Click "View Applications" → see your jobs with applicant counts → select a job to see each applicant's name, email, skills, and download their resume PDF.
4. **Restricted Navigation** — Company accounts see only Dashboard and Profile in the nav bar. Chatbot, Analyze, and Roadmap are hidden.

### Admin
1. **Platform Overview** — Live stats: total users, candidates, companies, jobs posted, applications, reports.
2. **Seed Demo Users** — One-click button to populate 12 demo candidates + 4 demo companies.
3. **User Management** — View, search, and delete any user account.
4. **Job Management** — View and delete any job posting platform-wide.
5. **Application Management** — View all applications with resume download links.
6. **🎯 Cluster Resumes** — Group all candidates by tech role (Frontend Developer, Backend Developer, DevOps, AI/ML, etc.) using keyword matching on skills, experience, and role fields. Admin can select any cluster to see matching candidates and their resume links.

---

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript
- **Backend**: Python 3.10+, Flask, Flask-CORS
- **Database**: MongoDB (via PyMongo)
- **AI/NLP**: Google Gemini API, `sentence-transformers` (SBERT), `nltk`
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

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/register` | Register a new user |
| `POST` | `/api/login` | Login and get user session data |
| `GET`  | `/api/profile` | Get user profile |
| `PUT`  | `/api/update-profile` | Update user profile |
| `POST` | `/api/upload-resume` | Upload candidate PDF resume |
| `GET`  | `/api/resume` | Check if resume exists |
| `GET`  | `/api/resume/download` | Download a resume PDF |
| `POST` | `/api/analyze` | Run SBERT + Gemini skill gap analysis |
| `POST` | `/api/match-score` | Compute resume-to-job fit score |
| `POST` | `/api/save-report` | Save an analysis report |
| `GET`  | `/api/reports` | List saved reports for a user |
| `DELETE` | `/api/reports/<id>` | Delete a saved report |
| `GET`  | `/api/jobs` | List all jobs (with `is_expired` flag) |
| `GET`  | `/api/jobs/company/<id>` | List jobs by company with applicant counts |
| `POST` | `/api/post-job` | Post a new job (with `required_skills`, `last_date`) |
| `PUT`  | `/api/edit-job/<id>` | Edit a job posting |
| `DELETE` | `/api/delete-job/<id>` | Delete a job |
| `POST` | `/api/apply` | Apply to a job (deadline-enforced) |
| `GET`  | `/api/applications` | List applications by job_id or user_id |
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
| `POST` | `/api/chatbot` | AI career coach (candidates only) |
| `POST` | `/api/skill-roadmap` | Generate skill roadmap |

---

## Project Structure

```
smart_skill_gap_analyzer/
├── backend/
│   ├── app.py                  ← Flask entry point
│   ├── models/
│   │   ├── admin.py            ← Admin CRUD, stats, cluster, seed-demo
│   │   ├── auth.py             ← Login, register, profile
│   │   ├── jobs.py             ← Jobs CRUD + deadline enforcement + company job list
│   │   ├── analyze.py          ← SBERT + Gemini analysis pipeline
│   │   ├── resume.py           ← PDF upload/download/match-score
│   │   ├── reports.py          ← Save/list/delete reports
│   │   ├── chatbot.py          ← Gemini career chat
│   │   ├── database.py         ← MongoDB connection
│   │   └── utils.py            ← SBERT semantic gap helpers
│   └── uploads/                ← Candidate resume PDFs (gitignored)
│
├── frontend/
│   ├── index.html              ← Public landing page
│   ├── login.html              ← Login page
│   ├── register.html           ← Registration page
│   ├── dashboard.html          ← Multi-role dashboard (Candidate/Company/Admin)
│   ├── analyze.html            ← Skill gap analysis + My Reports (inline)
│   ├── skill-gap-reports.html  ← Learning roadmap generator
│   ├── profile.html            ← User/company profile management
│   ├── admin.html              ← Admin panel (admin only)
│   ├── css/
│   │   ├── style.css
│   │   ├── analyze.css
│   │   └── dashboard.css
│   └── js/
│       ├── dashboard.js        ← Dashboard logic, job listings, modals
│       ├── analyze.js          ← Analysis + inline My Reports
│       ├── admin.js            ← Admin panel, cluster, seed
│       ├── profile.js          ← Profile management
│       ├── chat-widget.js      ← AI career chatbot (candidates only)
│       └── reports.js          ← (legacy — reports now embedded in analyze.js)
│
├── documents/                  ← Project documentation
├── readme.md
└── .gitignore
```

---

## Recent Changes (v2.0)

### Analyze Page — My Reports Inline
- **Removed** the separate `reports.html` page / "My Reports" nav link.
- Reports are now displayed **directly at the bottom of the Analyze page** in a responsive card grid.
- After saving a report, the grid refreshes automatically.
- Each report card has a **🗑 Delete** button backed by `DELETE /api/reports/<id>`.

### Job Management — New Fields
- **Required Skills** — comma-separated skills field on the post/edit job form.
- **Last Date to Apply** — date picker for application deadline.
- Job cards display the deadline date and required skills.
- Jobs past their deadline show a **CLOSED** badge; the Apply button is disabled (enforced both frontend and backend).

### Company Dashboard
- ❌ Removed **Market Overview** card.
- ✅ Added **View Applications (2-step modal)**:
  - Step 1: Lists all jobs posted by the company with applicant counts and deadline info.
  - Step 2: Click a job → see each applicant's name, email, skills, applied date, and a resume download link.
- Post-job and Edit-job forms now include Required Skills and Last Date fields.

### Company Navigation Restriction
- Company accounts see **only Dashboard and Profile** in the navigation bar.
- Roadmap, Analyze, and the AI Chatbot are completely hidden for company users.

### Admin Panel — Cluster Resumes
- New **🎯 Cluster Resumes** panel in the admin sidebar.
- Overview cards show candidate count per tech domain.
- Select a role to drill into a table of matching candidates with resume download links.
- **🪄 Seed Demo Users & Companies** button in the Overview panel.

### Backend
- `jobs.py`: Added `required_skills`, `last_date` fields; deadline validation on `/api/apply`; `GET /api/jobs/company/<id>` with applicant counts.
- `reports.py`: Added `DELETE /api/reports/<id>`.
- `admin.py`: Added `/api/admin/cluster-candidates` and `/api/admin/seed-demo`.
