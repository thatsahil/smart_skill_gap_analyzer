from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from models.database import jobs_collection, applications_collection, users_collection
from pathlib import Path

jobs_bp = Blueprint('jobs_bp', __name__)
UPLOAD_DIR = Path(__file__).parent.parent / 'uploads'


# ── Post a Job ────────────────────────────────────────────────────────────────
@jobs_bp.route('/api/post-job', methods=['POST'])
def post_job():
    data         = request.json
    title        = data.get('title')
    description  = data.get('description')
    company_id   = data.get('company_id')
    company_name = data.get('company_name')
    req_skills   = data.get('required_skills', '')
    last_date    = data.get('last_date', '')       # ISO date string "YYYY-MM-DD"

    if not title or not description or not company_id or not company_name:
        return jsonify({"message": "title, description, company_id and company_name are required"}), 400

    job_data = {
        "title":           title,
        "description":     description,
        "company_id":      company_id,
        "company_name":    company_name,
        "required_skills": req_skills,
        "last_date":       last_date,
        "created_at":      datetime.utcnow().isoformat()
    }
    result = jobs_collection.insert_one(job_data)

    return jsonify({
        "message": "Job posted successfully!",
        "job_id":  str(result.inserted_id)
    }), 201


# ── Delete a Job ──────────────────────────────────────────────────────────────
@jobs_bp.route('/api/delete-job/<job_id>', methods=['DELETE'])
def delete_job(job_id):
    company_id = request.args.get('company_id')
    if not company_id:
        return jsonify({"message": "Company ID is required"}), 400

    try:
        job = jobs_collection.find_one({"_id": ObjectId(job_id)})
    except Exception:
        return jsonify({"message": "Invalid job ID"}), 400

    if not job:
        return jsonify({"message": "Job not found"}), 404
    if job.get('company_id') != company_id:
        return jsonify({"message": "Unauthorized to delete this job"}), 403

    jobs_collection.delete_one({"_id": ObjectId(job_id)})
    applications_collection.delete_many({"job_id": job_id})
    return jsonify({"message": "Job deleted successfully!"}), 200


# ── List All Jobs (public) ────────────────────────────────────────────────────
@jobs_bp.route('/api/jobs', methods=['GET'])
def get_jobs():
    jobs = list(jobs_collection.find())
    for job in jobs:
        job['_id'] = str(job['_id'])
        # Check deadline
        last_date = job.get('last_date', '')
        if last_date:
            try:
                deadline = datetime.fromisoformat(last_date)
                job['is_expired'] = datetime.utcnow() > deadline
            except Exception:
                job['is_expired'] = False
        else:
            job['is_expired'] = False
    return jsonify(jobs), 200


# ── List Jobs posted by a specific company ────────────────────────────────────
@jobs_bp.route('/api/jobs/company/<company_id>', methods=['GET'])
def get_company_jobs(company_id):
    jobs = list(jobs_collection.find({"company_id": company_id}))
    result = []
    for job in jobs:
        job['_id'] = str(job['_id'])
        count = applications_collection.count_documents({"job_id": str(job['_id'])})
        job['applicant_count'] = count
        last_date = job.get('last_date', '')
        if last_date:
            try:
                deadline = datetime.fromisoformat(last_date)
                job['is_expired'] = datetime.utcnow() > deadline
            except Exception:
                job['is_expired'] = False
        else:
            job['is_expired'] = False
        result.append(job)
    return jsonify(result), 200


# ── Apply to a Job ────────────────────────────────────────────────────────────
@jobs_bp.route('/api/apply', methods=['POST'])
def apply_to_job():
    data    = request.json
    user_id = data.get('user_id')
    job_id  = data.get('job_id')

    if not user_id or not job_id:
        return jsonify({'message': 'user_id and job_id are required'}), 400

    # Check deadline
    try:
        job = jobs_collection.find_one({'_id': ObjectId(job_id)})
    except Exception:
        return jsonify({'message': 'Invalid job ID'}), 400

    if not job:
        return jsonify({'message': 'Job not found'}), 404

    last_date = job.get('last_date', '')
    if last_date:
        try:
            deadline = datetime.fromisoformat(last_date)
            if datetime.utcnow() > deadline:
                return jsonify({'message': 'The application deadline for this job has passed.'}), 403
        except Exception:
            pass

    existing = applications_collection.find_one({'user_id': user_id, 'job_id': job_id})
    if existing:
        return jsonify({'message': 'You have already applied to this job'}), 409

    user = users_collection.find_one({'_id': ObjectId(user_id)})
    candidate_name = user.get('name', 'Unknown') if user else 'Unknown'

    application = {
        'user_id':         user_id,
        'candidate_name':  candidate_name,
        'job_id':          job_id,
        'has_resume':      (UPLOAD_DIR / f'{user_id}.pdf').exists(),
        'applied_at':      datetime.utcnow().isoformat(),
    }
    applications_collection.insert_one(application)
    return jsonify({'message': 'Application submitted successfully!'}), 201


# ── Get Applications (by job_id or user_id) ───────────────────────────────────
@jobs_bp.route('/api/applications', methods=['GET'])
def get_applications():
    job_id  = request.args.get('job_id')
    user_id = request.args.get('user_id')

    if not job_id and not user_id:
        return jsonify({'message': 'job_id or user_id is required'}), 400

    query = {}
    if job_id:  query['job_id']  = job_id
    if user_id: query['user_id'] = user_id

    apps = list(applications_collection.find(query).sort('applied_at', -1))
    for a in apps:
        a['_id'] = str(a['_id'])
        try:
            candidate = users_collection.find_one({'_id': ObjectId(a['user_id'])})
            if candidate:
                a['candidate_email']  = candidate.get('email', '')
                a['candidate_skills'] = candidate.get('skills', '')
        except Exception:
            pass
        a['has_resume'] = (UPLOAD_DIR / f"{a['user_id']}.pdf").exists()
    return jsonify(apps), 200


# ── Edit a Job ────────────────────────────────────────────────────────────────
@jobs_bp.route('/api/edit-job/<job_id>', methods=['PUT'])
def edit_job(job_id):
    data       = request.json
    company_id = data.get('company_id')
    if not company_id:
        return jsonify({'message': 'company_id is required'}), 400

    try:
        job = jobs_collection.find_one({'_id': ObjectId(job_id)})
    except Exception:
        return jsonify({'message': 'Invalid job ID'}), 400

    if not job:
        return jsonify({'message': 'Job not found'}), 404
    if job.get('company_id') != company_id:
        return jsonify({'message': 'Unauthorized'}), 403

    update_fields = {}
    for field in ('title', 'description', 'required_skills', 'last_date'):
        if field in data:
            update_fields[field] = data[field]

    if not update_fields:
        return jsonify({'message': 'Nothing to update'}), 400

    jobs_collection.update_one({'_id': ObjectId(job_id)}, {'$set': update_fields})
    return jsonify({'message': 'Job updated successfully!'}), 200
