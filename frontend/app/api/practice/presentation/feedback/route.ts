import { NextRequest, NextResponse } from 'next/server'

// ─── Types (must match PresentationFeedback in app/practice/presentation/page.tsx) ──

interface WordSuggestion {
  used: string
  suggestion: string
  reason: string
}

interface RepeatedWord {
  word: string
  count: number
}

type MistakeType = 'grammar' | 'clarity' | 'vocabulary' | 'structure' | 'filler' | 'repetition' | 'stammer' | 'off-topic'

interface Mistake {
  quote: string
  type: MistakeType
  issue: string
  correction: string
}

interface TopicRelevance {
  onTopic: boolean
  coverageScore: number
  note: string
}

interface ScoreBreakdown {
  contentCoverage: number   // 0-10, weight 30%
  grammar: number           // 0-10, weight 25%
  fluency: number           // 0-10, weight 25%, fully deterministic
  vocabulary: number        // 0-10, weight 20%
}

export interface PresentationFeedback {
  wordCount: number
  durationSec: number | null
  paceWpm: number | null
  fillerWordCount: number
  fillerWordsFound: { word: string; count: number }[]
  repeatedWords: RepeatedWord[]
  stammering: { detected: boolean; examples: string[]; note: string }
  mistakes: Mistake[]
  vocabularySuggestions: WordSuggestion[]
  topicRelevance: TopicRelevance
  clarityNotes: string
  strengths: string[]
  improvements: string[]
  overallScore: number
  scoreBreakdown: ScoreBreakdown
  summary: string
  spokenSummary: string
}

// ─── Local, deterministic analysis (always runs — doesn't depend on the LLM) ──

const FILLER_WORDS = [
  'um', 'umm', 'uh', 'uhh', 'er', 'erm', 'ah',
  'like', 'you know', 'i mean', 'sort of', 'kind of',
  'basically', 'actually', 'literally', 'right', 'so yeah',
]

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'to',
  'of', 'in', 'on', 'for', 'with', 'this', 'that', 'it', 'as', 'be', 'we',
  'i', 'you', 'they', 'he', 'she', 'at', 'by', 'from', 'so', 'if', 'then',
  'there', 'here', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'these', 'those', 'our', 'your', 'their', 'its', 'my', 'me', 'us',
])

const WEAK_WORD_BANK: Record<string, string[]> = {
  good: ['effective', 'compelling', 'strong', 'valuable'],
  bad: ['problematic', 'ineffective', 'flawed'],
  big: ['substantial', 'significant', 'considerable'],
  small: ['minor', 'modest', 'limited'],
  thing: ['factor', 'element', 'aspect'],
  things: ['factors', 'elements', 'aspects'],
  stuff: ['material', 'content', 'components'],
  nice: ['impressive', 'notable', 'valuable'],
  very: ['highly', 'remarkably', 'exceptionally'],
  really: ['genuinely', 'significantly', 'notably'],
  lot: ['a great deal', 'substantially', 'considerably'],
  lots: ['numerous', 'a substantial number'],
  get: ['obtain', 'achieve', 'secure'],
  got: ['obtained', 'achieved', 'secured'],
  show: ['demonstrate', 'illustrate', 'reveal'],
  important: ['critical', 'essential', 'pivotal'],
  interesting: ['compelling', 'noteworthy', 'striking'],
  basically: ['essentially', 'fundamentally'],
  said: ['stated', 'noted', 'explained'],
  make: ['create', 'produce', 'generate'],
  helps: ['enables', 'facilitates', 'supports'],
  use: ['utilize', 'apply', 'employ'],
}

