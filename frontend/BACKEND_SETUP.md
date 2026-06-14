# Backend Setup Guide for Language Practice App

## Overview

This full-stack Next.js application includes built-in API endpoints for all practice modes. The backend uses Next.js Route Handlers to handle requests.

## API Endpoints

### 1. Casual Conversation Practice

**Endpoint:** `POST /api/practice/conversation/chat`

**Request Body:**

```json
{
  "transcript": "string - user's spoken response",
  "topic": "string - selected conversation topic",
  "conversation": "array - conversation history"
}
```

**Response:**

```json
{
  "response": "string - AI's response to continue conversation",
  "feedback": "string - detailed feedback on user's response",
  "timestamp": "ISO string"
}
```

**Supported Topics:**

- Daily Routine
- Hobbies and Interests
- Travel Experiences
- Food and Cooking
- Movies and Entertainment
- Work and Career
- Family and Friends
- Weather and Seasons

---

### 2. Interview Practice

**Endpoint:** `POST /api/practice/interview/feedback`

**Request Body:**

```json
{
  "transcript": "string - user's interview answer",
  "interviewSetup": {
    "jobTitle": "string",
    "company": "string",
    "jobDescription": "string",
    "keySkills": "string",
    "resume": "File | null"
  }
}
```

**Response:**

```json
{
  "feedback": "string - detailed interview feedback",
  "timestamp": "ISO string"
}
```

**Feedback Includes:**

- Language quality analysis
- Delivery metrics
- Content strengths
- Areas for improvement
- Overall score (1-10)

---

### 3. Presentation Practice

**Endpoint:** `POST /api/practice/presentation/feedback`

**Request Body:**

```json
{
  "transcript": "string - user's slide presentation",
  "currentSlide": "string",
  "allSlides": "array of slide content"
}
```

**Response:**

```json
{
  "feedback": "string - presentation feedback",
  "timestamp": "ISO string"
}
```

**Feedback Includes:**

- Delivery metrics (words, pace)
- Content strengths
- Presentation skills assessment
- Suggestions for improvement

---

### 4. Presentation Generation (Optional)

**Endpoint:** `POST /api/practice/presentation/generate`

**Request Body:**

```json
{
  "topic": "string - presentation topic",
  "prompt": "string - detailed requirements"
}
```

**Response:**

```json
{
  "slides": "array of slide titles/content",
  "timestamp": "ISO string"
}
```

---

## Running the Backend

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup Steps

1. **Install Dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Run Development Server**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

   The server will start at `http://localhost:3000`

3. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

---

## Testing the API

### Using cURL

**Test Conversation Endpoint:**

```bash
curl -X POST http://localhost:3000/api/practice/conversation/chat \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I usually wake up at 6 AM and go for a run.",
    "topic": "Daily Routine",
    "conversation": []
  }'
```

**Test Interview Endpoint:**

```bash
curl -X POST http://localhost:3000/api/practice/interview/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I led a team of 5 engineers to deliver a critical feature in 2 weeks.",
    "interviewSetup": {
      "jobTitle": "Senior Engineer",
      "company": "Tech Corp",
      "jobDescription": "Lead engineering team",
      "keySkills": "Leadership, React, Node.js"
    }
  }'
```

---

## Frontend-Backend Integration

### Conversation Practice

- Collects user transcripts from microphone
- Sends to `/api/practice/conversation/chat`
- Receives AI response and feedback
- Displays both in chat interface

### Interview Practice

- Collects interview setup information
- Records user's spoken response
- Sends transcript to `/api/practice/interview/feedback`
- Displays detailed feedback

### Presentation Practice

- Allows slide upload or generation
- Records user presenting each slide
- Sends transcript to `/api/practice/presentation/feedback`
- Provides slide-by-slide feedback

---

## Current Implementation

### Mock AI Responses

The API currently uses mock/rule-based responses for:

- Generating conversation continuations
- Providing feedback on user responses

**To upgrade to real AI:**

1. Integrate with OpenAI, Anthropic, or Groq
2. Add API key to environment variables
3. Replace mock generation functions with AI service calls

### Example Integration with OpenAI

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResponse(transcript: string, topic: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content: `Continue this conversation about ${topic}: "${transcript}"`,
      },
    ],
  });
  return response.choices[0].message.content;
}
```

---

## Environment Variables

Create a `.env.local` file:

```env
# Database (optional)
DATABASE_URL=

# AI Services (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# Authentication (optional)
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

---

## File Structure

```
app/
├── api/
│   └── practice/
│       ├── conversation/
│       │   └── chat/
│       │       └── route.ts
│       ├── interview/
│       │   └── feedback/
│       │       └── route.ts
│       └── presentation/
│           ├── feedback/
│           │   └── route.ts
│           └── generate/
│               └── route.ts
├── practice/
│   ├── conversation/
│   │   └── page.tsx
│   ├── interview/
│   │   └── page.tsx
│   └── presentation/
│       └── page.tsx
└── dashboard/
    └── page.tsx
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

- **Netlify:** Not suitable (requires serverless functions)
- **Railway:** Supported, follow Next.js deployment guide
- **Self-hosted:** Use `npm run build` and `npm start`

---

## Error Handling

All API endpoints return:

- **Success:** 200 status with data
- **Bad Request:** 400 status with error message
- **Server Error:** 500 status with error details

Example error response:

```json
{
  "error": "Transcript is required"
}
```

---

## Performance Considerations

- Responses are cached where possible
- Database queries are optimized with indexes
- API responses typically < 500ms
- Supports concurrent requests

---

## Support & Future Enhancements

- Real-time speech recognition integration
- Advanced NLP analysis
- Machine learning-based scoring
- User progress tracking
- Leaderboards and achievements
