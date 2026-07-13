"""
LexiFeed Interview Routes — Step 1 Complete Build

New endpoints added:
  POST /api/interview/start          → Upload resume + metadata → get 5 personalised questions
  POST /api/interview/followup       → Submit Q+A pair → get 1 follow-up question
  POST /api/interview/feedback       → Submit full transcript → get feedback + save session
  GET  /api/interview/sessions       → List user's sessions
  GET  /api/interview/stats          → Dashboard stats

Kept for backward compat:
  POST /api/interview/generate       → Old plain-text question generator
  POST /api/interview/upload-resume  → Old file upload
"""

from flask import Blueprint, request, jsonify
from models import db, PracticeSession
from services.ai_service import (
    generate_questions_from_resume,
    generate_followup_question,
    generate_feedback,
    generate_questions,       # legacy
    extract_resume_text,
)
from utils.jwt_handler import token_required
from services.goal_service import auto_track_progress
import os
import re
import json
from datetime import datetime, date, timedelta

interview_bp = Blueprint("interview", __name__)

UPLOAD_DIR = "uploads"


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def extract_score(feedback_text: str) -> str:
    match = re.search(r"Overall Score:\s*(\d+)/10", feedback_text, re.IGNORECASE)
    if match:
        return f"{match.group(1)}/10"
    match = re.search(r"Score:\s*(\d+)%", feedback_text, re.IGNORECASE)
    if match:
        return f"{round(int(match.group(1)) / 10)}/10"
    return "8/10"


