from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
from models.database import users_collection, jobs_collection

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/api/signup', methods=['POST'])
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

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = users_collection.find_one({"email": email})
    if user and check_password_hash(user['password'], password):
        user_type = user.get('user_type', 'candidate')
        redirect_page = 'admin.html' if user_type == 'admin' else 'dashboard.html'
        return jsonify({
            "message": "Login successful!",
            "redirect": redirect_page,
            "user_id": str(user['_id']),
            "username": user['name'],
            "user_type": user_type
        }), 200
    return jsonify({"message": "Invalid email or password"}), 401

@auth_bp.route('/api/profile', methods=['GET'])
def get_profile():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "User ID is required"}), 400
    
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    user['_id'] = str(user['_id'])
    if 'password' in user:
        del user['password']
    return jsonify(user), 200

@auth_bp.route('/api/profile', methods=['POST'])
def update_profile():
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"message": "User ID is required"}), 400
    
    update_data = {k: v for k, v in data.items() if k != 'user_id'}
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Profile updated successfully!"}), 200

@auth_bp.route('/api/delete-account', methods=['DELETE'])
def delete_account():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "User ID is required"}), 400
    
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    if user.get('user_type') == 'company':
        jobs_collection.delete_many({"company_id": user_id})
    
    users_collection.delete_one({"_id": ObjectId(user_id)})
    return jsonify({"message": "Account deleted successfully!"}), 200

@auth_bp.route('/api/save-progress', methods=['POST'])
def save_progress():
    data = request.json
    user_id = data.get('user_id')
    skill = data.get('skill')
    level = data.get('level')
    progress_data = data.get('progress')
    steps = data.get('steps')

    if not user_id or not skill or not level:
        return jsonify({"message": "User ID, skill, and level are required"}), 400

    update_fields = {f"progress.{skill}.{level}": progress_data}
    if steps:
        update_fields[f"roadmaps.{skill}.{level}"] = steps

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields},
        upsert=True
    )
    return jsonify({"message": "Progress saved successfully!"}), 200

@auth_bp.route('/api/load-progress', methods=['GET'])
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
    steps = user.get('roadmaps', {}).get(skill, {}).get(level, None)
    return jsonify({"progress": progress_data, "steps": steps}), 200


@auth_bp.route('/api/my-roadmaps', methods=['GET'])
def list_my_roadmaps():
    """Return a flat list of all roadmaps saved for this user."""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400

    try:
        user = users_collection.find_one({'_id': ObjectId(user_id)})
    except Exception:
        return jsonify({'message': 'Invalid user_id'}), 400
    if not user:
        return jsonify({'message': 'User not found'}), 404

    roadmaps = user.get('roadmaps', {})
    progress  = user.get('progress', {})

    result = []
    for skill, levels in roadmaps.items():
        for level, steps in levels.items():
            if not isinstance(steps, list) or len(steps) == 0:
                continue
            prog = progress.get(skill, {}).get(level, {})
            done = sum(1 for s in steps if prog.get(s.get('title', '')) == 'done')
            result.append({
                'skill':    skill,
                'level':    level,
                'total':    len(steps),
                'done':     done,
                'pct':      round((done / len(steps)) * 100) if steps else 0,
                'steps':    steps,
                'progress': prog,
            })

    result.sort(key=lambda x: x['done'], reverse=True)
    return jsonify(result), 200
