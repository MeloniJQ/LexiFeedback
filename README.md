# ??? LexiFeed - Full-Stack AI English Learning & Interview Platform

LexiFeed is a full-stack web application that helps users practice English interview and speaking skills using AI-driven question generation, voice transcription, smart resume processing, and session feedback.

---

## ?? Key Features

* **Secure auth** with JWT-based login/signup.
* **AI-powered interview question generation** from company, role, and resume context.
* **Voice transcription and analysis** for spoken answers.
* **Follow-up question generation** based on candidate responses.
* **Session feedback and progress stats** saved per user.
* **Modern frontend** built with Next.js, TypeScript, Tailwind CSS.

---

## ??? Technology Stack

### Frontend
* **Next.js 16.2** (App Router)
* **TypeScript**
* **Tailwind CSS**
* **React**
* **Lucide icons**
* **React hooks** + custom auth state

### Backend
* **Flask 3.x**
* **Flask-CORS**
* **Flask-SQLAlchemy**
* **SQLite**
* **OpenAI** via `openai` and LangChain helpers
* **JWT auth** via custom Flask middleware
* **Voice transcription + analysis** routes

---

## ?? Project Structure

```
LexiFeed/
+-- backend/
¦   +-- app.py
¦   +-- config.py
¦   +-- requirements.txt
¦   +-- models/
¦   +-- routes/
¦   +-- services/
¦   +-- utils/
+-- frontend/
    +-- app/
    +-- components/
    +-- lib/
    +-- hooks/
    +-- package.json
```

---

## ?? Setup Guide

### Prerequisites
* **Python 3.8+**
* **Node.js 18+**
* **npm**

---

### Backend Setup

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   * Windows PowerShell:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * macOS/Linux:
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file inside `backend/`:
   ```env
   SECRET_KEY=your_app_secret_key_here
   JWT_SECRET_KEY=your_jwt_secret_key_here
   DATABASE_URL=sqlite:///app.db
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. Start the backend server:
   ```bash
   python app.py
   ```

6. Verify the backend is running:
   ```text
   http://localhost:5000
   ```

> `app.db` is generated automatically when the backend starts.

---

### Frontend Setup

1. Open a separate terminal and go to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in `frontend/`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Run the frontend:
   ```bash
   npm run dev
   ```

5. Open the app at:
   ```text
   http://localhost:3000
   ```

---

## ?? Authentication Flow

1. **Sign up**: `POST /api/auth/signup`
2. **Login**: `POST /api/auth/login`
3. **Profile**: `GET /api/auth/me`

The frontend stores the returned JWT token and sends it in the `Authorization: Bearer <token>` header for protected endpoints.

---

## ?? Backend API Endpoints

### Auth
* `POST /api/auth/signup`
* `POST /api/auth/login`
* `GET /api/auth/me`

### Interview Workflows
* `POST /api/interview/start`
  * Starts a new interview session and returns AI-generated questions.
  * Supports multipart form data and optional resume upload.
* `POST /api/interview/followup`
  * Generates a follow-up question from the candidate answer.
* `POST /api/interview/feedback`
  * Saves interview transcript and returns AI feedback.
* `GET /api/interview/sessions`
  * Retrieves a user’s saved session history.
* `GET /api/interview/stats`
  * Returns aggregated progress metrics and streak data.

### Legacy Interview / Resume Endpoints
* `POST /api/interview/generate`
* `POST /api/interview/upload-resume`

### Voice Practice
* `POST /api/voice/transcribe`
* `POST /api/voice/analyze`
* `POST /api/voice/followup`
* `POST /api/voice/analyze-agentic`
* `POST /api/voice/session-comparison`

---

## ?? Notes

* The frontend uses `frontend/lib/api.ts` for most interview-related API calls.
* Voice transcription and analysis occur from `frontend/app/practice/interview/page.tsx`.
* The backend CORS policy allows local development requests from `http://localhost:3000` and `http://localhost:5000`.
* `OPENAI_API_KEY` is required for AI generation and voice analysis features.

---

## ?? Core Dependencies

### Backend
* Flask
* Flask-CORS
* Flask-SQLAlchemy
* python-dotenv
* PyJWT
* openai
* pdfplumber
* python-docx

### Frontend
* Next.js
* React
* TypeScript
* Tailwind CSS
* react-hook-form
* zod
* lucide-react

---

## ??? Troubleshooting

### If the backend does not start
* Ensure the virtual environment is activated.
* Confirm `requirements.txt` installed correctly.
* Check `.env` includes `OPENAI_API_KEY`.

### If the frontend cannot reach the API
* Verify the backend is running on port `5000`.
* Confirm `NEXT_PUBLIC_API_URL` is `http://localhost:5000/api`.
* If CORS errors appear, review the allowed origins in `backend/app.py`.

### Reset the database
```bash
cd backend
rm app.db
python app.py
```

---

## ?? Contributing

Fork the repository, create a branch, implement your changes, and open a pull request with a clear description. Keep backend and frontend changes separate when possible.
