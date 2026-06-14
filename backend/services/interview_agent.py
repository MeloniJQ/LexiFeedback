import hashlib
import json
import random
import re
from datetime import datetime, timezone


QUESTION_TYPES = [
    "behavioral",
    "technical",
    "situational",
    "culture-fit",
    "resume-specific",
]


ROLE_SKILL_MAP = {
    "software": ["system design", "debugging", "code quality", "testing", "scalability"],
    "frontend": ["accessibility", "state management", "performance", "component design", "design systems"],
    "backend": ["APIs", "databases", "reliability", "security", "distributed systems"],
    "data": ["SQL", "experimentation", "data quality", "model evaluation", "business impact"],
    "product": ["prioritization", "user research", "roadmaps", "metrics", "stakeholder alignment"],
    "design": ["user flows", "trade-offs", "visual systems", "research synthesis", "accessibility"],
    "marketing": ["positioning", "campaign metrics", "segmentation", "experimentation", "brand voice"],
    "sales": ["discovery", "objection handling", "pipeline discipline", "negotiation", "forecasting"],
    "support": ["customer empathy", "triage", "root cause analysis", "documentation", "escalation"],
    "manager": ["coaching", "hiring", "prioritization", "conflict resolution", "execution rhythm"],
}


COMPANY_SIGNALS = {
    "google": ["scale", "ambiguity", "user impact", "collaboration", "technical depth"],
    "microsoft": ["customer obsession", "cloud", "cross-team work", "growth mindset", "enterprise impact"],
    "amazon": ["ownership", "customer obsession", "operational excellence", "bias for action", "frugality"],
    "meta": ["product impact", "experimentation", "speed", "social systems", "large-scale trade-offs"],
    "apple": ["craft", "privacy", "end-to-end ownership", "quality bar", "user experience"],
    "netflix": ["judgment", "high ownership", "context over control", "technical excellence", "candor"],
    "tesla": ["first principles", "speed", "manufacturing constraints", "iteration", "high accountability"],
}


STOPWORDS = {
    "with", "from", "that", "this", "were", "have", "your", "will", "and", "the", "for",
    "using", "into", "about", "their", "there", "over", "under", "through", "between",
}


