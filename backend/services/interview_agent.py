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


ACTION_VERBS = {
    "built", "created", "designed", "led", "launched", "improved", "reduced", "increased",
    "migrated", "optimized", "automated", "owned", "managed", "implemented", "delivered",
}


STOPWORDS = {
    "with", "from", "that", "this", "were", "have", "your", "will", "and", "the", "for",
    "using", "into", "about", "their", "there", "over", "under", "through", "between",
}


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


def build_question_generation_prompt(context: dict, num_questions: int = 5) -> tuple[str, str]:
    """Build prompt for generating configurable number of interview questions."""
    resume = context["resume_signals"]
    
    # Cycle through question types if more than 5 questions requested
    num_questions = max(1, min(num_questions, 20))
    num_base_types = len(QUESTION_TYPES)
    
    if num_questions <= num_base_types:
        type_guidance = f", one of each type: {', '.join(QUESTION_TYPES[:num_questions])}"
    else:
        # For more than 5 questions, cycle through types
        types_used = [QUESTION_TYPES[i % num_base_types] for i in range(num_questions)]
        type_guidance = f", cycling through types as needed"
    
    system = (
        "You are an agentic interview designer. Act like a calibrated hiring panel: "
        "first infer role competencies, then map resume evidence to those competencies, "
        "then write realistic primary interview questions. Return valid JSON only."
    )
    user = f"""
Create a fresh mock interview for this target:
- Company: {context['company']}
- Role: {context['role']}
- Session seed: {context['session_seed']}
- Number of questions: {num_questions}

Role/company focus:
{json.dumps({
    "focus_areas": context["focus_areas"],
    "role_signals": context["role_signals"],
    "company_signals": context["company_signals"],
    "job_description_signals": context["job_description_signals"],
}, indent=2)}

Candidate resume signals:
{json.dumps({
    "roles": resume["roles"],
    "technologies": resume["technologies"],
    "projects": resume["projects"],
    "achievements": resume["achievements"],
    "possible_gaps": resume["possible_gaps"],
}, indent=2)}

Previously asked in this session:
{json.dumps(context["asked_questions"], indent=2)}

Interview design rules:
1. Generate exactly {num_questions} questions{type_guidance}.
2. Every question must be specific to the role, company, job description, skills, or resume evidence.
3. If resume signals exist, at least half the questions must mention concrete resume details such as a project, technology, prior title, metric, or transition.
4. Avoid generic prompts like "tell me about yourself", "strengths and weaknesses", or "why should we hire you".
5. Make the questions sound like a real interviewer: concise, probing, and answerable in 90-150 seconds.
6. Vary the angle from common interview-bank questions by using the session seed.
7. Include a hint that tells the candidate what evidence a strong answer should include.
8. Each question should probe different competencies — do not repeat themes.

Return JSON only as an array of {num_questions} objects with id, type, question, and hint keys.
"""
    return system, user


def validate_questions(raw_questions, context: dict, num_questions: int = 5) -> list[dict]:
    """Validate and normalize questions, filling to reach num_questions."""
    if not isinstance(raw_questions, list):
        raise ValueError("Question payload must be a list")

    normalized = []
    seen = set()
    used_types = set()

    # Ensure num_questions is reasonable
    num_questions = max(1, min(num_questions, 20))

    for item in raw_questions:
        if not isinstance(item, dict):
            continue
        question = _normalize_space(str(item.get("question", "")))
        hint = _normalize_space(str(item.get("hint", "")))
        qtype = str(item.get("type", "")).strip().lower()

        if qtype not in QUESTION_TYPES or qtype in used_types:
            qtype = _first_unused_type(used_types)
        if not question or _is_generic_question(question):
            continue

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

    if len(normalized) < num_questions:
        fill = generate_fallback_questions(context, count=num_questions)
        for item in fill:
            if len(normalized) >= num_questions:
                break
            key = _question_key(item["question"])
            if key not in seen and (len(normalized) < num_questions or item["type"] not in used_types):
                item = {**item, "id": len(normalized) + 1}
                normalized.append(item)
                seen.add(key)
                used_types.add(item["type"])

    return normalized[:num_questions]


