'use client'

import { useState, useRef } from 'react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label }    from '@/components/ui/label'
import {
  Mic, Square, Send, Upload, FileText, Home,
  ChevronRight, Loader2, CheckCircle2, MessageSquare,
  Brain, AlertCircle, RotateCcw, Star, BarChart2,
  Volume2, Zap, Award, TrendingUp, X
} from 'lucide-react'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: number
  type: string
  question: string
  hint: string
}

interface VoiceAnalysis {
  scores: { content: number; delivery: number; vocabulary: number; overall: number }
  content_analysis: {
    star_used: boolean
    relevance: string
    specificity: string
    key_strengths: string[]
    key_gaps: string[]
  }
  delivery_analysis: {
    pace_comment: string
    filler_comment: string
    structure_comment: string
    confidence_signals: string[]
  }
  vocabulary_analysis: {
    strong_phrases: string[]
    weak_phrases: string[]
    suggestion: string
  }
  top_tip: string
  metrics: {
    word_count: number
    duration_seconds: number
    words_per_minute: number
    pace_verdict: string
    filler_count: number
    filler_words_found: string[]
    sentence_count: number
    avg_sentence_length: number
  }
}

interface FollowupData {
  followup: string
  probe_target: string
  quote_used: string
}

interface QAPair {
  question: Question
  transcript: string
  analysis: VoiceAnalysis
  followup: FollowupData
  followupTranscript?: string
}

type Stage =
  | 'setup'
  | 'loading_questions'
  | 'answering'
  | 'transcribing'
  | 'analyzing'
  | 'analysis_result'
  | 'followup'
  | 'transcribing_followup'
  | 'done'
  | 'feedback'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

