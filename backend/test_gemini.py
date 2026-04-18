import requests, os, json
from dotenv import load_dotenv
load_dotenv()
k = os.getenv('GEMINI_API_KEY')
prompt = 'You are an expert learning roadmap designer.\nGenerate a structured learning roadmap for someone who wants to learn \"Python\" at the \"Beginner\" level.\nReturn ONLY a valid JSON array with exactly 7 steps. No explanation.\nEach step must have these fields:\n- \"title\": 3-5 word step name\n- \"description\": one sentence explaining what is covered\n- \"resources\": array of exactly 2 objects each with {\"label\": \"short name\", \"url\": \"https://...\"}\nReturn only the raw JSON array.'
r = requests.post(
    f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={k}',
    json={'contents': [{'parts': [{'text': prompt}]}]}
)
print('STATUS:', r.status_code)
print('RESPONSE:', r.text)
try:
    print('JSON VALID?', 'Yes' if json.loads(r.json()['candidates'][0]['content']['parts'][0]['text'].strip('`json').strip('`')) else '?')
except Exception as e:
    print('ERROR PARSING:', e)
