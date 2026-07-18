# LexiFeed Interview System Improvements

## Changelog — July 2026: Fixed persistent 429 rate-limit fallbacks

Logs showed every single AI call failing with a `429` from OpenRouter on
`meta-llama/llama-3.3-70b-instruct:free` — a popular free model that gets
rate-limited across ALL OpenRouter users during busy periods, independent
of your own account's quota (OpenRouter free tier: 20 requests/min, 50/day
without ever adding credits, 1,000/day permanently once you've added $10
once — see openrouter.ai/docs/api-reference/limits for current numbers).
The fallback system correctly caught every failure (no crashes), but you
were never getting real AI-generated content.

**Files changed:**
- `.env` — `AI_MODEL` changed from `meta-llama/llama-3.3-70b-instruct:free`
  to `openrouter/free`, OpenRouter's own auto-router that picks whichever
  free model currently has capacity instead of hammering one congested model.
- `llm/openrouter_provider.py` — added retry-with-backoff that honors
  OpenRouter's `Retry-After` hint (capped at 12s) before giving up, so a
  brief rate-limit blip doesn't immediately fall back to template content.

**Optional:** adding a one-time $10 balance to your OpenRouter account
permanently raises the daily free-model cap from 50 to 1,000 requests/day
(the balance isn't spent by free-model calls — it just unlocks the higher
quota). Not required, just useful if 50/day becomes limiting during demos.

## Changelog — July 2026: Migrated voice transcription to faster-whisper (free, local)

`transcribe_audio()` in `services/voice_service.py` previously called OpenAI's
hosted Whisper API, which requires a paid `OPENAI_API_KEY`. Replaced with
`faster-whisper`, a free, local reimplementation using the same Whisper model
weights (same accuracy, no API cost, no key required). Model loads once
per process (lazy singleton) and runs on CPU by default.

**Files changed:**
- `services/voice_service.py` — `transcribe_audio()` rewritten to use
  `faster_whisper.WhisperModel` instead of the OpenAI SDK. OpenAI import
  removed from this file entirely — it now has zero dependency on
  `OPENAI_API_KEY`.
- `requirements.txt` — added `faster-whisper==1.1.1`.
- `.env` — added `WHISPER_MODEL_SIZE` (default `small`), `WHISPER_DEVICE`
  (default `cpu`), `WHISPER_COMPUTE_TYPE` (default `int8`). Switch
  `WHISPER_DEVICE=cuda` + `WHISPER_COMPUTE_TYPE=float16` once a GPU is
  available — no other code changes needed.

**Result:** the entire app — question generation, follow-ups, analysis, and
now voice transcription — runs on zero paid API keys. Only `OPENROUTER_API_KEY`
(free tier) is required.

**Note:** the `small` model's weights (~500MB) download automatically from
Hugging Face the first time `transcribe_audio()` runs, then are cached
locally — first request after a fresh install will be slower than
subsequent ones.

## Changelog — July 2026: Fixed identical/repeated question bug

**Correction:** the first pass of this fix targeted `services/ai_service.py`
and `services/interview_agent.py`'s question-prompt builder. Those files
turned out NOT to be in the live path the frontend actually calls — they're
unused/dead code left over from an earlier iteration. Tracing the real
frontend call graph (`app/practice/interview/page.tsx` → `lib/api.ts`)
found the actual live files below.

**Real root causes, found and fixed:**

1. **Identical fallback questions** — `agents/question_generator.py`'s
   `_fallback_questions()` (which runs whenever the OpenRouter call fails
   or returns too few unique questions) built the exact same
   `question_text` in a loop `count` times, with only `question_id`
   differing. This is why every question in a session looked identical.
   Fixed to pull from a 10-category pool (Project, Core Technical,
   Programming, Database, Framework, Behavioral, Scenario, Problem Solving,
   System Design, HR), shuffled per call.
2. **Hardcoded question count of 5** — `app/practice/interview/page.tsx`
   called `generateInterviewQuestions(5)`, explicitly overriding the
   function's own default of 10. Changed to `generateInterviewQuestions(10)`.
3. **Follow-ups always identical** — `services/voice_service.py` built its
   own OpenAI client from `OPENAI_API_KEY`, which is never set in `.env`
   (this project uses OpenRouter). Every follow-up/analysis call silently
   failed and fell back to one hardcoded string. Fixed `analyze_voice_answer()`
   and `generate_voice_followup()` to route through
   `llm/provider_factory.get_provider()` (reads `AI_PROVIDER` +
   `OPENROUTER_API_KEY`), same as the rest of the app. `transcribe_audio()`
   (Whisper speech-to-text) still needs a real `OPENAI_API_KEY` — OpenRouter's
   free tier doesn't proxy audio transcription, so voice recording won't work
   until a Whisper-capable key is added; see "Known limitations" below.
