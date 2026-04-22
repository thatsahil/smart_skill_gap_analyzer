from flask import Blueprint, request, jsonify, send_from_directory
from bson import ObjectId
from werkzeug.security import generate_password_hash
from models.database import users_collection, jobs_collection, applications_collection, reports_collection
from pathlib import Path
import re

admin_bp = Blueprint('admin_bp', __name__)
UPLOAD_DIR = Path(__file__).parent.parent / 'uploads'

# ── Role keyword clusters ─────────────────────────────────────────────────────
ROLE_CLUSTERS = {
    "Frontend Developer":  ["frontend", "react", "vue", "angular", "html", "css", "ui", "next.js", "gatsby", "svelte"],
    "Backend Developer":   ["backend", "node", "django", "flask", "express", "spring", "rails", "laravel", "api", "rest"],
    "Full Stack Developer":["fullstack", "full-stack", "full stack", "mern", "mean", "lamp"],
    "Data Scientist":      ["data science", "machine learning", "ml", "deep learning", "pandas", "numpy", "jupyter", "tensorflow", "pytorch", "sklearn"],
    "Data Engineer":       ["data engineer", "pipeline", "etl", "spark", "hadoop", "kafka", "airflow", "bigquery"],
    "DevOps Engineer":     ["devops", "docker", "kubernetes", "ci/cd", "jenkins", "aws", "gcp", "azure", "terraform", "ansible"],
    "Mobile Developer":    ["android", "ios", "flutter", "react native", "swift", "kotlin", "mobile"],
    "Cloud Engineer":      ["cloud", "aws", "azure", "gcp", "lambda", "s3", "ec2", "serverless"],
    "Cybersecurity":       ["security", "penetration", "pentest", "soc", "siem", "firewall", "cryptography", "ethical hacking"],
    "AI/ML Engineer":      ["artificial intelligence", "ai", "nlp", "computer vision", "llm", "transformer", "bert", "gpt"],
    "QA Engineer":         ["qa", "quality assurance", "testing", "selenium", "cypress", "jest", "pytest", "automation testing"],
    "Database Administrator": ["dba", "sql", "postgresql", "mysql", "mongodb", "oracle", "database"],
}

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


# ── Cluster Candidates by Role ────────────────────────────────────────────────
@admin_bp.route('/api/admin/cluster-candidates', methods=['GET'])
def cluster_candidates():
    _, err = _require_admin()
    if err: return err

    role_filter = request.args.get('role', '').strip().lower()

    # 1. Fetch and serialise all candidates
    candidates = list(users_collection.find({"user_type": "candidate"}))
    for c in candidates:
        c['_id'] = str(c['_id'])
        c.pop('password', None)
        c['has_resume'] = (UPLOAD_DIR / f"{c['_id']}.pdf").exists()

    # 2. Build a separate blobs dict keyed by _id — no mutation of candidate dicts
    blobs = {}
    for c in candidates:
        blobs[c['_id']] = ' '.join(filter(None, [
            c.get('name', ''),
            c.get('skills', ''),
            c.get('experience', ''),
            c.get('education', ''),
            c.get('role', ''),
            c.get('bio', ''),
        ])).lower()

    # 3. Cluster using blobs dict
    clusters = {}
    for role, keywords in ROLE_CLUSTERS.items():
        clusters[role] = [c for c in candidates if any(kw in blobs.get(c['_id'], '') for kw in keywords)]

    # 4. Uncategorised bucket
    categorised_ids = set(c['_id'] for lst in clusters.values() for c in lst)
    clusters["Uncategorised"] = [c for c in candidates if c['_id'] not in categorised_ids]

    if role_filter:
        for name, lst in clusters.items():
            if role_filter in name.lower():
                return jsonify({"role": name, "candidates": lst, "count": len(lst)}), 200
        return jsonify({"role": role_filter, "candidates": [], "count": 0}), 200

    summary = [{"role": r, "count": len(lst)} for r, lst in clusters.items()]
    return jsonify({"clusters": summary, "roles": list(ROLE_CLUSTERS.keys())}), 200


