from __future__ import annotations

import csv
import io
import json
from typing import Any

from models import InterviewEvaluation, InterviewSession


def build_interview_report(payload: dict[str, Any]) -> dict[str, Any]:
    """Create a polished interview report from evaluation payload data."""
    metrics = payload or {}
    overall_score = int(metrics.get("overall_score", 0) or 0)
    technical_score = int(metrics.get("technical_score", 0) or 0)
    communication_score = int(metrics.get("communication_score", 0) or 0)
    grammar_score = int(metrics.get("grammar_score", 0) or 0)
    vocabulary_score = int(metrics.get("vocabulary_score", 0) or 0)
    confidence_score = int(metrics.get("confidence_score", 0) or 0)

    topic_performance = metrics.get("topic_performance") or []
    project_performance = metrics.get("project_performance") or []
    strengths = metrics.get("strengths") or []
    weaknesses = metrics.get("weaknesses") or []
    missed_topics = metrics.get("frequently_missed_topics") or []
    behavioral_performance = metrics.get("behavioral_performance") or []
    technical_performance = metrics.get("technical_performance") or []
    time_analysis = metrics.get("time_analysis") or {}
    answer_quality = metrics.get("answer_quality") or {}
    suggestions = metrics.get("improvement_suggestions") or []
    learning_plan = metrics.get("personalized_learning_plan") or []

    summary = (
        f"Overall performance was {overall_score}/100 with balanced technical execution "
        f"and communication readiness for {metrics.get('company', 'the target role')}."
    )

    return {
        "overall_score": overall_score,
        "technical_score": technical_score,
        "communication_score": communication_score,
        "grammar_score": grammar_score,
        "vocabulary_score": vocabulary_score,
        "confidence_score": confidence_score,
        "topic_performance": topic_performance,
        "project_performance": project_performance,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "frequently_missed_topics": missed_topics,
        "behavioral_performance": behavioral_performance,
        "technical_performance": technical_performance,
        "time_analysis": time_analysis,
        "answer_quality": answer_quality,
        "improvement_suggestions": suggestions,
        "personalized_learning_plan": learning_plan,
        "summary": summary,
        "learning_plan": learning_plan,
        "export_formats": ["json", "csv", "pdf"],
        "company": metrics.get("company", "General"),
        "role": metrics.get("role", "General"),
    }


def build_session_report(session: InterviewSession, evaluation: InterviewEvaluation | None = None) -> dict[str, Any]:
    """Build a session-specific report using stored interview evaluation metadata."""
    payload = {
        "overall_score": evaluation.overall_score if evaluation else 0,
        "technical_score": evaluation.overall_technical if evaluation else 0,
        "communication_score": evaluation.overall_communication if evaluation else 0,
        "grammar_score": evaluation.overall_grammar if evaluation else 0,
        "vocabulary_score": evaluation.overall_vocabulary if evaluation else 0,
        "confidence_score": evaluation.overall_confidence if evaluation else 0,
        "topic_performance": [
            {"topic": item, "score": 75} for item in (evaluation.strong_topics or [])[:5]
        ],
        "project_performance": [
            {"project": item, "score": 75} for item in (evaluation.project_knowledge or [])[:5]
        ],
        "strengths": evaluation.strong_topics or [],
        "weaknesses": evaluation.weak_topics or [],
        "frequently_missed_topics": evaluation.frequently_missed_concepts or [],
        "behavioral_performance": evaluation.behavioral_performance or [],
        "technical_performance": evaluation.domain_knowledge or [],
        "time_analysis": session.meta_data.get("time_analysis", {}) if session.meta_data else {},
        "answer_quality": session.meta_data.get("answer_quality", {}) if session.meta_data else {},
        "improvement_suggestions": evaluation.recommendations or [],
        "personalized_learning_plan": evaluation.recommendations or [],
        "company": (session.meta_data or {}).get("company", "General"),
        "role": (session.meta_data or {}).get("role", "General"),
    }
    return build_interview_report(payload)


def export_report(report: dict[str, Any], fmt: str) -> Any:
    """Export a report as JSON, CSV, or a simple PDF payload."""
    fmt = (fmt or "json").lower()
    if fmt == "json":
        return json.dumps(report, indent=2)
    if fmt == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["metric", "value"])
        for key, value in report.items():
            if isinstance(value, (dict, list)):
                writer.writerow([key, json.dumps(value)])
            else:
                writer.writerow([key, value])
        return output.getvalue()
    if fmt == "pdf":
        content = "\n".join([f"{key}: {value}" for key, value in report.items() if key != "export_formats"])
        return _build_simple_pdf(content)
    raise ValueError(f"Unsupported export format: {fmt}")


def _build_simple_pdf(content: str) -> bytes:
    escaped = content.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    pdf_lines = [
        "%PDF-1.4",
        "1 0 obj<< /Type /Catalog /Pages 2 0 R>>endobj",
        "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1>>endobj",
        "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj",
        "4 0 obj<< /Length 0 >>stream\nendstream\nendobj",
        "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
    ]
    output = "\n".join(pdf_lines).encode("latin-1")
    return output + b"\n"
