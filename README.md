---

## Setup Guide

### Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **npm**
- **LibreOffice** (only required for the PPT upload preview feature — see below)

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

   # Used directly by services/ (ai_service, voice_service, agentic_analysis, conversation_service)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Used by the backend/agents/ pipeline via the AI_PROVIDER abstraction
   AI_PROVIDER=openrouter
   AI_MODEL=openrouter/free
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OLLAMA_API_URL=http://127.0.0.1:11434

   # Optional — faster-whisper transcription tuning (see "Voice/Whisper
   # performance tuning" below). Defaults to "base" if unset.
   WHISPER_MODEL_SIZE=base
```

   > Get a free Gemini API key at https://aistudio.google.com/app/apikey
   > Get a free OpenRouter API key at https://openrouter.ai/keys — `openrouter/free` is OpenRouter's own auto-router, which picks whichever free model currently has capacity (recommended over pinning a single popular free model like `meta-llama/llama-3.3-70b-instruct:free`, which gets rate-limited across all OpenRouter users during busy periods). No credit card required. Browse individual free models (`:free` suffix) at https://openrouter.ai/models?supported_parameters=free

5. Start the backend server:

```bash
   python app.py
```

6. Verify the backend is running:

```text
   http://localhost:5000/api/health
```

   > `app.db` is generated automatically inside `backend/instance/` when the backend starts.

#### LibreOffice (optional — required only for PPT upload preview)

* **Windows**: Download and install from [libreoffice.org](https://www.libreoffice.org/download/). If installed at a non-default path, update `LIBREOFFICE_PATH` in `backend/routes/presentation_upload.py`.
* **macOS**: `brew install --cask libreoffice`
* **Ubuntu/Debian**: `sudo apt update && sudo apt install libreoffice -y`

Verify with:
```bash
# Windows (PowerShell)
& "C:\Program Files\LibreOffice\program\soffice.exe" --version

