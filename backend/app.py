from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

from models.chatbot import chatbot_bp
from models.auth import auth_bp
from models.jobs import jobs_bp
from models.analyze import analyze_bp
from models.resume import resume_bp
from models.reports import reports_bp
from models.admin import admin_bp

app.register_blueprint(chatbot_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(jobs_bp)
app.register_blueprint(analyze_bp)
app.register_blueprint(resume_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(admin_bp)

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

@app.route('/', defaults={'filename': 'index.html'})
@app.route('/<path:filename>')
def serve_frontend(filename):
    return send_from_directory(str(FRONTEND_DIR), filename)

if __name__ == '__main__':
    print("--- Skill Gap Analyzer Backend ---")
    print("Running Flask app on http://127.0.0.1:5000")
    app.run(debug=True, port=5000, use_reloader=False)
