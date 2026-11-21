"""
LexiFeed Code Execution Service

This is the piece that was completely missing before: an actual compiler/
interpreter that RUNS the candidate's code against real test cases and
reports genuine pass/fail results — not an AI guessing whether code "looks"
correct.

Uses the free, keyless Piston API (https://github.com/engineer-man/piston,
public instance at emkc.org) to actually execute code in a sandboxed
container. No API key or local Docker setup required.

Supported languages here: Python and JavaScript (Node). Piston supports many
more languages — add them to LANGUAGE_VERSIONS below if needed later.

Flow for a single test case:
  1. Wrap the candidate's source code with a tiny harness that calls their
     function with the test case's input arguments and prints the result as
     JSON to stdout.
  2. Send the combined source to Piston, get back real stdout/stderr from an
     actual interpreter run.
  3. Parse the JSON printed to stdout and compare it (as data, not as raw
     text) against the expected output — so formatting differences like
     spacing or list order-of-keys don't cause false failures.
"""

import json
import logging
import requests

logger = logging.getLogger("lexifeed.code_execution_service")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(name)s %(levelname)s: %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

PISTON_URL = "https://emkc.org/api/v2/piston/execute"
REQUEST_TIMEOUT_SECONDS = 15

# Piston needs an exact runtime version. "*" is NOT accepted by all Piston
# instances, so these are pinned to versions known to exist on the public
# emkc.org instance as of writing. If Piston later drops these, calls will
# fail cleanly with an error string surfaced to the user rather than crash.
LANGUAGE_VERSIONS = {
    "python": {"language": "python", "version": "3.10.0"},
    "javascript": {"language": "javascript", "version": "18.15.0"},
}


def _build_harness(language: str, source_code: str, function_name: str, args: list) -> str:
    """
    Wraps the candidate's raw code with a few lines that call their function
    with this test case's arguments and print the result as JSON — this is
    what lets us compare the ACTUAL output of running their code (not an AI
    opinion) against the expected value.
    """
    args_json = json.dumps(args)

    if language == "python":
        return f"""{source_code}

import json as __json
__args = __json.loads('''{args_json}''')
__result = {function_name}(*__args)
print(__json.dumps(__result))
"""

    if language == "javascript":
        return f"""{source_code}

const __args = JSON.parse(`{args_json}`);
const __result = {function_name}(...__args);
console.log(JSON.stringify(__result));
"""

    raise ValueError(f"Unsupported language: {language}")