# macOS / Linux
soffice --version
```

> If PPT preview shows only 1 slide, confirm LibreOffice is fully installed and the path in `presentation_upload.py` is correct.

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
   GROQ_API_KEY=your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   PEXELS_API_KEY=your_pexels_api_key_here
```

   | Key | Where to get it | Cost |
   |-----|-------------|------|
   | `GROQ_API_KEY` | https://console.groq.com | Free |
   | `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey | Free |
   | `PEXELS_API_KEY` | https://www.pexels.com/api/ | Free |

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

### CEFR Initial Assessment
- `GET /api/assessment/status` — Whether the current user has completed the placement test.
- `GET /api/assessment/start` — Builds a 5-part placement test (grammar, vocabulary, reading, listening, speaking) mixing a static item bank with AI-generated passages.
- `POST /api/assessment/submit` — Scores the completed test and stores the resulting CEFR level (A1-C2) on the user's profile.

### Interview Workflows
- `POST /api/interview/start` — Starts a new interview session and returns AI-generated questions. Supports multipart form data, an optional resume upload, and an optional `num_questions` field (1-20, default 5) to control how many questions are generated.
- `POST /api/interview/questions/generate` — Generates a blueprint-backed interview question set from the latest plan and candidate profile.
- `GET /api/interview/questions` — Lists generated questions for the current candidate profile.
- `GET /api/interview/questions/<question_id>` — Fetches a single stored generated question.
- `POST /api/interview/followup` — Generates a follow-up question from the candidate answer.
- `POST /api/interview/feedback` — Saves interview transcript and returns AI feedback.
- `GET /api/interview/sessions` — Retrieves a user's saved session history.
- `GET /api/interview/stats` — Returns aggregated progress metrics and streak data.
- `POST /api/interview/progress/save` — Upserts an in-progress interview session (questions, answered Q&A pairs, current position) so a page refresh mid-interview doesn't lose progress.
- `GET /api/interview/progress/active` — Returns the user's most recent in-progress attempt, used to show a "Resume / Start Fresh" prompt.
- `DELETE /api/interview/progress/<session_key>` — Discards a saved in-progress attempt.
- `POST /api/interview/generate` / `POST /api/interview/upload-resume` — Legacy endpoints.

### Candidate Intelligence
- `POST /api/candidate/resume/upload` — Upload a PDF resume and extract structured candidate information.
- `POST /api/candidate/jd/analyze` — Analyze a pasted job description and extract required skills, technologies, responsibilities, preferred experience, and domain tags.
- `GET /api/candidate/profile` — Return the latest candidate profile including resume data, JD data, and match metadata.
- `GET /api/candidate/match` — Generate or refresh match results between the resume and JD.

### Voice Practice
- `POST /api/voice/transcribe`
- `POST /api/voice/analyze`
- `POST /api/voice/followup`
- `POST /api/voice/analyze-agentic`
- `POST /api/voice/session-comparison`

### Reading Practice
- Routes under `/api/practice/reading` — see `backend/routes/reading.py` for AI passage/news-script generation and pronunciation analysis.
- Passage generation accepts `level` (CEFR) and `length` (short/medium/long); `level` defaults to the requesting user's assessed CEFR level when not passed explicitly.
- Every generated passage is logged to `ReadingPassageHistory`, and the last 15 titles (mode-matched, 30-day window) are excluded from future generations to avoid repeats.

### Casual Conversation
- `GET /api/practice/conversation/topics` — List the 20 predefined topics (title, icon, description, estimated time).
- `GET /api/practice/conversation/topics/<topic_id>` — Full topic detail (prompt + talking points).
- `POST /api/practice/conversation/feedback` — Transcript + topic (`topic_id`, or `topic_title`/`topic_prompt` for a custom user-typed topic) + duration → full IELTS-style report (overall score/CEFR level, vocabulary analysis, grammar mistakes, fluency, pronunciation with per-word IPA/syllables/stress, strengths, areas to improve, sample improved response, vocabulary flashcards, quick tips).

### Vocabulary
- `GET /api/vocabulary` — List the current user's saved words/idioms/phrases, newest first.
- `POST /api/vocabulary` — Save an entry (idempotent — saving the same entry twice returns the existing row).
- `DELETE /api/vocabulary/<entry_id>` — Remove a saved entry.

### Goals
- `GET /api/goals` — List current user's goals.
- `POST /api/goals` — Create a goal.
- `GET /api/goals/<id>` — Get a single goal.
- `PUT /api/goals/<id>` — Edit a goal (title/description/target/deadline).
- `DELETE /api/goals/<id>` — Delete a goal.
- `POST /api/goals/<id>/progress` — Update progress (increment or set).
- `GET /api/goals/stats` — Dashboard summary stats (totals, streaks, average progress).

### Presentation
- `POST /api/presentation/upload-preview` — Upload `.pptx`/`.ppt`, returns slide images (requires LibreOffice + PyMuPDF).

### Health
- `GET /api/health`

---

## Notes

- The frontend uses `frontend/lib/api.ts` for most interview-related API calls, including blueprint-based question generation.
- Candidate Intelligence adds backend services and routes for structured resume + JD parsing (`backend/services/resume_parser.py`, `backend/services/jd_parser.py`, `backend/services/match_service.py`).
- The `backend/agents/` pipeline uses the `AI_PROVIDER` abstraction (`backend/llm/`), supporting `OpenRouter` (default), `OpenAI`, `Ollama`, and `Gemini`. The newer AI/voice/agentic-analysis/conversation services (`backend/services/ai_service.py`, `voice_service.py`, `agentic_analysis.py`, `conversation_service.py`) try the same `AI_PROVIDER` abstraction first and fall back to calling Google Gemini directly via `GEMINI_API_KEY` if that fails.
- The backend CORS policy allows local development requests from `localhost`/`127.0.0.1` and standard private-network IP ranges (see `backend/app.py`), so the app can be reached from other devices on the same network without extra CORS config.
- **SQLAlchemy `metadata` column**: model classes use `meta_data` to represent JSON metadata fields, to avoid conflicting with SQLAlchemy's internal `metadata` class property. These map to the `"metadata"` column in the database.
- **Pronunciation playback**: Casual Conversation's "click a word to hear it" feature uses the browser's built-in Web Speech API (`speechSynthesis`) — free, no API key, no new dependency, works offline. It only needs a modern browser.

---

## Voice/Whisper Performance Tuning

Transcription time scales with recording length and CPU speed. If transcription feels slow (especially for the 2-minute Casual Conversation recordings), two levers help:

- **`WHISPER_MODEL_SIZE`** in `backend/.env` — defaults to `base`. Set to `tiny` for noticeably faster CPU transcription with a modest accuracy tradeoff. Restart the backend after changing it (first use of a new size downloads that model once, then it's cached).
- **`beam_size`** in `transcribe_audio()` (`backend/services/voice_service.py`) — greedy decoding (`beam_size=1`) is meaningfully faster than beam search (`beam_size=5`), especially on longer recordings, with only a small accuracy tradeoff for clear speech.

---

## Core Dependencies

### Backend
- Flask, Flask-CORS, Flask-SQLAlchemy, SQLAlchemy, Werkzeug
- PyJWT, python-dotenv
- openai (OpenRouter/OpenAI-compatible client), requests, google-genai
- faster-whisper, ctranslate2
- pdfplumber, PyPDF2, python-docx, PyMuPDF, pillow

See `backend/requirements.txt` for the full pinned list. If you add a feature that needs a new library, add it there and re-run `pip install -r requirements.txt`.

### Frontend
- Next.js, React, TypeScript, Tailwind CSS
- react-hook-form, zod, lucide-react
- pptxgenjs, jszip

---

## Running the Application Over a Local Network

To access LexiFeed from another device on the same network (phone, tablet, another computer):

1. Find your machine's local IP address (e.g. `10.221.6.136`) via `ipconfig` (Windows) or `ifconfig`/`hostname -I` (Linux/macOS).
2. Start the backend — it already binds to `0.0.0.0`, so it's reachable at `http://<YOUR_IP>:5000`.
3. Start the frontend bound to all interfaces: `npm run dev -- --host 0.0.0.0`, reachable at `http://<YOUR_IP>:3000`.
4. Update `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://<YOUR_IP>:5000/api`.
5. CORS already allows private-network IP ranges — no extra changes needed.
6. Open `http://<YOUR_IP>:3000` from the other device's browser.

