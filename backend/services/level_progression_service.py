"""
Automatic CEFR level progression.

The placement assessment (routes/assessment.py) sets User.english_level once.
This service moves it UP afterwards, based on how the user actually performs
in mock sessions (interview / presentation / conversation / reading).

Promotion rules (all must hold):
  - the user has a level and it isn't C2 already
  - at least COOLDOWN_DAYS have passed since the last assessment or promotion
  - at least PROMOTION_WINDOW scored sessions exist SINCE that point
  - their average score over the latest PROMOTION_WINDOW sessions >= PROMOTION_AVG_SCORE
  - those sessions cover >= MIN_DISTINCT_MODES practice modes
  - and >= MIN_DISTINCT_DAYS different calendar days (stops one cramming
    session — e.g. a 10-slide presentation, which logs 10 sessions — from
    triggering a promotion by itself)

Levels are NEVER lowered automatically. Sessions without a stored score
(e.g. AI-unavailable fallback results) don't count at all.
"""

import re
from datetime import datetime, timedelta
from math import ceil

from models import db, User, PracticeSession, LevelChange
from utils.cefr import CEFR_LEVELS

PROMOTION_WINDOW = 10
PROMOTION_AVG_SCORE = 8.0
MIN_DISTINCT_MODES = 2
MIN_DISTINCT_DAYS = 3
COOLDOWN_DAYS = 7


def _parse_score(score: str | None) -> int | None:
    m = re.match(r"\s*(\d+)\s*/\s*10", score or "")
    return int(m.group(1)) if m else None


def _evaluate(user: User) -> dict | None:
    """Computes progress metrics only — never modifies the database."""
    level = user.english_level
    if level not in CEFR_LEVELS:
        return None

    idx = CEFR_LEVELS.index(level)
    next_level = CEFR_LEVELS[idx + 1] if idx + 1 < len(CEFR_LEVELS) else None

    last_change = (
        LevelChange.query.filter_by(user_id=user.id)
        .order_by(LevelChange.created_at.desc())
        .first()
    )
    refs = [d for d in (user.assessment_date, last_change.created_at if last_change else None) if d]
    since = max(refs) if refs else None

    cooldown_days_left = 0
    if since:
        remaining = timedelta(days=COOLDOWN_DAYS) - (datetime.utcnow() - since)
        cooldown_days_left = max(0, ceil(remaining.total_seconds() / 86400))

    query = PracticeSession.query.filter(
        PracticeSession.user_id == user.id,
        PracticeSession.score.isnot(None),
    )
    if since:
        query = query.filter(PracticeSession.created_at > since)
    recent = query.order_by(PracticeSession.created_at.desc()).limit(PROMOTION_WINDOW).all()

    scored = [(_parse_score(s.score), s) for s in recent]
    scored = [(v, s) for v, s in scored if v is not None]

    count = len(scored)
    avg = round(sum(v for v, _ in scored) / count, 1) if count else 0.0
    modes = len({s.session_type for _, s in scored})
    days = len({s.created_at.date() for _, s in scored if s.created_at})

    eligible = bool(
        next_level
        and cooldown_days_left == 0
        and count >= PROMOTION_WINDOW
        and avg >= PROMOTION_AVG_SCORE
        and modes >= MIN_DISTINCT_MODES
        and days >= MIN_DISTINCT_DAYS
    )

    return {
        "current_level": level,
        "next_level": next_level,
        "sessions_counted": count,
        "sessions_needed": PROMOTION_WINDOW,
        "avg_score": avg,
        "avg_score_needed": PROMOTION_AVG_SCORE,
        "distinct_modes": modes,
        "modes_needed": MIN_DISTINCT_MODES,
        "distinct_days": days,
        "days_needed": MIN_DISTINCT_DAYS,
        "cooldown_days_left": cooldown_days_left,
        "eligible": eligible,
    }


def check_and_promote(user_id: int) -> LevelChange | None:
    """
    Called after every logged practice session. Promotes the user one CEFR
    level if all the rules above hold; returns the LevelChange row, or None.
    Never raises into the caller's main flow.
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return None
        ev = _evaluate(user)
        if not ev or not ev["eligible"]:
            return None

        change = LevelChange(
            user_id=user.id,
            from_level=user.english_level,
            to_level=ev["next_level"],
            avg_score=ev["avg_score"],
            sessions_considered=ev["sessions_counted"],
            reason=(
                f"You averaged {ev['avg_score']}/10 over your last {ev['sessions_counted']} "
                f"sessions across {ev['distinct_modes']} practice modes."
            ),
            seen=False,
        )
        user.english_level = ev["next_level"]
        db.session.add(change)
        db.session.commit()
        return change
    except Exception as e:
        db.session.rollback()
        print(f"[level_progression] promotion check failed (non-blocking): {e}")
        return None


def get_progress(user: User) -> dict:
    """Progress toward the next level + history, for the dashboard."""
    ev = _evaluate(user) or {
        "current_level": user.english_level, "next_level": None, "eligible": False,
    }
    history = (
        LevelChange.query.filter_by(user_id=user.id)
        .order_by(LevelChange.created_at.desc())
        .all()
    )
    return {
        **ev,
        "history": [c.to_dict() for c in history],
        "unseen": [c.to_dict() for c in history if not c.seen],
    }