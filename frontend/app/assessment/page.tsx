'use client'

/**
 * CEFR Initial English Level Assessment (Feature 1).
 *
 * First-time users are redirected here before ever seeing the dashboard
 * (see hooks/use-auth.ts + app/dashboard/layout.tsx). It's also reachable
 * any time from Settings as "Retake Assessment" for reassessment — the
 * backend simply overwrites the user's stored level on submit either way.
 *
 * Flow: Grammar → Vocabulary → Reading → Listening → Speaking → Result.
 * Reuses useVoiceRecorder (mic handling + error states) and the existing
 * /api/voice/transcribe endpoint for the speaking section, same as the
 * interview/reading practice pages.
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getToken, getCurrentUser, setAuth } from '@/lib/auth'
import {
  API_URL as API,
  startAssessment,
  submitAssessment,
  type AssessmentPackage,
  type AssessmentResult,
} from '@/lib/api'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import {
  Loader2, Mic, Square, ChevronRight, AlertCircle, CheckCircle2,
  BookOpen, Headphones, PenLine, Sparkles, RotateCcw,
} from 'lucide-react'

type Step =
  | 'intro' | 'grammar' | 'vocabulary' | 'reading' | 'listening'
  | 'speaking_readaloud' | 'speaking_open' | 'submitting' | 'result' | 'error'

const CEFR_LABELS: Record<string, string> = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper Intermediate', C1: 'Advanced', C2: 'Proficient',
}

const STEP_ORDER: Step[] = ['grammar', 'vocabulary', 'reading', 'listening', 'speaking_readaloud', 'speaking_open']

export default function AssessmentPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('intro')
  const [pkg, setPkg] = useState<AssessmentPackage | null>(null)
  const [loadError, setLoadError] = useState('')

  const [grammarAnswers, setGrammarAnswers] = useState<Record<string, number>>({})
  const [vocabAnswers, setVocabAnswers] = useState<Record<string, number>>({})
  const [readingAnswers, setReadingAnswers] = useState<number[]>([])
  const [listeningAnswers, setListeningAnswers] = useState<number[]>([])
  const [hasPlayedListening, setHasPlayedListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const [readaloudTranscript, setReadaloudTranscript] = useState('')
  const [openIdx, setOpenIdx] = useState(0)
  const [openTranscripts, setOpenTranscripts] = useState<string[]>([])
  const [transcribing, setTranscribing] = useState(false)
  const [micError, setMicError] = useState('')

  const [result, setResult] = useState<AssessmentResult | null>(null)

  const recorder = useVoiceRecorder()

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
  }, [router])

  const loadAssessment = useCallback(async () => {
    setLoadError('')
    setStep('intro')
    try {
      const data = await startAssessment()
      setPkg(data)
      // Reset all answer state for a clean retake.
      setGrammarAnswers({})
      setVocabAnswers({})
      setReadingAnswers([])
      setListeningAnswers([])
      setHasPlayedListening(false)
      setReadaloudTranscript('')
      setOpenIdx(0)
      setOpenTranscripts([])
      setResult(null)
      // BUG FIX: without this, `step` stayed 'intro' forever even though the
      // package loaded fine — the render guard `step === 'intro' || !pkg`
      // kept showing the spinner indefinitely since `step` never advanced.
      setStep('grammar')
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load the assessment.')
      setStep('error')
    }
  }, [])

  useEffect(() => {
    loadAssessment()
  }, [loadAssessment])

  const goNext = () => {
    const idx = STEP_ORDER.indexOf(step)
    if (idx === -1 || idx === STEP_ORDER.length - 1) return
    setStep(STEP_ORDER[idx + 1])
  }

  // ── Transcription helper (shared by readaloud + open questions) ─────────
  const transcribeCurrentRecording = async (): Promise<string> => {
    if (!recorder.audioBlob) return ''
    setTranscribing(true)
    setMicError('')
    try {
      const token = getToken()
      const fd = new FormData()
      const ext = recorder.audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
      fd.append('audio', recorder.audioBlob, `answer.${ext}`)
      fd.append('language', 'en')

      const res = await fetch(`${API}/voice/transcribe`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Transcription failed')
      return data.transcript || ''
    } catch (e: any) {
      setMicError(`Couldn't process that recording (${e.message}). Please retry.`)
      return ''
    } finally {
      setTranscribing(false)
    }
  }

  const handleReadaloudDone = async () => {
    const text = await transcribeCurrentRecording()
    if (!text) return // keep them on this step to retry
    setReadaloudTranscript(text)
    recorder.resetRecording()
    goNext()
  }

  const handleSkipReadaloud = () => {
    setReadaloudTranscript('')
    recorder.resetRecording()
    goNext()
  }

  const handleOpenAnswerDone = async () => {
    const text = await transcribeCurrentRecording()
    if (!text) return
    const updated = [...openTranscripts, text]
    setOpenTranscripts(updated)
    recorder.resetRecording()

    if (pkg && openIdx + 1 < pkg.speaking.open_questions.length) {
      setOpenIdx(openIdx + 1)
    } else {
      await handleSubmit(updated)
    }
  }

  const handleSkipOpenAnswer = async () => {
    recorder.resetRecording()
    const updated = [...openTranscripts, '']
    setOpenTranscripts(updated)

    if (pkg && openIdx + 1 < pkg.speaking.open_questions.length) {
      setOpenIdx(openIdx + 1)
    } else {
      await handleSubmit(updated)
    }
  }

  const handleSubmit = async (finalOpenTranscripts: string[]) => {
    if (!pkg) return
    setStep('submitting')
    try {
      const res = await submitAssessment({
        grammar: grammarAnswers,
        vocabulary: vocabAnswers,
        reading_answers: readingAnswers,
        listening_answers: listeningAnswers,
        speaking: {
          readaloud_transcript: readaloudTranscript,
          readaloud_reference: pkg.speaking.readaloud_sentence,
          open_transcripts: finalOpenTranscripts,
        },
      })
      setResult(res)

      // Refresh the cached user so the dashboard guard sees assessment_completed = true.
      const freshUser = await getCurrentUser()
      const token = getToken()
      if (freshUser && token) setAuth(token, freshUser)

      setStep('result')
    } catch (e: any) {
      setLoadError(e.message || 'Failed to score the assessment.')
      setStep('error')
    }
  }

  const speakListening = () => {
    if (!pkg) return
    try {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(pkg.listening.script)
      utter.rate = 0.95
      utter.onstart = () => setIsSpeaking(true)
      utter.onend = () => { setIsSpeaking(false); setHasPlayedListening(true) }
      utter.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utter)
    } catch {
      // speechSynthesis unsupported — let them read the transcript-free
      // question anyway rather than block the whole assessment.
      setIsSpeaking(false)
      setHasPlayedListening(true)
    }
  }

  const stopListening = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  // Safety net: never leave speech synthesis running if the user navigates
  // away or the component unmounts mid-playback.
  useEffect(() => {
    return () => { window.speechSynthesis.cancel() }
  }, [])

  const stepIndex = STEP_ORDER.indexOf(step)
  const progressPct = stepIndex >= 0 ? Math.round(((stepIndex) / STEP_ORDER.length) * 100) : 0

  // ── Render ────────────────────────────────────────────────────────────

  if (step === 'error') {
    return (
      <Shell>
        <div className="text-center py-16">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={40} />
          <p className="text-[#6B7280] dark:text-gray-400 mb-6">{loadError}</p>
          <Button onClick={loadAssessment}>
            <RotateCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      </Shell>
    )
  }

  if (step === 'intro' || !pkg) {
    return (
      <Shell>
        <div className="text-center py-16">
          <Loader2 className="mx-auto mb-4 animate-spin text-[#2C5AA0]" size={36} />
          <p className="text-[#6B7280] dark:text-gray-400">Preparing your English level assessment…</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {step !== 'result' && step !== 'submitting' && (
        <div className="mb-8">
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-2 uppercase tracking-wide">
            Step {Math.max(1, stepIndex + 1)} of {STEP_ORDER.length}
          </p>
        </div>
      )}

      {step === 'grammar' && (
        <McqSection
          icon={<PenLine className="text-[#2C5AA0]" />}
          title="Grammar"
          items={pkg.grammar.items}
          answers={grammarAnswers}
          onAnswer={(id, i) => setGrammarAnswers((prev) => ({ ...prev, [id]: i }))}
          onContinue={goNext}
        />
      )}

      {step === 'vocabulary' && (
        <McqSection
          icon={<Sparkles className="text-[#2C5AA0]" />}
          title="Vocabulary"
          items={pkg.vocabulary.items}
          answers={vocabAnswers}
          onAnswer={(id, i) => setVocabAnswers((prev) => ({ ...prev, [id]: i }))}
          onContinue={goNext}
        />
      )}

      {step === 'reading' && (
        <div>
          <SectionHeader icon={<BookOpen className="text-[#2C5AA0]" />} title="Reading" />
          <div className="bg-[#F9FAFB] dark:bg-[#1E293B] rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-2">{pkg.reading.title}</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#374151] dark:text-gray-300">
              {pkg.reading.content}
            </p>
          </div>
          <ComprehensionQuestions
            questions={pkg.reading.questions}
            answers={readingAnswers}
            onAnswer={(qi, oi) => {
              const next = [...readingAnswers]
              next[qi] = oi
              setReadingAnswers(next)
            }}
            onContinue={goNext}
          />
        </div>
      )}

      {step === 'listening' && (
        <div>
          <SectionHeader icon={<Headphones className="text-[#2C5AA0]" />} title="Listening" />
          <div className="bg-[#F9FAFB] dark:bg-[#1E293B] rounded-xl p-6 mb-6 text-center">
            <h3 className="font-semibold mb-4">{pkg.listening.title}</h3>
            {!isSpeaking ? (
              <Button onClick={speakListening} variant="outline">
                ▶ Play Audio
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[#2C5AA0] text-sm font-medium">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2C5AA0] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2C5AA0]" />
                  </span>
                  Playing audio…
                </div>
                <Button onClick={stopListening} variant="destructive">
                  <Square className="mr-2 h-4 w-4" /> Stop Audio
                </Button>
              </div>
            )}
            <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-3">
              You can replay it as many times as you like before answering.
            </p>
          </div>
          <ComprehensionQuestions
            questions={pkg.listening.questions}
            answers={listeningAnswers}
            disabled={!hasPlayedListening}
            onAnswer={(qi, oi) => {
              const next = [...listeningAnswers]
              next[qi] = oi
              setListeningAnswers(next)
            }}
            onContinue={() => { stopListening(); goNext() }}
          />
        </div>
      )}

      {step === 'speaking_readaloud' && (
        <div>
          <SectionHeader icon={<Mic className="text-[#2C5AA0]" />} title="Speaking — Read Aloud" />
          <div className="bg-[#F9FAFB] dark:bg-[#1E293B] rounded-xl p-6 mb-6">
            <p className="text-lg leading-relaxed">"{pkg.speaking.readaloud_sentence}"</p>
          </div>
          <RecorderControls
            recorder={recorder}
            transcribing={transcribing}
            micError={micError}
            onDone={handleReadaloudDone}
            onSkip={handleSkipReadaloud}
          />
        </div>
      )}

      {step === 'speaking_open' && (
        <div>
          <SectionHeader icon={<Mic className="text-[#2C5AA0]" />} title="Speaking — Open Question" />
          <p className="text-xs text-[#6B7280] dark:text-gray-400 mb-2">
            Question {openIdx + 1} of {pkg.speaking.open_questions.length}
          </p>
          <div className="bg-[#F9FAFB] dark:bg-[#1E293B] rounded-xl p-6 mb-6">
            <p className="text-lg leading-relaxed">{pkg.speaking.open_questions[openIdx]}</p>
          </div>
          <RecorderControls
            recorder={recorder}
            transcribing={transcribing}
            micError={micError}
            onDone={handleOpenAnswerDone}
            onSkip={handleSkipOpenAnswer}
          />
        </div>
      )}

      {step === 'submitting' && (
        <div className="text-center py-16">
          <Loader2 className="mx-auto mb-4 animate-spin text-[#2C5AA0]" size={36} />
          <p className="text-[#6B7280] dark:text-gray-400">Scoring your assessment…</p>
        </div>
      )}

      {step === 'result' && result && (
        <div className="text-center py-8">
          <CheckCircle2 className="mx-auto mb-4 text-green-500" size={48} />
          <p className="text-sm uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-1">
            Your English Level
          </p>
          <h2 className="text-5xl font-bold text-[#2C5AA0] mb-1">{result.english_level}</h2>
          <p className="text-lg mb-8">{CEFR_LABELS[result.english_level] ?? ''}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto mb-10 text-left">
            <ScoreTile label="Grammar" value={result.grammar_score} />
            <ScoreTile label="Vocabulary" value={result.vocabulary_score} />
            <ScoreTile label="Reading" value={result.reading_score} />
            <ScoreTile label="Listening" value={result.listening_score} />
            <ScoreTile label="Speaking" value={result.speaking_score} />
            <ScoreTile label="Pronunciation" value={result.pronunciation_score} />
            <ScoreTile label="Fluency" value={result.fluency_score} />
            <ScoreTile label="Overall" value={result.overall_score} highlight />
          </div>

          <Button size="lg" onClick={() => router.push('/dashboard')}>
            Go to Dashboard <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </Shell>
  )
}

// ─── Small presentational helpers ─────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#2C5AA0] mb-2">English Level Assessment</h1>
          <p className="text-[#6B7280] dark:text-gray-400 text-sm">
            A quick CEFR placement test so every practice mode matches your level.
          </p>
        </div>
        <div className="bg-white dark:bg-[#131C2E] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
  )
}

function McqSection({
  icon, title, items, answers, onAnswer, onContinue,
}: {
  icon: React.ReactNode
  title: string
  items: { id: string; question: string; options: string[] }[]
  answers: Record<string, number>
  onAnswer: (id: string, optionIndex: number) => void
  onContinue: () => void
}) {
  const answeredCount = items.filter((i) => answers[i.id] !== undefined).length
  return (
    <div>
      <SectionHeader icon={icon} title={title} />
      <p className="text-xs text-[#6B7280] dark:text-gray-400 -mt-2 mb-4">
        Not sure? It's fine to leave a question unanswered and continue — you can skip any question.
      </p>
      <div className="space-y-6 mb-6">
        {items.map((item, qi) => (
          <div key={item.id}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium">{qi + 1}. {item.question}</p>
              {answers[item.id] === undefined && (
                <span className="text-xs text-[#6B7280] dark:text-gray-400 shrink-0 ml-3 italic">Not answered</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {item.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => onAnswer(item.id, oi)}
                  className={`text-left px-4 py-2 rounded-lg border text-sm transition ${
                    answers[item.id] === oi
                      ? 'border-[#2C5AA0] bg-[#2C5AA0]/10 font-medium'
                      : 'border-gray-200 dark:border-gray-700 hover:border-[#2C5AA0]/50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={onContinue} className="w-full">
        {answeredCount < items.length ? `Continue (${items.length - answeredCount} skipped)` : 'Continue'} <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  )
}

function ComprehensionQuestions({
  questions, answers, onAnswer, onContinue, disabled,
}: {
  questions: { question: string; options: string[] }[]
  answers: number[]
  onAnswer: (questionIndex: number, optionIndex: number) => void
  onContinue: () => void
  disabled?: boolean
}) {
  const answeredCount = questions.filter((_, qi) => answers[qi] !== undefined).length
  return (
    <div>
      <div className={`space-y-6 mb-6 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {questions.map((q, qi) => (
          <div key={qi}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium">{qi + 1}. {q.question}</p>
              {answers[qi] === undefined && (
                <span className="text-xs text-[#6B7280] dark:text-gray-400 shrink-0 ml-3 italic">Not answered</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => onAnswer(qi, oi)}
                  className={`text-left px-4 py-2 rounded-lg border text-sm transition ${
                    answers[qi] === oi
                      ? 'border-[#2C5AA0] bg-[#2C5AA0]/10 font-medium'
                      : 'border-gray-200 dark:border-gray-700 hover:border-[#2C5AA0]/50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button disabled={disabled} onClick={onContinue} className="w-full">
        {answeredCount < questions.length ? `Continue (${questions.length - answeredCount} skipped)` : 'Continue'} <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  )
}

function RecorderControls({
  recorder, transcribing, micError, onDone, onSkip,
}: {
  recorder: ReturnType<typeof useVoiceRecorder>
  transcribing: boolean
  micError: string
  onDone: () => void
  onSkip: () => void
}) {
  // Safety net: auto-stop after 3 minutes so a recording can never run
  // away indefinitely even if something else goes wrong in the UI.
  useEffect(() => {
    if (recorder.state !== 'recording') return
    if (recorder.durationMs > 3 * 60 * 1000) {
      recorder.stopRecording()
    }
  }, [recorder.state, recorder.durationMs])

  const fmtTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div className="text-center">
      {(recorder.state === 'error' || micError) && (
        <div className="mb-4 flex items-start gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-left">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{micError || recorder.errorMessage}</span>
        </div>
      )}

      {recorder.state === 'idle' && (
        <Button size="lg" onClick={recorder.startRecording}>
          <Mic className="mr-2 h-4 w-4" /> Start Recording
        </Button>
      )}

      {recorder.state === 'requesting' && (
        <Button size="lg" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting microphone…
        </Button>
      )}

      {recorder.state === 'recording' && (
        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-sm font-mono font-medium text-red-600">
              {fmtTime(recorder.durationMs)}
            </span>
          </div>
          <div className="mb-4 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className="h-full bg-[#2C5AA0] transition-all"
              style={{ width: `${recorder.audioLevel}%` }}
            />
          </div>
          <Button
            size="lg"
            variant="destructive"
            onClick={recorder.stopRecording}
            className="w-full sm:w-auto min-w-[220px] text-base font-semibold shadow-md"
          >
            <Square className="mr-2 h-5 w-5" /> Stop Recording
          </Button>
        </div>
      )}

      {(recorder.state === 'processing' || transcribing) && (
        <Button size="lg" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
        </Button>
      )}

      {recorder.state === 'done' && !transcribing && (
        <div className="flex flex-col items-center gap-3">
          <Button size="lg" onClick={onDone}>
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <button
            className="text-xs text-[#6B7280] dark:text-gray-400 underline"
            onClick={recorder.resetRecording}
          >
            Re-record
          </button>
        </div>
      )}

      {recorder.state === 'error' && (
        <Button size="lg" variant="outline" onClick={recorder.startRecording}>
          <RotateCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      )}

      {/* Skip is always available except mid-recording/mid-processing, so a
          mic problem or simply not wanting to answer never blocks progress. */}
      {['idle', 'requesting', 'error'].includes(recorder.state) && !transcribing && (
        <div className="mt-4">
          <button
            className="text-xs text-[#6B7280] dark:text-gray-400 underline"
            onClick={onSkip}
          >
            Skip this question
          </button>
        </div>
      )}
    </div>
  )
}

function ScoreTile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        highlight
          ? 'border-[#2C5AA0] bg-[#2C5AA0]/10'
          : 'border-gray-100 dark:border-gray-800 bg-[#F9FAFB] dark:bg-[#1E293B]'
      }`}
    >
      <p className="text-xs text-[#6B7280] dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold">{Math.round(value ?? 0)}</p>
    </div>
  )
}
