import hashlib
import json
import random
import re
import uuid
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
def build_question_generation_prompt(context: dict, num_questions: int = 10) -> tuple[str, str]:

    resume = context["resume_signals"]
    num_questions = max(1, min(num_questions, 20))
    asked_questions = context.get("asked_questions") or []

    # rough distribution across a realistic interview
    n_technical = max(1, round(num_questions * 0.35))
    n_resume = max(1, round(num_questions * 0.2))
    n_situational = max(1, round(num_questions * 0.2))
    n_culture = max(1, num_questions - 1 - n_technical - n_resume - n_situational)

    system = (
        "You are a senior technical interviewer with 10+ years of experience running real "
        "interviews at top tech companies. You design realistic, professional mock interviews, "
        "not generic internet question lists. Every question must sound like it came from an "
        "interviewer who actually read this candidate's resume and this job description. "
        "Return valid JSON only — no markdown fences, no commentary, no text outside the JSON."
    )

    user = f"""
Design a complete mock interview of exactly {num_questions} questions for this candidate.

CANDIDATE CONTEXT
Company: {context['company']}
Role: {context['role']}
Key skills to probe: {json.dumps(context['key_skills'])}
Job description signals: {json.dumps(context['job_description_signals'])}
Resume signals: {json.dumps(resume)}
Role-specific focus areas: {json.dumps(context['role_signals'])}
Company culture signals: {json.dumps(context['company_signals'])}
Combined focus areas: {json.dumps(context['focus_areas'])}

QUESTIONS ALREADY ASKED IN THIS SESSION — do NOT repeat these or ask close variants of them:
{json.dumps(asked_questions)}

REQUIRED STRUCTURE (exactly {num_questions} questions total):
1. Question 1 (type "behavioral"): an opening question — a natural, role-specific version of
   "Tell me about yourself and why you're interested in this role at this company."
2. {n_technical} questions (type "technical"): core fundamentals for this role AND questions
   tied directly to the specific technologies named in the resume/job description. Not generic
   textbook trivia — make them specific to this candidate's stack.
3. {n_resume} questions (type "resume-specific"): dig into a specific project, achievement, or
   technology mentioned in the resume signals above. Reference it concretely by name.
4. {n_situational} questions (type "situational"): realistic on-the-job scenarios for this exact
   role (e.g. "Imagine X happens in production/with a client/on your team — walk me through what
   you'd do"). These must be scenario + ask-for-approach style, like a real interview.
5. {n_culture} questions (type "culture-fit"): HR-style questions about motivation, values,
   teamwork, or conflict, tied to the company's culture signals where possible. If this is the
   last question, make it a natural closing question.

RULES
- Every question must feel specific to THIS candidate/role/company — never interchangeable
  templates.
- Increase difficulty gradually across the set.
- No two questions may test the same underlying thing.
- Each question is 1-3 sentences, professional interviewer tone.
- "hint" is a 1-sentence coaching tip on how to structure a strong answer (e.g. STAR method for
  behavioral/situational, trade-off reasoning for technical).

Return ONLY a JSON array in this exact shape, with ids 1..{num_questions} in interview order:
[
  {{"id": 1, "type": "behavioral", "question": "...", "hint": "..."}},
  {{"id": 2, "type": "technical", "question": "...", "hint": "..."}}
]
"""
    return system, user


