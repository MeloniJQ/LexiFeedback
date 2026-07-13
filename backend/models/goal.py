from .user import db
from datetime import datetime, date


VALID_GOAL_TYPES = [
    "Interview Practice",
    "Presentation Mode",
    "Casual Conversation",
    "Reading Practice",
]

# Maps the internal session_type value used by PracticeSession / practice
# routes to the user-facing Goal Type label used on the Goals page.
SESSION_TYPE_TO_GOAL_TYPE = {
    "interview": "Interview Practice",
    "presentation": "Presentation Mode",
    "conversation": "Casual Conversation",
    "reading": "Reading Practice",
}


class Goal(db.Model):
    __tablename__ = "goals"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500), nullable=True, default="")
    goal_type = db.Column(db.String(50), nullable=False)

    target_value = db.Column(db.Integer, nullable=False)
    current_progress = db.Column(db.Integer, nullable=False, default=0)

    deadline = db.Column(db.Date, nullable=False)  # stored internally in ISO format (YYYY-MM-DD)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    streak_count = db.Column(db.Integer, nullable=False, default=0)
    longest_streak = db.Column(db.Integer, nullable=False, default=0)
    last_completed_date = db.Column(db.Date, nullable=True)

    completed = db.Column(db.Boolean, nullable=False, default=False)
    # status is derived/auto-updated but persisted for querying: active | completed | overdue | paused
    status = db.Column(db.String(20), nullable=False, default="active")

    user = db.relationship("User", backref=db.backref("goals", lazy=True, cascade="all, delete-orphan"))

    # ── Derived status logic ────────────────────────────────────────────────
    def refresh_status(self):
        """Recompute status/completed flags based on current data. Does not commit."""
        if self.status == "paused":
            # Paused is a manual state; only escalate to completed if target reached.
            if self.current_progress >= self.target_value:
                self.completed = True
                self.status = "completed"
            return

        if self.current_progress >= self.target_value:
            self.completed = True
            self.status = "completed"
            return

        self.completed = False
        if self.deadline and self.deadline < date.today():
            self.status = "overdue"
        else:
            self.status = "active"

    def register_activity(self, on_date: date = None):
        """Update streak counters for an activity performed on `on_date` (default today)."""
        on_date = on_date or date.today()

        if self.last_completed_date == on_date:
            # Already counted today — no-op (only increases once per day).
            return

        if self.last_completed_date is not None:
            gap = (on_date - self.last_completed_date).days
            if gap == 1:
                self.streak_count += 1
            elif gap > 1:
                # Missed at least one full day → reset.
                self.streak_count = 1
            else:
                # on_date is in the past relative to last_completed_date; ignore.
                return
        else:
            self.streak_count = 1

        self.last_completed_date = on_date
        if self.streak_count > self.longest_streak:
            self.longest_streak = self.streak_count

    def days_remaining(self):
        if not self.deadline:
            return None
        return (self.deadline - date.today()).days

    def to_dict(self):
        self.refresh_status()
        return {
            "id": self.id,
            "userId": self.user_id,
            "title": self.title,
            "description": self.description or "",
            "goalType": self.goal_type,
            "targetValue": self.target_value,
            "currentProgress": self.current_progress,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "streakCount": self.streak_count,
            "longestStreak": self.longest_streak,
            "lastCompletedDate": self.last_completed_date.isoformat() if self.last_completed_date else None,
            "completed": self.completed,
            "status": self.status,
            "daysRemaining": self.days_remaining(),
            "progressPercentage": round(min((self.current_progress / self.target_value) * 100, 100), 1) if self.target_value else 0,
        }