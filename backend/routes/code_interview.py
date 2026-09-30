"""
LexiFeed Code Interview Routes

  POST /api/interview/code/run       → run candidate code against test cases,
                                        return REAL pass/fail results (no AI
                                        involved — this is an actual compiler/
                                        interpreter run via Piston)
  POST /api/interview/code/analyze   → run tests (as above) AND get AI
                                        commentary on code quality, layered
                                        strictly on top of the real results

This is what "Developer"-role coding questions call instead of /voice/analyze
— it genuinely executes the submitted code rather than asking an LLM to
guess whether it's correct.
"""

from flask import Blueprint, request, jsonify
from utils.jwt_handler import token_required
from services.code_execution_service import run_test_cases, analyze_code_submission

code_interview_bp = Blueprint("code_interview", __name__)


@code_interview_bp.route("/run", methods=["POST"])
@token_required
def run_code(payload):
    """
    Body (JSON):
      {
        "code": "def two_sum(nums, target):\\n    ...",
        "language": "python",
        "function_name": "two_sum",
        "test_cases": [
          {"input": [[2,7,11,15], 9], "expected_output": [0,1]},
          ...
        ]
      }

    Returns the REAL execution results — no AI judgement involved here at all.
    """
    try:
        data = request.json or {}
        code = data.get("code", "")
        language = data.get("language", "python")
        function_name = data.get("function_name", "")
        test_cases = data.get("test_cases", [])

        if not function_name:
            return jsonify({"error": "function_name is required"}), 400
        if not isinstance(test_cases, list) or not test_cases:
            return jsonify({"error": "test_cases must be a non-empty list"}), 400

        result = run_test_cases(
            language=language,
            source_code=code,
            function_name=function_name,
            test_cases=test_cases,
        )
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@code_interview_bp.route("/analyze", methods=["POST"])
@token_required
def analyze_code(payload):
    """
    Body (JSON):
      {
        "code": "...",
        "language": "python",
        "function_name": "two_sum",
        "test_cases": [...],
        "question": "Given an array of integers...",
        "company": "...",
        "role": "..."
      }

    Runs the real test cases first, then asks AI for code-quality commentary
    ONLY — correctness in the response always comes from the actual test run,
    never from the AI's opinion. Returns the same shape as /voice/analyze
    (VoiceAnalysis on the frontend) plus a `test_results`/`test_summary`
    field the UI renders as a genuine pass/fail table.
    """
    try:
        data = request.json or {}
        code = data.get("code", "")
        language = data.get("language", "python")
        function_name = data.get("function_name", "")
        test_cases = data.get("test_cases", [])
        question = data.get("question", "")
        company = data.get("company", "Generic Company")
        role = data.get("role", "Developer")

        if not function_name:
            return jsonify({"error": "function_name is required"}), 400
        if not isinstance(test_cases, list) or not test_cases:
            return jsonify({"error": "test_cases must be a non-empty list"}), 400

        test_execution = run_test_cases(
            language=language,
            source_code=code,
            function_name=function_name,
            test_cases=test_cases,
        )

        analysis = analyze_code_submission(
            code=code,
            language=language,
            question=question,
            function_name=function_name,
            company=company,
            role=role,
            test_execution=test_execution,
        )
        return jsonify(analysis), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500