def generate_fallback_questions(context: dict, count: int = 5) -> list[dict]:
    """Generate fallback questions, cycling through types if count > len(QUESTION_TYPES)."""
    rng = random.Random(context["session_seed"])
    role = context["role"]
    company = context["company"]
    focus = context["focus_areas"] or _role_signals(role) or ["role priorities"]
    company_focus = context["company_signals"] or ["the company context"]
    evidence = context["candidate_evidence"]
    resume = context["resume_signals"]

    def pick(items, default):
        return rng.choice(items) if items else default

    # Ensure count is reasonable
    count = max(1, min(count, 20))

    templates = {
        "behavioral": [
            f"Tell me about a time you had to deliver {pick(focus, 'excellence')} under pressure. What trade-off did you make, and what changed because of your decision?",
            f"Walk me through a situation where you had to influence someone without authority while working on {pick(resume['achievements'], 'a project')}. What did you do when there was resistance?",
            f"Think about this resume item: \"{pick(resume['projects'], 'a project')}\". Where was your first approach wrong, how did you notice it, and what changed after you adapted?",
            f"Describe a moment when you failed at something important to this role. What did you learn, and how did it change your approach?",
            f"Tell me about a time you had to work with someone very different from you. How did you find common ground?",
        ],
        "technical": [
            f"For this {role} role, how would you evaluate whether your experience with {pick(resume['technologies'], 'a core technology')} is production-ready for {company}'s standards?",
            f"Take {pick(resume['projects'], 'a project')}. If {company} needed it to support 10x more users or stakeholders, what would you redesign first and why?",
            f"Choose one technical decision from your background involving {pick(resume['technologies'], 'a technology')}. What alternatives did you reject, and what evidence guided you?",
            f"What's the most complex technical problem you've solved? Walk me through how you broke it down and what you learned.",
            f"Describe a time you had to learn a new technology quickly. How did you approach it, and what was the result?",
        ],
        "situational": [
            f"Imagine you join {company} and inherit a project where {pick(focus, 'quality')} is failing but the deadline cannot move. What would you diagnose in your first week?",
            f"If a senior stakeholder at {company} pushed for speed while your analysis showed a quality or risk issue, how would you handle the conversation?",
            f"Suppose your team disagrees on whether to optimize for {pick(focus, 'performance')} or short-term delivery. How would you make the decision clear and fair?",
            f"Tell me about a time you received critical feedback. How did you respond, and what changed?",
            f"Describe a situation where you had to make a decision with incomplete information. What was your process?",
        ],
        "culture-fit": [
            f"What about {company}'s work connects with your experience in {pick(resume['achievements'], 'your background')}, and where do you think you would need to stretch?",
            f"{company} likely values {pick(company_focus, 'craftsmanship')}. Tell me about a time your behavior showed that quality, not just your results.",
            f"Why is {company} the right environment for your next step as a {role}, beyond the title itself?",
            f"What does a healthy team culture look like to you, and how do you contribute to it?",
            f"Tell me about a value that's deeply important to you. How has it guided a decision you made?",
        ],
        "resume-specific": [
            f"I noticed this resume item: \"{pick(resume['projects'], 'a project')}\". What was the hardest part that is not obvious from the resume, and what did you personally own?",
            f"Your resume points to {pick(resume['achievements'], 'an achievement')}. What metric or signal proves that work mattered, and what would you improve if you did it again?",
            f"You mention {pick(resume['technologies'], 'a technology')}. Explain a real problem you solved with it, including the constraint that made the work difficult.",
            f"Tell me about a role or project you're particularly proud of. What made you successful there, and how does it apply to this role?",
            f"What's the transition that excites you most about moving to this {role} role from your background?",
        ],
    }

    questions = []
    for idx in range(count):
        qtype = QUESTION_TYPES[idx % len(QUESTION_TYPES)]
        question_text = rng.choice(templates[qtype])
        questions.append({
            "id": idx + 1,
            "type": qtype,
            "question": question_text,
            "hint": _default_hint(qtype, context),
        })

    return questions