> **Note**: In production, replace these dev-only CORS settings with a proper domain whitelist.

---

## Troubleshooting

### Backend won't start
- Ensure the virtual environment is activated and `requirements.txt` installed correctly.
- Check `.env` includes `GEMINI_API_KEY` and, if using the agentic pipeline's default provider, `OPENROUTER_API_KEY`.

### Frontend can't reach the API
- Verify the backend is running on port `5000`.
- Confirm `NEXT_PUBLIC_API_URL` is `http://localhost:5000/api`.
- If CORS errors appear, review the allowed origins in `backend/app.py`.

### PPT upload shows only 1 slide
- Make sure LibreOffice is fully installed and the path in `backend/routes/presentation_upload.py` matches your installation.
- Confirm `PyMuPDF` installed correctly (`pip show pymupdf`).

### AI slides show generic content (fallback)
- Check that `GROQ_API_KEY` is set in `frontend/.env.local` and restart `npm run dev` after adding it.

### Popovers, dropdowns, tooltips, or overlays show faded/invisible text
- This project's `tailwind.config.ts` defines custom color tokens (`popover`, `card`, `muted`, `accent`, etc.) that `components/ui/*.tsx` depend on — but Tailwind v4 only loads a JS config file if `frontend/app/globals.css` has an explicit `@config '../tailwind.config.ts';` line right after `@import 'tailwindcss';`. Without it, those tokens silently resolve to nothing. Confirm that line is present, then restart `npm run dev` (a hot-reload alone may not pick up a `@config` change).

### Backend feels slow, or requests seem to hang with no error
- Flask's dev server defaults to handling one request at a time. Make sure `backend/app.py`'s last line includes `threaded=True`: `app.run(debug=True, use_reloader=False, port=5000, host="0.0.0.0", threaded=True)`. This matters especially for Casual Conversation, which makes two sequential slow requests (transcribe, then feedback) per session.

