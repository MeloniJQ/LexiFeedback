# Full Stack Integration Guide

This guide will help you run the LexiFeed backend and frontend together as a complete full-stack application.

## Prerequisites

- Python 3.8+
- Node.js 18+
- npm or pnpm
- Git

## Backend Setup

### 1. Install Backend Dependencies

Navigate to the backend directory and install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create or update the `.env` file in the backend directory with the following variables:

```
SECRET_KEY=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=sqlite:///app.db
```

**Important**: Replace the placeholder values with your actual keys:

- Generate a strong `SECRET_KEY` and `JWT_SECRET_KEY`
- Add your OpenAI API key from https://platform.openai.com/

### 3. Create Database

The database will be automatically created when you run the backend for the first time. SQLAlchemy will create the `app.db` file with all required tables.

### 4. Run Backend Server

```bash
python app.py
```

The backend will start on `http://localhost:5000`

You should see output like:

```
 * Running on http://127.0.0.1:5000
```

## Frontend Setup

### 1. Install Frontend Dependencies

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
# or if you use pnpm
pnpm install
```

### 2. Frontend Configuration

The frontend is already configured to connect to the backend at `http://localhost:5000/api`. No additional configuration is needed.

### 3. Run Frontend Development Server

```bash
npm run dev
# or
pnpm dev
```

The frontend will start on `http://localhost:3000`

## Running Both Services Together

### Option 1: Run in Separate Terminals

**Terminal 1 - Backend:**

```bash
cd backend
python app.py
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### Option 2: Using VS Code

1. Open VS Code integrated terminal
2. Split the terminal (Ctrl+Shift+5)
3. In one terminal: `cd backend && python app.py`
4. In the other terminal: `cd frontend && npm run dev`

## Testing the Application

### 1. Access the Application

Open your browser and navigate to `http://localhost:3000`

### 2. Create an Account

1. Click "Sign up" if you're on the login page, or navigate to `/signup`
2. Fill in:
   - Email
   - Full Name
   - Age (must be 13+)
   - Education/Job Description
   - Password
   - Confirm Password
3. Click "Sign Up"

### 3. Test Authentication

After signing up, you should be automatically redirected to the dashboard (`/dashboard`)

To test login:

1. Sign out from the user menu
2. Click "Sign in" or navigate to `/login`
3. Enter your email and password
4. You should be redirected back to the dashboard

### 4. Test API Endpoints

#### Check Backend Health

```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok"}`

#### Test Interview Generation (requires authentication)

```bash
# First, get your auth token from signing up or logging in
# Then test with:
curl -X POST http://localhost:5000/api/interview/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"company":"Google","role":"Software Engineer"}'
```

## API Endpoints

### Authentication

- **POST** `/api/auth/signup` - Create new account
- **POST** `/api/auth/login` - Login with email/password
- **GET** `/api/auth/me` - Get current user (requires auth)

### Interview

- **POST** `/api/interview/generate` - Generate interview questions (requires auth)
- **POST** `/api/interview/upload-resume` - Upload resume file (requires auth)

## Database

The SQLite database is stored in `backend/app.db`.

### Database Schema

**Users Table:**

- id (Integer, Primary Key)
- email (String, Unique)
- password_hash (String)
- full_name (String)
- age (Integer, Optional)
- education (String, Optional)
- created_at (DateTime)
- updated_at (DateTime)

### View Database Contents

```bash
# Using sqlite3 command line
sqlite3 backend/app.db

# Common queries:
# View all users
SELECT * FROM users;

# View specific user
SELECT * FROM users WHERE email='user@example.com';
```

## Troubleshooting

### Port Already in Use

If port 5000 or 3000 is already in use:

**Backend (change port in `app.py`):**

```python
if __name__ == "__main__":
    app.run(debug=True, port=5001, host="0.0.0.0")  # Change 5000 to 5001
```

Then update the frontend API URL in `frontend/lib/api.ts`:

```typescript
export const API_URL = "http://localhost:5001/api";
```

**Frontend (change port):**

```bash
npm run dev -- -p 3001
```

### CORS Errors

If you see CORS errors in the browser console, make sure:

1. Backend is running on http://localhost:5000
2. Frontend is running on http://localhost:3000
3. CORS is properly configured in `backend/app.py` (it should be by default)

### Database Errors

If you get database errors:

1. Delete `backend/app.db` file
2. Restart the backend server
3. The database will be recreated automatically

### Authentication Token Errors

If you get "Invalid or expired token" errors:

1. Make sure your JWT_SECRET_KEY in `.env` matches between sessions
2. Clear browser localStorage: Open DevTools → Application → LocalStorage → Delete auth_token
3. Log out and log back in

## Production Deployment

For production deployment, you'll need to:

1. Use a proper database (PostgreSQL, MySQL) instead of SQLite
2. Use a production WSGI server (Gunicorn, Waitress)
3. Set up environment variables securely
4. Enable HTTPS/SSL
5. Use a reverse proxy (Nginx, Apache)
6. Build and serve the frontend as static files

See individual SETUP.md files in backend and frontend directories for more details.

## Environment Variables Reference

### Backend (.env file)

| Variable       | Description                | Example          |
| -------------- | -------------------------- | ---------------- |
| SECRET_KEY     | Flask secret key           | abc123...        |
| JWT_SECRET_KEY | JWT signing key            | xyz789...        |
| OPENAI_API_KEY | OpenAI API key             | sk-proj-...      |
| DATABASE_URL   | Database connection string | sqlite:///app.db |

### Frontend (built-in)

The frontend automatically connects to:

- API: `http://localhost:5000/api`
- Change in `frontend/lib/api.ts` if needed

## Next Steps

1. ✅ Complete user authentication with proper signup/login
2. 🚀 Test the interview question generation feature
3. 📄 Test resume upload functionality
4. 💾 Add persistent storage for user data
5. 🎨 Implement the remaining dashboard features
6. 📦 Prepare for production deployment
