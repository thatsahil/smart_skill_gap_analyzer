from flask import Blueprint, request, jsonify, send_from_directory
from bson import ObjectId
from datetime import datetime
from models.database import users_collection, jobs_collection
from models.utils import get_sbert_model, extract_pdf_text, SBERT_SUPPORT, sbert_util
from pathlib import Path

resume_bp = Blueprint('resume_bp', __name__)
UPLOAD_DIR = Path(__file__).parent.parent / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

@resume_bp.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    user_id = request.form.get('user_id')
    file = request.files.get('resume')

    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400
    if not file or not file.filename.lower().endswith('.pdf'):
        return jsonify({'message': 'A PDF file is required'}), 400

    save_path = UPLOAD_DIR / f'{user_id}.pdf'
    file.save(str(save_path))

    users_collection.update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'stored_resume': f'{user_id}.pdf', 'resume_uploaded_at': datetime.utcnow().isoformat()}}
    )
    return jsonify({'message': 'Resume uploaded successfully!', 'filename': f'{user_id}.pdf'}), 200

@resume_bp.route('/api/resume', methods=['GET'])
def check_resume():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400

    resume_path = UPLOAD_DIR / f'{user_id}.pdf'
    if resume_path.exists():
        return jsonify({'exists': True, 'filename': f'{user_id}.pdf'}), 200
    return jsonify({'exists': False}), 200

@resume_bp.route('/api/resume/download', methods=['GET'])
def download_resume():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400

    resume_path = UPLOAD_DIR / f'{user_id}.pdf'
    if not resume_path.exists():
        return jsonify({'message': 'No stored resume found'}), 404

    return send_from_directory(str(UPLOAD_DIR), f'{user_id}.pdf',
                               as_attachment=True, download_name='my_resume.pdf')

@resume_bp.route('/api/match-score', methods=['POST'])
def match_score():
    if not SBERT_SUPPORT:
        return jsonify({'error': 'SBERT not available on this server'}), 503

    user_id = request.form.get('user_id', '').strip()
    resume_file = request.files.get('resume')
    resume_text = ''

    if resume_file and resume_file.filename:
        resume_text = extract_pdf_text(resume_file)
    elif user_id:
        stored = UPLOAD_DIR / f'{user_id}.pdf'
        if stored.exists():
            with open(stored, 'rb') as f:
                import io as _io
                resume_text = extract_pdf_text(_io.BytesIO(f.read()))

    if not resume_text.strip():
        return jsonify({'error': 'No resume text available. Upload a resume to your profile first.'}), 400

    jd_text = request.form.get('jd_text', '').strip()
    job_id = request.form.get('job_id', '').strip()
    jd_file = request.files.get('jd_file')

    if jd_file and jd_file.filename:
        jd_text = extract_pdf_text(jd_file)
    elif job_id:
        try:
            job = jobs_collection.find_one({'_id': ObjectId(job_id)})
            if not job:
                return jsonify({'error': 'Job not found'}), 404
            jd_text = f"{job.get('title', '')}\n{job.get('description', '')}"
        except Exception:
            return jsonify({'error': 'Invalid job ID'}), 400

    if not jd_text:
        return jsonify({'error': 'No job description provided'}), 400

    try:
        model = get_sbert_model()
        r_emb = model.encode(resume_text[:3000], convert_to_tensor=True, show_progress_bar=False)
        j_emb = model.encode(jd_text[:3000], convert_to_tensor=True, show_progress_bar=False)
        score = float(sbert_util.cos_sim(r_emb, j_emb)[0][0])
        score_pct = max(0, min(100, round(score * 100)))

        if score_pct >= 70: label = 'Great Match'
        elif score_pct >= 50: label = 'Good Match'
        elif score_pct >= 35: label = 'Partial Match'
        else: label = 'Low Match'

        return jsonify({'score': score_pct, 'label': label}), 200
    except Exception as e:
        return jsonify({'error': f'Scoring failed: {e}'}), 500
