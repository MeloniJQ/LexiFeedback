from datetime import datetime

from .user import db


class InterviewSession(db.Model):
    __tablename__ = 'interview_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    candidate_profile_id = db.Column(db.Integer, db.ForeignKey('candidate_profiles.id', ondelete='CASCADE'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('interview_plans.id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='pending')
    current_difficulty = db.Column(db.String(50), nullable=True)
    current_topic = db.Column(db.String(100), nullable=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    paused_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    meta_data = db.Column('metadata', db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('interview_sessions', lazy=True, cascade='all, delete-orphan'))
    question_histories = db.relationship('InterviewQuestionHistory', backref='interview_session', lazy=True, cascade='all, delete-orphan')
    conversation_memory = db.relationship('ConversationMemory', backref='interview_session', lazy=True, cascade='all, delete-orphan')
    answer_evaluations = db.relationship('AnswerEvaluation', backref='interview_session', lazy=True, cascade='all, delete-orphan')
    interview_evaluations = db.relationship('InterviewEvaluation', backref='interview_session', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'candidate_profile_id': self.candidate_profile_id,
            'plan_id': self.plan_id,
            'status': self.status,
            'current_difficulty': self.current_difficulty,
            'current_topic': self.current_topic,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'paused_at': self.paused_at.isoformat() if self.paused_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'metadata': self.meta_data or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class InterviewQuestionHistory(db.Model):
    __tablename__ = 'interview_question_histories'

    id = db.Column(db.Integer, primary_key=True)
    interview_session_id = db.Column(db.Integer, db.ForeignKey('interview_sessions.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.String(100), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(100), nullable=True)
    topic = db.Column(db.String(100), nullable=True)
    difficulty = db.Column(db.String(50), nullable=True)
    answer_text = db.Column(db.Text, nullable=True)
    is_followup = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'interview_session_id': self.interview_session_id,
            'question_id': self.question_id,
            'question_text': self.question_text,
            'question_type': self.question_type,
            'topic': self.topic,
            'difficulty': self.difficulty,
            'answer_text': self.answer_text,
            'is_followup': self.is_followup,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ConversationMemory(db.Model):
    __tablename__ = 'conversation_memories'

    id = db.Column(db.Integer, primary_key=True)
    interview_session_id = db.Column(db.Integer, db.ForeignKey('interview_sessions.id', ondelete='CASCADE'), nullable=False)
    memory_type = db.Column(db.String(100), nullable=False)
    memory_data = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'interview_session_id': self.interview_session_id,
            'memory_type': self.memory_type,
            'memory_data': self.memory_data or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class AnswerEvaluation(db.Model):
    __tablename__ = 'answer_evaluations'

    id = db.Column(db.Integer, primary_key=True)
    interview_session_id = db.Column(db.Integer, db.ForeignKey('interview_sessions.id', ondelete='CASCADE'), nullable=False)
    question_history_id = db.Column(db.Integer, db.ForeignKey('interview_question_histories.id', ondelete='CASCADE'), nullable=False)
    evaluator = db.Column(db.String(100), nullable=False, default='evaluation_agent')
    technical_score = db.Column(db.Integer, nullable=False, default=0)
    communication_score = db.Column(db.Integer, nullable=False, default=0)
    vocabulary_score = db.Column(db.Integer, nullable=False, default=0)
    grammar_score = db.Column(db.Integer, nullable=False, default=0)
    confidence_score = db.Column(db.Integer, nullable=False, default=0)
    completeness_score = db.Column(db.Integer, nullable=False, default=0)
    relevance_score = db.Column(db.Integer, nullable=False, default=0)
    overall_score = db.Column(db.Integer, nullable=False, default=0)
    strengths = db.Column(db.JSON, nullable=False, default=list)
    weaknesses = db.Column(db.JSON, nullable=False, default=list)
    missing_topics = db.Column(db.JSON, nullable=False, default=list)
    suggestions = db.Column(db.JSON, nullable=False, default=list)
    raw_analysis = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    question_history = db.relationship('InterviewQuestionHistory', backref=db.backref('answer_evaluation', uselist=False), lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'interview_session_id': self.interview_session_id,
            'question_history_id': self.question_history_id,
            'evaluator': self.evaluator,
            'technical_score': self.technical_score,
            'communication_score': self.communication_score,
            'vocabulary_score': self.vocabulary_score,
            'grammar_score': self.grammar_score,
            'confidence_score': self.confidence_score,
            'completeness_score': self.completeness_score,
            'relevance_score': self.relevance_score,
            'overall_score': self.overall_score,
            'strengths': self.strengths,
            'weaknesses': self.weaknesses,
            'missing_topics': self.missing_topics,
            'suggestions': self.suggestions,
            'raw_analysis': self.raw_analysis or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class InterviewEvaluation(db.Model):
    __tablename__ = 'interview_evaluations'

    id = db.Column(db.Integer, primary_key=True)
    interview_session_id = db.Column(db.Integer, db.ForeignKey('interview_sessions.id', ondelete='CASCADE'), nullable=False)
    evaluator = db.Column(db.String(100), nullable=False, default='evaluation_agent')
    overall_technical = db.Column(db.Integer, nullable=False, default=0)
    overall_communication = db.Column(db.Integer, nullable=False, default=0)
    overall_vocabulary = db.Column(db.Integer, nullable=False, default=0)
    overall_grammar = db.Column(db.Integer, nullable=False, default=0)
    overall_confidence = db.Column(db.Integer, nullable=False, default=0)
    overall_completeness = db.Column(db.Integer, nullable=False, default=0)
    overall_score = db.Column(db.Integer, nullable=False, default=0)
    strong_topics = db.Column(db.JSON, nullable=False, default=list)
    weak_topics = db.Column(db.JSON, nullable=False, default=list)
    frequently_missed_concepts = db.Column(db.JSON, nullable=False, default=list)
    project_knowledge = db.Column(db.JSON, nullable=False, default=list)
    domain_knowledge = db.Column(db.JSON, nullable=False, default=list)
    behavioral_performance = db.Column(db.JSON, nullable=False, default=list)
    recommendations = db.Column(db.JSON, nullable=False, default=list)
    summary = db.Column(db.JSON, nullable=False, default=dict)
    raw_analysis = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'interview_session_id': self.interview_session_id,
            'evaluator': self.evaluator,
            'overall_technical': self.overall_technical,
            'overall_communication': self.overall_communication,
            'overall_vocabulary': self.overall_vocabulary,
            'overall_grammar': self.overall_grammar,
            'overall_confidence': self.overall_confidence,
            'overall_completeness': self.overall_completeness,
            'overall_score': self.overall_score,
            'strong_topics': self.strong_topics,
            'weak_topics': self.weak_topics,
            'frequently_missed_concepts': self.frequently_missed_concepts,
            'project_knowledge': self.project_knowledge,
            'domain_knowledge': self.domain_knowledge,
            'behavioral_performance': self.behavioral_performance,
            'recommendations': self.recommendations,
            'summary': self.summary or {},
            'raw_analysis': self.raw_analysis or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
