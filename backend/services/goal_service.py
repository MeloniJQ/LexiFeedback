"""
Goal service — shared helpers for updating goal progress & streaks.

auto_track_progress() is called from the practice-session routes
(interview / presentation / conversation / reading) whenever a user
completes a session, so goals update automatically without the user
having to manually press "Update Progress".
"""

from datetime import date
from models import db, Goal
from models.goal import SESSION_TYPE_TO_GOAL_TYPE


def auto_track_progress(user_id: int, session_type: str):
    """
    Increment +1 progress (and update streaks) on every ACTIVE goal
    belonging to `user_id` whose goal_type matches the given session_type.

    session_type is the internal practice-session key, e.g.
    'interview' | 'presentation' | 'conversation' | 'reading'.

    Safe to call even if no matching goals exist — it's a no-op then.
    Returns the list of updated Goal objects (already committed).
    """
    goal_type = SESSION_TYPE_TO_GOAL_TYPE.get((session_type or "").lower())
    if not goal_type:
        return []

    goals = Goal.query.filter_by(user_id=user_id, goal_type=goal_type).all()
    updated = []

    today = date.today()
    for goal in goals:
        if goal.status == "paused":
            continue
        if goal.current_progress >= goal.target_value:
            continue  # already completed, nothing to track

        goal.current_progress = min(goal.current_progress + 1, goal.target_value)
        goal.register_activity(today)
        goal.refresh_status()
        updated.append(goal)

    if updated:
        db.session.commit()

    return updated