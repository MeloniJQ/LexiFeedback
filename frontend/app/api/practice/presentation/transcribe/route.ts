import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/practice/presentation/transcribe
 *
 * Accepts a multipart/form-data body containing an `audio` file
 * (webm/opus, mp4, wav — whatever MediaRecorder produced) and returns
 * the transcribed text using Groq's hosted Whisper endpoint, plus a
 * per-word "confident" flag derived from Whisper's segment-level
 * avg_logprob.
 *
 * IMPORTANT HONESTY NOTE: Whisper does not do true phoneme-level
 * pronunciation assessment. avg_logprob reflects how confident the model
 * was about what it transcribed for that stretch of audio — low
 * confidence often correlates with unclear/mispronounced speech, but it
 * can also be caused by background noise, fast speech, or an unusual
 * word. Treat `confident: false` as "worth double-checking," not a
 * certified pronunciation error. A real pronunciation score would need
 * a dedicated service (Azure Speech, Speechace, ELSA), which this app
 * does not currently integrate.
 */

interface WhisperWord {
  word: string
  start: number
  end: number
}

interface WhisperSegment {
  start: number
  end: number
  avg_logprob?: number
  no_speech_prob?: number
}

interface WordConfidence {
  word: string
  start: number
  end: number
  confident: boolean
}

// Below this avg_logprob, we treat the segment (and its words) as
// low-confidence. Tunable — more negative = more lenient (fewer flags).
const CONFIDENCE_THRESHOLD = -0.55

function buildWordConfidence(
  words: WhisperWord[] | undefined,
  segments: WhisperSegment[] | undefined
): WordConfidence[] {
  if (!words || words.length === 0) return []

  return words.map((w) => {
    const segment =
      (segments ?? []).find((s) => w.start >= s.start && w.start < s.end) ??
      (segments ?? [])
        .filter((s) => s.start <= w.start)
        .sort((a, b) => b.start - a.start)[0]

    const confident =
      !segment || typeof segment.avg_logprob !== 'number'
        ? true
        : segment.avg_logprob > CONFIDENCE_THRESHOLD

    return {
      word: w.word.trim(),
      start: w.start,
      end: w.end,
      confident,
    }
  })
}

async function transcribeWithGroq(audioFile: File, model: string) {
  const apiKey = process.env.GROQ_API_KEY!
  const ext = audioFile.type.includes('mp4') ? 'mp4' : audioFile.type.includes('wav') ? 'wav' : 'webm'

  const groqForm = new FormData()
  groqForm.append('file', audioFile, `slide-recording.${ext}`)
  groqForm.append('model', model)
  groqForm.append('response_format', 'verbose_json')
  groqForm.append('temperature', '0')
  // Request both segment- and word-level timestamps. If the model/endpoint
  // doesn't support word granularity, Groq will just omit `words` and this
  // route gracefully falls back to "everything confident" (see below).
  groqForm.append('timestamp_granularities[]', 'segment')
  groqForm.append('timestamp_granularities[]', 'word')

  return fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: groqForm,
  })
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured on the server (.env.local).' },
        { status: 500 }
      )
    }

    const incomingForm = await request.formData()
    const audioFile = incomingForm.get('audio') as File | null

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: 'No audio file received.' }, { status: 400 })
    }

    if (audioFile.size < 1000) {
      return NextResponse.json(
        { error: 'Recording was too short to transcribe. Please record a bit more.' },
        { status: 400 }
      )
    }

    let res = await transcribeWithGroq(audioFile, 'whisper-large-v3-turbo')

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('Groq transcription failed (turbo):', res.status, errText)
      // Retry once with the full model
      res = await transcribeWithGroq(audioFile, 'whisper-large-v3')
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Transcription failed. Please try recording again.' },
          { status: 502 }
        )
      }
    }

    const data = await res.json()
    const transcript: string = (data.text ?? '').trim()

    if (!transcript) {
      return NextResponse.json(
        { error: 'No speech detected in the recording. Please try again.' },
        { status: 400 }
      )
    }

    const wordConfidence = buildWordConfidence(data.words, data.segments)

    return NextResponse.json({
      transcript,
      durationSec: data.duration ?? null,
      segments: data.segments ?? null,
      wordConfidence, // [{ word, start, end, confident }] — see honesty note above
    })
  } catch (error: any) {
    console.error('Transcribe error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}