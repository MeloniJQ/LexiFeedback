"""
LexiFeed Voice Routes — Step 2

New endpoints:
  POST /api/voice/transcribe     → Upload audio blob → Whisper transcript
  POST /api/voice/analyze        → Transcript + question → rich analysis JSON
  POST /api/voice/analyze-agentic → Transcript + context → agentic AI analysis with prior answers
  POST /api/voice/followup       → Transcript + analysis → voice-aware follow-up

These sit on a separate blueprint (/api/voice) to keep interview.py clean.
"""

from flask import Blueprint, request, jsonify
import os
import re
import tempfile
from pathlib import Path
from utils.jwt_handler import token_required
from services.voice_service import (
    transcribe_audio,
    analyze_voice_answer,
    generate_voice_followup,
)
from services.agentic_analysis import (
    analyze_answer_contextually,
    generate_session_comparison,
)

voice_bp = Blueprint("voice", __name__)

UPLOAD_DIR   = "uploads/audio"
MAX_FILE_MB  = 25   # Whisper limit is 25 MB
MIN_FILE_BYTES = 2000   # ~2KB — below this, it's almost certainly an empty/near-silent
                         # or corrupted recording rather than real speech (e.g. mic
                         # permission denied, recording stopped instantly, browser
                         # produced a near-empty blob). Catching this here gives a
                         # clear, specific error instead of a confusing empty
                         # transcript with no explanation.


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/voice/transcribe
# ─────────────────────────────────────────────────────────────────────────────

@voice_bp.route("/transcribe", methods=["POST"])
@token_required
def transcribe(payload):
    """
    Accept an audio file (webm/wav/mp3/m4a) and return the Whisper transcript.

    Multipart form fields:
      audio     (file, required)   — the recorded audio blob
      language  (string, optional) — ISO 639-1 code, default "en"

    Response:
    {
      "transcript":       "What was said",
      "duration_seconds": 42.1,
      "word_count":       112,
      "success":          true
    }
    """
    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files["audio"]
        language   = request.form.get("language", "en")

        if not audio_file.filename:
            return jsonify({"error": "Empty filename"}), 400

        # Size check
        audio_file.seek(0, 2)  # seek to end
        file_size_mb = audio_file.tell() / (1024 * 1024)
        audio_file.seek(0)

        if file_size_mb > MAX_FILE_MB:
            return jsonify({"error": f"File too large ({file_size_mb:.1f} MB). Max {MAX_FILE_MB} MB."}), 413

        file_size_bytes = file_size_mb * 1024 * 1024
        if file_size_bytes < MIN_FILE_BYTES:
            return jsonify({
                "error": "Recording appears to be empty or too short. Check your microphone "
                         "permissions and try recording again."
            }), 400

        # Save to temp file with correct extension (Whisper uses it to detect format)
        suffix = Path(audio_file.filename).suffix or ".webm"
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        with tempfile.NamedTemporaryFile(
            dir=UPLOAD_DIR, suffix=suffix, delete=False
        ) as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        try:
            result = transcribe_audio(tmp_path, language=language)
        finally:
            # Always clean up temp file
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

        if not result["success"]:
            return jsonify({"error": result.get("error", "Transcription failed")}), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/voice/analyze
# ─────────────────────────────────────────────────────────────────────────────

@voice_bp.route("/analyze", methods=["POST"])
@token_required
def analyze(payload):
    """
    Analyse a transcribed answer in detail.

    JSON body:
    {
      "transcript":       "Full answer text",
      "question":         "Original interview question",
      "question_type":    "behavioral",
      "company":          "Google",
      "role":             "Software Engineer",
      "duration_seconds": 45.2,   (optional — from transcribe step)
      "word_count":       112      (optional)
    }

    Response: full analysis JSON (see voice_service.py for schema)
    """
    try:
        data             = request.json or {}
        transcript       = (data.get("transcript")       or "").strip()
        question         = (data.get("question")         or "").strip()
        question_type    = (data.get("question_type")    or "behavioral").strip()
        company          = (data.get("company")          or "the company").strip()
        role             = (data.get("role")              or "this role").strip()
        duration_seconds = float(data.get("duration_seconds", 0))
        word_count       = int(data.get("word_count", len(transcript.split())))

        if not transcript:
            return jsonify({"error": "transcript is required"}), 400
        if not question:
            return jsonify({"error": "question is required"}), 400

        analysis = analyze_voice_answer(
            transcript       = transcript,
            question         = question,
            question_type    = question_type,
            company          = company,
            role             = role,
            duration_seconds = duration_seconds,
            word_count       = word_count,
        )

        return jsonify(analysis), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/voice/analyze-agentic — NEW: Contextual agentic analysis