const TYPE_COLORS: Record<string, string> = {
  behavioral:        'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  technical:         'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  situational:       'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'culture-fit':     'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'resume-specific': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

const SCORE_COLOR = (n: number) =>
  n >= 8 ? 'text-green-600 dark:text-green-400' :
  n >= 6 ? 'text-yellow-600 dark:text-yellow-400' :
           'text-red-500 dark:text-red-400'

// ─── Auth fetch helper ────────────────────────────────────────────────────────

async function authFetch(url: string, init: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `API ${res.status}`)
  return json
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InterviewPracticePage() {
  const [setup, setSetup] = useState({
    company: '', role: '', jobDescription: '', keySkills: '', resume: null as File | null,
  })
  const [stage, setStage]             = useState<Stage>('setup')
  const [questions, setQuestions]     = useState<Question[]>([])
  const [currentIdx, setCurrentIdx]   = useState(0)
  const [pairs, setPairs]             = useState<QAPair[]>([])
  const [transcript, setTranscript]   = useState('')       // editable after transcribe
  const [currentAnalysis, setCurrentAnalysis] = useState<VoiceAnalysis | null>(null)
  const [currentFollowup, setCurrentFollowup] = useState<FollowupData | null>(null)
  const [followupTranscript, setFollowupTranscript] = useState('')
  const [finalFeedback, setFinalFeedback] = useState('')
  const [error, setError]             = useState('')
  const [resumeParsed, setResumeParsed] = useState(false)

  const recorder         = useVoiceRecorder()
  const followupRecorder = useVoiceRecorder()
  const currentQ         = questions[currentIdx]

  // ── Format ms → "0:42" ────────────────────────────────────────────────────
  const fmtDuration = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  // ── Step 1: Generate questions ────────────────────────────────────────────
  const handleStart = async () => {
    if (!setup.company.trim() || !setup.role.trim()) {
      setError('Company and Job Title are required.')
      return
    }
    setError('')
    setStage('loading_questions')
    try {
      const token = getToken()
      const fd = new FormData()
      fd.append('company',         setup.company)
      fd.append('role',            setup.role)
      fd.append('job_description', setup.jobDescription)
      fd.append('key_skills',      setup.keySkills)
      if (setup.resume) fd.append('resume', setup.resume)

      const res  = await fetch(`${API}/interview/start`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuestions(data.questions)
      setResumeParsed(data.resume_parsed ?? false)
      setCurrentIdx(0)
      setPairs([])
      setTranscript('')
      setStage('answering')
    } catch (e: any) {
      setError(e.message)
      setStage('setup')
    }
  }

  // ── Step 2: After recording — transcribe audio ────────────────────────────
  const handleTranscribeAnswer = async () => {
    if (!recorder.audioBlob) return
    setError('')
    setStage('transcribing')

    try {
      const token = getToken()
      const fd = new FormData()
      // Name the file with correct extension so Whisper detects format
      const ext  = recorder.audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
      fd.append('audio', recorder.audioBlob, `answer.${ext}`)
      fd.append('language', 'en')

      const res  = await fetch(`${API}/voice/transcribe`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setTranscript(data.transcript)
      // Move to analyze automatically
      await handleAnalyzeAnswer(data.transcript, data.duration_seconds, data.word_count)
    } catch (e: any) {
      setError(`Transcription failed: ${e.message}`)
      setStage('answering')
    }
  }

  // ── Step 3: Analyze transcribed answer ───────────────────────────────────
  const handleAnalyzeAnswer = async (
    text: string = transcript,
    duration = 0,
    wordCount = 0,
  ) => {
    if (!text.trim()) {
      setError('No transcript to analyze.')
      return
    }
    setError('')
    setStage('analyzing')
    try {
      const analysis = await authFetch(`${API}/voice/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript:       text,
          question:         currentQ.question,
          question_type:    currentQ.type,
          company:          setup.company,
          role:             setup.role,
          duration_seconds: duration,
          word_count:       wordCount || text.split(/\s+/).filter(Boolean).length,
        }),
      })
      setCurrentAnalysis(analysis)

      // Immediately generate follow-up
      const fu = await authFetch(`${API}/voice/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          question:   currentQ.question,
          analysis,
          company:    setup.company,
          role:       setup.role,
        }),
      })
      setCurrentFollowup(fu)
      setStage('analysis_result')
    } catch (e: any) {
      setError(`Analysis failed: ${e.message}`)
      setStage('answering')
    }
  }

  // ── Step 4: After seeing analysis, proceed to follow-up ──────────────────
  const handleGoToFollowup = () => {
    setFollowupTranscript('')
    followupRecorder.resetRecording()
    setStage('followup')
  }

  // ── Step 5: Transcribe follow-up audio ───────────────────────────────────
  const handleTranscribeFollowup = async () => {
    if (!followupRecorder.audioBlob) return
    setError('')
    setStage('transcribing_followup')
    try {
      const token = getToken()
      const fd = new FormData()
      const ext  = followupRecorder.audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
      fd.append('audio', followupRecorder.audioBlob, `followup.${ext}`)
      fd.append('language', 'en')

      const res  = await fetch(`${API}/voice/transcribe`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFollowupTranscript(data.transcript)
    } catch (e: any) {
      setError(`Follow-up transcription failed: ${e.message}`)
    } finally {
      setStage('followup')
    }
  }

  // ── Step 6: Confirm follow-up answer → advance ────────────────────────────
  const handleSubmitFollowup = () => {
    if (!currentAnalysis || !currentFollowup) return

    const pair: QAPair = {
      question:           currentQ,
      transcript:         transcript,
      analysis:           currentAnalysis,
      followup:           currentFollowup,
      followupTranscript: followupTranscript || '(skipped)',
    }
    setPairs(prev => [...prev, pair])

    const next = currentIdx + 1
    setTranscript('')
    setCurrentAnalysis(null)
    setCurrentFollowup(null)
    setFollowupTranscript('')
    recorder.resetRecording()
    followupRecorder.resetRecording()

    if (next < questions.length) {
      setCurrentIdx(next)
      setStage('answering')
    } else {
      setStage('done')
    }
  }

  // ── Final feedback ────────────────────────────────────────────────────────
  const handleGetFeedback = async () => {
    setError('')
    try {
      const fullTranscript = pairs.map((p, i) => {
        let b = `Q${i + 1} [${p.question.type}]: ${p.question.question}\n`
        b += `A: ${p.transcript}\n`
        b += `Follow-up: ${p.followup.followup}\n`
        b += `A: ${p.followupTranscript ?? '(skipped)'}`
        return b
      }).join('\n\n---\n\n')

      const data = await authFetch(`${API}/interview/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript:   fullTranscript,
          company:      setup.company,
          role:         setup.role,
          session_type: 'interview',
          title:        `${setup.role} at ${setup.company}`,
        }),
      })
      setFinalFeedback(data.session?.feedback ?? '')
      setStage('feedback')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleReset = () => {
    recorder.resetRecording()
    followupRecorder.resetRecording()
    setStage('setup')
    setSetup({ company: '', role: '', jobDescription: '', keySkills: '', resume: null })
    setQuestions([])
    setPairs([])
    setTranscript('')
    setCurrentAnalysis(null)
    setCurrentFollowup(null)
    setFollowupTranscript('')
    setFinalFeedback('')
    setError('')
    setCurrentIdx(0)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="absolute top-6 right-6 flex gap-2">
        {stage !== 'setup' && (
          <Button variant="ghost" onClick={handleReset} className="gap-2 text-sm">
            <RotateCcw className="w-4 h-4" /> Restart
          </Button>
        )}
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <Home className="w-4 h-4" /> Dashboard
          </Button>
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1F2937] dark:text-white">
            Interview Practice
          </h1>
          <p className="mt-1 text-[#6B7280] dark:text-gray-400">
            Speak your answers — AI transcribes, analyses delivery + content, and asks targeted follow-ups
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* ── SETUP ──────────────────────────────────────────────────────── */}
        {stage === 'setup' && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6 space-y-6">
            <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white">Interview Setup</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Job Title <span className="text-red-500">*</span></Label>
                <Input className="mt-1" placeholder="e.g. Software Engineer"
                  value={setup.role} onChange={e => setSetup(s => ({ ...s, role: e.target.value }))} />
              </div>
              <div>
                <Label>Company <span className="text-red-500">*</span></Label>
                <Input className="mt-1" placeholder="e.g. Google"
                  value={setup.company} onChange={e => setSetup(s => ({ ...s, company: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Job Description</Label>
              <Textarea className="mt-1" rows={3}
                placeholder="Paste the JD here for highly tailored questions…"
                value={setup.jobDescription}
                onChange={e => setSetup(s => ({ ...s, jobDescription: e.target.value }))} />
            </div>
            <div>
              <Label>Key Skills</Label>
              <Textarea className="mt-1" rows={2}
                placeholder="e.g. React, system design, cross-functional leadership…"
                value={setup.keySkills}
                onChange={e => setSetup(s => ({ ...s, keySkills: e.target.value }))} />
            </div>
            <div>
              <Label>Resume / CV
                <span className="ml-2 text-xs font-normal text-[#6B7280]">(PDF, DOCX, TXT — recommended)</span>
              </Label>
              <div className="mt-2">
                <input type="file" accept=".pdf,.doc,.docx,.txt" id="resume-input" className="hidden"
                  onChange={e => setSetup(s => ({ ...s, resume: e.target.files?.[0] ?? null }))} />
                <label htmlFor="resume-input"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  {setup.resume ? setup.resume.name : 'Choose file'}
                </label>
                {setup.resume && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <FileText className="w-3 h-3" /> {setup.resume.name}
                  </p>
                )}
              </div>
            </div>
            <Button className="w-full" onClick={handleStart}
              disabled={!setup.company.trim() || !setup.role.trim()}>
              Generate My Interview Questions <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* ── LOADING QUESTIONS ───────────────────────────────────────────── */}
        {stage === 'loading_questions' && (
          <LoadingCard message="Reading your resume and crafting questions…" sub="The AI is personalising 5 deep questions for you." />
        )}

        {/* ── ANSWERING ───────────────────────────────────────────────────── */}
        {stage === 'answering' && currentQ && (
          <>
            <ProgressBar current={currentIdx} total={questions.length} />
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${TYPE_COLORS[currentQ.type] ?? 'bg-gray-100 text-gray-700'}`}>
                  {currentQ.type.replace('-', ' ').toUpperCase()}
                </span>
                {resumeParsed && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Resume-personalised
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-[#6B7280] mb-2">
                  Question {currentQ.id} of {questions.length}
                </p>
                <p className="text-xl font-semibold text-[#1F2937] dark:text-white leading-snug">
                  {currentQ.question}
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                <Brain className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-xs text-indigo-700 dark:text-indigo-300">{currentQ.hint}</p>
              </div>

              {/* Voice recorder */}
              <VoiceRecorderWidget
                recorder={recorder}
                onTranscribe={handleTranscribeAnswer}
                fmtDuration={fmtDuration}
              />

              {/* Manual transcript fallback */}
              {recorder.state === 'idle' && (
                <div className="space-y-1">
                  <Label className="text-xs text-[#6B7280]">Or type your answer instead</Label>
                  <Textarea rows={5} placeholder="Type your answer here…"
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)} />
                  {transcript.trim() && (
                    <Button className="w-full mt-2 gap-2" onClick={() => handleAnalyzeAnswer()}>
                      <Send className="w-4 h-4" /> Analyse This Answer
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TRANSCRIBING ────────────────────────────────────────────────── */}
        {stage === 'transcribing' && (
          <LoadingCard message="Transcribing your answer with Whisper…" sub="This takes a few seconds." />
        )}

        {/* ── ANALYZING ───────────────────────────────────────────────────── */}
        {stage === 'analyzing' && (
          <LoadingCard message="Analysing content, delivery, and vocabulary…" sub="AI is reading every word of your answer." />
        )}

        {/* ── ANALYSIS RESULT ─────────────────────────────────────────────── */}
        {stage === 'analysis_result' && currentAnalysis && currentFollowup && (
          <>
            <ProgressBar current={currentIdx} total={questions.length} />

            {/* Transcript review */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1F2937] dark:text-white text-sm">Your Transcript</h3>
                <span className="text-xs text-[#6B7280]">{currentAnalysis.metrics.word_count} words · {currentAnalysis.metrics.duration_seconds}s</span>
              </div>
              <p className="text-sm text-[#374151] dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 leading-relaxed">
                {transcript}
              </p>
            </div>

            {/* Score cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['overall', 'content', 'delivery', 'vocabulary'] as const).map(k => (
                <ScoreCard key={k} label={k} value={currentAnalysis.scores[k]} />
              ))}
            </div>

            {/* Metrics bar */}
            <MetricsBar metrics={currentAnalysis.metrics} />

            {/* Content breakdown */}
            <AnalysisSection
              title="Content"
              icon={<Brain className="w-4 h-4 text-indigo-500" />}
              items={[
                { label: 'Relevance',    value: currentAnalysis.content_analysis.relevance },
                { label: 'Specificity',  value: currentAnalysis.content_analysis.specificity },
                { label: 'STAR Method',  value: currentAnalysis.content_analysis.star_used ? '✅ Detected' : '⚠️ Not clearly applied' },
              ]}
              strengths={currentAnalysis.content_analysis.key_strengths}
              gaps={currentAnalysis.content_analysis.key_gaps}
            />

            {/* Delivery breakdown */}
            <AnalysisSection
              title="Delivery"
              icon={<Volume2 className="w-4 h-4 text-orange-500" />}
              items={[
                { label: 'Pace',       value: currentAnalysis.delivery_analysis.pace_comment },
                { label: 'Fillers',    value: currentAnalysis.delivery_analysis.filler_comment },
                { label: 'Structure',  value: currentAnalysis.delivery_analysis.structure_comment },
              ]}
              strengths={currentAnalysis.delivery_analysis.confidence_signals}
            />

            {/* Vocabulary */}
            <AnalysisSection
              title="Vocabulary"
              icon={<Zap className="w-4 h-4 text-yellow-500" />}
              items={[{ label: 'Tip', value: currentAnalysis.vocabulary_analysis.suggestion }]}
              strengths={currentAnalysis.vocabulary_analysis.strong_phrases.map(p => `Strong: "${p}"`)}
              gaps={currentAnalysis.vocabulary_analysis.weak_phrases.map(p => `Replace: "${p}"`)}
            />

            {/* Top tip */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800">
              <Award className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Top Tip for Your Next Answer</p>
                <p className="text-sm text-[#1F2937] dark:text-white">{currentAnalysis.top_tip}</p>
              </div>
            </div>

            <Button className="w-full gap-2" onClick={handleGoToFollowup}>
              <MessageSquare className="w-4 h-4" /> Answer the Follow-up Question
            </Button>
          </>
        )}

        {/* ── FOLLOW-UP ───────────────────────────────────────────────────── */}
        {(stage === 'followup' || stage === 'transcribing_followup') && currentFollowup && (
          <>
            <ProgressBar current={currentIdx} total={questions.length} />
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10 p-6 space-y-5">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-indigo-500 mb-1">AI Follow-up</p>
                  <p className="text-lg font-semibold text-[#1F2937] dark:text-white">
                    {currentFollowup.followup}
                  </p>
                  {currentFollowup.quote_used && (
                    <p className="mt-2 text-xs text-[#6B7280] dark:text-gray-500">
                      Probing: "{currentFollowup.quote_used}" · Testing: {currentFollowup.probe_target}
                    </p>
                  )}
                </div>
              </div>

              {stage === 'transcribing_followup' ? (
                <LoadingCard message="Transcribing follow-up answer…" sub="" />
              ) : (
                <>
                  <VoiceRecorderWidget
                    recorder={followupRecorder}
                    onTranscribe={handleTranscribeFollowup}
                    fmtDuration={fmtDuration}
                  />

                  {followupTranscript && (
                    <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                      <p className="text-xs text-[#6B7280] mb-1">Transcribed:</p>
                      <p className="text-sm text-[#374151] dark:text-gray-300">{followupTranscript}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      onClick={handleSubmitFollowup}
                      disabled={!followupTranscript && !followupRecorder.audioBlob}
                    >
                      {currentIdx + 1 < questions.length ? 'Next Question →' : 'Finish Interview'}
                    </Button>
                    <Button variant="ghost" onClick={handleSubmitFollowup} className="text-sm">
                      Skip
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── DONE ────────────────────────────────────────────────────────── */}
        {stage === 'done' && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6 space-y-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">Interview Complete!</h2>
            <p className="text-[#6B7280] dark:text-gray-400">
              {pairs.length} questions · avg score{' '}
              <strong className={SCORE_COLOR(Math.round(pairs.reduce((a, p) => a + p.analysis.scores.overall, 0) / pairs.length))}>
                {Math.round(pairs.reduce((a, p) => a + p.analysis.scores.overall, 0) / pairs.length)}/10
              </strong>
            </p>

            {/* Per-question score recap */}
            <div className="text-left space-y-2">
              {pairs.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm">
                  <span className="text-[#374151] dark:text-gray-300 truncate max-w-xs">
                    Q{i + 1}: {p.question.question.slice(0, 60)}…
                  </span>
                  <span className={`font-bold ml-2 shrink-0 ${SCORE_COLOR(p.analysis.scores.overall)}`}>
                    {p.analysis.scores.overall}/10
                  </span>
                </div>
              ))}
            </div>

            <Button className="w-full gap-2" onClick={handleGetFeedback}>
              <Star className="w-4 h-4" /> Get Full AI Feedback Report
            </Button>
          </div>
        )}

        {/* ── FEEDBACK ────────────────────────────────────────────────────── */}
        {stage === 'feedback' && finalFeedback && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6 space-y-4">
            <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" /> Full Feedback Report
            </h2>
            <div className="space-y-1">
              {finalFeedback.split('\n').map((line, i) => {
                if (!line.trim()) return null
                const clean = line.replace(/\*\*(.*?)\*\*/g, '$1')
                if (line.startsWith('**') || line.match(/^#+\s/)) {
                  return <p key={i} className="font-bold text-[#1F2937] dark:text-white mt-4 first:mt-0">{clean}</p>
                }
                if (line.startsWith('- ')) {
                  return <p key={i} className="text-[#374151] dark:text-gray-300 pl-4 before:content-['•'] before:mr-2 before:text-indigo-500">{clean.slice(2)}</p>
                }
                return <p key={i} className="text-[#374151] dark:text-gray-300">{clean}</p>
              })}
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Practice Again
              </Button>
              <Link href="/dashboard">
                <Button variant="ghost">Back to Dashboard →</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingCard({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-10 flex flex-col items-center gap-3">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      <p className="text-lg font-medium text-[#1F2937] dark:text-white">{message}</p>
      {sub && <p className="text-sm text-[#6B7280] dark:text-gray-400 text-center max-w-xs">{sub}</p>}
    </div>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[#6B7280] dark:text-gray-500">
        <span>Question {current + 1} of {total}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const color =
    value >= 8 ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' :
    value >= 6 ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20' :
                 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
  const textColor = SCORE_COLOR(value)
  return (
    <div className={`rounded-xl border p-3 text-center ${color}`}>
      <p className={`text-2xl font-bold ${textColor}`}>{value}<span className="text-sm font-normal text-[#6B7280]">/10</span></p>
      <p className="text-xs mt-1 text-[#6B7280] capitalize">{label}</p>
    </div>
  )
}

function MetricsBar({ metrics }: { metrics: VoiceAnalysis['metrics'] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
      <Metric label="Words" value={String(metrics.word_count)} />
      <Metric label="WPM" value={`${metrics.words_per_minute}`} sub={metrics.pace_verdict.split('—')[0].trim()} />
      <Metric label="Fillers" value={String(metrics.filler_count)} highlight={metrics.filler_count > 4} />
      <Metric label="Sentences" value={String(metrics.sentence_count)} />
    </div>
  )
}

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
      <p className={`font-bold text-base ${highlight ? 'text-red-500' : 'text-[#1F2937] dark:text-white'}`}>{value}</p>
      <p className="text-[#6B7280] mt-0.5">{label}</p>
      {sub && <p className="text-[#9CA3AF] text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

function AnalysisSection({
  title, icon, items, strengths, gaps,
}: {
  title: string
  icon: React.ReactNode
  items: { label: string; value: string }[]
  strengths?: string[]
  gaps?: string[]
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-5 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-sm text-[#1F2937] dark:text-white">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i}>
            <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">{it.label}: </span>
            <span className="text-sm text-[#374151] dark:text-gray-300">{it.value}</span>
          </div>
        ))}
      </div>
      {strengths && strengths.length > 0 && (
        <div className="space-y-1">
          {strengths.map((s, i) => (
            <p key={i} className="text-xs text-green-700 dark:text-green-400 flex items-start gap-1">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" /> {s}
            </p>
          ))}
        </div>
      )}
      {gaps && gaps.length > 0 && (
        <div className="space-y-1">
          {gaps.map((g, i) => (
            <p key={i} className="text-xs text-orange-700 dark:text-orange-400 flex items-start gap-1">
              <TrendingUp className="w-3 h-3 mt-0.5 shrink-0" /> {g}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function VoiceRecorderWidget({
  recorder,
  onTranscribe,
  fmtDuration,
}: {
  recorder: ReturnType<typeof useVoiceRecorder>
  onTranscribe: () => void
  fmtDuration: (ms: number) => string
}) {
  const { state, audioLevel, durationMs, errorMessage, startRecording, stopRecording, resetRecording, audioBlob } = recorder

  return (
    <div className="space-y-3">
      {/* Waveform visualiser */}
      {state === 'recording' && (
        <div className="flex items-center justify-center gap-0.5 h-12 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden px-4">
          {Array.from({ length: 32 }).map((_, i) => {
            const jitter = Math.sin(i * 0.8 + Date.now() / 200) * 0.4 + 0.6
            const height = Math.max(4, (audioLevel / 100) * 40 * jitter)
            return (
              <div
                key={i}
                className="w-1 rounded-full bg-indigo-500 transition-all duration-75"
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2">
          <p className="text-xs text-red-500 flex-1">{errorMessage}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <Button onClick={startRecording} className="gap-2 bg-red-600 hover:bg-red-700">
            <Mic className="w-4 h-4" /> Record Answer
          </Button>
        )}
        {state === 'requesting' && (
          <Button disabled className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Requesting mic…
          </Button>
        )}
        {state === 'recording' && (
          <>
            <Button onClick={stopRecording} variant="destructive" className="gap-2">
              <Square className="w-4 h-4" /> Stop Recording
            </Button>
            <span className="text-sm font-mono text-[#6B7280]">{fmtDuration(durationMs)}</span>
            <span className="flex items-center gap-1 text-xs text-red-500 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> REC
            </span>
          </>
        )}
        {state === 'processing' && (
          <Button disabled className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Processing…
          </Button>
        )}
        {state === 'error' && (
          <>
            <Button onClick={startRecording} className="gap-2 bg-amber-600 hover:bg-amber-700">
              <Mic className="w-4 h-4" /> Retry
            </Button>
            <Button onClick={resetRecording} variant="ghost" className="gap-2 text-sm">
              <X className="w-4 h-4" /> Dismiss
            </Button>
          </>
        )}
        {state === 'done' && audioBlob && (
          <>
            <Button onClick={onTranscribe} className="gap-2">
              <Send className="w-4 h-4" /> Transcribe &amp; Analyse
            </Button>
            <Button variant="ghost" onClick={resetRecording} className="gap-2 text-sm">
              <RotateCcw className="w-3 h-3" /> Re-record
            </Button>
            <audio
              src={URL.createObjectURL(audioBlob)}
              controls
              className="h-8 max-w-[180px]"
            />
          </>
        )}
        {state === 'error' && (
          <Button variant="outline" onClick={resetRecording} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Try Again
          </Button>
        )}
      </div>
    </div>
  )
}
