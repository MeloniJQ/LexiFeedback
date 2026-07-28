# Feature Implementation Notes — CEFR Assessment, Interview Persistence, Dynamic Passages

This documents the changes made to implement three features on top of the
existing LexiFeedback codebase. Nothing here replaces existing functionality —
everything is additive or a targeted extension of an existing function's
signature (kept backward-compatible).

**Not tested against a live server** (this environment has no network access,
so `pip install` / `npm install` / `flask run` / `npm run dev` couldn't be
run). Backend Python was validated via `py_compile` on every file plus
standalone import + unit-level execution of the new scoring/generation logic
(with the Gemini/OpenAI SDKs stubbed out, since they aren't installed here) —
see the "What was actually verified" section at the bottom. Frontend TSX was
checked via brace/paren balance + import-resolution review, not `tsc`.
Please run your normal dev/test flow before deploying.

---

## Feature 1 — CEFR Initial English Level Assessment

**New files:**
- `backend/utils/cefr.py` — CEFR level constants, topic pools, CEFR↔difficulty
  mapping, `score_to_level()`.
- `backend/services/assessment_service.py` — builds the 5-part placement test
  and scores it. Grammar/Vocabulary use a static 12-item bank (2 per CEFR
  level) for reliability on a brand-new user's first screen. Reading/
  Listening reuse `generate_ai_passage()`. Speaking reuses
  `analyze_pronunciation()` (read-aloud) + a new open-speech scorer with a
  local heuristic fallback if the AI call fails.
- `backend/routes/assessment.py` — `GET /api/assessment/status`,
  `GET /api/assessment/start`, `POST /api/assessment/submit`.
- `frontend/app/assessment/page.tsx` — the assessment wizard UI.

**Modified files:**
- `backend/models/user.py` — added `english_level`, `assessment_completed`,
  `assessment_date`, and 6 score columns; exposed in `to_dict()`.
- `backend/app.py` — registered the new blueprint; added a startup
  auto-migration (SQLite `ALTER TABLE ADD COLUMN`) since the project has no
  Alembic/migration framework and `db.create_all()` doesn't alter existing
  tables.
- `frontend/lib/auth.ts`, `frontend/lib/api.ts` — typed fields/endpoints.
- `frontend/hooks/use-auth.ts` — signup/login redirect to `/assessment`
  instead of `/dashboard` when `assessment_completed` is false.
- `frontend/app/dashboard/layout.tsx` — also gates the dashboard directly
  (covers bookmarks/direct navigation, not just the login flow).
- `frontend/app/dashboard/settings/page.tsx` — added a "Retake Assessment"
  card.

**Known limitation:** the correct-answer key for a generated assessment is
kept in an in-process Python dict (`routes/assessment.py`,
`_pending_answer_keys`), keyed by user_id, the same pattern already used
elsewhere in this codebase (`ai_service._last_generated_title`). This is
fine for a single-process deployment; a multi-worker/multi-process deploy
should move this to the DB or Redis so `/start` and `/submit` hit the same
process.

---

## Feature 3 — Random Passage Generation

**Modified files:**
- `backend/services/ai_service.py`:
  - `_build_passage_prompt()` and `generate_ai_passage()` gained three new
    **optional** parameters — `level` (CEFR, picks the level-appropriate
    topic pool from `utils/cefr.py`), `length` (`short`/`medium`/`long`,
    overrides the word-count target), `exclude_titles` (triggers up to 2
    regeneration attempts on a title collision, then falls through to the
    fallback pool, which also now respects `exclude_titles`).
  - Signature/return shape is unchanged for existing callers that don't pass
    the new args.
- `backend/routes/reading.py` — `/generate` now accepts `level` and `length`;
  defaults `level` to the requesting user's assessed `english_level` if not
  explicitly passed. Also logs every generated passage to the new
  `ReadingPassageHistory` table and excludes the user's last 15 (mode-
  matched, 30-day window) titles from generation.
- `frontend/app/practice/reading/page.tsx` — added a short/medium/long length
  selector; difficulty now defaults from the user's assessed CEFR level on
  first load.

**New file:**
- `backend/models/reading_history.py` — `ReadingPassageHistory` (new table,
  no migration needed since `db.create_all()` handles new tables).

---

## Feature 2 — Interview Flow (refresh persistence + server-side autosave)

The existing `frontend/app/practice/interview/page.tsx` already implemented
most of what the original ticket described as missing (a working Next
Question flow, live transcript display, immediate per-answer analysis,
mic-error handling with retry, a typed-answer fallback if the mic fails).
**The real gap was persistence**: nothing was saved until the very end, and
refreshing mid-interview lost everything.

**New files:**
- `backend/models/interview_progress.py` — `InterviewProgress`: one row per
  (user, session_key), holding a JSON snapshot (questions, answered Q&A
  pairs with analysis + follow-ups, current position). Deliberately separate
  from `models/interview_session.py`'s `InterviewSession` /
  `InterviewQuestionHistory` — those back the heavier plan-driven
  orchestrator flow (`routes/interview_session.py`) and require a
  `CandidateProfile` row; the live practice page is a simpler, self-
  contained flow and gets its own lightweight table instead of being forced
  into that schema.

**Modified files:**
- `backend/routes/interview.py` — added `POST /api/interview/progress/save`
  (upsert, called after every scored answer, before advancing),
  `GET /api/interview/progress/active` (most recent in-progress attempt for
  the "resume?" prompt), `DELETE /api/interview/progress/<session_key>`
  (called when the user discards a resume prompt, or on completion).
- `frontend/app/practice/interview/page.tsx`:
  - A `session_key` (UUID) is generated when questions are first loaded.
  - `handleSubmitFollowup()` — the single choke point where a Q&A pair is
    finalized and the interview advances — now POSTs the full updated
    snapshot server-side *before* moving to the next question.
  - On mount, checks for an in-progress attempt and shows a "Resume /
    Start Fresh" banner above the setup form.
  - `handleReset()` and successful `handleGetFeedback()` clean up the saved
    progress row.
  - **Resume limitation:** resuming restores state to right after the last
    *completed* answer (clean "ready for next question" checkpoint) — an
    in-progress follow-up exchange mid-chain isn't separately persisted, so
    a refresh during a follow-up drops that one follow-up round (the main
    answer + its analysis are still safe).

---

## What was actually verified in this environment

No network access meant no `pip install` / `npm install` / live server. What
*was* run:
- `python3 -m py_compile` across every backend `.py` file — all pass.
- Standalone import of `utils/cefr.py` and `services/assessment_service.py`
  (with the Gemini/OpenAI SDKs stubbed via `sys.modules`, since those
  packages aren't installed here) — imports cleanly.
- Unit-level exercise of `score_to_level()`, `_score_mcq_section()`,
  `_score_comprehension()`, `_analyze_open_speech()`'s heuristic fallback,
  and a full `score_assessment()` call — correct outputs, correct CEFR band
  boundaries, static item banks validated (12 items each for grammar/vocab,
  all 6 CEFR levels covered, no out-of-range answer indices, no duplicate
  IDs).
- `generate_ai_passage()` exercised through its fallback path (no API key
  present) with `level`/`length`/`exclude_titles` — confirms the duplicate-
  avoidance logic actually avoids excluded titles until the pool is
  exhausted, then degrades gracefully.
- Frontend: brace/paren balance check + manual verification that every new
  import (`useEffect`, `getUser`, `API_URL`, `getCurrentUser`, `setAuth`,
  etc.) resolves to an actual export in the target file.
