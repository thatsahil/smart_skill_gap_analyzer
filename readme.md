# Skill Gap Analyzer for Job Seekers

## Overview
The Skill Gap Analyzer is an intelligent platform designed to help job seekers identify the missing skills needed to land their dream roles. By leveraging advanced Natural Language Processing (NLP) and Generative AI, the application compares a candidate's resume against a specific job description to find semantic gaps and generates a personalized learning path.

## Key Features
1. **Semantic Resume Parsing**: Uses SBERT (Sentence-BERT) to semantically match the skills in a candidate's PDF resume against a Job Description.
2. **AI-Powered Gap Analysis**: Integrates with the Google Gemini API to analyze identified skill gaps and provide targeted reasoning for why each missing skill is necessary.
3. **Personalized Learning Roadmaps**: Generates step-by-step, actionable roadmaps with curated online resources to master missing skills.
4. **AI Career Coach**: Includes an interactive AI chat widget to assist candidates with interview preparation, resume tips, and career advice.
5. **Job Board Integration**: Stores and manages existing job postings in a MongoDB database to streamline the analysis process.

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript
- **Backend**: Python, Flask, Flask-CORS
- **Database**: MongoDB (via PyMongo)
- **AI/NLP**: Google Gemini (via API), `sentence-transformers` (SBERT), `nltk`
- **PDF Processing**: `pdfplumber`

## Setup and Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/skill-gap-analyzer.git
cd skill-gap-analyzer
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (you can copy from `.env.example`) and add your Gemini API Key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: Keep your `.env` file secure and do not commit it to version control!)*

### 3. Setup the Backend
Navigate to the backend directory and install the required Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

*(Note: Ensure you have MongoDB running locally or update the connection string in `backend/models/database.py`).*

### 4. Run the Application
Start the Flask development server from the backend directory:
```bash
python app.py
```
The server will start on `http://127.0.0.1:5000`. It acts as the API and serves the frontend static files. Open the URL in your browser to access the app!

## Project Structure
- `/frontend`: Contains all the HTML, CSS, and JS files for the user interface.
- `/backend`: Contains the Flask server, routing logic, and AI models.
  - `/backend/models`: Modular architecture (auth, analyze, chatbot, resume, database).

## Security
- API keys are handled securely via environment variables (`.env`). The repository is already configured with `.gitignore` to prevent your `.env` file from being accidentally committed to GitHub.
