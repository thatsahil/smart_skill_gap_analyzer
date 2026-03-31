Skill Gap Analyzer for Job Seekers
Objectives:
    1. Extract required skills and qualifications from job
    descriptions using GenAI.
    2. Parse candidate resumes and match them semantically
    with job requirements.
    3. Generate a personalized skill-gap report with
    suggested learning resources, using an agentic
    assistant.

## Backend Setup and Run Instructions

To set up and run the Python Flask backend:

1.  **Install dependencies:**
    `pip install -r backend/requirements.txt`

2.  **Navigate to the backend directory:**
    `cd backend`

3.  **Initialize the database (run this once):**
    `python database.py`
    (This will create `test.db` in the `backend` directory)

4.  **Run the Flask application:**
    `flask run`
    (If `flask run` doesn't work directly, try `python app.py`)

The server should start on `http://127.0.0.1:5000`.

## Testing Backend API Endpoints

Once the Flask server is running, you can test the API endpoints using `curl` or a tool like Postman.

**Signup Endpoint (`/api/signup`):**
To register a new user:
`curl -X POST -H "Content-Type: application/json" -d "{\"username\": \"testuser\", \"email\": \"test@example.com\", \"password\": \"password123\"}" http://127.0.0.1:5000/api/signup`

**Login Endpoint (`/api/login`):**
To log in a user:
`curl -X POST -H "Content-Type: application/json" -d "{\"email\": \"test@example.com\", \"password\": \"password123\"}" http://127.0.0.1:5000/api/login`
