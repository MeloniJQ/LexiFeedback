"""
Shared CEFR (Common European Framework of Reference) helpers.

Every feature that needs to scale content difficulty to a user's English
level imports from here, so the level→difficulty mapping only lives in one
place. Keeping this tiny and dependency-free means it can be imported from
models/, services/, and routes/ without any circular-import risk.
"""

# Canonical ordered list — index doubles as a numeric "strength" score.
CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

CEFR_LABELS = {
    "A1": "Beginner",
    "A2": "Elementary",
    "B1": "Intermediate",
    "B2": "Upper Intermediate",
    "C1": "Advanced",
    "C2": "Proficient",
}

# The rest of the app (reading passages, interview question generation,
# fallback pools, etc.) already speaks in three tiers: beginner /
# intermediate / advanced. Map every CEFR level onto the nearest existing
# tier so new code can reuse those pools/prompts without a rewrite.
CEFR_TO_DIFFICULTY = {
    "A1": "beginner",
    "A2": "beginner",
    "B1": "intermediate",
    "B2": "intermediate",
    "C1": "advanced",
    "C2": "advanced",
}

# CEFR-appropriate topic pools for reading passages (Feature 3). Chosen to
# match the level descriptions in the feature spec.
CEFR_READING_TOPICS = {
    "A1": ["daily routines", "family life", "school", "shopping", "simple food and cooking", "pets and animals"],
    "A2": ["hobbies", "weather and seasons", "local neighborhoods", "simple travel", "friendship", "weekend plans"],
    "B1": ["travel", "technology in daily life", "education", "the environment", "sports", "healthy habits"],
    "B2": ["business", "innovation", "leadership", "science", "media and culture", "career development"],
    "C1": ["artificial intelligence", "economics", "scientific research", "healthcare systems", "urban planning", "psychology"],
    "C2": ["professional/industry analysis", "academic research", "business strategy reports", "public policy debates", "philosophy", "global affairs"],
}

READING_LENGTHS = {
    "short":  (60, 110),
    "medium": (150, 220),
    "long":   (260, 350),
}


def normalize_level(level: str) -> str:
    """Uppercase + validate a CEFR level string, defaulting to B1 (a safe
    'average adult learner' middle ground) if missing/invalid."""
    if not level:
        return "B1"
    level = level.strip().upper()
    return level if level in CEFR_LEVELS else "B1"


def difficulty_for_level(level: str) -> str:
    return CEFR_TO_DIFFICULTY.get(normalize_level(level), "intermediate")


def level_index(level: str) -> int:
    return CEFR_LEVELS.index(normalize_level(level))


def score_to_level(score_0_100: float) -> str:
    """
    Map a weighted 0-100 overall assessment score onto a CEFR band.
    Bands are intentionally generous at the edges — this is a placement
    test, not a certification exam, so users land in a level they can
    immediately start practicing at rather than being pushed to the
    boundary.
    """
    if score_0_100 is None:
        return "B1"
    s = max(0.0, min(100.0, score_0_100))
    if s < 20:
        return "A1"
    if s < 37:
        return "A2"
    if s < 54:
        return "B1"
    if s < 71:
        return "B2"
    if s < 88:
        return "C1"
    return "C2"
