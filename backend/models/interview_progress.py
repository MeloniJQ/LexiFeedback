from datetime import datetime

from .user import db


class InterviewProgress(db.Model):
    """
    Autosave snapshot for the live Interview Practice page (Feature 2).

    Distinct from InterviewSession/InterviewQuestionHistory in
    models/interview_session.py — those back the more heavyweight
    plan-driven orchestrator flow (routes/interview_session.py) and require
    a CandidateProfile row. The live practice page (app/practice/interview)
    is a simpler, self-contained flow, so it gets its own lightweight
    "one JSON blob per in-progress attempt" table instead of being forced
    into that schema.

    One row per (user, session_key). The frontend generates a session_key
    (uuid) when the user clicks "Start Interview" and POSTs the full
    snapshot here immediately after every answer is scored — satisfying
    "every answer must be stored before moving to the next question" and
    "if the user refreshes, previously answered questions still exist."
    """
    __tablename__ = "interview_progress"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_key = db.Column(db.String(64), nullable=False, index=True)

    company = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(255), nullable=True)

    # Full serialized state needed to resume: questions list, answered
    # Q&A pairs (with analysis + followups), and current position.
    snapshot = db.Column(db.JSON, nullable=False, default=dict)

    status = db.Column(db.String(20), nullable=False, default="in_progress")  # in_progress | completed | abandoned
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "session_key", name="uq_interview_progress_user_session"),
    )

    user = db.relationship("User", backref=db.backref("interview_progress", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "session_key": self.session_key,
            "company": self.company,
            "role": self.role,
            "snapshot": self.snapshot or {},
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