function analyzeLocally(transcript: string, durationSec: number | null) {
  const cleaned = transcript.trim()
  const lowerText = cleaned.toLowerCase()
  const words = lowerText.match(/[a-z']+/g) ?? []
  const wordCount = words.length

  const paceWpm =
    durationSec && durationSec > 3 ? Math.round((wordCount / durationSec) * 60) : null

  const fillerCounts: Record<string, number> = {}
  for (const filler of FILLER_WORDS) {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'g')
    const matches = lowerText.match(re)
    if (matches && matches.length > 0) fillerCounts[filler] = matches.length
  }
  const fillerWordsFound = Object.entries(fillerCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
  const fillerWordCount = fillerWordsFound.reduce((sum, f) => sum + f.count, 0)

  const freq: Record<string, number> = {}
  for (const w of words) {
    if (w.length < 3) continue
    if (STOPWORDS.has(w)) continue
    if (FILLER_WORDS.includes(w)) continue
    freq[w] = (freq[w] ?? 0) + 1
  }
  const repeatedWords: RepeatedWord[] = Object.entries(freq)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }))

  const stammerPattern = /\b([a-zA-Z']+)(\s+\1\b){1,}/gi
  const stammerMatches = Array.from(cleaned.matchAll(stammerPattern)).map((m) => m[0])
  const brokenFragmentPattern = /\b[a-zA-Z]{1,4}-\s/g
  const brokenMatches = cleaned.match(brokenFragmentPattern) ?? []
  const stammerExamples = [...new Set([...stammerMatches, ...brokenMatches])].slice(0, 5)

  const vocabularySuggestions: WordSuggestion[] = []
  const seen = new Set<string>()
  for (const w of words) {
    if (WEAK_WORD_BANK[w] && !seen.has(w)) {
      seen.add(w)
      const options = WEAK_WORD_BANK[w]
      vocabularySuggestions.push({
        used: w,
        suggestion: options[Math.floor(Math.random() * options.length)],
        reason: `"${w}" is vague/overused in presentations — a more precise word adds impact.`,
      })
    }
  }

  return {
    wordCount,
    paceWpm,
    fillerWordsFound,
    fillerWordCount,
    repeatedWords,
    stammerExamples,
    vocabularySuggestions: vocabularySuggestions.slice(0, 6),
  }
}

// Fluency score is 100% deterministic — no LLM involved — so it can never
// be inconsistent between runs of the same transcript. Starts at 10, loses
// points for filler words, stammering, and heavy word repetition.
function computeFluencyScore(local: ReturnType<typeof analyzeLocally>): number {
  let score = 10
  score -= Math.min(4, local.fillerWordCount * 0.5)
  score -= Math.min(3, local.stammerExamples.length * 0.8)
  score -= Math.min(2, local.repeatedWords.length * 0.3)
  return Math.max(0, Math.round(score * 10) / 10)
}

// A transcript that's too short simply cannot earn a high score in any
// LLM-judged category, no matter how the LLM scores it.
function capScoreByLength(score: number, wordCount: number): number {
  if (wordCount < 8) return Math.min(score, 2.5)
  if (wordCount < 15) return Math.min(score, 4.5)
  if (wordCount < 25) return Math.min(score, 6.5)
  return score
}

// ─── LLM synthesis (Groq) ──────────────────────────────────────────────────

interface GroqFeedbackResponse {
  clarityNotes?: string
  stammeringNote?: string
  strengths?: string[]
  improvements?: string[]
  additionalVocabSuggestions?: WordSuggestion[]
  mistakes?: Mistake[]
  topicRelevance?: TopicRelevance
  contentScore?: number
  grammarScore?: number
  vocabularyScore?: number
  summary?: string
  spokenSummary?: string
}

async function synthesizeWithGroq(
  transcript: string,
  topic: string,
  slideTitle: string,
  slideBullets: string[],
  local: ReturnType<typeof analyzeLocally>
): Promise<GroqFeedbackResponse | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  const hasRealSlideContent = slideBullets.length > 0
  const contextBlock = hasRealSlideContent
    ? `SLIDE TITLE: "${slideTitle}"\nSLIDE TALKING POINTS: ${slideBullets.join(' | ')}`
    : `TOPIC THE SPEAKER IS PRESENTING ON: "${topic || 'not specified'}"\n(No extracted slide text is available for this slide — judge topic relevance against the stated topic above, not invented slide content.)`

  const prompt = `You are a strict, no-nonsense presentation and public-speaking coach. A speaker just presented the following slide out loud. Catch every real mistake and be specific — do not soften scores out of politeness. Most transcripts you review will be mediocre; treat that as the default.

${contextBlock}

WHAT THE SPEAKER ACTUALLY SAID (transcribed from their voice):
"""
${transcript}
"""

Automated stats already computed (ground truth — do not recompute or contradict these):
- Word count: ${local.wordCount}
- Speaking pace: ${local.paceWpm ? local.paceWpm + ' words/minute' : 'unknown'}
- Filler words found: ${local.fillerWordsFound.map(f => `${f.word}(x${f.count})`).join(', ') || 'none'}
- Repeated content words: ${local.repeatedWords.map(r => `${r.word}(x${r.count})`).join(', ') || 'none'}
- Possible stammer/restart fragments: ${local.stammerExamples.join(', ') || 'none'}

MISTAKES: quote the exact phrase (under 15 words) for every real mistake — grammar, unclear phrasing, vague words, structural/logic problems, or drifting off the stated topic (use type "off-topic" for that last one). Never describe a mistake without quoting it. Empty array only if genuinely flawless.

Return ONLY raw JSON (no markdown, no backticks) matching exactly this shape:
{
  "topicRelevance": {
    "onTopic": true/false,
    "coverageScore": 0-10,
    "note": "1-2 sentences on whether what they said actually matches the stated topic/slide"
  },
  "contentScore": 0-10,
  "grammarScore": 0-10,
  "vocabularyScore": 0-10,
  "mistakes": [{"quote": "exact phrase, under 15 words", "type": "grammar"|"clarity"|"vocabulary"|"structure"|"filler"|"repetition"|"stammer"|"off-topic", "issue": "what's wrong", "correction": "how it should be said instead"}],
  "clarityNotes": "2-3 sentences on how clear/confusing the delivery was",
  "stammeringNote": "1-2 sentences on stammering/hesitation, or say delivery was smooth if none",
  "strengths": ["specific strength tied to what they actually said — omit if genuinely nothing beyond effort"],
  "improvements": ["specific, actionable improvement, biggest problem first", "improvement 2", "improvement 3"],
  "additionalVocabSuggestions": [{"used": "word/phrase they actually said", "suggestion": "stronger alternative", "reason": "short reason"}] — at least 3 if transcript has 20+ words,
  "summary": "2-3 sentence written coaching summary, direct and specific",
  "spokenSummary": "3-4 sentence natural-sounding paragraph for text-to-speech — NO markdown, NO nested quotes. State the score, the biggest issue, one genuine strength if any, one concrete next step."
}

STRICT SCORING RUBRIC — apply to contentScore, grammarScore, and vocabularyScore independently, do not inflate:
- 9-10: Flawless in this dimension. Rare.
- 7-8.9: Strong, only 1-2 minor issues.
- 5-6.9: Adequate but flawed — noticeable problems.
- 3-4.9: Weak — frequent issues in this dimension.
- 0-2.9: Very weak.
A transcript under 15 words cannot score above 4.5 in ANY of these three dimensions — there isn't enough material to demonstrate competence.`

  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1700,
        }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const raw: string = data.choices?.[0]?.message?.content ?? ''
      const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start === -1 || end === -1) continue
      const parsed: GroqFeedbackResponse = JSON.parse(clean.slice(start, end + 1))
      return parsed
    } catch (err) {
      console.error(`Groq feedback synthesis failed [${model}]:`, err)
      continue
    }
  }
  return null
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const {
      transcript,
      topic = '',
      slideNumber = 1,
      currentSlide = {},
      durationSec = null,
    } = await request.json()

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
    }

    const local = analyzeLocally(transcript, durationSec)
    const llm = await synthesizeWithGroq(
      transcript,
      topic,
      currentSlide?.title ?? `Slide ${slideNumber}`,
      currentSlide?.bullets ?? [],
      local
    )

    const vocabularySuggestions: WordSuggestion[] = [
      ...local.vocabularySuggestions,
      ...(llm?.additionalVocabSuggestions ?? []),
    ].slice(0, 8)

    const mistakes: Mistake[] = Array.isArray(llm?.mistakes) ? llm!.mistakes! : defaultMistakes(local)

    const topicRelevance: TopicRelevance = llm?.topicRelevance ?? {
      onTopic: true,
      coverageScore: capScoreByLength(computeFallbackScore(local), local.wordCount),
      note: 'Topic relevance could not be assessed by the AI this time; falling back to a generic estimate.',
    }

    // ── Score breakdown — this is the actual, transparent scoring system.
    // Each category is capped by transcript length independently, and the
    // overall score is ALWAYS this weighted sum — the LLM never sets the
    // overall number directly, so it can't drift from the real breakdown.
    const contentCoverage = capScoreByLength(
      typeof llm?.contentScore === 'number' ? clamp10(llm.contentScore) : topicRelevance.coverageScore,
      local.wordCount
    )
    const grammar = capScoreByLength(
      typeof llm?.grammarScore === 'number' ? clamp10(llm.grammarScore) : computeFallbackScore(local),
      local.wordCount
    )
    const vocabulary = capScoreByLength(
      typeof llm?.vocabularyScore === 'number' ? clamp10(llm.vocabularyScore) : computeFallbackScore(local),
      local.wordCount
    )
    const fluency = computeFluencyScore(local) // deterministic — no length cap needed, already reflects short transcripts via low word interactions

    const scoreBreakdown: ScoreBreakdown = {
      contentCoverage: round1(contentCoverage),
      grammar: round1(grammar),
      fluency: round1(fluency),
      vocabulary: round1(vocabulary),
    }

    const overallScore = round1(
      contentCoverage * 0.30 + grammar * 0.25 + fluency * 0.25 + vocabulary * 0.20
    )

    const summary =
      llm?.summary ??
      `You spoke ${local.wordCount} words${local.paceWpm ? ` at about ${local.paceWpm} words/minute` : ''}. Focus on trimming filler words and varying repeated vocabulary for a stronger delivery.`

    const spokenSummary =
      llm?.spokenSummary ??
      buildFallbackSpokenSummary(overallScore, local, mistakes)

    const feedback: PresentationFeedback = {
      wordCount: local.wordCount,
      durationSec,
      paceWpm: local.paceWpm,
      fillerWordCount: local.fillerWordCount,
      fillerWordsFound: local.fillerWordsFound,
      repeatedWords: local.repeatedWords,
      stammering: {
        detected: local.stammerExamples.length > 0,
        examples: local.stammerExamples,
        note:
          llm?.stammeringNote ??
          (local.stammerExamples.length > 0
            ? `Detected ${local.stammerExamples.length} instance(s) of repeated/broken words, e.g. "${local.stammerExamples[0]}".`
            : 'No repeated or broken words detected — delivery sounded smooth.'),
      },
      mistakes,
      vocabularySuggestions,
      topicRelevance,
      clarityNotes:
        llm?.clarityNotes ??
        (local.fillerWordCount > 5
          ? 'Frequent filler words made parts of the delivery harder to follow.'
          : 'Delivery was reasonably clear.'),
      strengths: llm?.strengths ?? defaultStrengths(local),
      improvements: llm?.improvements ?? defaultImprovements(local),
      overallScore,
      scoreBreakdown,
      summary,
      spokenSummary,
    }

    return NextResponse.json({
      feedback,
      feedbackText: renderFeedbackText(feedback, slideNumber),
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate feedback' },
      { status: 500 }
    )
  }
}

