# Backend for Skill Gap Analyzer

This is the backend for the Skill Gap Analyzer project, providing user authentication and verification using Flask and MongoDB.

## Features
- **User Signup**: Validates user data and securely stores hashed passwords in MongoDB.
- **User Login**: Verifies user credentials against the database.
- **CORS Support**: Configured to work seamlessly with the frontend.

## Prerequisites
- **Python 3.x**
- **MongoDB**: Ensure MongoDB is installed and running locally on `localhost:27017` or provide a `MONGO_URI` environment variable.

## Setup Instructions
1.  Navigate to the `backend/` directory.
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Run the backend server:
    ```bash
    python app.py
    ```

The server will start on `http://127.0.0.1:5000/`.
