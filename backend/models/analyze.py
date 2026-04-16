import os
import json
import re
import requests as http_requests
from flask import Blueprint, request, jsonify
from bson import ObjectId
from models.database import jobs_collection
from models.utils import extract_pdf_text, semantic_gap_analysis, SBERT_SUPPORT

analyze_bp = Blueprint('analyze_bp', __name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
_roadmap_cache = {}

@analyze_bp.route('/api/analyze', methods=['POST'])
def analyze_resume():
    resume_file = request.files.get('resume')
    if not resume_file:
        return jsonify({"error": "Resume PDF is required"}), 400
    if not resume_file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Resume must be a PDF file"}), 400

    resume_text = extract_pdf_text(resume_file)
    if not resume_text.strip():
        return jsonify({"error": "Could not extract text from resume PDF"}), 422

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
            "skills": enriched_skills,
            "sbert_gaps": sbert_gaps,
            "gap_count": len(sbert_gaps),
            "sbert_used": SBERT_SUPPORT,
            "sbert_skills": [g["skill"] for g in sbert_gaps],
        }), 200

    except http_requests.exceptions.HTTPError as e:
        return jsonify({"error": f"Gemini API error: {e}"}), 502
    except (KeyError, json.JSONDecodeError) as e:
        return jsonify({"error": f"Could not parse Gemini response: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {e}"}), 500


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
