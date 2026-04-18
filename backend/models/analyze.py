import os
import io
import json
import re
import requests as http_requests
from pathlib import Path
from flask import Blueprint, request, jsonify
from bson import ObjectId
from models.database import jobs_collection
from models.utils import extract_pdf_text, semantic_gap_analysis, extract_skills_from_text, SBERT_SUPPORT

analyze_bp = Blueprint('analyze_bp', __name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
_roadmap_cache = {}

UPLOAD_DIR = Path(__file__).parent.parent / 'uploads'

# ── Heuristic resume validator ─────────────────────────────────────────────────
RESUME_SIGNALS = [
    'experience', 'education', 'skills', 'summary', 'objective',
    'projects', 'certifications', 'work history', 'employment',
    'achievements', 'profile', 'career', 'qualifications', 'references',
]

def is_likely_resume(text):
    """Return True if the text looks like a resume (has enough resume signals)."""
    if not text or len(text.strip()) < 100:
        return False
    lower = text.lower()
    hits = sum(1 for s in RESUME_SIGNALS if s in lower)
    return hits >= 2


def compute_ats_score(resume_text, extracted_skills):
    """
    Compute a heuristic ATS score (0-100) based on actual resume content.
    Factors: word count, skill count, section keywords, contact info.
    """
    text = resume_text or ''
    words = text.strip().split()
    word_count = len(words)
    skill_count = len(extracted_skills)

    # Word count score (0-25): ideal range 300-700 words
    if word_count >= 300:
        length_score = min(25, int((word_count / 700) * 25))
    else:
        length_score = int((word_count / 300) * 15)  # penalty for very short

    # Skills score (0-35): 15+ skills = full marks
    skill_score = min(35, int((skill_count / 15) * 35))

    # Section headings score (0-25)
    sections = [
        'experience', 'education', 'skills', 'projects', 'summary',
        'objective', 'certifications', 'achievements', 'work history',
        'publications', 'awards', 'volunteering', 'languages'
    ]
    found_sections = sum(1 for s in sections if s in text.lower())
    section_score = min(25, int((found_sections / 5) * 25))

    # Contact info score (0-15)
    has_email = bool(re.search(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', text, re.I))
    has_phone = bool(re.search(r'(\+?\d[\d\s\-\(\)]{6,}\d)', text))
    has_linkedin = bool(re.search(r'linkedin\.com', text, re.I))
    has_github = bool(re.search(r'github\.com', text, re.I))
    contact_score = (5 if has_email else 0) + (5 if has_phone else 0) + \
                    (3 if has_linkedin else 0) + (2 if has_github else 0)

    total = length_score + skill_score + section_score + contact_score
    return min(100, max(5, total))


@analyze_bp.route('/api/analyze', methods=['POST'])
def analyze_resume():
    user_id = request.form.get('user_id', '').strip()
    resume_file = request.files.get('resume')

    resume_text = ''

    # Try uploaded file first
    if resume_file and resume_file.filename:
        if not resume_file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Resume must be a PDF file"}), 400
        resume_text = extract_pdf_text(resume_file)

    # Fallback to stored resume on disk
    if not resume_text.strip() and user_id:
        stored_path = UPLOAD_DIR / f'{user_id}.pdf'
        if stored_path.exists():
            with open(stored_path, 'rb') as f:
                resume_text = extract_pdf_text(io.BytesIO(f.read()))

    if not resume_text.strip():
        return jsonify({"error": "Could not extract text from resume. Make sure the PDF is text-based (not a scanned image)."}), 422

    jd_text = request.form.get('jd_text', '').strip()
    job_id = request.form.get('job_id', '').strip()
    jd_file = request.files.get('jd_file')

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
        return jsonify({"error": "Please provide a job description"}), 400

    # Extract skills FROM the actual resume
    resume_skills = extract_skills_from_text(resume_text)

    # Compute real ATS score from actual resume content
    ats_score = compute_ats_score(resume_text, resume_skills)

    # SBERT gap analysis: skills in JD not well represented in resume
    sbert_gaps = semantic_gap_analysis(resume_text, jd_text)

    if sbert_gaps:
        skills_to_enrich = [g["skill"] for g in sbert_gaps[:10]]
        skills_block = "\n".join(f"- {s}" for s in skills_to_enrich)
        instruction = (
            f"The SBERT semantic analysis identified these specific skills from the job description "
            f"that are MISSING or UNDERREPRESENTED in the candidate's resume:\n\n{skills_block}\n\n"
            f"For EACH of these skills, explain why it is needed for this role and provide learning "
            f"resources. Do NOT invent new skills — only address the ones listed above."
        )
    else:
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
- "skill"     : the skill name
- "why_needed": one sentence (max 20 words) explaining why this skill matters
- "resources" : array of exactly 2 objects each with {{"label": "short name", "url": "https://..."}}
Return only the raw JSON array."""

    headers = {'Content-Type': 'application/json'}
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = http_requests.post(GEMINI_URL, headers=headers, json=payload, timeout=90)
        response.raise_for_status()

        text = response.json()['candidates'][0]['content']['parts'][0]['text']
        text = re.sub(r'^```(?:json)?\s*', '', text.strip())
        text = re.sub(r'```\s*$', '', text.strip())

        enriched_skills = json.loads(text.strip())
        sim_map = {g["skill"].lower(): g["similarity"] for g in sbert_gaps}
        for skill_obj in enriched_skills:
            key = skill_obj.get("skill", "").lower()
            skill_obj["similarity"] = sim_map.get(key, None)

        return jsonify({
            "success": True,
            "ats_score": ats_score,
            "resume_skills": resume_skills,          # actual skills found in resume
            "skills": enriched_skills,               # Gemini-enriched gap skills
            "sbert_gaps": sbert_gaps,                # gap skills with similarity scores
            "gap_count": len(sbert_gaps),
            "sbert_used": SBERT_SUPPORT,
        }), 200

    except http_requests.exceptions.HTTPError as e:
        return jsonify({"error": f"Gemini API error: {e}"}), 502
    except (KeyError, json.JSONDecodeError) as e:
        return jsonify({"error": f"Could not parse Gemini response: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {e}"}), 500


# ── Resume Scan endpoint (Manage Resume page) ──────────────────────────────────
@analyze_bp.route('/api/resume-scan', methods=['POST'])
def resume_scan():
    """Lightweight endpoint: upload/stored resume → ATS score + skills + location + summary.
    Does NOT require a job description. Rejects non-resume PDFs."""
    user_id = request.form.get('user_id', '').strip()
    resume_file = request.files.get('resume')

    resume_text = ''

    # Try uploaded file first
    if resume_file and resume_file.filename:
        if not resume_file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "not_resume", "message": "Please upload a resume file (PDF format)."}), 400
        resume_text = extract_pdf_text(resume_file)

    # Fallback to stored resume on disk
    if not resume_text.strip() and user_id:
        stored_path = UPLOAD_DIR / f'{user_id}.pdf'
        if stored_path.exists():
            with open(stored_path, 'rb') as f:
                resume_text = extract_pdf_text(io.BytesIO(f.read()))

    if not resume_text.strip():
        return jsonify({"error": "not_resume", "message": "Could not extract text from file. Make sure it is a text-based PDF, not a scanned image."}), 422

    # Validate it actually looks like a resume
    if not is_likely_resume(resume_text):
        return jsonify({"error": "not_resume", "message": "This doesn't look like a resume. Please upload your resume PDF."}), 422

    # Extract skills from resume
    resume_skills = extract_skills_from_text(resume_text)

    # Compute ATS score
    ats_score = compute_ats_score(resume_text, resume_skills)

    # Use Gemini to extract location and generate summary
    gemini_prompt = f"""You are an expert resume parser.
Analyse the resume text below and return ONLY a valid JSON object (no markdown, no code fences) with exactly these keys:
- "location": the candidate's city/country extracted from the resume (e.g. "Mumbai, India"). If not found, use "Not specified".
- "summary": a 2-3 sentence professional summary of the candidate based on their resume. Write in third person.

Resume (first 3000 chars):
{resume_text[:3000]}

Return only the raw JSON object."""

    headers = {'Content-Type': 'application/json'}
    payload = {"contents": [{"parts": [{"text": gemini_prompt}]}]}

    location = "Not specified"
    summary = ""

    try:
        resp = http_requests.post(GEMINI_URL, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        raw = resp.json()['candidates'][0]['content']['parts'][0]['text']
        raw = re.sub(r'^```(?:json)?\s*', '', raw.strip())
        raw = re.sub(r'```\s*$', '', raw.strip())
        parsed = json.loads(raw.strip())
        location = parsed.get('location', 'Not specified')
        summary  = parsed.get('summary', '')
    except Exception as e:
        print(f"[resume-scan] Gemini error: {e}")
        summary = "Could not generate summary."

    return jsonify({
        "success": True,
        "ats_score": ats_score,
        "resume_skills": resume_skills,
        "location": location,
        "summary": summary,
    }), 200


@analyze_bp.route('/api/generate-roadmap', methods=['POST'])
def generate_roadmap():
    data = request.json
    skill = data.get('skill', '').strip()
    level = data.get('level', '').strip()

    if not skill or not level:
        return jsonify({"error": "Skill and level are required"}), 400

    cache_key = f"{skill.lower()}__{level.lower()}"
    if cache_key in _roadmap_cache:
        return jsonify({"success": True, "steps": _roadmap_cache[cache_key], "cached": True}), 200

    prompt = f"""You are an expert learning roadmap designer.
Generate a structured learning roadmap for someone who wants to learn "{skill}" at the "{level}" level.
Return ONLY a valid JSON array with exactly 7 steps. No explanation.
Each step must have these fields:
- "title": 3-5 word step name
- "description": one sentence explaining what is covered
- "resources": array of exactly 2 objects each with {{"label": "short name", "url": "https://..."}}
Return only the raw JSON array."""

    headers = {'Content-Type': 'application/json'}
    data = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = http_requests.post(GEMINI_URL, headers=headers, json=data, timeout=60)
        response.raise_for_status()

        response_data = response.json()
        text = response_data['candidates'][0]['content']['parts'][0]['text']
        text = re.sub(r'^```(?:json)?\s*', '', text.strip())
        text = re.sub(r'```\s*$', '', text.strip())

        roadmap_steps = json.loads(text.strip())
        _roadmap_cache[cache_key] = roadmap_steps
        return jsonify({"success": True, "steps": roadmap_steps, "model": MODEL_NAME}), 200

    except http_requests.exceptions.HTTPError as e:
        return jsonify({"error": f"Gemini API is temporarily unavailable or returned an error: {e}"}), 502
    except json.JSONDecodeError as e:
        return jsonify({"error": f"Could not parse Gemini response: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"Roadmap generation failed: {e}"}), 500