function clamp10(n: number): number {
  return Math.min(10, Math.max(0, n))
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function computeFallbackScore(local: ReturnType<typeof analyzeLocally>): number {
  let score = 7
  score -= Math.min(3, local.fillerWordCount * 0.4)
  score -= Math.min(2.5, local.repeatedWords.length * 0.4)
  score -= Math.min(2.5, local.stammerExamples.length * 0.6)
  return Math.max(1.5, Math.round(score * 10) / 10)
}

function defaultMistakes(local: ReturnType<typeof analyzeLocally>): Mistake[] {
  const out: Mistake[] = []
  for (const f of local.fillerWordsFound.slice(0, 3)) {
    out.push({
      quote: f.word,
      type: 'filler',
      issue: `"${f.word}" used ${f.count} time(s) — a verbal crutch that weakens delivery.`,
      correction: 'Pause silently instead of using a filler word.',
    })
  }
  for (const r of local.repeatedWords.slice(0, 2)) {
    out.push({
      quote: r.word,
      type: 'repetition',
      issue: `"${r.word}" repeated ${r.count} times — reads as repetitive to a listener.`,
      correction: 'Vary the word choice across repeats using a synonym.',
    })
  }
  for (const s of local.stammerExamples.slice(0, 2)) {
    out.push({
      quote: s.trim(),
      type: 'stammer',
      issue: 'Repeated or broken word — a stammer/restart in the delivery.',
      correction: 'Slow down slightly and complete the thought before speaking the next word.',
    })
  }
  return out
}

function defaultStrengths(local: ReturnType<typeof analyzeLocally>): string[] {
  const out: string[] = []
  if (local.wordCount > 30) out.push('Gave a reasonably detailed explanation rather than a one-liner.')
  if (local.fillerWordCount === 0) out.push('No filler words detected — crisp delivery.')
  if (out.length === 0) out.push('Attempted the slide content out loud, which is the most important step.')
  return out
}

function defaultImprovements(local: ReturnType<typeof analyzeLocally>): string[] {
  const out: string[] = []
  if (local.fillerWordCount > 0) out.push('Reduce filler words like "um", "like", or "basically" — pause silently instead.')
  if (local.repeatedWords.length > 0) out.push(`Vary vocabulary instead of repeating "${local.repeatedWords[0].word}" — try a synonym.`)
  if (local.stammerExamples.length > 0) out.push('Slow down slightly to avoid repeating or restarting words mid-sentence.')
  if (out.length === 0) out.push('Add a concrete example or number to make the point more memorable.')
  return out
}

function buildFallbackSpokenSummary(
  score: number,
  local: ReturnType<typeof analyzeLocally>,
  mistakes: Mistake[]
): string {
  const topIssue = mistakes[0]?.issue ?? 'nothing major stood out as a problem'
  const strength = local.fillerWordCount === 0
    ? 'you kept your delivery free of filler words'
    : 'you got through the slide content'
  return `Your score for this slide was ${score} out of 10. The main thing to work on is: ${topIssue}. On the positive side, ${strength}. For your next attempt, try to speak a bit more slowly and vary your word choice where you repeated yourself.`
}

function renderFeedbackText(f: PresentationFeedback, slideNumber: number): string {
  let text = `Slide ${slideNumber} Feedback\n\n`
  text += `Overall: ${f.overallScore}/10 (Content ${f.scoreBreakdown.contentCoverage} · Grammar ${f.scoreBreakdown.grammar} · Fluency ${f.scoreBreakdown.fluency} · Vocabulary ${f.scoreBreakdown.vocabulary})\n`
  text += `Words: ${f.wordCount}${f.paceWpm ? ` · Pace: ${f.paceWpm} wpm` : ''}\n`
  text += `Filler words: ${f.fillerWordCount > 0 ? f.fillerWordsFound.map(w => `${w.word} (${w.count})`).join(', ') : 'none'}\n`
  text += `Repeated words: ${f.repeatedWords.length > 0 ? f.repeatedWords.map(w => `${w.word} (${w.count})`).join(', ') : 'none'}\n`
  text += `Stammering: ${f.stammering.note}\n`
  text += `Mistakes found: ${f.mistakes.length}\n\n`
  text += `Clarity: ${f.clarityNotes}\n\n`
  text += f.summary
  return text
}