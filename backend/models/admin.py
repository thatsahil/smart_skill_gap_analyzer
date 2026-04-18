from flask import Blueprint, request, jsonify, send_from_directory
from bson import ObjectId
from werkzeug.security import generate_password_hash
from models.database import users_collection, jobs_collection, applications_collection, reports_collection
from pathlib import Path

admin_bp = Blueprint('admin_bp', __name__)
UPLOAD_DIR = Path(__file__).parent.parent / 'uploads'

ADMIN_EMAIL = "admin@skillgap.io"
ADMIN_PASSWORD = "Admin@12345"

# ── Seed admin user (call once) ──────────────────────────────────────────────
@admin_bp.route('/api/admin/seed', methods=['POST'])
def seed_admin():
    """Create the master admin account if it doesn't exist."""
    existing = users_collection.find_one({"email": ADMIN_EMAIL})
    if existing:
        return jsonify({"message": "Admin already exists", "email": ADMIN_EMAIL}), 200

    users_collection.insert_one({
        "name": "Admin",
        "email": ADMIN_EMAIL,
        "password": generate_password_hash(ADMIN_PASSWORD),
        "user_type": "admin"
    })
    return jsonify({"message": "Admin account created!", "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}), 201


# ── Auth check helper ────────────────────────────────────────────────────────
def _require_admin():
    user_id = request.args.get('admin_id') or (request.json or {}).get('admin_id')
    if not user_id:
        return None, (jsonify({"message": "Admin ID required"}), 403)
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None, (jsonify({"message": "Invalid admin ID"}), 400)
    if not user or user.get('user_type') != 'admin':
        return None, (jsonify({"message": "Access denied — admin only"}), 403)
    return user, None


# ── Users ────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    _, err = _require_admin()
    if err: return err

    users = list(users_collection.find())
    for u in users:
        u['_id'] = str(u['_id'])
        u.pop('password', None)
        u['has_resume'] = (UPLOAD_DIR / f"{u['_id']}.pdf").exists()
    return jsonify(users), 200


@admin_bp.route('/api/admin/users/<user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    _, err = _require_admin()
    if err: return err

    try:
        obj_id = ObjectId(user_id)
    except Exception:
        return jsonify({"message": "Invalid user ID"}), 400

    user = users_collection.find_one({"_id": obj_id})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if user.get('user_type') == 'admin':
        return jsonify({"message": "Cannot delete the admin account"}), 403

    users_collection.delete_one({"_id": obj_id})
    if user.get('user_type') == 'company':
        jobs_collection.delete_many({"company_id": user_id})
    resume_path = UPLOAD_DIR / f"{user_id}.pdf"
    if resume_path.exists():
        resume_path.unlink()
    return jsonify({"message": "User deleted"}), 200


@admin_bp.route('/api/admin/users/<user_id>', methods=['PATCH'])
def admin_update_user(user_id):
    _, err = _require_admin()
    if err: return err

    data = request.json or {}
    data.pop('admin_id', None)
    data.pop('password', None)  # do not allow password change via this route
    try:
        result = users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": data})
    except Exception:
        return jsonify({"message": "Invalid user ID"}), 400

    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "User updated"}), 200


# ── Jobs ─────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/jobs', methods=['GET'])
def admin_get_jobs():
    _, err = _require_admin()
    if err: return err

    jobs = list(jobs_collection.find())
    for j in jobs:
        j['_id'] = str(j['_id'])
        count = applications_collection.count_documents({"job_id": str(j['_id'])})
        j['applicant_count'] = count
    return jsonify(jobs), 200


@admin_bp.route('/api/admin/jobs/<job_id>', methods=['DELETE'])
def admin_delete_job(job_id):
    _, err = _require_admin()
    if err: return err

    try:
        result = jobs_collection.delete_one({"_id": ObjectId(job_id)})
    except Exception:
        return jsonify({"message": "Invalid job ID"}), 400

    if result.deleted_count == 0:
        return jsonify({"message": "Job not found"}), 404
    applications_collection.delete_many({"job_id": job_id})
    return jsonify({"message": "Job deleted"}), 200


# ── Applications ─────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/applications', methods=['GET'])
def admin_get_applications():
    _, err = _require_admin()
    if err: return err

    apps = list(applications_collection.find().sort('applied_at', -1))
    for a in apps:
        a['_id'] = str(a['_id'])
        a['has_resume'] = (UPLOAD_DIR / f"{a['user_id']}.pdf").exists()
    return jsonify(apps), 200


@admin_bp.route('/api/admin/applications/<app_id>', methods=['DELETE'])
def admin_delete_application(app_id):
    _, err = _require_admin()
    if err: return err

    try:
        result = applications_collection.delete_one({"_id": ObjectId(app_id)})
    except Exception:
        return jsonify({"message": "Invalid application ID"}), 400

    if result.deleted_count == 0:
        return jsonify({"message": "Application not found"}), 404
    return jsonify({"message": "Application deleted"}), 200


# ── Stats ─────────────────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    _, err = _require_admin()
    if err: return err

    total_users      = users_collection.count_documents({})
    candidates       = users_collection.count_documents({"user_type": "candidate"})
    companies        = users_collection.count_documents({"user_type": "company"})
    total_jobs       = jobs_collection.count_documents({})
    total_apps       = applications_collection.count_documents({})
    total_reports    = reports_collection.count_documents({})
    return jsonify({
        "total_users": total_users,
        "candidates": candidates,
        "companies": companies,
        "total_jobs": total_jobs,
        "total_applications": total_apps,
        "total_reports": total_reports,
    }), 200
