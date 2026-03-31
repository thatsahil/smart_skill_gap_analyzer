from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
import os
import requests as http_requests
import json
import re
from pathlib import Path
import io
import tempfile
import threading

# PDF extraction
try:
    import pdfplumber
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    print("[WARN] pdfplumber not installed — PDF upload will be disabled")

# SBERT for semantic matching
try:
    from sentence_transformers import SentenceTransformer, util as sbert_util
    import nltk
    _sbert_model = None
    _sbert_lock  = threading.Lock()

    def get_sbert_model():
        global _sbert_model
        with _sbert_lock:
            if _sbert_model is None:
                print("[SBERT] Loading all-MiniLM-L6-v2 model…")
                _sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
                print("[SBERT] Model ready")
        return _sbert_model

    SBERT_SUPPORT = True
except ImportError:
    SBERT_SUPPORT = False
    print("[WARN] sentence-transformers not installed — falling back to Gemini-only analysis")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Gemini API configuration — key is kept server-side, never exposed to frontend
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "your_api_key")
MODEL_NAME     = "gemini-2.5-flash"
GEMINI_URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"

# Simple in-memory cache: { "skill__level": [steps] }
_roadmap_cache = {}

# Path to the frontend folder (one level up from backend/)
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

# MongoDB Connection Configuration
# You can change 'mongodb://localhost:27017/' to your MongoDB URI if needed.
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client['skill_gap_analyzer']  # Database name
users_collection = db['users']      # Collection name
jobs_collection = db['jobs']       # Collection name for jobs

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    confirm_password = data.get('confirm-password')
    user_type = data.get('user_type')

    if not name or not email or not password or not confirm_password or not user_type:
        return jsonify({"message": "All fields are required"}), 400

    if password != confirm_password:
        return jsonify({"message": "Passwords do not match"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"message": "User with this email already exists"}), 409

    hashed_password = generate_password_hash(password)
    
    user_data = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "user_type": user_type
    }

    result = users_collection.insert_one(user_data)
    
    return jsonify({
        "message": "User registered successfully!",
        "redirect": "dashboard.html",
        "user_id": str(result.inserted_id),
        "username": name,
        "user_type": user_type
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = users_collection.find_one({"email": email})

    if user and check_password_hash(user['password'], password):
        return jsonify({
            "message": "Login successful!",
            "redirect": "dashboard.html",
            "user_id": str(user['_id']),
            "username": user['name'],
            "user_type": user.get('user_type', 'candidate') # Default to candidate if not set
        }), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401

@app.route('/api/post-job', methods=['POST'])
def post_job():
    data = request.json
    title = data.get('title')
    description = data.get('description')
    company_id = data.get('company_id')
    company_name = data.get('company_name')

    if not title or not description or not company_id or not company_name:
        return jsonify({"message": "All fields are required"}), 400

    job_data = {
        "title": title,
        "description": description,
        "company_id": company_id,
        "company_name": company_name
    }

    result = jobs_collection.insert_one(job_data)
    
    return jsonify({
        "message": "Job posted successfully!",
        "job_id": str(result.inserted_id)
    }), 201

@app.route('/api/delete-job/<job_id>', methods=['DELETE'])
def delete_job(job_id):
    company_id = request.args.get('company_id')
    if not company_id:
        return jsonify({"message": "Company ID is required"}), 400
    
    job = jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        return jsonify({"message": "Job not found"}), 404
    
    if job.get('company_id') != company_id:
        return jsonify({"message": "Unauthorized to delete this job"}), 403
    
    jobs_collection.delete_one({"_id": ObjectId(job_id)})
    return jsonify({"message": "Job deleted successfully!"}), 200

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    jobs = list(jobs_collection.find())
    for job in jobs:
        job['_id'] = str(job['_id'])
    return jsonify(jobs), 200

@app.route('/api/profile', methods=['GET'])
def get_profile():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "User ID is required"}), 400
    
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # Don't return the password
    user['_id'] = str(user['_id'])
    if 'password' in user:
        del user['password']
        
    return jsonify(user), 200