4. **Duplicate dead function** — `services/voice_service.py` defined
   `generate_voice_followup()` twice. Python silently used only the second
   definition; the first (~90 lines, unreachable) also had a corrupted
   prompt with a stray `print(...)` statement embedded directly inside the
   text sent to the LLM. Removed the dead copy entirely.
5. `fallback_followup()` in `services/interview_agent.py` — was a single
   hardcoded string; now picks randomly from a small pool.

**Also left in a better state, even though not on the critical path:**
- `services/ai_service.py` — fixed the same missing-`OPENAI_API_KEY` pattern
  anyway (routes through `get_provider()` now), in case it gets wired up later.
- `services/interview_agent.py`'s `build_question_generation_prompt()` and
  `generate_fallback_questions()` — rewritten for a realistic, category-
  balanced interview structure, in case this file gets adopted later.

## Known limitations
- Voice recording/transcription (`transcribe_audio` in `voice_service.py`)
  requires a genuine `OPENAI_API_KEY` for Whisper — OpenRouter's free tier
  does not include speech-to-text. Text-based follow-up/analysis works fine
  on OpenRouter alone.
- `agents/` and `orchestrator/` (blueprint planner, evaluation agent,
  recommendation agent) are reachable via `/api/interview/plan/*` and
  `/api/interview/session/*` but the session-based flow isn't what the
  live practice page uses end-to-end — worth an audit before relying on it.

## Overview



The interview system has been significantly enhanced with three major improvements:

1. **Configurable Question Limit** - Users can now ask more than 5 questions
2. **Improved Adaptive Follow-ups** - Follow-up questions are now truly distinct based on answer content
3. **Agentic AI Analysis** - Sophisticated contextual analysis that tracks improvement throughout the session

---

## 1. Configurable Question Limit

### What Changed

- Previously: Fixed at 5 questions (hardcoded)
- **Now: 1-20 questions, configurable per session**

### Frontend Integration

**Interview Setup Screen:**

```typescript
// Add to interview setup form
<div className="question-limit-control">
  <label htmlFor="numQuestions">
    Number of Questions (1-20)
  </label>
  <input
    id="numQuestions"
    type="number"
    min="1"
    max="20"
    defaultValue="5"
    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
  />
  <p className="help-text">
    More questions = more comprehensive evaluation
  </p>
</div>
```

**When Starting Interview:**

```typescript
const startInterview = async () => {
  const formData = new FormData();
  formData.append("company", company);
  formData.append("role", role);
  formData.append("job_description", jobDescription);
  formData.append("key_skills", keySkills);
  formData.append("num_questions", numQuestions); // NEW
  if (resumeFile) {
    formData.append("resume", resumeFile);
  }

  const response = await authFetch(`${API}/interview/start`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  console.log(`Interview started with ${data.num_questions} questions`);
};
```

**Display Question Count:**

```typescript
// During interview
<div className="question-progress">
  Question {currentQuestionIndex + 1} of {totalQuestions}
  <progress
    value={currentQuestionIndex + 1}
    max={totalQuestions}
  />
</div>
```

### Backend Compatibility

- POST `/api/interview/start` now accepts optional `num_questions` field
- Default remains 5 for backward compatibility
- Validates and clamps to 1-20 range

---

## 2. Improved Adaptive Follow-ups

### What Changed

- Previously: Follow-up questions could appear similar across different answers
- **Now: Each follow-up is uniquely tailored to the specific answer content**

### How It Works

The system automatically detects answer characteristics:

```
If answer is VAGUE → Probes for concrete examples
If answer lacks METRICS → Probes for measurable impact
If answer incomplete STAR → Probes for context/decisions
If answer complete → Probes for learning/transferability
```

### Examples

**Vague Answer:**

```
Q: "Tell me about a challenging project"
A: "I worked on a mobile app"
Follow-up: "Can you walk me through a specific challenge you faced?"
```

**Answer Without Metrics:**

```
Q: "How did your work impact the team?"
A: "I improved the system significantly"
Follow-up: "What's the measurable impact? How much faster/more reliable/larger?"
```

**Incomplete STAR:**

```
Q: "Tell me about a conflict"
A: "There was a disagreement about design"
Follow-up: "What decision did YOU make, and what changed because of it?"
```

### No Changes Required in Frontend

- Same endpoint: POST `/api/voice/followup`
- Automatic adaptive behavior
- More natural, specific follow-ups generated

---

## 3. Agentic AI Analysis System

### What Changed