def build_followup_prompt(
    original_question: str,
    candidate_answer: str,
    company: str,
    role: str,
    previous_pairs: list[dict] | None = None,
    resume_context: str = "",
) -> tuple[str, str]:
    """Build adaptive follow-up prompt that probes deeper based on answer gaps."""
    context = build_interview_context(company, role, resume_context)
    
    # Analyze answer to guide follow-up direction
    answer_lower = candidate_answer.lower()
    has_metrics = bool(re.search(r'\b\d+%|\d+x|\$\d+|\d+%|improved|increased|reduced\b', answer_lower))
    has_star = bool(re.search(r'situation|task|action|result|challenge|problem', answer_lower, re.I))
    answer_length = len(candidate_answer.split())
    is_vague = answer_length < 30 or "think" in answer_lower or "maybe" in answer_lower or "probably" in answer_lower
    
    # Determine probe direction
    if is_vague:
        probe_direction = "Ask for concrete example or specific situation with measurable outcome."
    elif not has_metrics:
        probe_direction = "Probe for quantifiable impact, business metrics, or measurable results."
    elif not has_star:
        probe_direction = "Probe for deeper context: what was the challenge, your role, the decision point?"
    else:
        probe_direction = "Probe for learning, growth, or how they'd apply this in the new role/company context."
    
    system = (
        "You are a senior interviewer running an adaptive mock interview. "
        "Your follow-ups are sharp, probing, and help the candidate demonstrate depth. "
        "Each follow-up should feel like it's responding to their specific answer, not a script. "
        "Return valid JSON only."
    )
    user = f"""
Target role: {context['role']} at {context['company']}
Role/company focus: {json.dumps(context['focus_areas'][:8])}

Original question:
{original_question}

Candidate answer ({answer_length} words):
{candidate_answer}

Previous Q&A in this session:
{json.dumps(previous_pairs or [], indent=2)}

Probing direction: {probe_direction}

Task:
1. Identify the SINGLE most important missing evidence, vague claim, risk, or interesting thread in the answer.
2. Ask exactly one sharp follow-up question (1-2 sentences) that a real interviewer would ask next.
3. The follow-up should feel naturally adaptive—reference something specific they said.
4. Do not repeat the original question unless the answer is completely evasive.
5. Avoid generic follow-ups—make it specific to their answer and the role.
6. If possible, quote 2-8 exact words from their answer that triggered the follow-up.

Return JSON only:
{{
  "followup": "...",
  "reason": "one short sentence explaining why this probes the answer",
  "probe_target": "specific skill, evidence, risk, or competency being tested",
  "quote_used": "exact candidate phrase or empty string"
}}
"""
    return system, user


def fallback_followup(original_question: str, candidate_answer: str, company: str, role: str) -> dict:
    answer = _normalize_space(candidate_answer)
    quote = _extract_quote(answer)
    lower = answer.lower()

    if len(answer.split()) < 25:
        followup = "Can you make that concrete by walking me through one specific situation, your action, and the measurable result?"
        target = "specificity"
    elif not re.search(r"\d|%|reduced|increased|improved|saved|launched|users|revenue", lower):
        followup = f"You mentioned '{quote}' - what result proved that work was successful, and how did you measure it?"
        target = "measurable impact"
    elif not re.search(r"\bi\b|\bmy\b|\bme\b", lower):
        followup = f"What part of that outcome did you personally own, and what decisions were only yours to make?"
        target = "personal ownership"
    else:
        followup = f"If you had to repeat that work at {company} as a {role}, what would you change based on what you learned?"
        target = "judgment and transferability"

    return {
        "followup": followup,
        "reason": "The answer needs deeper evidence before an interviewer can judge the competency.",
        "probe_target": target,
        "quote_used": quote if quote and quote in followup else "",
    }


def extract_resume_signals(resume_text: str) -> dict:
    text = _normalize_space(resume_text)
    if not text:
        return {"roles": [], "technologies": [], "projects": [], "achievements": [], "possible_gaps": []}

    sentences = _sentences(text)
    technologies = _extract_technologies(text)
    roles = _extract_roles(text)
    projects = _extract_project_lines(sentences)
    achievements = _extract_achievement_lines(sentences)
    possible_gaps = _extract_possible_gaps(text)

    return {
        "roles": roles[:6],
        "technologies": technologies[:12],
        "projects": projects[:6],
        "achievements": achievements[:6],
        "possible_gaps": possible_gaps[:4],
    }