@app.route('/api/profile', methods=['POST'])
def update_profile():
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"message": "User ID is required"}), 400
    
    # Remove user_id from update data
    update_data = {k: v for k, v in data.items() if k != 'user_id'}
    
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
        
    return jsonify({"message": "Profile updated successfully!"}), 200

@app.route('/api/delete-account', methods=['DELETE'])
def delete_account():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "User ID is required"}), 400
    
    # Find user to check type
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    # If company, delete their jobs too
    if user.get('user_type') == 'company':
        jobs_collection.delete_many({"company_id": user_id})
    
    # Delete the user
    users_collection.delete_one({"_id": ObjectId(user_id)})
    
    return jsonify({"message": "Account deleted successfully!"}), 200

@app.route('/api/save-progress', methods=['POST'])
def save_progress():
    data = request.json
    user_id = data.get('user_id')
    skill = data.get('skill')
    level = data.get('level')
    progress_data = data.get('progress')

    if not user_id or not skill or not level:
        return jsonify({"message": "User ID, skill, and level are required"}), 400

    # Update user document with progress
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {f"progress.{skill}.{level}": progress_data}},
        upsert=True
    )
    
    return jsonify({"message": "Progress saved successfully!"}), 200

@app.route('/api/load-progress', methods=['GET'])
def load_progress():
    user_id = request.args.get('user_id')
    skill = request.args.get('skill')
    level = request.args.get('level')

    if not user_id or not skill or not level:
        return jsonify({"message": "User ID, skill, and level are required"}), 400

    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404

    progress_data = user.get('progress', {}).get(skill, {}).get(level, {})
    
    return jsonify(progress_data), 200


# ─────────────────────────────────────────────────────────────────────────────
# /api/analyze  — Resume vs JD semantic skill-gap analysis
# ─────────────────────────────────────────────────────────────────────────────
def extract_pdf_text(file_storage):
    """Extract plain text from an uploaded PDF FileStorage object."""
    if not PDF_SUPPORT:
        return ""
    with pdfplumber.open(file_storage) as pdf:
        return "\n".join(p.extract_text() or "" for p in pdf.pages)


# ── Common tech / skill term patterns ────────────────────────────────────────
_SKILL_PATTERN = re.compile(
    r'\b('
    # Programming languages
    r'python|java(?:script)?|typescript|kotlin|swift|rust|go(?:lang)?|ruby|php|scala|c\+\+|c#|r(?=\s)|matlab|perl|bash|shell|powershell|'
    # Web / frontend
    r'react(?:\.js)?|vue(?:\.js)?|angular(?:js)?|next\.js|nuxt|svelte|html5?|css3?|sass|less|webpack|vite|tailwind(?:css)?|bootstrap|jquery|'
    # Backend
    r'node(?:\.js)?|express(?:\.js)?|django|flask|fastapi|spring(?:\s*boot)?|laravel|rails|graphql|rest(?:ful)?(?:\s*api)?|grpc|'
    # Data / ML / AI
    r'machine\s*learning|deep\s*learning|neural\s*network|nlp|computer\s*vision|'
    r'tensorflow|pytorch|keras|scikit[-\s]?learn|pandas|numpy|opencv|hugging\s*face|bert|gpt|llm|'
    r'data\s*science|data\s*engineering|data\s*analysis|etl|feature\s*engineering|'
    # Cloud & DevOps
    r'aws|azure|gcp|google\s*cloud|kubernetes|k8s|docker|helm|terraform|ansible|jenkins|github\s*actions|ci/cd|ci\s*cd|'
    r'lambda|ec2|s3|cloudformation|'
    # Databases
    r'sql|mysql|postgresql|postgres|mongodb|redis|elasticsearch|cassandra|dynamodb|sqlite|oracle|'
    # Security / Networking
    r'cybersecurity|penetration\s*testing|owasp|oauth|jwt|ssl/tls|firewall|vpn|'
    # Soft / methodologies
    r'agile|scrum|kanban|jira|confluence|git|microservices|serverless|soa|'
    # Other common tools
    r'spark|hadoop|kafka|airflow|dbt|tableau|power\s*bi|looker|excel|figma|sketch'
    r')\b',
    re.IGNORECASE
)


