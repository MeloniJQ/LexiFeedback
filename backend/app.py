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

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)

CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        r"^http://\[::1\]:3000$",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        r"^http://\[::1\]:5000$",
        # Add your production frontend URL here when deploying:
        # "https://your-app.vercel.app",
    ],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
)

app.config.from_pyfile("config.py")

# Initialise database
db.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp,      url_prefix="/api/auth")
app.register_blueprint(interview_bp, url_prefix="/api/interview")
<<<<<<< HEAD
app.register_blueprint(voice_bp,     url_prefix="/api/voice")   # ← NEW
app.register_blueprint(reading_bp,   url_prefix="/api/practice/reading")
=======
app.register_blueprint(voice_bp,     url_prefix="/api/voice")  
app.register_blueprint(presentation_upload_bp)   # ← NEW
>>>>>>> b27285d7d3f186e50d7e822541df88e1e5728365

@app.route("/api/health", methods=["GET"])
def health():
    return {"status": "ok", "step": 2}

# Create database tables on first run
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5000, host="0.0.0.0")