- Previously: Each answer analyzed independently with same template
- **Now: Sophisticated contextual analysis that:**
  - Tracks patterns across multiple answers
  - Compares performance against role/company requirements
  - Identifies improvement trajectory
  - Detects recurring strengths and gaps
  - Maps demonstrated competencies to role

### New Analysis Capabilities

#### Per-Question Analysis

The new `analyze-agentic` endpoint provides:

```json
{
  "scores": {
    "content": 7,
    "delivery": 8,
    "vocabulary": 7,
    "overall": 7
  },
  "content_analysis": {
    "star_used": true,
    "relevance": "Directly addressed the technical architecture question",
    "specificity": "Concrete example with specific technology choices",
    "key_strength": "Clear technical decision-making process",
    "key_gap": "Missing discussion of trade-offs considered"
  },
  "pattern_analysis": {
    "pattern_trend": "improving", // vs prior answers
    "recurring_strength": "Technical depth across answers",
    "recurring_gap": "Missing user impact discussion",
    "demonstrates_growth": "This answer showed better metrics integration than Q1"
  },
  "competency_alignment": {
    "demonstrated_competencies": [
      "System Design",
      "Technical Decision Making",
      "Trade-off Analysis"
    ],
    "confidence_level": "strong", // vs role requirements
    "risk_flag": null
  },
  "coaching": {
    "immediate_tip": "In next answer, explicitly mention the user/business impact",
    "if_to_improve": "When discussing decisions, frame around impact not just process"
  }
}
```

### Frontend Integration - Option 1: Track Patterns (Recommended)

```typescript
const allAnalyses = [];

// After each question answered:
const analysis = await authFetch(`${API}/voice/analyze-agentic`, {
  method: "POST",
  body: JSON.stringify({
    transcript: userAnswer,
    question: currentQuestion.question,
    question_type: currentQuestion.type,
    company,
    role,
    question_num: currentQuestionIndex + 1,
    total_questions: totalQuestions,
    previous_analyses: allAnalyses, // Pass all prior analyses
  }),
});

const data = await analysis.json();
allAnalyses.push(data);

// Display pattern-aware feedback
displayAnalysis(data, {
  showPatternTrend: true, // "improving" / "consistent" / "declining"
  showRecurringIssues: true, // Track across answers
  showCompetencyMap: true, // Map skills to role requirements
});
```

#### End-of-Session Comparison

After all questions are answered, get comprehensive analysis:

```typescript
const comparison = await authFetch(`${API}/voice/session-comparison`, {
  method: "POST",
  body: JSON.stringify({
    company,
    role,
    all_answers: allAnalyses,
  }),
});

const sessionInsight = await comparison.json();

// Returns:
{
  "strengths_profile": [
    "Strong technical depth across multiple domains",
    "Clear communication of complex concepts",
    "Results-oriented decision making"
  ],
  "growth_areas": [
    "Impact articulation across all answers",
    "Stakeholder consideration in decisions"
  ],
  "interview_arc": "Started strong technically but struggled with context framing. Improvement evident in Q3-Q5.",
  "role_fit": "strong",
  "risk_assessment": "Minor: Limited evidence of cross-functional collaboration",
  "hiring_recommendation": "Strong hire",
  "final_thoughts": "..."
}
```

### Display Strategy

**During Interview:**

```typescript
// Show pattern detection
if (analysis.pattern_analysis.pattern_trend === "improving") {
  <Alert type="positive">
    Pattern: Your answers are improving in {analysis.pattern_analysis.recurring_strength}
  </Alert>
}

// Show competency tags
<div className="competencies">
  {analysis.competency_alignment.demonstrated_competencies.map(comp => (
    <Badge key={comp}>{comp}</Badge>
  ))}
</div>

// Show risk flags early
if (analysis.competency_alignment.risk_flag) {
  <Alert type="warning">
    Note: {analysis.competency_alignment.risk_flag}
  </Alert>
}
```

**After Interview:**

```typescript
// Show final comparison
<div className="session-summary">
  <h2>Interview Summary</h2>
  <div className="strengths">
    <h3>Your Strengths</h3>
    {sessionInsight.strengths_profile.map(s => <p key={s}>{s}</p>)}
  </div>
  <div className="growth-areas">
    <h3>Growth Areas</h3>
    {sessionInsight.growth_areas.map(g => <p key={g}>{g}</p>)}
  </div>
  <div className="role-fit">
    <h3>Role Fit: <strong>{sessionInsight.role_fit}</strong></h3>
  </div>
  <div className="recommendation">
    <h3>Hiring Assessment</h3>
    <p className={`recommendation-${sessionInsight.hiring_recommendation}`}>
      {sessionInsight.hiring_recommendation}
    </p>
  </div>
</div>
```

