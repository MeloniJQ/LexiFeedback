'use client'

import { useState, useRef, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Mic, Square, Send, Upload, FileText,
  Wand2, ChevronLeft, ChevronRight, Loader2, Download, Plus, X,
  AlertCircle, CheckCircle2, PlayCircle, RotateCcw, Volume2, VolumeX,
  Target, ListChecks, Repeat, Sparkles, Activity,
} from 'lucide-react'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'

import { getUser } from '@/lib/auth'

interface Slide {
  title: string
  bullets: string[]
  content?: string
  imageBase64?: string
  imageMime?: string
  image?: string
}

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
  contentCoverage: number
  grammar: number
  fluency: number
  vocabulary: number
}

interface PresentationFeedback {
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

type SlideStatus = 'idle' | 'recorded' | 'transcribing' | 'analyzing' | 'done' | 'error'

interface SlideRecording {
  audioBlob: Blob | null
  audioUrl: string | null
  durationSec: number | null
  transcript: string
  feedback: PresentationFeedback | null
  status: SlideStatus
  error: string | null
}

const emptyRecording = (): SlideRecording => ({
  audioBlob: null,
  audioUrl: null,
  durationSec: null,
  transcript: '',
  feedback: null,
  status: 'idle',
  error: null,
})

function downloadPptx(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function RealSlideViewer({
  slides, current, onSelect, recordings,
}: {
  slides: any[]; current: number; onSelect: (i: number) => void
  recordings: Record<number, SlideRecording>
}) {
  return (
    <div className="space-y-4">
      <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-black flex items-center justify-center">
        <img
          src={slides[current].image}
          alt={`Slide ${current + 1}`}
          className="w-full h-auto object-contain"
          style={{ maxHeight: '75vh' }}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((slide, i) => {
          const rec = recordings[i]
          const hasRecording = !!rec?.audioBlob
          const hasFeedback = !!rec?.feedback
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all relative ${
                i === current
                  ? 'border-blue-500 ring-2 ring-blue-400'
                  : 'border-gray-600 hover:border-blue-400'
              }`}
              style={{ width: '130px' }}
            >
              <img
                src={slide.image}
                alt={`Slide ${i + 1}`}
                className="w-full object-cover"
                style={{ height: '73px' }}
              />
              <div className="bg-gray-900 text-center py-1">
                <span className="text-gray-300 text-[9px]">Slide {i + 1}</span>
              </div>
              {hasRecording && (
                <div className={`absolute top-1 right-1 rounded-full p-0.5 ${hasFeedback ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  {hasFeedback
                    ? <CheckCircle2 className="w-3 h-3 text-white" />
                    : <Mic className="w-3 h-3 text-white" />}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SlideCard({ slide, index, total, contentMode }: {
  slide: any; index: number; total: number; contentMode: string
}) {
  const title: string = slide?.title ?? 'Untitled'
  const bullets: string[] = Array.isArray(slide?.bullets) ? slide.bullets : []
  const content: string = slide?.content ?? ''
  const imageBase64: string | undefined = slide?.imageBase64
  const imageMime: string = slide?.imageMime ?? 'image/jpeg'

  return (
    <div
      className="w-full rounded-xl shadow-xl overflow-hidden relative select-none"
      style={{ aspectRatio: '16/9' }}
    >
      {imageBase64 ? (
        <img
          src={`data:${imageMime};base64,${imageBase64}`}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-blue-900" />
      )}
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col h-full p-10 text-white">
        <div className="text-xs font-medium text-blue-300 mb-2">Slide {index + 1} / {total}</div>
        <div className="w-10 h-1 bg-blue-400 rounded mb-4" />
        <h2 className="text-3xl font-bold mb-6 leading-snug drop-shadow-lg">{title}</h2>
        {contentMode === 'paragraphs' && content ? (
          <p className="text-white/90 text-sm leading-relaxed drop-shadow">{content}</p>
        ) : bullets.length > 0 ? (
          <ul className="space-y-3 flex-1 overflow-hidden">
            {bullets.slice(0, 5).map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-base text-white/90">
                <span className="mt-2 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="drop-shadow">{b}</span>
              </li>
            ))}
            {bullets.length > 5 && (
              <li className="text-xs text-blue-300 italic">+ {bullets.length - 5} more…</li>
            )}
          </ul>
        ) : (
          <p className="text-white/60 italic text-sm mt-4">(No content)</p>
        )}
      </div>
    </div>
  )
}

function ThumbnailStrip({ slides, current, onSelect, recordings }: {
  slides: any[]; current: number; onSelect: (i: number) => void
  recordings: Record<number, SlideRecording>
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
      {slides.map((slide, i) => {
        const imageBase64 = slide?.imageBase64
        const imageMime = slide?.imageMime ?? 'image/jpeg'
        const title = slide?.title ?? ''
        const rec = recordings[i]
        const hasRecording = !!rec?.audioBlob
        const hasFeedback = !!rec?.feedback
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex-shrink-0 w-28 rounded-lg overflow-hidden border-2 transition-all relative ${
              i === current
                ? 'border-blue-500 ring-2 ring-blue-300'
                : 'border-gray-600 hover:border-blue-400'
            }`}
          >
            {imageBase64 ? (
              <img
                src={`data:${imageMime};base64,${imageBase64}`}
                alt={title}
                className="w-full object-cover"
                style={{ height: '64px' }}
              />
            ) : (
              <div className="bg-gradient-to-br from-blue-700 to-blue-900 h-16" />
            )}
            <div className="absolute inset-0 bg-black/25 flex flex-col justify-end p-1">
              <span className="text-white text-[8px] font-bold truncate leading-tight">{title}</span>
              <span className="text-blue-300 text-[7px]">Slide {i + 1}</span>
            </div>
            {hasRecording && (
              <div className={`absolute top-1 right-1 rounded-full p-0.5 ${hasFeedback ? 'bg-green-500' : 'bg-yellow-500'}`}>
                {hasFeedback
                  ? <CheckCircle2 className="w-3 h-3 text-white" />
                  : <Mic className="w-3 h-3 text-white" />}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Feedback display helpers ──────────────────────────────────────────────────
function Pill({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'red' | 'yellow' | 'green' | 'blue' }) {
  const tones: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}

function ScoreBar({ label, score, weightPct }: { label: string; score: number; weightPct: number }) {
  const pct = (score / 10) * 100
  const color = score >= 7.5 ? 'bg-green-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = score >= 7.5 ? 'text-green-600 dark:text-green-400' : score >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {label} <span className="text-gray-400">({weightPct}%)</span>
        </span>
        <span className={`text-xs font-bold ${textColor}`}>{score}/10</span>
      </div>
      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// A consistently-styled, numbered section wrapper — used for every block in
// the feedback report so the whole panel reads as one structured document
// instead of a loose stack of differently-styled cards.
function ReportSection({
  number, icon, title, tone = 'default', children,
}: {
  number: number
  icon: React.ReactNode
  title: string
  tone?: 'default' | 'warn' | 'good' | 'bad'
  children: React.ReactNode
}) {
  const toneClasses: Record<string, string> = {
    default: 'border-gray-200 dark:border-gray-700',
    warn: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10',
    good: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10',
    bad: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10',
  }
  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-bold flex items-center justify-center">
          {number}
        </span>
        {icon}
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      </div>
      {children}
    </div>
  )
}

// Wraps the browser's built-in speech synthesis so the feedback summary can
// be read aloud with no backend call, no extra API cost, and no dependency
// on any TTS service being configured. Works in Chrome, Edge, Safari.
function useSpeakSummary() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  const speak = (text: string) => {
    if (!supported || !text.trim()) return
    window.speechSynthesis.cancel() // stop anything already playing
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const stop = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  return { speak, stop, isSpeaking, supported }
}

function MistakePill({ type }: { type: MistakeType }) {
  const labels: Record<MistakeType, { label: string; tone: 'red' | 'yellow' | 'blue' | 'gray' }> = {
    grammar:    { label: 'Grammar',    tone: 'red' },
    clarity:    { label: 'Clarity',    tone: 'yellow' },
    vocabulary: { label: 'Vocabulary', tone: 'blue' },
    structure:  { label: 'Structure',  tone: 'yellow' },
    filler:     { label: 'Filler',     tone: 'gray' },
    repetition: { label: 'Repetition', tone: 'gray' },
    stammer:    { label: 'Stammer',    tone: 'red' },
    'off-topic':{ label: 'Off-topic',  tone: 'red' },
  }
  const { label, tone } = labels[type] ?? { label: type, tone: 'gray' as const }
  return <Pill tone={tone}>{label}</Pill>
}

// ── Structured feedback report ──────────────────────────────────────────────
// Fixed section order every time: Score & Summary → Topic Relevance →
// Delivery Metrics → Mistakes → Vocabulary → Filler/Stammer → Repeated Words
// → Clarity → Top Improvements → Strengths. Same order, same card style,
// every time — reads like a report, not a scattered list.
function FeedbackPanel({ feedback }: { feedback: PresentationFeedback }) {
  const { speak, stop, isSpeaking, supported: ttsSupported } = useSpeakSummary()
  const scoreTone = feedback.overallScore >= 8 ? 'text-green-600' : feedback.overallScore >= 5.5 ? 'text-yellow-600' : 'text-red-600'
  const tr = feedback.topicRelevance
  let sectionNum = 0
  const next = () => ++sectionNum

  return (
    <div className="space-y-4">
      {/* Score + written summary — always first, not numbered like the rest
          since it's the report header, not a section */}
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <div className={`text-3xl font-bold ${scoreTone}`}>{feedback.overallScore}<span className="text-base text-gray-400">/10</span></div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {tr && (
                <Pill tone={tr.onTopic ? 'green' : 'red'}>
                  {tr.onTopic ? 'On topic' : 'Off topic'} · coverage {tr.coverageScore}/10
                </Pill>
              )}
              <span className="text-xs text-gray-400">{feedback.wordCount} words</span>
              {feedback.paceWpm && <span className="text-xs text-gray-400">{feedback.paceWpm} words/min</span>}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{feedback.summary}</p>
            {ttsSupported && feedback.spokenSummary && (
              <button
                onClick={() => (isSpeaking ? stop() : speak(feedback.spokenSummary))}
                className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors text-xs font-medium"
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isSpeaking ? 'Stop' : 'Listen to Summary'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ① Score Breakdown — the actual, transparent scoring math */}
      <ReportSection number={next()} icon={<Sparkles className="w-4 h-4 text-gray-500" />} title="How This Score Was Calculated">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <ScoreBar label="Content / Topic Coverage" score={feedback.scoreBreakdown.contentCoverage} weightPct={30} />
          <ScoreBar label="Grammar Accuracy" score={feedback.scoreBreakdown.grammar} weightPct={25} />
          <ScoreBar label="Fluency (filler/stammer/repetition)" score={feedback.scoreBreakdown.fluency} weightPct={25} />
          <ScoreBar label="Vocabulary" score={feedback.scoreBreakdown.vocabulary} weightPct={20} />
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Overall score = weighted sum of these four. Fluency is calculated directly from your filler word,
          stammer, and repetition counts — not judged by the AI — so it can't be inconsistent.
        </p>
      </ReportSection>

      {/* ② Delivery Metrics — quick-glance numbers, always shown */}
      <ReportSection number={next()} icon={<Activity className="w-4 h-4 text-gray-500" />} title="Delivery Metrics">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Words" value={String(feedback.wordCount)} />
          <StatCard label="Pace" value={feedback.paceWpm ? `${feedback.paceWpm} wpm` : '—'} />
          <StatCard label="Filler words" value={String(feedback.fillerWordCount)} />
          <StatCard label="Mistakes" value={String(feedback.mistakes.length)} />
        </div>
      </ReportSection>

      {/* ② Topic Relevance */}
      {tr && (
        <ReportSection
          number={next()}
          icon={<Target className="w-4 h-4 text-gray-500" />}
          title="Topic Relevance"
          tone={tr.onTopic ? 'good' : 'bad'}
        >
          <p className="text-xs text-gray-600 dark:text-gray-400">{tr.note}</p>
        </ReportSection>
      )}

      {/* ③ Mistakes Found */}
      {feedback.mistakes.length > 0 && (
        <ReportSection number={next()} icon={<AlertCircle className="w-4 h-4 text-gray-500" />} title={`Mistakes Found (${feedback.mistakes.length})`}>
          <div className="space-y-2">
            {feedback.mistakes.map((m, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <MistakePill type={m.type} />
                  <span className="text-xs text-gray-400 italic">"{m.quote}"</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{m.issue}</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">→ {m.correction}</p>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* ④ Vocabulary Suggestions */}
      {feedback.vocabularySuggestions.length > 0 && (
        <ReportSection number={next()} icon={<Sparkles className="w-4 h-4 text-gray-500" />} title="Vocabulary Suggestions">
          <ul className="space-y-1.5">
            {feedback.vocabularySuggestions.map((v, i) => (
              <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex flex-wrap items-center gap-1.5">
                <Pill tone="red">"{v.used}"</Pill>
                <span>→</span>
                <Pill tone="blue">"{v.suggestion}"</Pill>
                <span className="text-gray-400">— {v.reason}</span>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {/* ⑤ Filler Words & Stammering */}
      <ReportSection number={next()} icon={<Mic className="w-4 h-4 text-gray-500" />} title="Filler Words & Stammering">
        {feedback.fillerWordCount > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {feedback.fillerWordsFound.map((f) => (
              <Pill key={f.word} tone="yellow">"{f.word}" × {f.count}</Pill>
            ))}
          </div>
        ) : (
          <p className="text-xs text-green-600 mb-1.5">No filler words detected ✓</p>
        )}
        <p className={`text-xs ${feedback.stammering.detected ? 'text-red-600' : 'text-green-600'}`}>
          {feedback.stammering.note}
        </p>
        {feedback.stammering.examples.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {feedback.stammering.examples.map((ex, i) => <Pill key={i} tone="red">"{ex.trim()}"</Pill>)}
          </div>
        )}
      </ReportSection>

      {/* ⑥ Repeated Words */}
      {feedback.repeatedWords.length > 0 && (
        <ReportSection number={next()} icon={<Repeat className="w-4 h-4 text-gray-500" />} title="Repeated Words">
          <div className="flex flex-wrap gap-1.5">
            {feedback.repeatedWords.map((r) => (
              <Pill key={r.word} tone="gray">"{r.word}" × {r.count}</Pill>
            ))}
          </div>
        </ReportSection>
      )}

      {/* ⑦ Clarity */}
      <ReportSection number={next()} icon={<CheckCircle2 className="w-4 h-4 text-gray-500" />} title="Clarity">
        <p className="text-xs text-gray-600 dark:text-gray-400">{feedback.clarityNotes}</p>
      </ReportSection>

      {/* ⑧ Top Areas to Improve — ranked, most important first */}
      {feedback.improvements.length > 0 && (
        <ReportSection number={next()} icon={<ListChecks className="w-4 h-4 text-amber-600" />} title="Top Areas to Improve" tone="warn">
          <ol className="space-y-1.5">
            {feedback.improvements.map((s, i) => (
              <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </ReportSection>
      )}

      {/* ⑨ Strengths — always last */}
      {feedback.strengths.length > 0 && (
        <ReportSection number={next()} icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} title="Strengths" tone="good">
          <ul className="space-y-1">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" /> {s}
              </li>
            ))}
          </ul>
        </ReportSection>
      )}
    </div>
  )
}

export default function PresentationPracticePage() {
  const [mode, setMode] = useState<'upload' | 'generate'>('upload')

  // Shared topic — used both to give the AI real context for uploaded PPTs
  // (whose slide text we can't extract) and, in generate mode, as the topic
  // the deck itself is built from.
  const [topic, setTopic] = useState('')

  const [pptFile, setPptFile] = useState<File | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)
  const [uploadedSlides, setUploadedSlides] = useState<any[]>([])

  const [description, setDescription] = useState('')
  const [slideCount, setSlideCount] = useState(8)
  const [contentMode, setContentMode] = useState<'bullets' | 'paragraphs'>('bullets')
  const [slideHeadings, setSlideHeadings] = useState<string[]>([''])
  const [showHeadings, setShowHeadings] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [pptxBase64, setPptxBase64] = useState<string | null>(null)
  const [pptxFilename, setPptxFilename] = useState('')
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generatedSlides, setGeneratedSlides] = useState<any[]>([])

  const [currentSlide, setCurrentSlide] = useState(0)

  // ── Per-slide recording/transcript/feedback state, keyed by slide index ────
  const [recordings, setRecordings] = useState<Record<number, SlideRecording>>({})
  const recordingSlideRef = useRef<number | null>(null) // which slide is currently being recorded

  const {
    state: recState,
    audioBlob,
    audioLevel,
    durationMs,
    errorMessage: recError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoiceRecorder()

  const currentRec: SlideRecording = recordings[currentSlide] ?? emptyRecording()
  const isRecordingThisSlide = recState === 'recording' && recordingSlideRef.current === currentSlide

  const resetAll = () => {
    setUploadedSlides([])
    setGeneratedSlides([])
    setCurrentSlide(0)
    setRecordings({})
    recordingSlideRef.current = null
    resetRecording()
    setPptxBase64(null)
    setGenerateError(null)
    setConvertError(null)
  }

  const totalSlides = mode === 'upload' ? uploadedSlides.length : generatedSlides.length

  const addHeading = () => setSlideHeadings(h => [...h, ''])
  const removeHeading = (i: number) => setSlideHeadings(h => h.filter((_, idx) => idx !== i))
  const updateHeading = (i: number, val: string) =>
    setSlideHeadings(h => h.map((v, idx) => idx === i ? val : v))

  // ── When a recording finishes (blob becomes available), save it under the
  //    slide that was active when recording *started* — not whatever slide
  //    is currently showing — so navigation never bleeds recordings together.
  useEffect(() => {
    if (audioBlob && recordingSlideRef.current !== null) {
      const slideIdx = recordingSlideRef.current
      const url = URL.createObjectURL(audioBlob)
      const durationSec = Math.max(1, Math.round(durationMs / 1000))
      setRecordings(prev => ({
        ...prev,
        [slideIdx]: {
          ...emptyRecording(),
          audioBlob,
          audioUrl: url,
          durationSec,
          status: 'recorded',
        },
      }))
      recordingSlideRef.current = null
      resetRecording()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob])

  const handleStartRecording = async () => {
    // Fresh slate for this slide every time recording (re)starts
    setRecordings(prev => ({ ...prev, [currentSlide]: emptyRecording() }))
    recordingSlideRef.current = currentSlide
    await startRecording()
  }

  const handleStopRecording = () => {
    stopRecording()
  }

  const handleReRecord = () => {
    setRecordings(prev => ({ ...prev, [currentSlide]: emptyRecording() }))
  }

  // If the user navigates away while recording, stop & save automatically
  // so nothing is lost, then land cleanly on the new slide with no carry-over.
  const stopActiveRecordingIfAny = () => {
    if (recState === 'recording') {
      stopRecording()
    }
  }

  const selectSlide = (i: number) => {
    stopActiveRecordingIfAny()
    setCurrentSlide(i)
  }

  // ── Analyze & Feedback: transcribe the saved recording, then get AI feedback ─
  const handleAnalyze = async () => {
    const rec = recordings[currentSlide]
    if (!rec?.audioBlob) return

    setRecordings(prev => ({ ...prev, [currentSlide]: { ...prev[currentSlide], status: 'transcribing', error: null } }))
    try {
      const form = new FormData()
      const ext = rec.audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
      form.append('audio', rec.audioBlob, `slide-${currentSlide + 1}.${ext}`)

      const transcribeRes = await fetch('/api/practice/presentation/transcribe', { method: 'POST', body: form })
      const transcribeData = await transcribeRes.json()
      if (!transcribeRes.ok) throw new Error(transcribeData.error ?? 'Transcription failed')

      const transcript: string = transcribeData.transcript
      setRecordings(prev => ({
        ...prev,
        [currentSlide]: { ...prev[currentSlide], transcript, status: 'analyzing' },
      }))

      // Upload mode has no extracted slide text (backend only returns images),
      // so we pass the shared topic + slide number and let the feedback route
      // grade relevance against the stated topic instead of invented bullets.
      const currentSlideData = mode === 'upload'
        ? { title: `Slide ${currentSlide + 1}`, bullets: [] }
        : generatedSlides[currentSlide]

      const feedbackRes = await fetch('/api/practice/presentation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          topic: topic.trim(),
          slideNumber: currentSlide + 1,
          currentSlide: currentSlideData,
          durationSec: transcribeData.durationSec ?? rec.durationSec,
        }),
      })
      const feedbackData = await feedbackRes.json()
      if (!feedbackRes.ok) throw new Error(feedbackData.error ?? 'Feedback generation failed')

      setRecordings(prev => ({
        ...prev,
        [currentSlide]: { ...prev[currentSlide], feedback: feedbackData.feedback, status: 'done' },
      }))
    } catch (err: any) {
      setRecordings(prev => ({
        ...prev,
        [currentSlide]: { ...prev[currentSlide], status: 'error', error: err.message ?? 'Something went wrong' },
      }))
    }
  }

  // Selecting a file just validates + stores it — the actual upload/convert
  // now happens on an explicit Submit click (see handleSubmitUpload) so
  // nothing fires until the user has also entered a topic.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    resetAll()
    setConvertError(null)

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pptx' && ext !== 'ppt') {
      setConvertError('Please upload a .pptx or .ppt file.')
      setPptFile(null)
      return
    }
    setPptFile(file)
  }

  const handleSubmitUpload = async () => {
    if (!pptFile) return
    setIsConverting(true)
    setConvertError(null)
    try {
      const formData = new FormData()
      formData.append('file', pptFile)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presentation/upload-preview`,
        { method: 'POST', body: formData }
      )

      const data = await res.json()

      if (!res.ok) {
        setConvertError(data.error ?? 'Conversion failed.')
        return
      }

      setUploadedSlides(data.slides)
    } catch (err: any) {
      setConvertError('Could not connect to backend. Make sure Python backend is running.')
      console.error(err)
    } finally {
      setIsConverting(false)
    }
  }

  const handleGeneratePPT = async () => {
    if (!topic.trim()) return
    setIsGenerating(true)
    resetAll()

    try {
      const headings = slideHeadings.filter(h => h.trim())
      const res = await fetch('/api/practice/presentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          prompt: `Create a ${slideCount}-slide presentation about "${topic}". ${description}`,
          slideCount,
          contentMode,
          description: description.trim(),
          slideHeadings: headings,
          englishLevel: getUser()?.english_level ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setGenerateError(data.error ?? 'Generation failed.'); return }

      const normalized = (data.slides as any[]).map((s: any) =>
        typeof s === 'string'
          ? { title: s, bullets: [], content: '', imageBase64: undefined, imageMime: undefined }
          : {
              title:       s.title       ?? 'Untitled',
              bullets:     Array.isArray(s.bullets) ? s.bullets : [],
              content:     s.content     ?? '',
              imageBase64: s.imageBase64 ?? undefined,
              imageMime:   s.imageMime   ?? 'image/jpeg',
            }
      )
      setGeneratedSlides(normalized)

      if (data.pptxBase64) {
        setPptxBase64(data.pptxBase64)
        setPptxFilename(data.filename ?? `${topic}_presentation.pptx`)
      }
    } catch (err: any) {
      setGenerateError(err.message ?? 'Something went wrong.')
    } finally {
      setIsGenerating(false)
    }
  }

  const goNext = () => {
    if (currentSlide < totalSlides - 1) {
      stopActiveRecordingIfAny()
      setCurrentSlide(c => c + 1)
    }
  }
  const goPrev = () => {
    if (currentSlide > 0) {
      stopActiveRecordingIfAny()
      setCurrentSlide(c => c - 1)
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                Presentation Practice
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Upload your real PPT or generate one with AI
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Choose Mode</h2>
              <div className="flex gap-3">
                <Button
                  variant={mode === 'upload' ? 'default' : 'outline'}
                  onClick={() => { setMode('upload'); resetAll() }}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload My PPT
                </Button>
                <Button
                  variant={mode === 'generate' ? 'default' : 'outline'}
                  onClick={() => { setMode('generate'); resetAll() }}
                >
                  <Wand2 className="w-4 h-4 mr-2" /> Generate with AI
                </Button>
              </div>
            </div>

            {/* Upload Mode */}
            {mode === 'upload' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">
                  Upload Your Presentation
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
                  Your actual slides will be shown exactly as they look in PowerPoint
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What topic are you presenting on? <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Q3 Sales Review, Climate Change, Our Product Roadmap"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    The AI coach uses this to check whether what you actually say stays on topic — it can't
                    read text off your slide images, so this is what gives it real context to grade against.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="file" accept=".pptx,.ppt"
                    onChange={handleFileSelect}
                    className="hidden" id="ppt-upload"
                  />
                  <label
                    htmlFor="ppt-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    {pptFile ? pptFile.name : 'Choose .pptx file'}
                  </label>
                  {pptFile && (
                    <Button
                      variant="outline"
                      className="text-red-500 border-red-300"
                      onClick={() => { setPptFile(null); resetAll() }}
                    >
                      Remove
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmitUpload}
                    disabled={!pptFile || !topic.trim() || isConverting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isConverting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
                      : <><Send className="w-4 h-4 mr-2" />Submit</>
                    }
                  </Button>
                </div>
                {pptFile && !topic.trim() && (
                  <p className="text-xs text-amber-600">Enter a topic above before submitting.</p>
                )}

                {isConverting && (
                  <div className="flex items-center gap-2 text-blue-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Converting slides to images… this may take 10–30 seconds</span>
                  </div>
                )}

                {convertError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{convertError}</p>
                    {convertError.includes('LibreOffice') && (
                      <p className="text-xs text-red-500 mt-1">
                        Download free from:{' '}
                        <a
                          href="https://www.libreoffice.org/download/download/"
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          libreoffice.org
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {!isConverting && uploadedSlides.length > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ {uploadedSlides.length} slides loaded — showing your real PPT below
                  </p>
                )}
              </div>
            )}

            {/* Generate Mode */}
            {mode === 'generate' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generate Presentation with AI
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Topic <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Climate Change, Machine Learning, Solar System"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description / What to cover
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Target audience, key points, tone…"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Slides:{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{slideCount}</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min={3} max={20} value={slideCount}
                      onChange={(e) => setSlideCount(parseInt(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <input
                      type="number" min={3} max={20} value={slideCount}
                      onChange={(e) =>
                        setSlideCount(Math.min(20, Math.max(3, parseInt(e.target.value) || 3)))
                      }
                      className="w-16 text-center border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>3 min</span><span>20 max</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Style
                  </label>
                  <div className="flex gap-3">
                    {(['bullets', 'paragraphs'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setContentMode(m)}
                        className={`flex-1 p-3 rounded-lg border-2 text-left transition-all ${
                          contentMode === m
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                        }`}
                      >
                        <div className="font-semibold text-sm">
                          {m === 'bullets' ? '• Bullet Points' : '¶ Paragraphs'}
                        </div>
                        <div className="text-xs mt-0.5 opacity-70">
                          {m === 'bullets' ? '4 key facts per slide' : '3–4 sentence detail per slide'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setShowHeadings(!showHeadings)}
                    className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <span className="text-xs">{showHeadings ? '▼' : '▶'}</span>
                    Custom Slide Headings{' '}
                    <span className="text-xs opacity-60">(optional)</span>
                  </button>
                  {showHeadings && (
                    <div className="mt-3 space-y-2 pl-1">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                        Enter headings for each slide. Leave blank to let AI decide.
                      </p>
                      {slideHeadings.map((heading, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
                          <Input
                            value={heading}
                            onChange={(e) => updateHeading(i, e.target.value)}
                            placeholder={`Slide ${i + 1} heading...`}
                            className="flex-1 h-8 text-sm"
                          />
                          {slideHeadings.length > 1 && (
                            <button onClick={() => removeHeading(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {slideHeadings.length < slideCount && (
                        <button
                          onClick={addHeading}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1 ml-7"
                        >
                          <Plus className="w-3 h-3" /> Add heading
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-gray-100 dark:border-gray-700">
                  <Button
                    onClick={handleGeneratePPT}
                    disabled={!topic.trim() || isGenerating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isGenerating
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                      : <><Wand2 className="w-4 h-4 mr-2" />Generate PPT</>
                    }
                  </Button>
                  {pptxBase64 && (
                    <Button
                      onClick={() => downloadPptx(pptxBase64, pptxFilename)}
                      variant="outline"
                      className="text-green-600 border-green-500 hover:bg-green-50"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download .pptx
                    </Button>
                  )}
                </div>

                {generateError && <p className="text-sm text-red-500">{generateError}</p>}
                {isGenerating && (
                  <p className="text-xs text-gray-400">
                    Generating slides with real facts and topic-specific images…
                  </p>
                )}
                {pptxBase64 && !isGenerating && (
                  <p className="text-sm text-green-600">✓ Real .pptx ready — click Download to save</p>
                )}
              </div>
            )}

            {/* Slide Viewer */}
            {(uploadedSlides.length > 0 || generatedSlides.length > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {mode === 'upload' ? 'Your Presentation' : 'Slide Preview'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goPrev} disabled={currentSlide === 0}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-500 min-w-[70px] text-center">
                      {currentSlide + 1} / {totalSlides}
                    </span>
                    <Button variant="outline" size="sm" onClick={goNext} disabled={currentSlide === totalSlides - 1}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {mode === 'upload' && uploadedSlides.length > 0 && (
                  <RealSlideViewer
                    slides={uploadedSlides}
                    current={currentSlide}
                    onSelect={selectSlide}
                    recordings={recordings}
                  />
                )}

                {mode === 'generate' && generatedSlides.length > 0 && (
                  <>
                    <SlideCard
                      slide={generatedSlides[currentSlide]}
                      index={currentSlide}
                      total={generatedSlides.length}
                      contentMode={contentMode}
                    />
                    <ThumbnailStrip
                      slides={generatedSlides}
                      current={currentSlide}
                      onSelect={selectSlide}
                      recordings={recordings}
                    />
                  </>
                )}

                {/* Recording controls */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 flex-wrap">
                    {!isRecordingThisSlide ? (
                      <Button
                        onClick={handleStartRecording}
                        disabled={recState === 'requesting'}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {recState === 'requesting'
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Requesting mic…</>
                          : <><Mic className="w-4 h-4 mr-2" /> Start Recording</>
                        }
                      </Button>
                    ) : (
                      <Button onClick={handleStopRecording} variant="destructive" className="animate-pulse">
                        <Square className="w-4 h-4 mr-2" /> Stop Recording
                      </Button>
                    )}

                    <Button
                      onClick={handleAnalyze}
                      disabled={!currentRec.audioBlob || currentRec.status === 'transcribing' || currentRec.status === 'analyzing'}
                    >
                      {currentRec.status === 'transcribing' ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Transcribing…</>
                      ) : currentRec.status === 'analyzing' ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing…</>
                      ) : (
                        <><Send className="w-4 h-4 mr-2" />Analyze & Feedback</>
                      )}
                    </Button>

                    {currentRec.audioBlob && !isRecordingThisSlide && (
                      <Button variant="outline" size="sm" onClick={handleReRecord}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Re-record
                      </Button>
                    )}
                  </div>

                  {isRecordingThisSlide && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-red-500 font-medium">
                        ● REC {(Math.round(durationMs / 1000))}s
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full bg-red-500 transition-all duration-100"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {recError && recState === 'error' && (
                    <p className="text-sm text-red-500 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> {recError}
                    </p>
                  )}

                  {currentRec.audioUrl && !isRecordingThisSlide && (
                    <div className="flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <audio controls src={currentRec.audioUrl} className="h-9 max-w-xs" />
                      <span className="text-xs text-gray-400">
                        {currentRec.durationSec ? `${currentRec.durationSec}s recorded` : ''}
                      </span>
                    </div>
                  )}

                  {!currentRec.audioBlob && !isRecordingThisSlide && (
                    <p className="text-xs text-gray-400">
                      Click "Start Recording", speak this slide's content, then "Stop Recording" — recording is per-slide, so switching slides never mixes speech together.
                    </p>
                  )}
                </div>

                {currentRec.transcript && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      What you said (transcribed):
                    </label>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                      {currentRec.transcript}
                    </div>
                  </div>
                )}

                {currentRec.status === 'error' && currentRec.error && (
                  <p className="text-sm text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {currentRec.error}
                  </p>
                )}

                {currentRec.feedback && (
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">AI Feedback Report</h3>
                    <FeedbackPanel feedback={currentRec.feedback} />
                  </div>
                )}

              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}