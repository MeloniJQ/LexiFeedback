from datetime import datetime

from .user import db
from utils.time import to_iso_utc


class LevelChange(db.Model):
    """
    One row per automatic CEFR level promotion (see
    services/level_progression_service.py). Doubles as:
      - the history behind "how did my level change over time"
      - the cooldown reference (a promotion can't happen again for a while)
      - the "you've been promoted" notification queue (`seen` flips to True
        once the user has dismissed the banner on the dashboard)
    Manual assessment retakes are NOT recorded here — they already stamp
    User.assessment_date, which the progression service also respects.
    """
    __tablename__ = 'level_changes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    from_level = db.Column(db.String(2), nullable=False)
    to_level = db.Column(db.String(2), nullable=False)
    avg_score = db.Column(db.Float, nullable=True)
    sessions_considered = db.Column(db.Integer, nullable=True)
    reason = db.Column(db.String(255), nullable=True)
    seen = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('level_changes', lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            'id': self.id,
            'from_level': self.from_level,
            'to_level': self.to_level,
            'avg_score': self.avg_score,
            'sessions_considered': self.sessions_considered,
            'reason': self.reason,
            'seen': bool(self.seen),
            'created_at': to_iso_utc(self.created_at),
        }