# Skill Gap Analyzer for Job Seekers

## Overview
The Skill Gap Analyzer is an intelligent platform designed to help job seekers identify the missing skills needed to land their dream roles. By leveraging advanced Natural Language Processing (NLP) and Generative AI, the application compares a candidate's resume against a specific job description to find semantic gaps and generates a personalized learning path.

## Key Features
1. **Semantic Resume Parsing**: Uses SBERT (Sentence-BERT) to semantically match the skills in a candidate's PDF resume against a Job Description.
2. **AI-Powered Gap Analysis**: Integrates with the Google Gemini API to analyze identified skill gaps and provide targeted reasoning for why each missing skill is necessary.
3. **Personalized Learning Roadmaps**: Generates step-by-step, actionable roadmaps with curated online resources to master missing skills.
4. **AI Career Coach**: Includes an interactive AI chat widget to assist candidates with interview preparation, resume tips, and career advice.
5. **Job Board Integration**: Stores and manages existing job postings in a MongoDB database to streamline the analysis process.

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript
- **Backend**: Python, Flask, Flask-CORS
- **Database**: MongoDB (via PyMongo)
- **AI/NLP**: Google Gemini (via API), `sentence-transformers` (SBERT), `nltk`
- **PDF Processing**: `pdfplumber`

## Setup and Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/skill-gap-analyzer.git
cd skill-gap-analyzer
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (you can copy from `.env.example`) and add your Gemini API Key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: Keep your `.env` file secure and do not commit it to version control!)*

### 3. Setup the Backend
Navigate to the backend directory and install the required Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

*(Note: Ensure you have MongoDB running locally or update the connection string in `backend/models/database.py`).*

### 4. Run the Application
Start the Flask development server from the backend directory:
```bash
python app.py
```
The server will start on `http://127.0.0.1:5000`. It acts as the API and serves the frontend static files. Open the URL in your browser to access the app!

## Project Structure
- `/frontend`: Contains all the HTML, CSS, and JS files for the user interface.
- `/backend`: Contains the Flask server, routing logic, and AI models.
  - `/backend/models`: Modular architecture (auth, analyze, chatbot, resume, database).

## Security
- API keys are handled securely via environment variables (`.env`). The repository is already configured with `.gitignore` to prevent your `.env` file from being accidentally committed to GitHub.

---

## Admin Panel

A master `admin` profile is built into the platform with full control over all data.

### Admin Credentials
| Field    | Value               |
|----------|---------------------|
| Email    | `admin@skillgap.io` |
| Password | `Admin@12345`       |

### First-time Setup
On first run, seed the admin account by calling:
```bash
curl -X POST http://127.0.0.1:5000/api/admin/seed
```
Or in PowerShell:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/admin/seed" -Method POST -ContentType "application/json" -Body "{}"
```
After seeding, log in at `/login.html` and you will be automatically redirected to `/admin.html`.

### Admin Capabilities
- 📊 **Overview** — Platform-wide stats (total users, candidates, companies, jobs, applications, reports)
- 👥 **Users** — View, search, and delete any candidate or company account
- 💼 **Jobs** — View and delete any job posting across all companies
- 📄 **Applications** — View all applications, download candidate resumes

---

## Recent Changes

### Company Dashboard Improvements
- Companies can now **view applicants** for each job posting — click the `👥 View Applicants` button on any job card to open a modal showing each applicant's name, email, skills, and a link to download their resume PDF.
- Companies can now **edit their job postings** — click the `✏️ Edit` button on any owned job card to update the title or description in-place without re-posting.
- **Roadmap** and **Analyze** navigation links are hidden for company accounts — these features are candidate-only.

### New Backend Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/admin/seed` | Create the admin account (run once) |
| `GET`  | `/api/admin/stats` | Platform usage statistics |
| `GET`  | `/api/admin/users` | List all users |
| `DELETE` | `/api/admin/users/<id>` | Delete a user |
| `PATCH` | `/api/admin/users/<id>` | Update a user |
| `GET`  | `/api/admin/jobs` | List all jobs with applicant counts |
| `DELETE` | `/api/admin/jobs/<id>` | Delete a job and its applications |
| `GET`  | `/api/admin/applications` | List all applications |
| `DELETE` | `/api/admin/applications/<id>` | Remove an application |
| `PUT`  | `/api/edit-job/<id>` | Company edits their own job posting |

### Project Structure Update
```
/backend/models/
  ├── admin.py      ← NEW: Master admin API (all CRUD + stats + seed)
  ├── auth.py       ← UPDATED: Admin login redirects to admin.html
  ├── jobs.py       ← UPDATED: Edit-job endpoint; applications enriched with candidate email & resume info
  ├── analyze.py
  ├── resume.py
  ├── reports.py
  ├── chatbot.py
  ├── database.py
  └── utils.py

/frontend/
  ├── admin.html    ← NEW: Full admin panel UI
  ├── js/admin.js   ← NEW: Admin panel logic
  ├── dashboard.html ← UPDATED: Applicants modal + Edit-job modal + Admin section
  └── js/dashboard.js ← UPDATED: Company nav filtering, modals wired up
```

