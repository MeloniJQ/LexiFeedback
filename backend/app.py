"""LexiFeed Flask application entrypoint."""

from flask import Flask
from flask_cors import CORS
from models import db
from routes.auth import auth_bp
from routes.interview import interview_bp
from routes.interview_planning import interview_planning_bp
from routes.interview_session import interview_session_bp
from routes.question_generation import question_bp
from routes.voice import voice_bp
from routes.reading import reading_bp
from routes.presentation_upload import presentation_upload_bp
from routes.candidate_intelligence import candidate_bp
from routes.analytics import analytics_bp
from routes.reports import reports_bp
from routes.recommendations import recommendations_bp
from routes.history import history_bp
from routes.modes import modes_bp
from routes.health import health_bp
from routes.vocabulary import vocabulary_bp
from routes.goals import goals_bp
from routes.assessment import assessment_bp

import sys
import os
import re

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)

# Allow localhost and standard private network IP address ranges on any port in development
CORS_ORIGINS = [
    re.compile(r"^https?://localhost(:\d+)?$"),
    re.compile(r"^https?://127\.0\.0\.1(:\d+)?$"),
    re.compile(r"^https?://\[::1\](:\d+)?$"),
    re.compile(r"^https?://10\.\d+\.\d+\.\d+(:\d+)?$"),
    re.compile(r"^https?://192\.168\.\d+\.\d+(:\d+)?$"),
    re.compile(r"^https?://172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$"),
]

CORS(
    app,
    origins=CORS_ORIGINS,
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

app.config.from_pyfile("config.py")

# Initialise database
db.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(interview_bp, url_prefix="/api/interview")
app.register_blueprint(interview_planning_bp, url_prefix="/api/interview/plan")
app.register_blueprint(interview_session_bp, url_prefix="/api/interview/session")
app.register_blueprint(question_bp, url_prefix="/api/interview/questions")
app.register_blueprint(reading_bp,   url_prefix="/api/practice/reading")
app.register_blueprint(voice_bp,     url_prefix="/api/voice")
app.register_blueprint(presentation_upload_bp)
app.register_blueprint(candidate_bp)
app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
app.register_blueprint(reports_bp, url_prefix="/api/reports")
app.register_blueprint(recommendations_bp, url_prefix="/api/recommendations")
app.register_blueprint(history_bp, url_prefix="/api/history")
app.register_blueprint(modes_bp, url_prefix="/api/modes")
app.register_blueprint(health_bp, url_prefix="/api")
app.register_blueprint(vocabulary_bp, url_prefix="/api/vocabulary")
app.register_blueprint(goals_bp, url_prefix="/api/goals")
app.register_blueprint(assessment_bp, url_prefix="/api/assessment")

@app.route("/", methods=["GET"])
def root():
    return {
        "message": "LexiFeed API is running",
        "docs": "/api/health"
    }

# Create database tables on first run
with app.app_context():
    db.create_all()

    # ── Lightweight auto-migration for the CEFR assessment columns ─────────
    # db.create_all() only creates missing TABLES, it never ALTERs existing
    # ones — so a developer with a pre-existing app.db (created before this
    # feature) would otherwise crash on the first query that touches these
    # new User columns. The project has no migration framework (no Alembic),
    # so this adds any missing columns directly via SQLite's ALTER TABLE.
    # Safe to run on every startup: it only adds columns that don't exist.
    try:
        from sqlalchemy import inspect, text

        inspector = inspect(db.engine)
        if "users" in inspector.get_table_names():
            existing_columns = {col["name"] for col in inspector.get_columns("users")}
            new_columns = {
                "english_level": "VARCHAR(2)",
                "assessment_completed": "BOOLEAN DEFAULT 0",
                "assessment_date": "DATETIME",
                "overall_score": "FLOAT",
                "grammar_score": "FLOAT",
                "vocabulary_score": "FLOAT",
                "pronunciation_score": "FLOAT",
                "fluency_score": "FLOAT",
                "speaking_score": "FLOAT",
                "reading_score": "FLOAT",
                "listening_score": "FLOAT",
            }
            for col_name, col_type in new_columns.items():
                if col_name not in existing_columns:
                    db.session.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
            db.session.commit()
    except Exception as migration_error:
        print(f"[startup migration] Warning: could not auto-migrate users table: {migration_error}")

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5000, host="0.0.0.0")