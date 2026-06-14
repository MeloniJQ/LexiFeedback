from .user import db
from datetime import datetime

class PracticeSession(db.Model):
    __tablename__ = 'practice_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    session_type = db.Column(db.String(50), nullable=False)  # 'interview', 'presentation', 'conversation', 'reading'
    title = db.Column(db.String(255), nullable=True)
    transcript = db.Column(db.Text, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    score = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to user
    user = db.relationship('User', backref=db.backref('practice_sessions', lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_type': self.session_type,
            'title': self.title,
            'transcript': self.transcript,
            'feedback': self.feedback,
            'score': self.score,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