# -----------------------------
# VALIDATION
# -----------------------------
def validate_questions(raw_questions, context: dict, num_questions: int = 10) -> list[dict]:

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
def generate_fallback_questions(context: dict, count: int = 10) -> list[dict]:
    """
    Used ONLY when the live AI call itself fails (e.g. OpenRouter outage/timeout).
    Seeded with a fresh random source every call (not a deterministic hash of
    company+role+resume) so retries with the same inputs don't produce an
    identical interview, and each category pool is large enough that a full
    10-question fallback interview doesn't repeat itself.
    """
    rng = random.Random(uuid.uuid4().int)
    role = context["role"]
    company = context["company"]
    key_skills = context.get("key_skills") or []
    top_skill = key_skills[0] if key_skills else "your core skills"

    count = max(1, min(count, 20))

    fallback_pools = {
        "behavioral": [
            f"Tell me about a time you handled a difficult situation in a role like {role}.",
            "Describe a significant project you're proud of from your experience.",
            "Tell me about a time you had to learn a new tool or technology quickly.",
            "Describe a time you disagreed with a teammate and how you resolved it.",
            "Tell me about a mistake you made at work and what you learned from it.",
            "Describe a time you had to work under a tight deadline.",
            "Tell me about a time you took initiative without being asked.",
        ],
        "technical": [
            f"Explain a technical challenge you encountered while working as a {role}.",
            "How do you ensure code quality and maintainability in your projects?",
            "Can you walk me through your process for debugging a complex issue?",
            f"How would you design a system that needs to scale, using {top_skill}?",
            "What trade-offs do you consider when choosing a database for a new project?",
            "How do you approach writing tests for a feature you're building?",
            "Walk me through how you'd optimize a slow-performing piece of code.",
        ],
        "resume-specific": [
            "Pick one project from your resume — what was the hardest technical decision you made on it?",
            "What was your specific individual contribution on the project you'd call your biggest achievement?",
            "One of your listed skills stands out to me — tell me about a real situation where you used it.",
            "What would you do differently if you rebuilt the project on your resume today?",
        ],
        "situational": [
            "How would you handle a situation where a project deadline is at risk?",
            "What would you do if you disagreed with a technical decision made by your team lead?",
            "How do you prioritize tasks when you have multiple urgent requests at once?",
            "Imagine a critical bug is found in production right before a release — walk me through what you'd do.",
            "A stakeholder asks for a feature that conflicts with best practice — how do you handle that conversation?",
            "You inherit a codebase with no documentation and a tight deadline — what's your approach?",
        ],
        "culture-fit": [
            f"What values are you looking for in your next team at {company}?",
            "How do you give and receive constructive feedback?",
            "What motivates you to do your best work?",
            f"Why {company} specifically, and why this {role} role?",
            "Do you have any questions for us before we wrap up?",
        ],
    }

    # Mirror the same realistic category distribution used in the AI prompt
    n_technical = max(1, round(count * 0.35))
    n_resume = max(1, round(count * 0.2))
    n_situational = max(1, round(count * 0.2))
    n_culture = max(1, count - 1 - n_technical - n_resume - n_situational)
    sequence = (
        ["behavioral"]
        + ["technical"] * n_technical
        + ["resume-specific"] * n_resume
        + ["situational"] * n_situational
        + ["culture-fit"] * n_culture
    )[:count]
    while len(sequence) < count:
        sequence.append(rng.choice(QUESTION_TYPES))
    rng.shuffle(sequence[1:])  # keep index 0 as the intro question, mix the rest

    questions = []
    used_per_category: dict[str, set] = {}

    for i in range(count):
        if i == 0:
            q = f"To start, could you tell me a bit about yourself and your interest in the {role} role at {company}?"
            qtype = "behavioral"
        else:
            qtype = sequence[i]
            pool = list(fallback_pools.get(qtype, fallback_pools["behavioral"]))
            rng.shuffle(pool)
            used = used_per_category.setdefault(qtype, set())
            q = next((p for p in pool if p not in used), None)
            if q is None:
                q = rng.choice(pool)  # pool exhausted (rare) — reuse rather than crash
            used.add(q)

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
    hints = {
        "behavioral": "Use the STAR method: Situation, Task, Action, Result.",
        "situational": "Use the STAR method and be concrete about the exact steps you'd take.",
        "technical": "Explain your reasoning and trade-offs, not just the final answer.",
        "resume-specific": "Be concrete — name the project, your specific role, and the outcome.",
        "culture-fit": "Be authentic and back your answer with a real example.",
    }
    return hints.get(qtype, f"Answer using clear, structured reasoning for a {qtype} question.")


# FIXED JSON PARSER
def parse_json_object(raw: str):
    try:
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)
    except:
        return []
def fallback_followup(original_question: str, candidate_answer: str, company: str, role: str) -> dict:
    pool = [
        "That's helpful context. Can you elaborate specifically on your individual contribution and the final outcome?",
        "Can you walk me through a concrete example with specific numbers or measurable outcomes?",
        "What was the hardest part of that, and how did you specifically get through it?",
        "Can you go one level deeper on the technical approach you took there?",
    ]
    return {
        "followup": random.choice(pool),
        "reason": "Fallback due to missing/failed AI response.",
        "probe_target": "depth and ownership",
        "quote_used": ""
    }