"""
LexiFeed Goals Routes

GET    /api/goals              → list current user's goals
POST   /api/goals               → create a goal
GET    /api/goals/<id>          → get a single goal
PUT    /api/goals/<id>          → edit a goal (title/description/target/deadline)
DELETE /api/goals/<id>          → delete a goal
POST   /api/goals/<id>/progress → update progress (increment or set)
GET    /api/goals/stats         → dashboard summary stats
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date
from models import db, Goal
from models.goal import VALID_GOAL_TYPES
from utils.jwt_handler import token_required

goals_bp = Blueprint("goals", __name__)

MAX_TITLE_LEN = 100
MAX_DESC_LEN = 500


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_date(value):
    """Parse an ISO (YYYY-MM-DD) date string. Returns a date or raises ValueError."""
    if isinstance(value, date):
        return value
    return datetime.strptime(value, "%Y-%m-%d").date()


def _validate_goal_payload(data, partial=False):
    """Validate incoming goal fields. Returns dict of {field: message} errors."""
    errors = {}

    title = (data.get("title") or "").strip() if "title" in data or not partial else None
    if not partial or "title" in data:
        if not data.get("title") or not str(data.get("title")).strip():
            errors["title"] = "Title is required"
        elif len(str(data.get("title")).strip()) > MAX_TITLE_LEN:
            errors["title"] = f"Title cannot exceed {MAX_TITLE_LEN} characters"

    if "description" in data and data.get("description"):
        if len(str(data.get("description"))) > MAX_DESC_LEN:
            errors["description"] = f"Description cannot exceed {MAX_DESC_LEN} characters"

    if not partial or "goalType" in data:
        if data.get("goalType") not in VALID_GOAL_TYPES:
            errors["goalType"] = "Invalid goal type"

    if not partial or "targetValue" in data:
        try:
            target = int(data.get("targetValue"))
            if target <= 0:
                errors["targetValue"] = "Target must be greater than 0"
        except (TypeError, ValueError):
            errors["targetValue"] = "Target must be a valid number"

    if not partial or "deadline" in data:
        deadline_raw = data.get("deadline")
        if not deadline_raw:
            errors["deadline"] = "Deadline is required"
        else:
            try:
                deadline = _parse_date(deadline_raw)
                if deadline < date.today():
                    errors["deadline"] = "Deadline cannot be in the past"
            except ValueError:
                errors["deadline"] = "Deadline must be a valid date (YYYY-MM-DD)"

    return errors


# ─────────────────────────────────────────────────────────────────────────────
# List / Create
# ─────────────────────────────────────────────────────────────────────────────

@goals_bp.route("", methods=["GET"])
@token_required
def list_goals(payload):
    try:
        goals = (
            Goal.query.filter_by(user_id=payload["user_id"])
            .order_by(Goal.created_at.desc())
            .all()
        )
        changed = False
        for g in goals:
            before = (g.status, g.completed)
            g.refresh_status()
            if (g.status, g.completed) != before:
                changed = True
        if changed:
            db.session.commit()

        return jsonify([g.to_dict() for g in goals]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@goals_bp.route("", methods=["POST"])
@token_required
def create_goal(payload):
    try:
        data = request.json or {}
        errors = _validate_goal_payload(data)
        if errors:
            return jsonify({"errors": errors}), 400

        goal = Goal(
            user_id=payload["user_id"],
            title=str(data["title"]).strip(),
            description=str(data.get("description") or "").strip(),
            goal_type=data["goalType"],
            target_value=int(data["targetValue"]),
            current_progress=int(data.get("currentProgress") or 0),
            deadline=_parse_date(data["deadline"]),
        )
        goal.refresh_status()

        db.session.add(goal)
        db.session.commit()

        return jsonify({"message": "Goal created successfully", "goal": goal.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard stats  (declared before /<id> to avoid route conflicts)
# ─────────────────────────────────────────────────────────────────────────────

@goals_bp.route("/stats", methods=["GET"])
@token_required
def goal_stats(payload):
    try:
        goals = Goal.query.filter_by(user_id=payload["user_id"]).all()
        for g in goals:
            g.refresh_status()

        total = len(goals)
        completed = sum(1 for g in goals if g.status == "completed")
        active = sum(1 for g in goals if g.status == "active")
        current_streak = max((g.streak_count for g in goals), default=0)
        longest_streak = max((g.longest_streak for g in goals), default=0)
        avg_progress = (
            round(sum(min((g.current_progress / g.target_value) * 100, 100) for g in goals if g.target_value) / total, 1)
            if total else 0
        )

        return jsonify({
            "totalGoals": total,
            "completedGoals": completed,
            "currentStreak": current_streak,
            "longestStreak": longest_streak,
            "averageProgress": avg_progress,
            "activeGoals": active,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Get / Update / Delete single goal
# ─────────────────────────────────────────────────────────────────────────────

def _get_owned_goal(goal_id, user_id):
    return Goal.query.filter_by(id=goal_id, user_id=user_id).first()


@goals_bp.route("/<int:goal_id>", methods=["GET"])
@token_required
def get_goal(payload, goal_id):
    goal = _get_owned_goal(goal_id, payload["user_id"])
    if not goal:
        return jsonify({"error": "Goal not found"}), 404
    return jsonify(goal.to_dict()), 200


@goals_bp.route("/<int:goal_id>", methods=["PUT", "PATCH"])
@token_required
def update_goal(payload, goal_id):
    try:
        goal = _get_owned_goal(goal_id, payload["user_id"])
        if not goal:
            return jsonify({"error": "Goal not found"}), 404

        data = request.json or {}
        errors = _validate_goal_payload(data, partial=True)
        if errors:
            return jsonify({"errors": errors}), 400

        # Editable fields only — progress is untouched here (per spec).
        if "title" in data:
            goal.title = str(data["title"]).strip()
        if "description" in data:
            goal.description = str(data.get("description") or "").strip()
        if "goalType" in data:
            goal.goal_type = data["goalType"]
        if "targetValue" in data:
            goal.target_value = int(data["targetValue"])
        if "deadline" in data:
            goal.deadline = _parse_date(data["deadline"])
        if "status" in data and data["status"] in ("active", "paused"):
            goal.status = data["status"]

        goal.refresh_status()
        db.session.commit()

        return jsonify({"message": "Goal updated successfully", "goal": goal.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@goals_bp.route("/<int:goal_id>", methods=["DELETE"])
@token_required
def delete_goal(payload, goal_id):
    try:
        goal = _get_owned_goal(goal_id, payload["user_id"])
        if not goal:
            return jsonify({"error": "Goal not found"}), 404

        db.session.delete(goal)
        db.session.commit()

        return jsonify({"message": "Goal deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Progress updates
# ─────────────────────────────────────────────────────────────────────────────

@goals_bp.route("/<int:goal_id>/progress", methods=["POST"])
@token_required
def update_progress(payload, goal_id):
    """
    Body:
    { "mode": "increment", "amount": 1 }   → add `amount` (default 1) to progress
    { "mode": "set", "value": 12 }         → set progress to an exact value
    """
    try:
        goal = _get_owned_goal(goal_id, payload["user_id"])
        if not goal:
            return jsonify({"error": "Goal not found"}), 404

        data = request.json or {}
        mode = data.get("mode", "increment")

        was_completed = goal.current_progress >= goal.target_value

        if mode == "set":
            try:
                value = int(data.get("value"))
            except (TypeError, ValueError):
                return jsonify({"error": "value must be a number"}), 400
            if value < 0:
                return jsonify({"error": "value cannot be negative"}), 400
            goal.current_progress = value
        else:
            try:
                amount = int(data.get("amount", 1))
            except (TypeError, ValueError):
                return jsonify({"error": "amount must be a number"}), 400
            goal.current_progress = max(0, goal.current_progress + amount)

        goal.current_progress = min(goal.current_progress, goal.target_value) if goal.current_progress > goal.target_value else goal.current_progress

        prev_streak = goal.streak_count
        goal.register_activity()
        streak_increased = goal.streak_count > prev_streak

        goal.refresh_status()
        just_completed = goal.completed and not was_completed

        db.session.commit()

        return jsonify({
            "message": "Progress updated successfully",
            "goal": goal.to_dict(),
            "justCompleted": just_completed,
            "streakIncreased": streak_increased,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500