import { NextRequest, NextResponse } from 'next/server'

interface ConversationTurn {
  speaker: 'system' | 'user'
  text: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcript, topic, conversation, englishLevel } = body as {
      transcript: string
      topic?: string
      conversation?: ConversationTurn[]
      englishLevel?: string | null
    }

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      )
    }

    const aiResult = await generateAIConversationTurn(transcript, topic, conversation ?? [], englishLevel ?? null)

    return NextResponse.json({
      response: aiResult.response,
      feedback: aiResult.feedback,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    )
  }
}

// ── CEFR language complexity (same approach as the presentation route) ─────
function cefrClause(englishLevel: string | null): string {
  if (!englishLevel) return ''
  const level = String(englishLevel).toUpperCase()
  const guidance: Record<string, string> = {
    A1: 'Use very short sentences (5-8 words) and only the most common everyday words. No idioms, no phrasal verbs. Ask one simple question at a time.',
    A2: 'Use short, simple sentences and common vocabulary. Avoid idioms and complex grammar like conditionals or passive voice.',
    B1: 'Use clear, moderately simple sentences. You can use some everyday idioms, but avoid dense or rare vocabulary.',
    B2: 'Use natural conversational English — normal idioms and moderately complex sentences are fine.',
    C1: 'Use fluent, natural English including idiomatic phrasing and nuanced follow-up questions, as with a native speaker.',
    C2: 'Use sophisticated, idiomatic, native-level conversational English freely, including subtext and nuance.',
  }
  if (!guidance[level]) return ''
  return ` The learner's English level is ${level}. ${guidance[level]}`
}

// ── AI-backed conversation turn (primary), with the original canned logic
// as a safety-net fallback if both providers are unavailable ───────────────
async function generateAIConversationTurn(
  userMessage: string,
  topic: string | undefined,
  conversation: ConversationTurn[],
  englishLevel: string | null
): Promise<{ response: string; feedback: string }> {
  const history = conversation
    .slice(-8) // keep the prompt small — recent turns are what matter for a natural reply
    .map(t => `${t.speaker === 'user' ? 'Learner' : 'You'}: ${t.text}`)
    .join('\n')

  const systemPrompt =
    'You are a friendly, patient English conversation partner helping a learner practice speaking. ' +
    'Keep the conversation natural and engaging, ask one genuine follow-up question, and stay on topic.' +
    cefrClause(englishLevel) +
    ' Respond with ONLY valid JSON, no markdown fences, no commentary.'

  const userPrompt = `${topic ? `Conversation topic: "${topic}"\n` : ''}${history ? `Recent conversation:\n${history}\n\n` : ''}Learner just said: "${userMessage}"

Reply naturally, as their conversation partner would (1-3 sentences, at least one genuine follow-up question).
Then give brief, encouraging feedback on the learner's English in that message (grammar, vocabulary, fluency) —
2-4 short bullet points, specific to what they actually wrote, starting each strength with "✓".

Return ONLY this JSON:
{
  "response": "your natural conversational reply",
  "feedback": "✓ ...\\n• ...\\n..."
}`

  const raw =
    (await tryGroqChat(systemPrompt, userPrompt)) ??
    (await tryGeminiChat(systemPrompt, userPrompt))

  if (raw) {
    const parsed = parseChatJson(raw)
    if (parsed) return parsed
  }

  // Both providers unavailable/failed — fall back to the original
  // deterministic canned responder so conversation practice never breaks.
  return {
    response: generateCannedResponse(userMessage, topic),
    feedback: generateCannedFeedback(userMessage),
  }
}

function parseChatJson(rawText: string): { response: string; feedback: string } | null {
  const clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1))
    if (typeof parsed.response !== 'string') return null
    return {
      response: parsed.response,
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : generateCannedFeedback(''),
    }
  } catch {
    return null
  }
}

async function tryGroqChat(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null
  const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it']
  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content ?? ''
      if (text) return text
    } catch (err: any) {
      console.error(`❌ Groq chat [${model}]:`, err.message)
    }
  }
  return null
}

async function tryGeminiChat(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  const MODELS = ['gemini-2.5-flash-lite-preview-06-17', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-8b', 'gemini-1.5-flash']
  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 500 },
          }),
          signal: AbortSignal.timeout(15000),
        }
      )
      if (!res.ok) continue
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      if (text) return text
    } catch (err: any) {
      console.error(`❌ Gemini chat [${model}]:`, err.message)
    }
  }
  return null
}

