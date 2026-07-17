# LexiFeed - Full-Stack AI English Learning & Interview Platform

LexiFeed is a full-stack web application that helps users practice English interview and speaking skills using AI-driven question generation, voice transcription, smart resume processing, and session feedback.

---

## Key Features

- **Secure auth** with JWT-based login/signup.
- **AI-powered interview question generation** from company, role, resume context, and a planner-generated interview blueprint.
- **Blueprint-first question generation** using a configurable `AI_PROVIDER` abstraction (OpenRouter / OpenAI / Ollama / Gemini).
- **Voice transcription and analysis** for spoken answers.
- **Follow-up question generation** based on candidate responses.
- **Session feedback and progress stats** saved per user.
- **Modern frontend** built with Next.js, TypeScript, Tailwind CSS.

---

## Technology Stack

### Frontend

- **Next.js 16.2** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React**
- **Lucide icons**
- **React hooks** + custom auth state

### Backend

- **Flask 3.x**
- **Flask-CORS**
- **Flask-SQLAlchemy**
- **SQLite**
- **OpenRouter** via `openai` SDK (OpenAI-compatible API) — default provider
- **JWT auth** via custom Flask middleware
- **Voice transcription + analysis** routes

---

## Project Structure

```
LexiFeed/
+-- backend/
�   +-- app.py
�   +-- config.py
�   +-- requirements.txt
�   +-- models/
�   +-- routes/
�   +-- services/
�   +-- utils/
+-- frontend/
    +-- app/
    +-- components/
    +-- lib/
    +-- hooks/
    +-- package.json
```

---

## Setup Guide

### Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **npm**

---

### Backend Setup

1. Open a terminal and navigate to the backend folder:

   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   - Windows PowerShell:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - macOS/Linux:
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
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   AI_PROVIDER=openrouter
   AI_MODEL=meta-llama/llama-3.3-70b-instruct:free
   OLLAMA_API_URL=http://127.0.0.1:11434
   ```

   > Get your free OpenRouter API key at https://openrouter.ai/keys
   > The default model `meta-llama/llama-3.3-70b-instruct:free` is **completely free** — no credit card required.
   > Other popular free models: `deepseek/deepseek-v4-flash:free`, `tencent/hy3:free`, `openrouter/free` (auto-selects).
   > Free models have the `:free` suffix. Browse them at https://openrouter.ai/models?supported_parameters=free

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

## Authentication Flow

1. **Sign up**: `POST /api/auth/signup`
2. **Login**: `POST /api/auth/login`
3. **Profile**: `GET /api/auth/me`

The frontend stores the returned JWT token and sends it in the `Authorization: Bearer <token>` header for protected endpoints.

---

## Backend API Endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Interview Workflows

- `POST /api/interview/start`
  - Starts a new interview session and returns AI-generated questions.
  - Supports multipart form data and optional resume upload.
- `POST /api/interview/questions/generate`
  - Generates a blueprint-backed interview question set from the latest plan and candidate profile.
- `GET /api/interview/questions`
  - Lists generated questions for the current candidate profile.
- `GET /api/interview/questions/<question_id>`
  - Fetches a single stored generated question.
- `POST /api/interview/followup`
  - Generates a follow-up question from the candidate answer.
- `POST /api/interview/feedback`
  - Saves interview transcript and returns AI feedback.
- `GET /api/interview/sessions`
  - Retrieves a user’s saved session history.
- `GET /api/interview/stats`
  - Returns aggregated progress metrics and streak data.

### Candidate Intelligence Layer (Phase 1)

- `POST /api/candidate/resume/upload`
  - Upload a PDF resume and extract structured candidate information.
  - Stores normalized personal info, education, skills, projects, tools, and more.
- `POST /api/candidate/jd/analyze`
  - Analyze a pasted job description and extract required skills, technologies, responsibilities, preferred experience, and domain tags.
- `GET /api/candidate/profile`
  - Return the latest candidate profile including resume data, JD data, and match metadata.
- `GET /api/candidate/match`
  - Generate or refresh match results between the resume and JD.

### Legacy Interview / Resume Endpoints

- `POST /api/interview/generate`
- `POST /api/interview/upload-resume`

### Voice Practice

- `POST /api/voice/transcribe`
- `POST /api/voice/analyze`
- `POST /api/voice/followup`
- `POST /api/voice/analyze-agentic`
- `POST /api/voice/session-comparison`

---

## ?? Notes

- The frontend uses `frontend/lib/api.ts` for most interview-related API calls, including blueprint-based question generation.
- Candidate Intelligence Phase 1 adds backend services and routes for structured resume + JD parsing.
- Phase 3 adds a provider abstraction layer under `backend/llm/`, with support for `OpenRouter` (default), `OpenAI`, `Ollama`, and `Gemini` via `AI_PROVIDER`.
- The frontend interview setup page (`frontend/app/practice/interview/page.tsx`) now supports building a candidate profile summary and interview plan before generating questions.
- The backend CORS policy allows local development requests from `http://localhost:3000` and `http://localhost:5000`.
- `OPENROUTER_API_KEY` is required when `AI_PROVIDER=openrouter` (the default). Set `OPENAI_API_KEY` instead if you switch to `AI_PROVIDER=openai`.

---

## ?? Core Dependencies

