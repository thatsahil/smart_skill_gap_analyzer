import os
import requests as http_requests
from flask import Blueprint, request, jsonify

chatbot_bp = Blueprint('chatbot_bp', __name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME     = "gemini-2.5-flash"
GEMINI_URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"

@chatbot_bp.route('/api/chat', methods=['POST'])
def api_chat():
    data = request.json
    messages = data.get('messages', [])
    
    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    headers = {'Content-Type': 'application/json'}
    
    contents = []
    for msg in messages:
        role = "model" if msg.get("role") == "assistant" else "user"
        contents.append({
            "role": role,
            "parts": [{"text": msg.get("content", "")}]
        })
    
    payload = {
        "contents": contents,
        "systemInstruction": {
            "role": "user",
            "parts": [
                {"text": "You are a concise, helpful career advisor AI built into the Skill Gap Analyzer platform. Keep responses brief, under 2-3 short paragraphs."}
            ]
        }
    }
    
    try:
        response = http_requests.post(GEMINI_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        resp_data = response.json()
        
        reply_text = resp_data['candidates'][0]['content']['parts'][0]['text']
        return jsonify({"success": True, "reply": reply_text})
        
    except Exception as e:
        print(f"[Chat API] Error: {e}")
        try:
           print(response.text)
        except:
           pass
        return jsonify({"error": "Failed to communicate with AI endpoint"}), 500
