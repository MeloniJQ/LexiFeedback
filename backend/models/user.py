from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    education = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── CEFR Initial English Level Assessment (Feature 1) ──────────────────
    # english_level drives content difficulty across every practice mode
    # (interview questions, presentation topics, reading passages, daily
    # conversation). assessment_completed gates the first-login redirect —
    # see routes/assessment.py + frontend app/assessment/page.tsx.
    english_level = db.Column(db.String(2), nullable=True)  # A1, A2, B1, B2, C1, C2
    assessment_completed = db.Column(db.Boolean, nullable=False, default=False)
    assessment_date = db.Column(db.DateTime, nullable=True)
    overall_score = db.Column(db.Float, nullable=True)
    grammar_score = db.Column(db.Float, nullable=True)
    vocabulary_score = db.Column(db.Float, nullable=True)
    pronunciation_score = db.Column(db.Float, nullable=True)
    fluency_score = db.Column(db.Float, nullable=True)
    speaking_score = db.Column(db.Float, nullable=True)
    reading_score = db.Column(db.Float, nullable=True)
    listening_score = db.Column(db.Float, nullable=True)

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify password against hash"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert user to dictionary for JSON response"""
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'age': self.age,
            'education': self.education,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            # CEFR assessment fields — used by the frontend to decide whether
            # to redirect to /assessment and to personalize practice content.
            'english_level': self.english_level,
            'assessment_completed': bool(self.assessment_completed),
            'assessment_date': self.assessment_date.isoformat() if self.assessment_date else None,
            'overall_score': self.overall_score,
            'grammar_score': self.grammar_score,
            'vocabulary_score': self.vocabulary_score,
            'pronunciation_score': self.pronunciation_score,
            'fluency_score': self.fluency_score,
            'speaking_score': self.speaking_score,
            'reading_score': self.reading_score,
            'listening_score': self.listening_score,
        }