# ── Seed Demo Users ───────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/seed-demo', methods=['POST'])
def seed_demo():
    _, err = _require_admin()
    if err: return err

    demo_candidates = [
        {"name": "Aisha Khan",       "email": "aisha.khan@demo.com",     "skills": "React, JavaScript, CSS, HTML, Redux, Next.js",         "experience": "3 years as a Frontend Developer at Infosys",      "education": "B.Tech Computer Science",   "role": "Frontend Developer"},
        {"name": "Rohan Mehta",      "email": "rohan.mehta@demo.com",    "skills": "Node.js, Express, MongoDB, REST API, Docker",            "experience": "4 years Backend Developer at TCS",              "education": "B.E. Software Engineering",  "role": "Backend Developer"},
        {"name": "Priya Sharma",     "email": "priya.sharma@demo.com",   "skills": "Python, Django, Flask, PostgreSQL, REST API",            "experience": "2 years Django Developer at Wipro",             "education": "MCA",                         "role": "Backend Developer"},
        {"name": "Arjun Nair",       "email": "arjun.nair@demo.com",     "skills": "React, Node.js, MongoDB, Express, AWS, Docker",         "experience": "5 years Full Stack Developer at Accenture",      "education": "B.Tech IT",                    "role": "Full Stack Developer"},
        {"name": "Sneha Patel",      "email": "sneha.patel@demo.com",    "skills": "Python, TensorFlow, PyTorch, Pandas, NLP, scikit-learn","experience": "3 years ML Engineer at IBM Research",           "education": "M.Tech AI",                    "role": "AI/ML Engineer"},
        {"name": "Vikram Singh",     "email": "vikram.singh@demo.com",   "skills": "AWS, Docker, Kubernetes, Terraform, Jenkins, CI/CD",    "experience": "6 years DevOps Engineer at HCL",               "education": "B.Tech CSE",                   "role": "DevOps Engineer"},
        {"name": "Meera Iyer",       "email": "meera.iyer@demo.com",     "skills": "Flutter, Dart, Android, iOS, Firebase",                 "experience": "2 years Mobile Developer at Mphasis",           "education": "B.Sc Computer Science",        "role": "Mobile Developer"},
        {"name": "Rahul Gupta",      "email": "rahul.gupta@demo.com",    "skills": "Spark, Hadoop, Kafka, Airflow, ETL, SQL, BigQuery",     "experience": "4 years Data Engineer at Deloitte",             "education": "M.Sc Data Engineering",        "role": "Data Engineer"},
        {"name": "Divya Reddy",      "email": "divya.reddy@demo.com",    "skills": "MySQL, PostgreSQL, MongoDB, Oracle, DBA, SQL",          "experience": "3 years DBA at Cognizant",                     "education": "B.Tech CSE",                   "role": "Database Administrator"},
        {"name": "Karan Bhatt",      "email": "karan.bhatt@demo.com",    "skills": "Penetration Testing, Security, Ethical Hacking, SIEM, SOC","experience": "5 years Cybersecurity Analyst at Capgemini", "education": "B.Tech Information Security",  "role": "Cybersecurity"},
        {"name": "Anjali Verma",     "email": "anjali.verma@demo.com",   "skills": "Vue.js, Angular, HTML, CSS, SCSS, Figma",               "experience": "2 years UI Developer at Mindtree",              "education": "B.Des Interaction Design",     "role": "Frontend Developer"},
        {"name": "Siddharth Joshi",  "email": "siddharth.joshi@demo.com","skills": "Selenium, Cypress, Pytest, Jest, QA, Automation Testing","experience": "3 years QA Engineer at Zensar",                 "education": "B.Tech CSE",                   "role": "QA Engineer"},
    ]

    demo_companies = [
        {"name": "TechNova Solutions",   "email": "hr@technova.demo",    "website": "https://technova.example.com",  "industry": "Software Development",  "description": "Leading product-based company building cloud-native SaaS solutions."},
        {"name": "DataPulse Analytics",  "email": "careers@datapulse.demo","website": "https://datapulse.example.com", "industry": "Data & Analytics",      "description": "Specialising in big data pipelines and real-time analytics platforms."},
        {"name": "FinSecure Corp",        "email": "jobs@finsecure.demo",  "website": "https://finsecure.example.com", "industry": "FinTech & Cybersecurity","description": "Building secure banking infrastructure and fraud-detection systems."},
        {"name": "MobileCraft Studio",   "email": "talent@mobilecraft.demo","website": "https://mobilecraft.example.com","industry": "Mobile Applications",   "description": "Award-winning mobile app studio for iOS and Android platforms."},
    ]

    inserted_candidates = 0
    inserted_companies  = 0
    demo_password = generate_password_hash("Demo@12345")

    for c in demo_candidates:
        if not users_collection.find_one({"email": c['email']}):
            doc = {**c, "password": demo_password, "user_type": "candidate"}
            users_collection.insert_one(doc)
            inserted_candidates += 1

    for co in demo_companies:
        if not users_collection.find_one({"email": co['email']}):
            doc = {**co, "password": demo_password, "user_type": "company"}
            users_collection.insert_one(doc)
            inserted_companies += 1

    return jsonify({
        "message": f"Seeded {inserted_candidates} candidates and {inserted_companies} companies.",
        "demo_password": "Demo@12345"
    }), 201
