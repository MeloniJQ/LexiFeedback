"""
LexiFeed Flask App — Step 2 update: register voice blueprint
Copy this over backend/app.py
"""

from flask import Flask
from flask_cors import CORS
from models import db
from routes.auth import auth_bp
from routes.interview import interview_bp
from routes.voice import voice_bp          # ← NEW Step 2
from routes.reading import reading_bp      # ← NEW Reading Practice
from routes.presentation_upload import presentation_upload_bp

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
app.register_blueprint(auth_bp,      url_prefix="/api/auth")
app.register_blueprint(interview_bp, url_prefix="/api/interview")
app.register_blueprint(reading_bp,   url_prefix="/api/practice/reading")
app.register_blueprint(voice_bp,     url_prefix="/api/voice")  
app.register_blueprint(presentation_upload_bp)   # ← NEW

@app.route("/", methods=["GET"])
def root():
    return {"message": "LexiFeed API is running", "docs": "/api/health"}

@app.route("/api/health", methods=["GET"])
def health():
    return {"status": "ok", "step": 2}

# Create database tables on first run
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5000, host="0.0.0.0")
