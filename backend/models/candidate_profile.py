from datetime import datetime

from .user import db


class ResumeData(db.Model):
    __tablename__ = "resume_data"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = db.Column(db.String(255), nullable=True)
    file_type = db.Column(db.String(50), nullable=True)
    extracted_text = db.Column(db.Text, nullable=True)
    parsed_data = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("resume_data", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "filename": self.filename,
            "file_type": self.file_type,
            "parsed_data": self.parsed_data or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class JobDescriptionData(db.Model):
    __tablename__ = "job_description_data"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    raw_text = db.Column(db.Text, nullable=True)
    parsed_data = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("job_description_data", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "parsed_data": self.parsed_data or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CandidateProfile(db.Model):
    __tablename__ = "candidate_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resume_data_id = db.Column(db.Integer, db.ForeignKey("resume_data.id", ondelete="SET NULL"), nullable=True)
    job_description_data_id = db.Column(db.Integer, db.ForeignKey("job_description_data.id", ondelete="SET NULL"), nullable=True)
    profile_data = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("candidate_profiles", lazy=True, cascade="all, delete-orphan"))
    resume_data = db.relationship("ResumeData", foreign_keys=[resume_data_id])
    job_description_data = db.relationship("JobDescriptionData", foreign_keys=[job_description_data_id])

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "resume_data_id": self.resume_data_id,
            "job_description_data_id": self.job_description_data_id,
            "profile_data": self.profile_data or {},
            "resume_data": self.resume_data.to_dict() if self.resume_data else None,
            "job_description_data": self.job_description_data.to_dict() if self.job_description_data else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ProfileMatch(db.Model):
    __tablename__ = "profile_matches"

    id = db.Column(db.Integer, primary_key=True)
    candidate_profile_id = db.Column(db.Integer, db.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False)
    match_data = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    candidate_profile = db.relationship("CandidateProfile", backref=db.backref("profile_matches", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "candidate_profile_id": self.candidate_profile_id,
            "match_data": self.match_data or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
