from .user import db
from datetime import datetime


class ReadingPassageHistory(db.Model):
    """
    Tracks passages already shown to a user so /practice/reading/generate
    can avoid repeats across sessions, not just within a single process's
    in-memory 'last generated' cache (see services/ai_service.py).
    """
    __tablename__ = "reading_passage_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = db.Column(db.String(255), nullable=False)
    mode = db.Column(db.String(20), nullable=False, default="standard")  # 'standard' | 'journalist'
    difficulty = db.Column(db.String(20), nullable=True)
    level = db.Column(db.String(2), nullable=True)  # CEFR level, if known
    length = db.Column(db.String(10), nullable=True)  # short | medium | long

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship("User", backref=db.backref("reading_passage_history", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "mode": self.mode,
            "difficulty": self.difficulty,
            "level": self.level,
            "length": self.length,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
