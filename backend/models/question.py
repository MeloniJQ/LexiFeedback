from datetime import datetime

from .user import db


class Question(db.Model):
    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.String(100), unique=True, nullable=False)
    candidate_profile_id = db.Column(
        db.Integer,
        db.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_text = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    topic = db.Column(db.String(100), nullable=True)
    difficulty = db.Column(db.String(50), nullable=True)
    expected_skills = db.Column(db.JSON, nullable=True, default=list)
    estimated_duration = db.Column(db.String(50), nullable=True)
    expected_keywords = db.Column(db.JSON, nullable=True, default=list)
    project = db.Column(db.String(100), nullable=True)
    meta_data = db.Column('metadata', db.JSON, nullable=True, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate_profile = db.relationship(
        "CandidateProfile",
        backref=db.backref("questions", lazy=True, cascade="all, delete-orphan"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "question_id": self.question_id,
            "candidate_profile_id": self.candidate_profile_id,
            "question_text": self.question_text,
            "category": self.category,
            "topic": self.topic,
            "difficulty": self.difficulty,
            "expected_skills": self.expected_skills or [],
            "estimated_duration": self.estimated_duration,
            "expected_keywords": self.expected_keywords or [],
            "project": self.project,
            "metadata": self.meta_data or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
