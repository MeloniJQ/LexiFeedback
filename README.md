4. If installed at a different path, update this line in `backend/routes/presentation_upload.py`:
```python
   LIBREOFFICE_PATH = r"C:\Program Files\LibreOffice\program\soffice.exe"
```

#### macOS
```bash
brew install --cask libreoffice
```

#### Ubuntu / Debian Linux
```bash
sudo apt update
sudo apt install libreoffice -y
```

#### Verify Installation
```bash
# Windows (PowerShell)
& "C:\Program Files\LibreOffice\program\soffice.exe" --version

# macOS / Linux
soffice --version
```

You should see output like: `LibreOffice 24.x.x.x`

> **Note:** LibreOffice is only required for the PPT upload preview feature. All other features work without it.

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

4. Install additional Python dependency for image processing:
```bash
   pip install pillow
```

5. Create a `.env` file inside `backend/`:
```env
   SECRET_KEY=your_app_secret_key_here
   JWT_SECRET_KEY=your_jwt_secret_key_here
   DATABASE_URL=sqlite:///app.db
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

6. Start the backend server:
```bash
   python app.py
```

7. Verify the backend is running:
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

3. Install additional frontend dependencies:
```bash
   npm install pptxgenjs jszip
```

4. Create a `.env.local` file in `frontend/`:
```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   GROQ_API_KEY=your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   PEXELS_API_KEY=your_pexels_api_key_here
```

   #### How to get free API keys:
   | Key | Where to get | Cost |
   |-----|-------------|------|
   | `GROQ_API_KEY` | https://console.groq.com | Free |
   | `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey | Free |
   | `PEXELS_API_KEY` | https://www.pexels.com/api/ | Free |

5. Run the frontend:
```bash
   npm run dev
```

6. Open the app at:
```text
   http://localhost:3000
```

---

## 🔐 Authentication Flow

1. **Sign up**: `POST /api/auth/signup`
2. **Login**: `POST /api/auth/login`
3. **Profile**: `GET /api/auth/me`

The frontend stores the returned JWT token and sends it in the `Authorization: Bearer <token>` header for protected endpoints.

---

## 📡 Backend API Endpoints

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
  * Retrieves a user�s saved session history.
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

### Presentation
* `POST /api/presentation/upload-preview` — Upload `.pptx`, returns slide images
* `POST /api/presentation/generate-content` — AI generates slide content (optional backend route)

---

## 🔑 Core Dependencies

### Backend
* Flask
* Flask-CORS
* Flask-SQLAlchemy
* python-dotenv
* PyJWT
* openai
* pdfplumber
* python-docx
* pillow
* requests

### Frontend
* Next.js
* React
* TypeScript
* Tailwind CSS
* react-hook-form
* zod
* lucide-react
* pptxgenjs
* jszip

---

## ⚠️ Troubleshooting

### If the backend does not start
* Ensure the virtual environment is activated.
* Confirm `requirements.txt` installed correctly.
* Check `.env` includes all required keys.

### If the frontend cannot reach the API
* Verify the backend is running on port `5000`.
* Confirm `NEXT_PUBLIC_API_URL` is `http://localhost:5000/api`.
* If CORS errors appear, review the allowed origins in `backend/app.py`.

### If PPT upload shows only 1 slide
* Make sure LibreOffice is fully installed (not just partially).
* Verify the path in `backend/routes/presentation_upload.py` matches your installation.
* Try running LibreOffice from the command line to confirm it works:
```powershell
  & "C:\Program Files\LibreOffice\program\soffice.exe" --version
```
* If you have Poppler installed, `pdftoppm` will be used automatically as a fallback.
* Install Poppler on Windows via winget:
```powershell
  winget install oschwartz10612.poppler
```

### If AI slides show generic content (FALLBACK)
* Check that `GROQ_API_KEY` is in `frontend/.env.local`
* Get a free key at https://console.groq.com (no credit card needed)
* Restart `npm run dev` after adding the key

### Reset the database
```bash
cd backend
rm app.db
python app.py
```

---

## 🤝 Contributing

Fork the repository, create a branch, implement your changes, and open a pull request with a clear description. Keep backend and frontend changes separate when possible.