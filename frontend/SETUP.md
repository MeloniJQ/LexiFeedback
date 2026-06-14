# Lexical - English Learning Platform Setup Guide

Welcome to Lexical! This guide will help you get the application up and running.

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Environment variables configured

## Environment Setup

### 1. Supabase Configuration

First, ensure you have a Supabase project set up. Then, add the following environment variables to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
INIT_SECRET=your_secret_key
```

You can find these values in your Supabase project settings under "API".

### 2. Database Schema Setup

The application requires the following tables in your Supabase database. You have two options:

#### Option A: Automatic Setup (Recommended)
Call the initialization API endpoint with your INIT_SECRET:

```bash
curl -X POST http://localhost:3000/api/init \
  -H "Authorization: Bearer YOUR_INIT_SECRET" \
  -H "Content-Type: application/json"
```

#### Option B: Manual Setup
Run the SQL commands from `scripts/01-init-schema.sql` directly in your Supabase SQL editor:

1. Go to Supabase Dashboard → Your Project
2. Click "SQL Editor" in the left sidebar
3. Create a new query
4. Copy and paste the contents of `scripts/01-init-schema.sql`
5. Click "Run" to execute

The schema includes the following tables:
- **users**: User profile information
- **practice_sessions**: Records of practice sessions
- **feedback**: AI-generated feedback for sessions
- **progress**: User progress tracking

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Features

### Authentication
- Sign up with email and password
- Login with existing credentials
- Automatic session management

### Practice Modes
1. **Interview Practice**: Prepare for interviews with AI feedback
2. **Presentation Mode**: Deliver presentations and get delivery feedback
3. **Casual Conversation**: Practice natural English with AI conversation partner
4. **Reading Practice**: Improve comprehension with passages and quizzes

### Dashboard
- Track practice sessions
- View progress across different skills
- See recent activity and feedback

### Settings
- Manage profile information
- Configure learning preferences
- Control notification settings

## Key Pages

- `/` - Redirects to dashboard
- `/login` - Login page
- `/signup` - Sign up page
- `/dashboard` - Main dashboard with practice mode selection
- `/dashboard/feedback` - Progress and feedback analytics
- `/dashboard/settings` - User settings
- `/practice/interview` - Interview practice
- `/practice/presentation` - Presentation practice
- `/practice/conversation` - Conversation practice
- `/practice/reading` - Reading comprehension

## Dark Mode

The application includes a fully functional dark mode toggle in the header. The theme preference is saved to localStorage and persists across sessions.

## API Routes

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/logout` - Logout user

### Practice Feedback
- `POST /api/practice/interview/feedback` - Get interview feedback
- `POST /api/practice/presentation/feedback` - Get presentation feedback
- `POST /api/practice/conversation/chat` - Chat with AI
- `POST /api/init` - Initialize database (requires INIT_SECRET)

## Database RLS Policies

Row Level Security (RLS) is enabled for all tables to ensure data privacy:

- Users can only read and update their own data
- Practice sessions are private to the user
- Feedback is only visible for user's own sessions
- Progress tracking is user-specific

## Troubleshooting

### "Missing Supabase configuration"
Ensure all environment variables are set in `.env.local` file.

### "Database tables not found"
Run the database initialization as described in Database Schema Setup section.

### Dark mode not working
Check that JavaScript is enabled and localStorage is available in your browser.

### Authentication errors
Verify that the Supabase URL and keys are correct and that RLS policies are properly configured.

## Next Steps

1. Complete the database setup
2. Create a test user account
3. Try out different practice modes
4. Check the feedback dashboard
5. Adjust settings as needed

## Support

For issues or questions, refer to:
- Supabase Documentation: https://supabase.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Project Issues: Check GitHub issues or create a new one

---

**Happy Learning!** 🎓