// ── Fallback: original canned/keyword-based logic (unchanged behavior) ─────

function generateCannedResponse(userMessage: string, topic?: string): string {
  const lowerMessage = userMessage.toLowerCase()

  if (topic) {
    const topicResponses: { [key: string]: string[] } = {
      'Daily Routine': [
        'That sounds like a productive routine! What time do you usually have lunch?',
        'Interesting! How do you manage to stay so organized?',
        'Do you always follow this schedule, or is it flexible?'
      ],
      'Hobbies and Interests': [
        'That\'s fascinating! How long have you been interested in that?',
        'How often do you get to pursue this hobby?',
        'What inspired you to start doing this?'
      ],
      'Travel Experiences': [
        'That sounds amazing! Which destination would you visit again?',
        'What was the most memorable moment of your trip?',
        'How long did you stay there?'
      ],
      'Food and Cooking': [
        'Delicious! Do you cook often?',
        'What\'s your favorite ingredient to work with?',
        'Have you taken any cooking classes?'
      ],
      'Movies and Entertainment': [
        'Great taste! What was your favorite scene?',
        'Would you recommend it to others?',
        'Have you watched any similar movies?'
      ],
      'Work and Career': [
        'That\'s impressive! What do you find most rewarding?',
        'How long have you been in this field?',
        'What are your career goals?'
      ],
      'Family and Friends': [
        'That\'s wonderful! How often do you spend time together?',
        'What do you enjoy doing with them?',
        'Do you have any special traditions?'
      ],
      'Weather and Seasons': [
        'I agree! Do you prefer warm or cold weather?',
        'What activities do you enjoy in this season?',
        'How does the weather affect your mood?'
      ]
    }

    const responses = topicResponses[topic] || [
      'That\'s interesting! Tell me more about that.',
      'How does that make you feel?',
      'Can you elaborate on that?'
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  if (lowerMessage.includes('weekend') || lowerMessage.includes('free')) {
    return 'That sounds interesting! Could you tell me more about what you enjoyed most about it?'
  }
  if (lowerMessage.includes('work') || lowerMessage.includes('job')) {
    return 'I see. How long have you been working there? Do you enjoy what you do?'
  }
  if (lowerMessage.includes('friend') || lowerMessage.includes('family')) {
    return 'That\'s wonderful! How often do you get to spend time with them?'
  }
  if (lowerMessage.includes('like') || lowerMessage.includes('enjoy')) {
    return 'That\'s great! What is it about that you enjoy the most?'
  }
  if (lowerMessage.includes('movie') || lowerMessage.includes('film')) {
    return 'Oh nice! What was your favorite scene? Would you recommend it to others?'
  }

  return 'That\'s interesting! Could you tell me more about that?'
}

function generateCannedFeedback(transcript: string): string {
  const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length
  const sentenceCount = (transcript.match(/[.!?]/g) || []).length
  const hasQuestionMark = transcript.includes('?')
  const hasPunctuation = /[.!?]/.test(transcript)
  const words = transcript.split(/\s+/)
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size

  let feedback = '✓ Good effort! Here\'s my feedback:\n\n'

  if (wordCount < 5) {
    feedback += '• Response is too short - try to give longer answers (aim for 20+ words)\n'
  } else if (wordCount < 20) {
    feedback += '• Try to give more detailed responses\n'
  } else {
    feedback += '• ✓ Good response length!\n'
  }

  if (!hasQuestionMark && sentenceCount > 0) {
    feedback += '• Try asking questions to keep the conversation flowing naturally\n'
  } else if (hasQuestionMark) {
    feedback += '• ✓ Great! You asked a question to keep the conversation going\n'
  }

  if (!hasPunctuation) {
    feedback += '• Remember to use proper punctuation (.!?) to make your sentences clear\n'
  } else {
    feedback += '• ✓ Good use of punctuation\n'
  }

  if (uniqueWords < wordCount / 2) {
    feedback += '• Try using a variety of different words instead of repeating the same ones\n'
  } else {
    feedback += '• ✓ Nice vocabulary variety!\n'
  }

  feedback += '\nKeep practicing! Natural conversations improve with time.'

  return feedback
}
