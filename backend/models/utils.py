import os
import threading
import re
try:
    import pdfplumber
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False

try:
    from sentence_transformers import SentenceTransformer, util as sbert_util
    import nltk
    _sbert_model = None
    _sbert_lock  = threading.Lock()

    def get_sbert_model():
        global _sbert_model
        with _sbert_lock:
            if _sbert_model is None:
                print("[SBERT] Loading all-MiniLM-L6-v2 model…")
                _sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
        return _sbert_model
    SBERT_SUPPORT = True
except ImportError:
    SBERT_SUPPORT = False

def extract_pdf_text(file_storage):
    if not PDF_SUPPORT:
        return ""
    with pdfplumber.open(file_storage) as pdf:
        return "\n".join(p.extract_text() or "" for p in pdf.pages)

_SKILL_PATTERN = re.compile(
    r'\b(python|java(?:script)?|typescript|kotlin|swift|rust|go(?:lang)?|ruby|php|scala|c\+\+|c#|r(?=\s)|matlab|perl|bash|shell|powershell|react(?:\.js)?|vue(?:\.js)?|angular(?:js)?|next\.js|nuxt|svelte|html5?|css3?|sass|less|webpack|vite|tailwind(?:css)?|bootstrap|jquery|node(?:\.js)?|express(?:\.js)?|django|flask|fastapi|spring(?:\s*boot)?|laravel|rails|graphql|rest(?:ful)?(?:\s*api)?|grpc|machine\s*learning|deep\s*learning|neural\s*network|nlp|computer\s*vision|tensorflow|pytorch|keras|scikit[-\s]?learn|pandas|numpy|opencv|hugging\s*face|bert|gpt|llm|data\s*science|data\s*engineering|data\s*analysis|etl|feature\s*engineering|aws|azure|gcp|google\s*cloud|kubernetes|k8s|docker|helm|terraform|ansible|jenkins|github\s*actions|ci/cd|ci\s*cd|lambda|ec2|s3|cloudformation|sql|mysql|postgresql|postgres|mongodb|redis|elasticsearch|cassandra|dynamodb|sqlite|oracle|cybersecurity|penetration\s*testing|owasp|oauth|jwt|ssl/tls|firewall|vpn|agile|scrum|kanban|jira|confluence|git|microservices|serverless|soa|spark|hadoop|kafka|airflow|dbt|tableau|power\s*bi|looker|excel|figma|sketch)\b',
    re.IGNORECASE
)

def extract_skills_from_text(text):
    raw = _SKILL_PATTERN.findall(text)
    seen, skills = set(), []
    for s in raw:
        key = s.lower().strip()
        if key not in seen:
            seen.add(key)
            skills.append(s.strip())
    return skills

def semantic_gap_analysis(resume_text, jd_text, threshold=0.55):
    if not SBERT_SUPPORT or not resume_text or not jd_text:
        return []
    try:
        jd_skills = extract_skills_from_text(jd_text)
        resume_skills = extract_skills_from_text(resume_text)
        if not jd_skills:
            try:
                nltk.data.find('tokenizers/punkt_tab')
            except LookupError:
                nltk.download('punkt_tab', quiet=True)
            import nltk.tokenize
            jd_chunks = [s.strip() for s in nltk.tokenize.sent_tokenize(jd_text) if len(s.strip()) > 10]
            resume_chunks = [s.strip() for s in nltk.tokenize.sent_tokenize(resume_text) if len(s.strip()) > 10]
            if not jd_chunks or not resume_chunks:
                return []
            jd_skills = jd_chunks
            resume_skills = resume_chunks
        model = get_sbert_model()
        jd_emb = model.encode(jd_skills, convert_to_tensor=True, show_progress_bar=False)
        resume_emb = model.encode(resume_skills, convert_to_tensor=True, show_progress_bar=False)
        cos_scores = sbert_util.cos_sim(jd_emb, resume_emb)
        max_scores = cos_scores.max(dim=1).values.tolist()
        gaps = []
        for i, (skill, score) in enumerate(zip(jd_skills, max_scores)):
            if score < threshold:
                gaps.append({"skill": skill, "similarity": round(float(score), 3)})
        gaps.sort(key=lambda x: x["similarity"])
        return gaps[:20]
    except Exception as e:
        print(f"[SBERT] Error during gap analysis: {e}")
        return []
