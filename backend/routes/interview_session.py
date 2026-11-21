from flask import Blueprint, jsonify, request
from models import InterviewSession, InterviewQuestionHistory, ConversationMemory, CandidateProfile
from orchestrator.interview_orchestrator import InterviewOrchestrator
from utils.jwt_handler import token_required

interview_session_bp = Blueprint('interview_session', __name__)


@interview_session_bp.route('/start', methods=['POST'])
@token_required
def start_session(payload):
    try:
        orchestrator = InterviewOrchestrator(payload['user_id'])
        session = orchestrator.create_session()
        return jsonify({'message': 'Interview session created', 'session': session.to_dict()}), 201
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@interview_session_bp.route('/<int:session_id>', methods=['GET'])
@token_required
def get_session(payload, session_id):
    orchestrator = InterviewOrchestrator(payload['user_id'])
    session = orchestrator.load_session(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    history = [item.to_dict() for item in InterviewQuestionHistory.query.filter_by(interview_session_id=session.id).order_by(InterviewQuestionHistory.created_at.asc()).all()]
    memory = [item.to_dict() for item in ConversationMemory.query.filter_by(interview_session_id=session.id).all()]
    return jsonify({'session': session.to_dict(), 'history': history, 'memory': memory}), 200


@interview_session_bp.route('/<int:session_id>/next', methods=['POST'])
@token_required
def next_question(payload, session_id):
    try:
        orchestrator = InterviewOrchestrator(payload['user_id'])
        session = orchestrator.load_session(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        if session.status != 'active':
            return jsonify({'error': f'Session is {session.status}'}), 400
        question = orchestrator.get_next_question()
        return jsonify({'question': question}), 200
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@interview_session_bp.route('/<int:session_id>/answer', methods=['POST'])
@token_required
def submit_answer(payload, session_id):
    try:
        data = request.json or {}
        question_id = data.get('question_id')
        answer_text = data.get('answer_text', '').strip()
        if not question_id or not answer_text:
            return jsonify({'error': 'question_id and answer_text are required'}), 400

        orchestrator = InterviewOrchestrator(payload['user_id'])
        session = orchestrator.load_session(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        result = orchestrator.submit_answer(question_id, answer_text)
        return jsonify({'followup': result}), 200
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@interview_session_bp.route('/<int:session_id>/pause', methods=['POST'])
@token_required
def pause_session(payload, session_id):
    orchestrator = InterviewOrchestrator(payload['user_id'])
    session = orchestrator.load_session(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    paused = orchestrator.pause()
    return jsonify({'session': paused.to_dict()}), 200


@interview_session_bp.route('/<int:session_id>/resume', methods=['POST'])
@token_required
def resume_session(payload, session_id):
    orchestrator = InterviewOrchestrator(payload['user_id'])
    session = orchestrator.load_session(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    resumed = orchestrator.resume()
    return jsonify({'session': resumed.to_dict()}), 200


@interview_session_bp.route('/<int:session_id>/end', methods=['POST'])
@token_required
def end_session(payload, session_id):
    orchestrator = InterviewOrchestrator(payload['user_id'])
    session = orchestrator.load_session(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    ended = orchestrator.end()
    return jsonify({'session': ended.to_dict()}), 200