# -----------------------------
# MAIN CONTEXT BUILDER
# -----------------------------
def build_interview_context(
    company: str,
    role: str,
    resume_text: str = "",
    job_description: str = "",
    key_skills: str = "",
    asked_questions: list[str] | None = None,
) -> dict:

    clean_company = _clean_label(company, "the company")
    clean_role = _clean_label(role, "this role")

    resume_signals = extract_resume_signals(resume_text)
    jd_signals = _extract_keywords(job_description, limit=10)
    skill_signals = _split_skills(key_skills)
    role_signals = _role_signals(clean_role)
    company_signals = _company_signals(clean_company, job_description)

    seed = _session_seed(clean_company, clean_role, resume_text, job_description, key_skills)

    focus_areas = _unique(
        skill_signals
        + jd_signals
        + resume_signals["technologies"][:6]
        + role_signals[:5]
        + company_signals[:4]
    )[:12]

    candidate_evidence = _unique(
        resume_signals["achievements"][:4]
        + resume_signals["projects"][:4]
        + resume_signals["roles"][:3]
    )

    return {
        "company": clean_company,
        "role": clean_role,
        "resume_signals": resume_signals,
        "job_description_signals": jd_signals,
        "key_skills": skill_signals,
        "role_signals": role_signals,
        "company_signals": company_signals,
        "focus_areas": focus_areas,
        "candidate_evidence": candidate_evidence,
        "asked_questions": asked_questions or [],
        "session_seed": seed,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# -----------------------------
# QUESTION GENERATION PROMPT
# -----------------------------
def build_question_generation_prompt(context: dict, num_questions: int = 5) -> tuple[str, str]:

    resume = context["resume_signals"]
    num_questions = max(1, min(num_questions, 20))

    system = (
        "You are an agentic interview designer. "
        "Design structured interview questions with increasing difficulty."
    )

    user = f"""
Create a mock interview:

Company: {context['company']}
Role: {context['role']}
Questions: {num_questions}

Focus:
{json.dumps(context["focus_areas"], indent=2)}

Resume:
{json.dumps(resume, indent=2)}

Rules:
1. First question must be intro.
2. Increase difficulty gradually.
3. Return JSON only.
"""
    return system, user


# -----------------------------
# VALIDATION
# -----------------------------
def validate_questions(raw_questions, context: dict, num_questions: int = 5) -> list[dict]:

    if not isinstance(raw_questions, list):
        raise ValueError("Question payload must be a list")

    normalized = []
    seen = set()
    used_types = set()

    num_questions = max(1, min(num_questions, 20))

    for i, item in enumerate(raw_questions):
        if not isinstance(item, dict):
            continue

        question = _normalize_space(str(item.get("question", "")))
        hint = _normalize_space(str(item.get("hint", "")))
        qtype = str(item.get("type", "")).strip().lower()

        is_intro = (i == 0 or item.get("id") == 1)

        if not question:
            continue

        if qtype not in QUESTION_TYPES:
            qtype = "behavioral"

        key = _question_key(question)
        if key in seen:
            continue

        seen.add(key)
        used_types.add(qtype)

        normalized.append({
            "id": len(normalized) + 1,
            "type": qtype,
            "question": question,
            "hint": hint or _default_hint(qtype, context),
        })

        if len(normalized) >= num_questions:
            break

    # fallback fill
    if len(normalized) < num_questions:
        fill = generate_fallback_questions(context, num_questions)
        for item in fill:
            if len(normalized) >= num_questions:
                break
            key = _question_key(item["question"])
            if key not in seen:
                item = {**item, "id": len(normalized) + 1}
                normalized.append(item)
                seen.add(key)

    return normalized[:num_questions]


# -----------------------------
# FALLBACK QUESTIONS
# -----------------------------
def generate_fallback_questions(context: dict, count: int = 5) -> list[dict]:

    rng = random.Random(context["session_seed"])
    role = context["role"]
    company = context["company"]
    resume = context["resume_signals"]
    
    count = max(1, min(count, 20))
    questions = []

    # Pool of fallback questions to avoid repetition
    fallback_pools = {
        "behavioral": [
            f"Tell me about a time you handled a difficult situation in a role like {role}.",
            f"Describe a significant project you're proud of from your experience.",
            "Tell me about a time you had to learn a new tool or technology quickly."
        ],
        "technical": [
            f"Explain a technical challenge you encountered while working as a {role}.",
            "How do you ensure code quality and maintainability in your projects?",
            "Can you walk me through your process for debugging a complex issue?"
        ],
        "situational": [
            "How would you handle a situation where a project deadline is at risk?",
            "What would you do if you disagreed with a technical decision made by your team?",
            "How do you prioritize tasks when you have multiple urgent requests?"
        ],
        "culture-fit": [
            f"What values are you looking for in your next team at {company}?",
            "How do you give and receive constructive feedback?",
            "What motivates you to do your best work?"
        ]
    }

    for i in range(count):
        if i == 0:
            q = f"To start, could you tell me a bit about yourself and your interest in the {role} role at {company}?"
            qtype = "behavioral"
        else:
            qtype = QUESTION_TYPES[i % len(QUESTION_TYPES)]
            pool = fallback_pools.get(qtype, fallback_pools["behavioral"])
            q = rng.choice(pool)

        questions.append({
            "id": i + 1,
            "type": qtype,
            "question": q,
            "hint": _default_hint(qtype, context),
        })

    return questions


# -----------------------------
# FOLLOWUP PROMPT
# -----------------------------
def build_followup_prompt(
    original_question: str, 
    candidate_answer: str, 
    previous_pairs=None, 
    resume_context="", 
    company: str = "", 
    role: str = ""
):
    system = (
        "You are an expert interviewer. Your task is to generate a single, sharp follow-up "
        "question based on the candidate's answer. Your response must be in valid JSON format."
    )
    user = f"""
INTERVIEW CONTEXT:
- Role: {role}
- Company: {company}

ORIGINAL QUESTION: "{original_question}"
CANDIDATE ANSWER: \"\"\"{candidate_answer}\"\"\"

Task:
Generate ONE sharp, incisive follow-up question that probes for more detail.
Return valid JSON only:
{{
  "followup": "the follow-up question text",
  "probe_target": "what this tests (e.g., 'specificity', 'ownership')",
  "quote_used": "the 2-6 word phrase from the answer that triggered this question"
}}
"""
    print(f"FOLLOWUP INPUT TRANSCRIPT: {candidate_answer[:100]}...")
    return system, user


# -----------------------------
# RESUME SIGNALS
# -----------------------------
def extract_resume_signals(resume_text: str) -> dict:

    if not resume_text:
        return {"roles": [], "technologies": [], "projects": [], "achievements": [], "possible_gaps": []}

    tech_keywords = {"python", "javascript", "react", "node", "sql", "aws", "docker", "kubernetes"}

    words = re.findall(r'\b\w+\b', resume_text.lower())

    return {
        "roles": [],
        "technologies": list(set(words) & tech_keywords),
        "projects": [],
        "achievements": [],
        "possible_gaps": [],
    }


# -----------------------------
# HELPERS
# -----------------------------
def _clean_label(text: str, default: str) -> str:
    return text.strip() if text else default


def _extract_keywords(text: str, limit: int = 10):
    words = re.findall(r'\b\w{4,}\b', (text or "").lower())
    return list(dict.fromkeys(words))[:limit]


def _split_skills(skills: str):
    return [s.strip() for s in re.split(r'[,;|\n]', skills or "") if s.strip()]


def _role_signals(role: str):
    for k, v in ROLE_SKILL_MAP.items():
        if k in role.lower():
            return v
    return []


def _company_signals(company: str, jd: str):
    signals = []
    for k, v in COMPANY_SIGNALS.items():
        if k in company.lower():
            signals += v
    return signals


def _session_seed(*args):
    return int(hashlib.md5("".join(args).encode()).hexdigest(), 16) % 10**8


def _unique(items):
    return list(dict.fromkeys(items))


def _normalize_space(text: str):
    return " ".join(text.split())


def _question_key(q: str):
    return re.sub(r'[^a-z0-9]', '', q.lower())


def _default_hint(qtype: str, context: dict):
    return f"Answer using clear structured reasoning for {qtype}."


# FIXED JSON PARSER
def parse_json_object(raw: str):
    try:
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)
    except:
        return []
def fallback_followup(original_question: str, candidate_answer: str, company: str, role: str) -> dict:
    return {
        "followup": "That's helpful context. Can you elaborate specifically on your individual contribution and the final outcome of that situation?",
        "reason": "Fallback due to missing AI response.",
        "probe_target": "depth and ownership",
        "quote_used": ""
    }