### Reset the database
```bash
cd backend
rm instance/app.db
python app.py
```

---

## Candidate Intelligence Architecture

### Resume Parsing Pipeline
- `backend/services/resume_parser.py` parses uploaded PDF resumes using `pdfplumber` or `PyPDF2`.
- Extracted fields include personal info, education, skills, programming languages, frameworks, databases, cloud technologies, projects, certifications, tools, and soft skills.
- Parsed values are normalized and deduplicated so the backend stores canonical names such as `Python`, `AWS`, and `SaaS`.

### Job Description Parser
- `backend/services/jd_parser.py` analyzes pasted JD text, extracting required skills, technologies, programming languages, frameworks, database technologies, tools, responsibilities, preferred experience, and preferred domain.

### Candidate Profile Matching
- `backend/services/match_service.py` compares resume and JD structured data, producing matching/missing skills, a skill match percentage, project/technology match, strengths, and improvement areas.
- Match data is stored via `backend/models/candidate_profile.py`.

### JSON Schema Highlights
- Resume profile JSON includes: `candidate_name`, `email`, `phone`, `education`, `skills`, `projects`, `internships`, `certifications`, `tools`, `soft_skills`.
- JD summary JSON includes: `required_skills`, `required_technologies`, `programming_languages`, `frameworks`, `database_technologies`, `required_tools`, `preferred_experience`, `responsibilities`, `preferred_domain`.
- Match summary JSON includes: `matching_skills`, `missing_skills`, `skill_match_percentage`, `project_match`, `technology_match`, `strength_areas`, `improvement_areas`.

---

## Testing

Unit and integration tests for the production-ready interview platform features live in `backend/tests/` (`test_production_features.py`, `test_candidate_intelligence.py`, `test_interview_planning.py`). Run them from the `backend/` directory with your virtual environment active:

```bash
cd backend
python -m pytest tests/
```

`backend/templates/` is reserved for deployment/documentation templates for production use and is currently empty.

---

## Known Limitations

- **Assessment answer keys** are cached in an in-process dict (`routes/assessment.py`), keyed by user ID. This works for a single-process deployment; a multi-worker/multi-process production deploy should move this to the database or Redis so `/api/assessment/start` and `/api/assessment/submit` always hit the same process.
- **Interview progress resume** restores state to right after the last completed answer. An in-progress follow-up exchange mid-chain isn't separately persisted, so refreshing mid-follow-up drops that one follow-up round (the main answer and its analysis are still saved).
- **Voice transcription** (`transcribe_audio` in `voice_service.py`) uses local `faster-whisper` and needs no API key, but text-based follow-up/analysis for voice answers still goes through the configured `AI_PROVIDER`.
- The `backend/agents/` and orchestrator pipeline (blueprint planner, evaluation agent, recommendation agent) is reachable via `/api/interview/plan/*` and `/api/interview/session/*`, but the primary practice page (`/practice/interview`) uses the simpler, self-contained flow described above rather than this orchestrator — worth an audit before relying on the orchestrator end-to-end.
- **OpenRouter free-tier rate limits**: if you see repeated fallback/template content instead of real AI responses, you may be hitting OpenRouter's free-tier cap (20 requests/min, 50/day without adding credit; 1,000/day once a one-time $10 balance is added). Setting `AI_MODEL=openrouter/free` lets OpenRouter auto-route to whichever free model currently has capacity, instead of hammering a single congested model. See https://openrouter.ai/docs/api-reference/limits for current numbers.

---

## Contributing

Fork the repository, create a branch, implement your changes, and open a pull request with a clear description. Keep backend and frontend changes separate when possible.

## Screen Recordings

You can view the project demonstration videos using the Google Drive link below:

🔗[ https://drive.google.com/drive/folders/1wMZ62Scx87hwHFD8_HgB3Xq5Kzr6kPns?usp=sharing](https://drive.google.com/drive/folders/1wMZ62Scx87hwHFD8_HgB3Xq5Kzr6kPns?usp=sharing)

The folder contains screen recordings demonstrating the key features and workflow of the project.