import json
from datetime import datetime
from models.user import db


class SavedVocabulary(db.Model):
    """A word/idiom/phrase a user saved from Word of the Day.

    Tied to the user's account (not the browser), so it's the same across
    every device/browser they log in from.
    """
    __tablename__ = 'saved_vocabulary'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # Matches the frontend WordEntry.id (e.g. "w:happy" for live words, "bi1" for idioms)
    entry_id = db.Column(db.String(64), nullable=False)

    term = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(20), nullable=False)       # word | idiom | phrase
    level = db.Column(db.String(20), nullable=False)       # Beginner | Intermediate | Advanced
    part_of_speech = db.Column(db.String(50), nullable=True)
    pronunciation = db.Column(db.String(255), nullable=True)
    meaning = db.Column(db.Text, nullable=False)
    example = db.Column(db.Text, nullable=False)
    synonyms = db.Column(db.Text, nullable=True)           # JSON-encoded list of strings

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'entry_id', name='uq_user_vocab_entry'),
    )

    def to_dict(self):
        return {
            'id': self.entry_id,
            'term': self.term,
            'type': self.type,
            'level': self.level,
            'partOfSpeech': self.part_of_speech,
            'pronunciation': self.pronunciation,
            'meaning': self.meaning,
            'example': self.example,
            'synonyms': json.loads(self.synonyms) if self.synonyms else [],
        }