### Optional: Advanced Usage

**Progressive Enhancement:**

```typescript
// If you want to show analysis as it streams
const streamAnalysis = async (questionNum: number) => {
  // Option 1: Use basic analysis for quick feedback
  const basicAnalysis = await analyzeAnswer(transcript, question);
  displayQuickFeedback(basicAnalysis);

  // Option 2: In background, fetch agentic analysis
  const agenticAnalysis = await analyzeAnswerContextually(
    transcript,
    question,
    previousAnalyses,
  );
  updateWithPatternInsights(agenticAnalysis);
};
```

---

## 4. API Reference

### New/Modified Endpoints

#### POST `/api/interview/start`

**What's new:** Optional `num_questions` parameter

```javascript
Request:
{
  "company": "Google",
  "role": "Senior Engineer",
  "num_questions": 8,  // NEW: default 5
  "job_description": "...",
  "key_skills": "...",
  "resume": <File>
}

Response includes:
{
  "questions": [...],
  "num_questions": 8,  // NEW: confirms actual count
  ...
}
```

#### POST `/api/voice/analyze-agentic` (NEW)

Enhanced contextual analysis

```javascript
Request:
{
  "transcript": "...",
  "question": "...",
  "question_type": "behavioral",
  "company": "...",
  "role": "...",
  "question_num": 2,              // NEW: current question
  "total_questions": 8,            // NEW: total questions
  "previous_analyses": [...]      // NEW: prior analyses
}

Response:
// See structure in section 3 above
```

#### POST `/api/voice/session-comparison` (NEW)

Cross-session analysis

```javascript
Request:
{
  "company": "...",
  "role": "...",
  "all_answers": [
    { "question_type": "behavioral", "scores": {...}, ... },
    ...
  ]
}

Response:
{
  "strengths_profile": [...],
  "growth_areas": [...],
  "interview_arc": "...",
  "role_fit": "strong|moderate|weak",
  "risk_assessment": "...",
  "hiring_recommendation": "...",
  "final_thoughts": "..."
}
```

---

## 5. Implementation Checklist

### Phase 1: Variable Questions (Easy)

- [ ] Add number input to interview setup (1-20, default 5)
- [ ] Update API call to include `num_questions`
- [ ] Display current question number / total

### Phase 2: Improved Follow-ups (No Changes Needed)

- [ ] Just use existing `/api/voice/followup` endpoint
- [ ] Follow-ups automatically become more adaptive
- [ ] Test with various answer types to verify distinctness

### Phase 3: Agentic Analysis (Recommended)

- [ ] Update analysis display to show new fields:
  - `pattern_analysis` (with trend indicator)
  - `competency_alignment` (with risk flags)
  - `coaching` (with immediate tips)
- [ ] Call `/api/voice/analyze-agentic` instead of `/api/voice/analyze`
- [ ] Pass `previous_analyses` for context

### Phase 4: Session Insights (Optional)

- [ ] After final answer, call `/api/voice/session-comparison`
- [ ] Display comparative analysis summary
- [ ] Show hiring recommendation

---

## 6. Key Technical Notes

### Backward Compatibility

- All changes are additive
- Existing endpoints still work with default values
- Old frontend code continues to function
- No breaking changes

### Error Handling

- If agentic endpoints fail, fallback to basic analysis
- Number validation happens server-side
- Safe defaults for all optional parameters

### Performance Considerations

- Agentic analysis adds ~1-2s per call (network latency)
- Session comparison is computationally lightweight
- Consider showing "Analyzing..." UI during calls

---

## 7. Testing Guide

### Test Questions Configuration

```javascript
// Test case 1: Default behavior
POST /api/interview/start { company, role }
// Should return 5 questions

// Test case 2: More questions
POST /api/interview/start { company, role, num_questions: 8 }
// Should return 8 questions cycling through types

// Test case 3: Maximum questions
POST /api/interview/start { company, role, num_questions: 20 }
// Should return 20 questions
```

### Test Follow-ups

```javascript
// Vague answer should get specificity-focused follow-up
// Metric-free answer should ask for numbers
// Each answer should trigger different follow-up
```

### Test Analysis

```javascript
// Q1 analysis: baseline
// Q2 analysis: should show trend (improving/consistent/declining)
// Q3+ analysis: should highlight recurring patterns
// Final: should compare across all answers
```

---

## 8. Questions or Issues?

If follow-ups seem "off" or analysis seems generic:

1. Check that previous_analyses are passed correctly
2. Verify question_type is accurately labeled
3. Review the prompt in agentic_analysis.py
4. Test with variety of answer types

Backend improvements are complete and ready. Frontend can integrate at own pace, starting with Phase 1 for immediate user benefit.