def parse_json_object(raw: str):
    cleaned = re.sub(r"```json|```", "", raw or "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"(\[.*\]|\{.*\})", cleaned, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(1))


def _clean_label(value: str, fallback: str) -> str:
    value = _normalize_space(value)
    return value[:120] if value else fallback


def _normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _session_seed(*parts: str) -> int:
    source = "|".join(_normalize_space(p).lower() for p in parts if p)
    source = f"{source}|{datetime.now(timezone.utc).isoformat(timespec='microseconds')}"
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def _role_signals(role: str) -> list[str]:
    lower = role.lower()
    signals = []
    for key, values in ROLE_SKILL_MAP.items():
        if key in lower:
            signals.extend(values)
    if not signals:
        signals = _extract_keywords(role, limit=6)
    return _unique(signals)


def _company_signals(company: str, job_description: str = "") -> list[str]:
    lower = company.lower()
    signals = []
    for key, values in COMPANY_SIGNALS.items():
        if key in lower:
            signals.extend(values)
    if job_description:
        signals.extend(_extract_keywords(job_description, limit=5))
    return _unique(signals)


def _split_skills(value: str) -> list[str]:
    return _unique([part.strip(" .") for part in re.split(r"[,;/\n]+", value or "") if part.strip()])[:12]


def _extract_keywords(text: str, limit: int = 10) -> list[str]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9+#.-]{2,}", text or "")
    candidates = []
    for word in words:
        clean = word.strip(".,:;()[]{}").lower()
        if clean in STOPWORDS or len(clean) < 3:
            continue
        if clean not in candidates:
            candidates.append(clean)
    return candidates[:limit]


def _extract_technologies(text: str) -> list[str]:
    tech_pattern = re.compile(
        r"\b(Python|JavaScript|TypeScript|React|Next\.js|Node\.js|Flask|Django|FastAPI|"
        r"Java|C\+\+|C#|Go|Rust|SQL|PostgreSQL|MySQL|MongoDB|Redis|AWS|Azure|GCP|"
        r"Docker|Kubernetes|GraphQL|REST|TensorFlow|PyTorch|Pandas|Spark|Tableau|Power BI|"
        r"Figma|Salesforce|Excel|Git|Linux)\b",
        re.IGNORECASE,
    )
    found = [m.group(0) for m in tech_pattern.finditer(text)]
    found.extend([
        w for w in re.findall(r"\b[A-Z0-9][A-Z0-9+#.]{2,}\b", text)
        if len(w) <= 12 and w.lower() not in ACTION_VERBS
    ])
    return _unique(found)


def _extract_roles(text: str) -> list[str]:
    role_pattern = re.compile(
        r"\b([A-Z][A-Za-z ]{2,40}?(Engineer|Developer|Analyst|Manager|Designer|Consultant|Intern|Lead|Specialist|Architect))\b"
    )
    return _unique([m.group(1).strip() for m in role_pattern.finditer(text)])


def _extract_project_lines(sentences: list[str]) -> list[str]:
    project_words = re.compile(r"\b(project|built|created|developed|designed|implemented|launched|platform|app|system|dashboard)\b", re.I)
    return _unique([s[:180].rstrip(".;:, ") for s in sentences if project_words.search(s)])[:8]


def _extract_achievement_lines(sentences: list[str]) -> list[str]:
    achievement_words = re.compile(r"\b(achieved|improved|increased|reduced|optimized|led|managed|saved|won|ranked|delivered|%|\d+)\b", re.I)
    return _unique([s[:180].rstrip(".;:, ") for s in sentences if achievement_words.search(s)])[:8]


def _extract_possible_gaps(text: str) -> list[str]:
    gaps = []
    if not re.search(r"\d+%|\$\d+|\d+\s*(users|customers|ms|seconds|hours|days|people)", text, re.I):
        gaps.append("Few quantified outcomes are visible in the resume.")
    if len(_extract_technologies(text)) < 3:
        gaps.append("Technical/tooling evidence is light or not explicitly named.")
    if not re.search(r"\b(led|owned|managed|mentored|coordinated)\b", text, re.I):
        gaps.append("Ownership or leadership scope is not obvious.")
    return gaps


def _sentences(text: str) -> list[str]:
    chunks = re.split(r"(?<=[.!?])\s+|\n+", text)
    return [_normalize_space(c) for c in chunks if len(_normalize_space(c)) > 20]


def _unique(items: list[str]) -> list[str]:
    seen = set()
    result = []
    for item in items:
        clean = _normalize_space(str(item)).strip(" -")
        key = clean.lower()
        if clean and key not in seen:
            seen.add(key)
            result.append(clean)
    return result


def _is_generic_question(question: str) -> bool:
    lower = question.lower()
    generic = [
        "tell me about yourself",
        "what are your strengths",
        "what are your weaknesses",
        "why should we hire you",
        "where do you see yourself",
    ]
    return any(phrase in lower for phrase in generic)


def _question_key(question: str) -> str:
    words = [w for w in re.findall(r"[a-z0-9]+", question.lower()) if w not in STOPWORDS]
    return " ".join(words[:12])


def _first_unused_type(used_types: set[str]) -> str:
    for qtype in QUESTION_TYPES:
        if qtype not in used_types:
            return qtype
    return "behavioral"


def _default_hint(qtype: str, context: dict) -> str:
    if qtype == "technical":
        return "Name the constraints, compare alternatives, and explain the trade-off behind your final choice."
    if qtype == "culture-fit":
        return f"Connect your motivation to {context['company']} with a concrete example from your work style."
    if qtype == "resume-specific":
        return "Use exact evidence from your resume, clarify your personal ownership, and include a measurable result."
    if qtype == "situational":
        return "Think aloud through diagnosis, stakeholders, trade-offs, and the first action you would take."
    return "Answer with STAR: Situation, Task, Action, Result, plus one lesson learned."


def _extract_quote(answer: str) -> str:
    words = [w.strip(".,;:!?\"'()") for w in answer.split() if len(w.strip(".,;:!?\"'()")) > 3]
    if not words:
        return ""
    for i, word in enumerate(words):
        if word.lower() in ACTION_VERBS:
            return " ".join(words[i:i + 5])
    return " ".join(words[:5])
