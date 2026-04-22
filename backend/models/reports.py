from flask import Blueprint, request, jsonify
from datetime import datetime
from bson import ObjectId
from models.database import reports_collection

reports_bp = Blueprint('reports_bp', __name__)


@reports_bp.route('/api/save-report', methods=['POST'])
def save_report():
    data        = request.json
    user_id     = data.get('user_id')
    skills      = data.get('skills', [])
    sbert_gaps  = data.get('sbert_gaps', [])
    gap_count   = data.get('gap_count', 0)
    job_snippet = data.get('job_snippet', '')

    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400

    report = {
        'user_id':     user_id,
        'job_snippet': job_snippet[:160],
        'skills':      skills,
        'sbert_gaps':  sbert_gaps,
        'gap_count':   gap_count,
        'created_at':  datetime.utcnow().isoformat(),
    }
    result = reports_collection.insert_one(report)
    return jsonify({'message': 'Report saved!', 'report_id': str(result.inserted_id)}), 201


@reports_bp.route('/api/reports', methods=['GET'])
def get_reports():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400

    reports = list(reports_collection.find({'user_id': user_id}).sort('created_at', -1))
    for r in reports:
        r['_id'] = str(r['_id'])
    return jsonify(reports), 200


@reports_bp.route('/api/reports/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400
    try:
        result = reports_collection.delete_one({'_id': ObjectId(report_id), 'user_id': user_id})
    except Exception:
        return jsonify({'message': 'Invalid report ID'}), 400
    if result.deleted_count == 0:
        return jsonify({'message': 'Report not found or access denied'}), 404
    return jsonify({'message': 'Report deleted'}), 200
