"""
Session logger — shared helper for recording a completed practice attempt.

Every practice mode (interview, presentation, casual conversation, reading
— including the "TV News Anchor" mode, which is just Reading practice with
mode="journalist") should call log_practice_session() once it has a score
for that attempt. This is what powers:

  - GET /api/interview/sessions  (per-user session history)
  - GET /api/interview/stats     (the Progress/Analysis dashboard: totals,
                                   streaks, per-skill bars, activity graph)

It also auto-tracks any matching active Goal, mirroring the existing
auto_track_progress() call sites, so callers only need to call this one
function instead of two.
"""

from models import db, PracticeSession
from services.goal_service import auto_track_progress


def log_practice_session(
    user_id: int,
    session_type: str,
    title: str = None,
    transcript: str = "",
    feedback: str = "",
    score_out_of_10: float = None,
    duration_seconds: float = None,
) -> PracticeSession:
    """
    Create + commit a PracticeSession row and bump any matching goal.

    score_out_of_10: a 0-10 float/int. Stored as the "N/10" string format
    that get_user_stats() (routes/interview.py) already parses for every
    session type. Pass None if no score is available for this attempt.

    duration_seconds: how long the user actually spent on this attempt.
    Pass None (not 0) when the caller has no real timing, so the frontend
    can fall back to showing "—" instead of a made-up number.
    """
    score_str = None
    if score_out_of_10 is not None:
        try:
            score_str = f"{round(float(score_out_of_10))}/10"
        except (TypeError, ValueError):
            score_str = None

    duration_val = None
    if duration_seconds is not None:
        try:
            duration_val = max(0.0, float(duration_seconds))
        except (TypeError, ValueError):
            duration_val = None

    record = PracticeSession(
        user_id=user_id,
        session_type=session_type,
        title=(title or "")[:255] or None,
        transcript=transcript or "",
        feedback=feedback or "",
        score=score_str,
        duration_seconds=duration_val,
    )
    db.session.add(record)
    db.session.commit()

    try:
        auto_track_progress(user_id, session_type)
    except Exception:
        pass  # never let goal tracking break the caller's main response

    return record