def run_test_cases(
    language: str,
    source_code: str,
    function_name: str,
    test_cases: list[dict],
) -> dict:
    """
    Actually executes the candidate's code once per test case via Piston.

    test_cases: [{"input": [<arg1>, <arg2>, ...], "expected_output": <any JSON-serialisable value>}, ...]

    Returns:
      {
        "results": [
          {"input": [...], "expected": ..., "actual": ..., "passed": bool, "error": str|None},
          ...
        ],
        "passed_count": int,
        "total_count": int,
        "all_passed": bool,
        "execution_error": str|None,   # set if the whole run couldn't happen (Piston unreachable, etc.)
      }
    """
    language = (language or "python").lower()
    if language not in LANGUAGE_VERSIONS:
        return {
            "results": [],
            "passed_count": 0,
            "total_count": len(test_cases),
            "all_passed": False,
            "execution_error": f"Unsupported language '{language}'. Supported: {list(LANGUAGE_VERSIONS)}",
        }

    if not source_code.strip():
        return {
            "results": [],
            "passed_count": 0,
            "total_count": len(test_cases),
            "all_passed": False,
            "execution_error": "No code was submitted.",
        }

    runtime = LANGUAGE_VERSIONS[language]
    results = []

    for case in test_cases:
        test_input = case.get("input", [])
        expected = case.get("expected_output")

        try:
            harness_source = _build_harness(language, source_code, function_name, test_input)
        except Exception as e:
            results.append({
                "input": test_input, "expected": expected, "actual": None,
                "passed": False, "error": f"Could not build test harness: {e}",
            })
            continue

        try:
            resp = requests.post(
                PISTON_URL,
                json={
                    "language": runtime["language"],
                    "version": runtime["version"],
                    "files": [{"content": harness_source}],
                    "stdin": "",
                    "compile_timeout": 10000,
                    "run_timeout": 5000,
                },
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"[run_test_cases] Piston request failed: {e}")
            return {
                "results": results,
                "passed_count": sum(1 for r in results if r["passed"]),
                "total_count": len(test_cases),
                "all_passed": False,
                "execution_error": f"Could not reach the code execution service: {e}",
            }

        run_info = data.get("run", {}) or {}
        compile_info = data.get("compile", {}) or {}
        stderr = (run_info.get("stderr") or compile_info.get("stderr") or "").strip()
        stdout = (run_info.get("stdout") or "").strip()

        if stderr:
            results.append({
                "input": test_input, "expected": expected, "actual": None,
                "passed": False, "error": stderr[-500:],  # keep it short — full tracebacks can be huge
            })
            continue

        try:
            # Compare as parsed JSON values, not raw strings, so e.g. `5` vs
            # `5.0` or differing whitespace doesn't cause a false failure.
            actual = json.loads(stdout) if stdout else None
        except (ValueError, TypeError):
            actual = stdout  # not JSON — compare as raw string as a fallback

        passed = actual == expected
        results.append({
            "input": test_input, "expected": expected, "actual": actual,
            "passed": passed, "error": None,
        })

    passed_count = sum(1 for r in results if r["passed"])
    return {
        "results": results,
        "passed_count": passed_count,
        "total_count": len(test_cases),
        "all_passed": passed_count == len(test_cases) and len(test_cases) > 0,
        "execution_error": None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Qualitative analysis layered ON TOP of the real execution results
# ─────────────────────────────────────────────────────────────────────────────
#
# IMPORTANT DESIGN CHOICE: the "content"/correctness score below is computed
# DIRECTLY from the real pass/fail test results above (passed_count/total),
# never guessed by the AI. The AI is only asked for qualitative commentary
# (readability, style, complexity, what to improve) — it cannot override
# whether the code actually worked. This is what fixes the earlier problem
# where an answer could be called "correct" with a high score despite being
# wrong: correctness here is now a fact from a real interpreter run, not an
# opinion.

def analyze_code_submission(
    code: str,
    language: str,
    question: str,
    function_name: str,
    company: str,
    role: str,
    test_execution: dict,
) -> dict:
    from llm.provider_factory import get_provider  # local import avoids a circular import at module load

    total = test_execution.get("total_count", 0)
    passed = test_execution.get("passed_count", 0)
    correctness_score = round(10 * passed / total) if total > 0 else 0

    system = (
        "You are a senior software engineering interviewer reviewing a candidate's code "
        "submission. You are given the REAL pass/fail test results already — do not "
        "re-judge correctness yourself, only comment on code quality. "
        "Return valid JSON only, no markdown fences."
    )
    user = f"""
CONTEXT: Coding interview question for a {role} role at {company}.

QUESTION: "{question}"

CANDIDATE'S CODE ({language}):
\"\"\"{code}\"\"\"

REAL TEST EXECUTION RESULTS (already run through an actual {language} interpreter — this is ground truth, not your judgement):
{json.dumps(test_execution.get('results', []), indent=2)}
Tests passed: {passed}/{total}

Comment ONLY on code quality aspects (NOT correctness — that's already determined above):
readability, naming, structure, time/space complexity, edge-case handling, and idiomatic style
for this language.

Return ONLY this JSON:
{{
  "delivery_score": <1-10, code structure/organisation/complexity reasoning>,
  "vocabulary_score": <1-10, naming quality and idiomatic style>,
  "relevance": "one sentence on whether the approach fits what was asked",
  "specificity": "one sentence on complexity/edge-case handling",
  "key_strengths": ["strength 1", "strength 2"],
  "key_gaps": ["gap 1", "gap 2"],
  "top_tip": "the single most useful thing to improve about this code, 1-2 sentences"
}}
"""

    try:
        provider = get_provider()
        raw = provider.chat(system=system, user=user, temperature=0.4)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.strip("`").replace("json\n", "", 1)
        data = json.loads(raw)
        is_fallback = False
        delivery_score = int(data.get("delivery_score", 5))
        vocabulary_score = int(data.get("vocabulary_score", 5))
        relevance = data.get("relevance", "")
        specificity = data.get("specificity", "")
        key_strengths = data.get("key_strengths", [])
        key_gaps = data.get("key_gaps", [])
        top_tip = data.get("top_tip", "")
    except Exception as e:
        logger.error(f"[analyze_code_submission] AI commentary failed: {e}. Using result-only fallback.")
        is_fallback = True
        # Even without AI commentary, correctness (the part that matters
        # most) is still 100% real, since it comes from actual test runs.
        delivery_score = 5
        vocabulary_score = 5
        relevance = "Could not be assessed — AI reviewer was unavailable, but test results above are real."
        specificity = ""
        key_strengths = []
        key_gaps = ["Code quality commentary unavailable — AI reviewer was unavailable for this submission."]
        if total > 0 and passed < total:
            key_gaps.insert(0, f"Failed {total - passed} of {total} test case(s) — see Test Results for details.")
        top_tip = (
            "Our AI reviewer couldn't be reached, so only the automated test results below are "
            "available for this submission — code style feedback isn't included this time."
        )

    overall_score = round((correctness_score + delivery_score + vocabulary_score) / 3)

    return {
        "scores": {
            "content": correctness_score,
            "delivery": delivery_score,
            "vocabulary": vocabulary_score,
            "overall": overall_score,
        },
        "content_analysis": {
            "star_used": False,
            "relevance": relevance,
            "specificity": specificity,
            "key_strengths": key_strengths,
            "key_gaps": key_gaps,
        },
        "delivery_analysis": {
            "pace_comment": "",
            "filler_comment": "",
            "structure_comment": f"{passed}/{total} test cases passed." if total else "No test cases were defined for this question.",
            "confidence_signals": [],
        },
        "vocabulary_analysis": {
            "strong_phrases": [],
            "weak_phrases": [],
            "suggestion": "",
        },
        "top_tip": top_tip,
        "metrics": {
            "word_count": len(code.split()),
            "duration_seconds": 0,
            "words_per_minute": 0,
            "pace_verdict": "n/a",
            "filler_count": 0,
            "filler_words_found": [],
            "sentence_count": 0,
            "avg_sentence_length": 0,
        },
        "test_results": test_execution.get("results", []),
        "test_summary": {
            "passed": passed,
            "total": total,
            "execution_error": test_execution.get("execution_error"),
        },
        "is_fallback": is_fallback,
    }