### Backend

- Flask
- Flask-CORS
- Flask-SQLAlchemy
- python-dotenv
- PyJWT
- openai (used as the HTTP client for OpenRouter's OpenAI-compatible API)
- pdfplumber
- python-docx

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- react-hook-form
- zod
- lucide-react

---

## ??? Troubleshooting

### If the backend does not start

- Ensure the virtual environment is activated.
- Confirm `requirements.txt` installed correctly.
- Check `.env` includes `OPENROUTER_API_KEY` (when using the default `openrouter` provider).
- **SQLAlchemy Class Mapping (`metadata` column)**: Python classes use `meta_data` to represent the JSON metadata fields to prevent conflict with SQLAlchemy's internal class property `metadata`. They map natively to the `"metadata"` column on SQL tables, ensuring both JSON outputs and existing databases remain compatible.

### If the frontend cannot reach the API

- Verify the backend is running on port `5000`.
- Confirm `NEXT_PUBLIC_API_URL` is `http://localhost:5000/api`.
- If CORS errors appear, review the allowed origins in `backend/app.py`.

### Reset the database

```bash
cd backend
rm app.db
python app.py
```

---

## ?? Candidate Intelligence Architecture

### Resume Parsing Pipeline

- `backend/services/resume_parser.py` parses uploaded PDF resumes using `pdfplumber` or `PyPDF2`.
- Extracted fields include personal info, education, skills, programming languages, frameworks, databases, cloud technologies, projects, certifications, tools, and soft skills.
- Parsed values are normalized and deduplicated so the backend stores canonical names such as `Python`, `AWS`, and `SaaS`.

### Job Description Parser

- `backend/services/jd_parser.py` analyzes pasted JD text.
- Extracted fields include required skills, required technologies, programming languages, frameworks, database technologies, required tools, responsibilities, preferred experience, and preferred domain.
- Domain extraction maps text like `SaaS` and `fintech` into normalized tags.

### Candidate Profile Matching

- `backend/services/match_service.py` compares resume and JD structured data.
- Generates matching skills, missing skills, a skill match percentage, project match, technology match, strength areas, and improvement areas.
- Match data is stored in `backend/models/candidate_profile.py`.

### Folder Structure

```
backend/
  app.py
  config.py
  models/
    user.py
    session.py
    candidate_profile.py
  routes/
    auth.py
    interview.py
    candidate_intelligence.py
    presentation_upload.py
    voice.py
    reading.py
  services/
    resume_parser.py
    jd_parser.py
    match_service.py
    candidate_profile.py
  utils/
    jwt_handler.py
```

### JSON Schema Highlights

- Resume profile JSON includes:
  - `candidate_name`, `email`, `phone`
  - `education`, `skills`, `projects`, `internships`, `certifications`, `tools`, `soft_skills`
- JD summary JSON includes:
  - `required_skills`, `required_technologies`, `programming_languages`, `frameworks`, `database_technologies`, `required_tools`, `preferred_experience`, `responsibilities`, `preferred_domain`
- Match summary JSON includes:
  - `matching_skills`, `missing_skills`, `skill_match_percentage`, `project_match`, `technology_match`, `strength_areas`, `improvement_areas`

### Future Phase Integration

- Future agentic AI modules can consume `GET /api/candidate/profile` and `GET /api/candidate/match` to generate interview planning, question generation, and candidate coaching.
- The current phase provides standardized structured data so later components do not depend on raw resume text.

## ?? Contributing

Fork the repository, create a branch, implement your changes, and open a pull request with a clear description. Keep backend and frontend changes separate when possible.
## 🌐 Running the Application Over a Local Network

When you want to access LexiFeed from another device on the same network (e.g., a phone, tablet, or another computer), follow these extra steps:

1. **Find your machine’s local IP address** (e.g., `10.221.6.136`). You can get it with `ipconfig` (Windows) or `ifconfig`/`hostname -I` (Linux/macOS).
2. **Start the backend** binding to `0.0.0.0` (already configured) so it listens on all interfaces:
   ```bash
   python app.py
   ```
   The server will be reachable at `http://<YOUR_IP>:5000`.
3. **Start the frontend** also binding to `0.0.0.0` for development:
   ```bash
   npm run dev -- --host 0.0.0.0
   ```
   The dev server will be reachable at `http://<YOUR_IP>:3000`.
4. **Update the frontend environment** so it points to the backend’s network address. Edit `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://<YOUR_IP>:5000/api
   ```
5. **Configure CORS** – the backend already allows private‑network IP ranges via regex patterns in `app.py`, so no extra changes are needed.
6. **Open the app from the other device’s browser**:
   ```text
   http://<YOUR_IP>:3000
   ```
   You should now see the full UI and be able to sign‑in, generate interview questions, etc.

> **Note**: In production you would replace these dev‑only CORS settings with a proper domain whitelist.

---

## 📦 Verify Dependencies

All required Python packages are listed in `backend/requirements.txt`. The current list already includes:
- `Flask`
- `flask-cors`
- `python-dotenv`
- `SQLAlchemy`
- `openai` (and related LangChain packages)
- `uvicorn` (if you ever run via ASGI)

If you add new features that depend on additional libraries, remember to append them to `requirements.txt` and run `pip install -r requirements.txt`.

---