def extract_skills_from_text(text):
    """Extract deduplicated skill/technology terms from free text using regex."""
    raw = _SKILL_PATTERN.findall(text)
    # Normalise case and deduplicate while preserving order
    seen, skills = set(), []
    for s in raw:
        key = s.lower().strip()
        if key not in seen:
            seen.add(key)
            skills.append(s.strip())
    return skills


def semantic_gap_analysis(resume_text, jd_text, threshold=0.55):
    """Use SBERT to find skill terms from the JD that are NOT semantically
    covered by the resume.  Returns a list of dicts:
        {"skill": str, "similarity": float}
    sorted from largest gap (lowest similarity) first.
    """
    if not SBERT_SUPPORT or not resume_text or not jd_text:
        return []

    try:
        jd_skills     = extract_skills_from_text(jd_text)
        resume_skills = extract_skills_from_text(resume_text)

        print(f"[SBERT] JD skills found     : {jd_skills}")
        print(f"[SBERT] Resume skills found : {resume_skills}")

        if not jd_skills:
            # Fallback: sentence-level analysis when no structured skills found
            try:
                nltk.data.find('tokenizers/punkt_tab')
            except LookupError:
                nltk.download('punkt_tab', quiet=True)
            import nltk.tokenize
            jd_chunks     = [s.strip() for s in nltk.tokenize.sent_tokenize(jd_text)   if len(s.strip()) > 20]
            resume_chunks = [s.strip() for s in nltk.tokenize.sent_tokenize(resume_text) if len(s.strip()) > 10]
            if not jd_chunks or not resume_chunks:
                return []
            jd_skills     = jd_chunks
            resume_skills = resume_chunks
            use_chunks    = True
        else:
            use_chunks = False

        model             = get_sbert_model()
        jd_emb            = model.encode(jd_skills,     convert_to_tensor=True, show_progress_bar=False)
        resume_emb        = model.encode(resume_skills, convert_to_tensor=True, show_progress_bar=False)

        cos_scores = sbert_util.cos_sim(jd_emb, resume_emb)   # shape [jd_n, resume_n]
        max_scores = cos_scores.max(dim=1).values.tolist()

        gaps = []
        for i, (skill, score) in enumerate(zip(jd_skills, max_scores)):
            if score < threshold:
                gaps.append({"skill": skill, "similarity": round(float(score), 3)})

        # Sort: worst matches first
        gaps.sort(key=lambda x: x["similarity"])
        return gaps[:20]   # cap at 20

    except Exception as e:
        print(f"[SBERT] Error during gap analysis: {e}")
        return []