# ─────────────────────────────────────────────────────────────────────────────

@voice_bp.route("/analyze-agentic", methods=["POST"])
@token_required
def analyze_agentic(payload):
    """
    Agentic analysis that evaluates answers contextually with comparison to prior answers.

    JSON body:
    {
      "transcript":         "Full answer text",
      "question":           "Original interview question",
      "question_type":      "behavioral",
      "company":            "Google",
      "role":               "Software Engineer",
      "question_num":       1,
      "total_questions":    5,
      "previous_analyses":  [
        { "question_type": "technical", "scores": {...}, "content_analysis": {...}, ... },
        ...
      ]
    }

    Returns: agentic analysis with pattern tracking and competency alignment
    """
    try:
        data = request.json or {}
        transcript = (data.get("transcript") or "").strip()
        question = (data.get("question") or "").strip()
        question_type = (data.get("question_type") or "behavioral").strip()
        company = (data.get("company") or "the company").strip()
        role = (data.get("role") or "this role").strip()
        question_num = int(data.get("question_num", 1))
        total_questions = int(data.get("total_questions", 5))
        previous_analyses = data.get("previous_analyses", [])

        if not transcript:
            return jsonify({"error": "transcript is required"}), 400
        if not question:
            return jsonify({"error": "question is required"}), 400

        analysis = analyze_answer_contextually(
            transcript=transcript,
            question=question,
            question_type=question_type,
            company=company,
            role=role,
            previous_analyses=previous_analyses,
            question_num=question_num,
            total_questions=total_questions,
        )

        return jsonify(analysis), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/voice/session-comparison — NEW: Cross-session analysis
# ─────────────────────────────────────────────────────────────────────────────

@voice_bp.route("/session-comparison", methods=["POST"])
@token_required
def session_comparison(payload):
    """
    Generate comprehensive session-level analysis comparing all answers.

    JSON body:
    {
      "all_answers": [
        { "question_type": "...", "scores": {...}, "content_analysis": {...}, ... },
        ...
      ],
      "company": "Google",
      "role": "Software Engineer"
    }

    Returns: comparative analysis with strengths, gaps, and hiring recommendation
    """
    try:
        data = request.json or {}
        all_answers = data.get("all_answers", [])
        company = (data.get("company") or "the company").strip()
        role = (data.get("role") or "this role").strip()

        if not all_answers:
            return jsonify({"error": "all_answers is required"}), 400

        comparison = generate_session_comparison(
            all_answers=all_answers,
            company=company,
            role=role,
        )

        return jsonify(comparison), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/voice/followup
# ─────────────────────────────────────────────────────────────────────────────

@voice_bp.route("/followup", methods=["POST"])
@token_required
def voice_followup(payload):
    """
    Generate a follow-up question that specifically references what was said.

    JSON body:
    {
      "transcript": "Full answer transcript",
      "question":   "Original question",
      "analysis":   { ...full analysis object from /analyze... },
      "company":    "Google",
      "role":       "Software Engineer"
    }

    Response:
    {
      "followup":     "You mentioned you 'led the migration' — what did that ownership look like day-to-day?",
      "probe_target": "ownership depth",
      "quote_used":   "led the migration"
    }
    """
    try:
        data       = request.json or {}
        transcript = (data.get("transcript") or "").strip()
        question   = (data.get("question")   or "").strip()
        analysis   = data.get("analysis",    {})
        company    = (data.get("company")    or "the company").strip()
        role       = (data.get("role")       or "this role").strip()

        if not transcript:
            return jsonify({"error": "transcript is required"}), 400

        result = generate_voice_followup(
            transcript = transcript,
            question   = question,
            analysis   = analysis,
            company    = company,
            role       = role,
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500