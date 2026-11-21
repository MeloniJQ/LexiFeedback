import json

from flask import Blueprint, request, jsonify

from models import db
from models.vocabulary import SavedVocabulary
from utils.jwt_handler import token_required

vocabulary_bp = Blueprint('vocabulary', __name__)


@vocabulary_bp.route('', methods=['GET'])
@token_required
def list_vocabulary(payload):
    """Return everything this user has saved, newest first."""
    user_id = payload['user_id']
    items = (
        SavedVocabulary.query
        .filter_by(user_id=user_id)
        .order_by(SavedVocabulary.created_at.desc())
        .all()
    )
    return jsonify({'entries': [item.to_dict() for item in items]})


@vocabulary_bp.route('', methods=['POST'])
@token_required
def save_vocabulary(payload):
    """Save a word/idiom/phrase for this user. Idempotent — saving the same
    entry twice just returns the existing row instead of erroring."""
    user_id = payload['user_id']
    data = request.get_json(silent=True) or {}

    entry_id = data.get('id')
    term = data.get('term')
    if not entry_id or not term:
        return jsonify({'error': 'Missing required fields (id, term)'}), 400

    existing = SavedVocabulary.query.filter_by(user_id=user_id, entry_id=entry_id).first()
    if existing:
        return jsonify({'entry': existing.to_dict()}), 200

    item = SavedVocabulary(
        user_id=user_id,
        entry_id=entry_id,
        term=term,
        type=data.get('type', 'word'),
        level=data.get('level', 'Intermediate'),
        part_of_speech=data.get('partOfSpeech'),
        pronunciation=data.get('pronunciation'),
        meaning=data.get('meaning', ''),
        example=data.get('example', ''),
        synonyms=json.dumps(data.get('synonyms') or []),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'entry': item.to_dict()}), 201


@vocabulary_bp.route('/<path:entry_id>', methods=['DELETE'])
@token_required
def delete_vocabulary(payload, entry_id):
    """Remove a saved entry for this user."""
    user_id = payload['user_id']
    item = SavedVocabulary.query.filter_by(user_id=user_id, entry_id=entry_id).first()
    if item:
        db.session.delete(item)
        db.session.commit()
    return jsonify({'deleted': True})