@app.route('/api/analyze', methods=['POST'])
def analyze_resume():
    """Semantic skill-gap analysis.
    Accepts multipart/form-data with:
      - resume      : PDF file (required)
      - jd_text     : plain-text job description (optional)
      - jd_file     : PDF job description (optional)
      - job_id      : MongoDB ObjectId of an existing job posting (optional)
    Exactly one of jd_text / jd_file / job_id must be provided.
    """

    # ── 1. Extract resume text ────────────────────────────────────────────
    resume_file = request.files.get('resume')
    if not resume_file:
        return jsonify({"error": "Resume PDF is required"}), 400
    if not resume_file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Resume must be a PDF file"}), 400

    resume_text = extract_pdf_text(resume_file)
    if not resume_text.strip():
        return jsonify({"error": "Could not extract text from resume PDF. Make sure it is not a scanned image."}), 422

    # ── 2. Extract JD text ────────────────────────────────────────────────
    jd_text  = request.form.get('jd_text', '').strip()
    job_id   = request.form.get('job_id', '').strip()
    jd_file  = request.files.get('jd_file')

    if jd_file and jd_file.filename:
        if not jd_file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Job description file must be a PDF"}), 400
        jd_text = extract_pdf_text(jd_file)
    elif job_id:
        try:
            job = jobs_collection.find_one({"_id": ObjectId(job_id)})
            if not job:
                return jsonify({"error": "Job posting not found"}), 404
            jd_text = f"{job.get('title', '')}\n{job.get('description', '')}"
        except Exception:
            return jsonify({"error": "Invalid job ID"}), 400

    if not jd_text:
        return jsonify({"error": "Please provide a job description (text, PDF, or select a job posting)"}), 400

    # ── 3. SBERT semantic gap analysis ───────────────────────────────────
    print(f"[Analyze] Running SBERT gap analysis (resume {len(resume_text)} chars, jd {len(jd_text)} chars)")
    sbert_gaps = semantic_gap_analysis(resume_text, jd_text)
    print(f"[Analyze] SBERT identified {len(sbert_gaps)} missing skills: {[g['skill'] for g in sbert_gaps]}")

    # ── 4. Gemini: enrich each SBERT-identified gap ───────────────────────
    # Build the list of skills Gemini should explain
    if sbert_gaps:
        skills_to_enrich = [g["skill"] for g in sbert_gaps[:10]]  # max 10
        skills_block     = "\n".join(f"- {s}" for s in skills_to_enrich)
        instruction      = (
            f"The SBERT semantic analysis identified these specific skills from the job description "
            f"that are MISSING or UNDERREPRESENTED in the candidate's resume:\n\n{skills_block}\n\n"
            f"For EACH of these skills, explain why it is needed for this role and provide learning "
            f"resources. Do NOT invent new skills — only address the ones listed above."
        )
    else:
        # Fallback: ask Gemini to infer gaps from raw text (SBERT found nothing)
        skills_to_enrich = []
        instruction = (
            "No specific skill terms were identified via SBERT. Analyse the full texts below and "
            "identify 5-8 key skills the candidate needs to develop for this role."
        )

    prompt = f"""You are an expert career coach and skill-gap analyst.

{instruction}

Job Description (first 3000 chars):
{jd_text[:3000]}

Resume (first 2000 chars):
{resume_text[:2000]}

Return ONLY a valid JSON array (no markdown, no code fences).
Each object must have exactly these keys:
- "skill"     : the skill name (use the exact term from the list above when applicable)
- "why_needed": one sentence (max 20 words) explaining why this skill matters for the role
- "resources" : array of exactly 2 objects each with {{"label": "short resource name", "url": "https://..."}}

Return only the raw JSON array."""

    headers = {'Content-Type': 'application/json'}
    payload  = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        print("[Gemini] Enriching SBERT skill gaps…")
        response = http_requests.post(GEMINI_URL, headers=headers, data=json.dumps(payload), timeout=90)
        response.raise_for_status()

        text = response.json()['candidates'][0]['content']['parts'][0]['text']
        text = re.sub(r'^```(?:json)?\s*', '', text.strip())
        text = re.sub(r'```\s*$',          '', text.strip())

        enriched_skills = json.loads(text.strip())
        print(f"[Gemini] Enriched {len(enriched_skills)} skills")

        # Attach similarity scores to each enriched skill where possible
        sim_map = {g["skill"].lower(): g["similarity"] for g in sbert_gaps}
        for skill_obj in enriched_skills:
            key = skill_obj.get("skill", "").lower()
            skill_obj["similarity"] = sim_map.get(key, None)

        return jsonify({
            "success"       : True,
            "skills"        : enriched_skills,
            "sbert_gaps"    : sbert_gaps,          # raw SBERT output
            "gap_count"     : len(sbert_gaps),
            "sbert_used"    : SBERT_SUPPORT,
            "sbert_skills"  : [g["skill"] for g in sbert_gaps],
        }), 200

    except http_requests.exceptions.HTTPError as e:
        return jsonify({"error": f"Gemini API error: {e}. Body: {response.text[:300]}"}), 502
    except (KeyError, json.JSONDecodeError) as e:
        return jsonify({"error": f"Could not parse Gemini response: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {e}"}), 500


