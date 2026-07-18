from datetime import datetime

from .user import db


class InterviewPlan(db.Model):
    __tablename__ = "interview_plans"

    id = db.Column(db.Integer, primary_key=True)
    candidate_profile_id = db.Column(
        db.Integer,
        db.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_data = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate_profile = db.relationship(
        "CandidateProfile",
        backref=db.backref("interview_plans", lazy=True, cascade="all, delete-orphan"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "candidate_profile_id": self.candidate_profile_id,
            "plan_data": self.plan_data or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