---

## How SBERT Works (with Example)

### What is SBERT?
**SBERT (Sentence-BERT)** is a modification of the BERT model that produces a single fixed-size **embedding vector** for any text input. Two vectors can then be compared using **cosine similarity** — a score between `0.0` (no relation) and `1.0` (identical meaning).

The model used is `all-MiniLM-L6-v2` — a lightweight 22M parameter model producing 384-dimensional vectors.

---

### Stage 1 — WordPiece Tokenization (sub-word)

SBERT does not tokenize by whole word. It uses a **WordPiece tokenizer** that breaks words into sub-word pieces:

```
"Kubernetes"   → ["Ku", "##ber", "##net", "##es"]
"unsupervised" → ["un", "##super", "##vised"]
"Python"       → ["Python"]         ← common word, stays whole
"CI/CD"        → ["CI", "/", "CD"]
```

The `##` prefix means *"this piece continues the previous token"*. This means rare or technical words are never fully discarded — they survive as meaningful fragments.

---

### Stage 2 — Self-Attention Transformer (context is computed here)

Every token is enriched by attending to **every other token** in the same sequence simultaneously. This is not sequential — it is a full all-to-all attention:

```
Input: "Must have experience with Docker and Kubernetes orchestration"

Token:     Must  have  experience  with  Docker  and  Kubernetes  orchestration
                                           ↕            ↕
           ← every token attends to every other token simultaneously →
```

This means `"orchestration"` carries information from `"Kubernetes"` and `"Docker"` baked into it. No token is ever read in isolation.

**Crucially — this is NOT a sliding/overlapping window.** Within a single input, BERT uses full attention. The overlapping concept only becomes relevant when splitting *very long documents* across multiple calls (see below).

---

### Stage 3 — Mean Pooling (tokens → one vector)

After the transformer layers, each token has its own 384-dim vector. SBERT averages them all into **one sentence-level vector**:

```
sentence_vector = mean(token_0_vector, token_1_vector, ..., token_n_vector)
                          ↓
                   [384 numbers]  ← represents the meaning of the whole input
```

---

### Stage 4 — Cosine Similarity (finding gaps)

In `utils.py`, every JD skill is compared against every resume skill:

```python
cos_scores = sbert_util.cos_sim(jd_emb, resume_emb)  # shape: [n_jd, n_resume]
max_scores = cos_scores.max(dim=1).values             # best match per JD skill
```

**Worked Example:**

Resume skills extracted: `["Python", "Flask", "AWS", "REST API"]`
JD skills extracted: `["Kubernetes", "Docker", "Kafka", "Python", "CI/CD"]`

Cosine similarity matrix:

|            | Python | Flask | AWS  | REST API |
|------------|--------|-------|------|----------|
| Kubernetes | 0.22   | 0.18  | 0.31 | 0.20     |
| Docker     | 0.24   | 0.20  | 0.33 | 0.22     |
| Kafka      | 0.19   | 0.15  | 0.25 | 0.21     |
| **Python** | **0.99**| 0.60 | 0.32 | 0.45     |
| CI/CD      | 0.25   | 0.22  | 0.40 | 0.30     |

`max(dim=1)` → best score each JD skill got:

| JD Skill   | Best Score | vs Threshold (0.55) | Result      |
|------------|------------|----------------------|-------------|
| Kubernetes | 0.31       | below                | ✅ GAP       |
| Docker     | 0.35       | below                | ✅ GAP       |
| Kafka      | 0.25       | below                | ✅ GAP       |
| Python     | 0.99       | above                | ❌ Covered  |
| CI/CD      | 0.40       | below                | ✅ GAP       |

The gaps list `["Kubernetes", "Docker", "Kafka", "CI/CD"]` is then handed to **Gemini** for explanation and learning resources.

---

### Why SBERT beats simple keyword matching

| Scenario | Keyword Match | SBERT |
|----------|--------------|-------|
| `"ML"` vs `"Machine Learning"` | ❌ Miss | ✅ ~0.91 |
| `"Node"` vs `"Node.js"` | ❌ Miss | ✅ ~0.95 |
| `"container orchestration"` vs `"Kubernetes"` | ❌ Miss | ✅ ~0.72 |
| `"REST"` vs `"RESTful API"` | ❌ Miss | ✅ ~0.88 |

SBERT understands **semantic meaning**, not just character patterns.

---

### The Token Limit & Why It's Not a Problem Here

`all-MiniLM-L6-v2` has a hard limit of **256 tokens**. Beyond that, text is **silently truncated**.

This project avoids the problem entirely:
- **Skill extraction first** (`extract_skills_from_text`) reduces inputs to short keyword terms before encoding.
- **Sentence fallback** (`nltk.sent_tokenize`) splits text into individual sentences — each well under 256 tokens.
- SBERT is never called on a raw full-length resume or job description as one blob.

If full-document encoding were needed, a **sliding window with overlap** would be required:
```
Doc tokens:  [0 ─────────── 255][overlap: 206─255][206 ──────────── 460] ...
                Window 1                              Window 2
→ then average the resulting vectors across all windows
```
But this is unnecessary for the current architecture.