def generate_roadmap():
    """Proxy endpoint: calls Gemini API server-side so the API key is never
    exposed to the browser. Results are cached in-memory per skill+level."""
    data  = request.json
    skill = data.get('skill', '').strip()
    level = data.get('level', '').strip()

    if not skill or not level:
        return jsonify({"error": "Skill and level are required"}), 400

    # ── Cache check ──────────────────────────────────────────
    cache_key = f"{skill.lower()}__{level.lower()}"
    if cache_key in _roadmap_cache:
        print(f"[Cache HIT] {cache_key}")
        return jsonify({"success": True, "steps": _roadmap_cache[cache_key], "cached": True}), 200

    prompt = f"""You are an expert learning roadmap designer.

Generate a structured learning roadmap for someone who wants to learn "{skill}" at the "{level}" level.

Return ONLY a valid JSON array with exactly 7 steps. No markdown, no code fences, no explanation.
Each step must have these fields:
- "title": 3-5 word step name
- "description": one sentence (max 20 words) explaining what is covered
- "resources": array of exactly 2 objects each with {{"label": "short name", "url": "https://..."}}

Return only the raw JSON array."""

    headers = {
        'Content-Type': 'application/json',
    }

    data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    }


    try:
        print(f"[Gemini] Calling {MODEL_NAME} for: {skill} / {level}")
        response = http_requests.post(GEMINI_URL, headers=headers, data=json.dumps(data), timeout=60)
        response.raise_for_status()

        response_data = response.json()

        # Extract text — same navigation as the working chatbot
        text = response_data['candidates'][0]['content']['parts'][0]['text']

        # Strip markdown code fences if Gemini wraps in ```json ... ```
        text = re.sub(r'^```(?:json)?\s*', '', text.strip())
        text = re.sub(r'```\s*$', '', text.strip())

        roadmap_steps = json.loads(text.strip())

        # Cache result so repeated requests don't hit the API
        _roadmap_cache[cache_key] = roadmap_steps
        print(f"[Gemini] Success — {len(roadmap_steps)} steps generated")
        return jsonify({"success": True, "steps": roadmap_steps, "model": MODEL_NAME}), 200

    except http_requests.exceptions.HTTPError as e:
        print(f"[Gemini] HTTP Error: {e}")
        print(f"[Gemini] Response body: {response.text}")
        return jsonify({"error": f"Gemini API HTTP error: {e}. Body: {response.text[:300]}"}), 502
    except (KeyError, json.JSONDecodeError) as e:
        print(f"[Gemini] Parse error: {e}")
        return jsonify({"error": f"Could not parse Gemini response: {e}"}), 500
    except Exception as e:
        print(f"[Gemini] Error: {e}")
        return jsonify({"error": f"An error occurred: {e}"}), 500


# ── Serve frontend static files ───────────────────────────────────────────────
# Accessing http://127.0.0.1:5000/ serves the frontend directly from Flask,
# avoiding all file:// security-origin browser restrictions.
@app.route('/', defaults={'filename': 'index.html'})
@app.route('/<path:filename>')
def serve_frontend(filename):
    """Serve any file from the frontend folder."""
    return send_from_directory(str(FRONTEND_DIR), filename)


if __name__ == '__main__':
    # Print helpful instructions on start
    print("--- Skill Gap Analyzer Backend ---")
    print("Connecting to MongoDB at:", MONGO_URI)
    print("Running Flask app on http://127.0.0.1:5000")
    # use_reloader=False prevents the watchdog from reloading mid-request
    # which causes WinError 10038 on Windows when the server restarts
    # while a long Gemini API call is in progress.
    app.run(debug=True, port=5000, use_reloader=False)