def _save_file(file) -> str:
    """Save uploaded file to disk, return local path."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    # Sanitise filename
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename)
    filepath = os.path.join(UPLOAD_DIR, safe_name)
    file.save(filepath)
    return filepath


def _json_list(value) -> list:
    """Parse an optional JSON list from form-data without failing the request."""
    if isinstance(value, list):
        return value
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, ValueError):
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Step 1 — Start interview: parse resume → return 5 personalised questions
# ─────────────────────────────────────────────────────────────────────────────

@interview_bp.route("/start", methods=["POST"])
@token_required
def start_interview(payload):
    """
    Accepts multipart/form-data OR JSON.

    Fields:
      company          (required)
      role             (required)
      job_description  (optional)
      key_skills       (optional)
      num_questions    (optional, default 5, max 20)
      resume           (optional file — PDF / DOCX / TXT)

    Returns:
      { "questions": [ { id, type, question, hint }, ... ] }
    """
    try:
        # ── Parse inputs ────────────────────────────────────────────────────
        if request.content_type and "multipart/form-data" in request.content_type:
            company         = (request.form.get("company")         or "").strip()
            role            = (request.form.get("role")            or "").strip()
            job_description = (request.form.get("job_description") or "").strip()
            key_skills      = (request.form.get("key_skills")      or "").strip()
            asked_questions = _json_list(request.form.get("asked_questions"))
            num_questions   = int(request.form.get("num_questions", 5))
            resume_file     = request.files.get("resume")
        else:
            data            = request.json or {}
            company         = (data.get("company")         or "").strip()
            role            = (data.get("role")            or "").strip()
            job_description = (data.get("job_description") or "").strip()
            key_skills      = (data.get("key_skills")      or "").strip()
            asked_questions = _json_list(data.get("asked_questions"))
            num_questions   = int(data.get("num_questions", 5))
            resume_file     = None

        if not company or not role:
            return jsonify({"error": "company and role are required"}), 400

        # Validate num_questions
        num_questions = max(1, min(num_questions, 20))

        # ── Extract resume text ──────────────────────────────────────────────
        resume_text = ""
        if resume_file and resume_file.filename:
            filepath    = _save_file(resume_file)
            resume_text = extract_resume_text(filepath)

        # ── Generate questions ───────────────────────────────────────────────
        questions = generate_questions_from_resume(
            company         = company,
            role            = role,
            resume_text     = resume_text,
            job_description = job_description,
            key_skills      = key_skills,
            asked_questions = asked_questions,
            num_questions   = num_questions,
        )

        return jsonify({
            "questions":    questions,
            "resume_parsed": bool(resume_text),
            "company":      company,
            "role":         role,
            "num_questions": num_questions,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Step 1 — Follow-up: given Q + candidate answer → return 1 follow-up question
# ─────────────────────────────────────────────────────────────────────────────

@interview_bp.route("/followup", methods=["POST"])
@token_required
def followup(payload):
    """
    Body (JSON):
      {
        "original_question": "...",
        "candidate_answer":  "...",
        "company":           "...",
        "role":              "..."
      }

    Returns:
      { "followup": "...", "reason": "..." }
    """
    try:
        data = request.json or {}
        original_question = (data.get("original_question") or "").strip()
        candidate_answer  = (data.get("candidate_answer")  or "").strip()
        company           = (data.get("company")           or "Unknown Company").strip()
        role              = (data.get("role")              or "Unknown Role").strip()
        previous_pairs    = _json_list(data.get("previous_pairs"))
        resume_context    = (data.get("resume_context") or "").strip()

        if not original_question or not candidate_answer:
            return jsonify({"error": "original_question and candidate_answer are required"}), 400

        result = generate_followup_question(
            original_question = original_question,
            candidate_answer  = candidate_answer,
            company           = company,
            role              = role,
            previous_pairs    = previous_pairs,
            resume_context    = resume_context,
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# End of session — generate feedback + save to DB
# ─────────────────────────────────────────────────────────────────────────────

@interview_bp.route("/feedback", methods=["POST"])
@token_required
def get_session_feedback(payload):
    """
    Body (JSON):
      {
        "transcript":    "...",   ← full Q&A conversation as plain text
        "company":       "...",
        "role":          "...",
        "session_type":  "interview",
        "title":         "optional custom title"
      }
    """
    try:
        data         = request.json or {}
        transcript   = (data.get("transcript")   or "").strip()
        company      = (data.get("company")      or "Generic Company").strip()
        role         = (data.get("role")         or "General Role").strip()
        session_type = (data.get("session_type") or "interview").strip()
        title        = (data.get("title")        or f"{role} Practice at {company}").strip()

        if not transcript:
            return jsonify({"error": "transcript cannot be empty"}), 400

        feedback = generate_feedback(transcript, company, role)
        score    = extract_score(feedback)

        session_record = PracticeSession(
            user_id      = payload["user_id"],
            session_type = session_type,
            title        = title,
            transcript   = transcript,
            feedback     = feedback,
            score        = score,
        )
        db.session.add(session_record)
        db.session.commit()

        # Auto-track: bump progress/streak on any of the user's active goals
        # matching this practice mode (interview / presentation / conversation).
        try:
            auto_track_progress(payload["user_id"], session_type)
        except Exception:
            pass  # Never let goal tracking break the main session save

        return jsonify({
            "message": "Session saved successfully",
            "session": session_record.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Session history + stats
# ─────────────────────────────────────────────────────────────────────────────

@interview_bp.route("/sessions", methods=["GET"])
@token_required
def get_user_sessions(payload):
    try:
        session_type = request.args.get("session_type")
        query = PracticeSession.query.filter_by(user_id=payload["user_id"])
        if session_type:
            query = query.filter_by(session_type=session_type)
        sessions = query.order_by(PracticeSession.created_at.desc()).all()
        return jsonify([s.to_dict() for s in sessions]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/stats", methods=["GET"])
@token_required
def get_user_stats(payload):
    try:
        sessions = PracticeSession.query.filter_by(user_id=payload["user_id"]).all()
        total_sessions = len(sessions)
        total_hours    = round((total_sessions * 10) / 60, 1)

        total_score, valid_count = 0, 0
        for s in sessions:
            if s.score:
                m = re.match(r"(\d+)/10", s.score)
                if m:
                    total_score += int(m.group(1)) * 10
                    valid_count += 1
        avg_score = round(total_score / valid_count, 1) if valid_count else 0.0

        # Streak
        streak = 0
        if sessions:
            dates = sorted({s.created_at.date() for s in sessions}, reverse=True)
            today = date.today()
            if dates[0] in (today, today - timedelta(days=1)):
                streak = 1
                for i in range(len(dates) - 1):
                    if dates[i] - dates[i + 1] == timedelta(days=1):
                        streak += 1
                    else:
                        break

        type_data = {t: {"count": 0, "sum": 0, "n": 0}
                    for t in ("interview", "presentation", "conversation", "reading")}
        for s in sessions:
            t = s.session_type.lower()
            if t in type_data:
                type_data[t]["count"] += 1
                m = re.match(r"(\d+)/10", s.score or "")
                if m:
                    type_data[t]["sum"] += int(m.group(1)) * 10
                    type_data[t]["n"]   += 1

        def skill_entry(label, key):
            d = type_data[key]
            avg = round(d["sum"] / d["n"]) if d["n"] else 0
            return {
                "skill":       label,
                "progress":    avg,
                "sessions":    d["count"],
                "improvement": f"+{max(0, avg - 50)}%" if avg else "+0%",
            }

        return jsonify({
            "total_sessions": total_sessions,
            "total_hours":    total_hours,
            "avg_score_pct":  avg_score,
            "streak":         streak,
            "skills_progress": [
                skill_entry("Interview Practice",   "interview"),
                skill_entry("Presentation Skills",  "presentation"),
                skill_entry("Conversation Fluency", "conversation"),
                skill_entry("Reading Comprehension","reading"),
            ],
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Legacy endpoints — kept for backward compat
# ─────────────────────────────────────────────────────────────────────────────

@interview_bp.route("/generate", methods=["POST"])
@token_required
def generate(payload):
    """Legacy: returns plain-text question list."""
    try:
        data    = request.json or {}
        company = data.get("company", "").strip()
        role    = data.get("role", "").strip()
        if not company or not role:
            return jsonify({"error": "Missing company or role"}), 400
        return jsonify({"questions": generate_questions(company, role)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/upload-resume", methods=["POST"])
@token_required
def upload_resume(payload):
    """Legacy: save file only, return path."""
    try:
        if "resume" not in request.files:
            return jsonify({"error": "No resume file provided"}), 400
        file = request.files["resume"]
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400
        filepath = _save_file(file)
        return jsonify({"message": "Uploaded successfully", "filepath": filepath}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
