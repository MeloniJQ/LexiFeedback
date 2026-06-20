'use client'

import { useState, useRef, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { getToken } from '@/lib/auth'
import { API_URL as API } from '@/lib/api'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import {
  Mic, Square, Send, Volume2, VolumeX, Sparkles, Tv, BookOpen,
  RotateCcw, ChevronRight, Loader2, Play, Pause, AlertCircle, CheckCircle2, Award, HelpCircle
} from 'lucide-react'

interface ReadingPassage {
  title: string
  content: string
}

interface PronunciationFeedback {
  accuracy_score: number
  fluency_score: number
  mispronounced_words: string[]
  added_words: string[]
  feedback_markdown: string
}



const NEWS_TICKERS = [
  "BREAKING NEWS: LexiFeed releases TV News Anchor Practice Mode for advanced speech training...",
  "BUSINESS: Pronunciation accuracy in remote work environments rises by 35% this quarter...",
  "EDUCATION: Studies show reading aloud speeds up second language acquisition by 2x...",
  "WEATHER: High pressure of clear speaking today, with a 0% chance of hesitations...",
  "SCIENCE: Neuroscientists discover reading like a journalist boosts confidence signals...",
  "SPORTS: Speech champions break records in fluency speed drills..."
]

export default function ReadingPracticePage() {
  // Config state
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [mode, setMode] = useState<'standard' | 'journalist'>('standard')
  
  // Passage and loading
  const [passage, setPassage] = useState<ReadingPassage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Speech synthesis playback
  const [isPlaying, setIsPlaying] = useState(false)

  // Voice recorder and transcription analysis
  const recorder = useVoiceRecorder()
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Teleprompter auto-scroll state (for journalist mode)
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState<number>(1) // 1: slow, 2: medium, 3: fast
  const teleprompterRef = useRef<HTMLDivElement>(null)

  // News ticker index
  const [tickerIndex, setTickerIndex] = useState(0)

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch dynamic passage from AI backend
  // ─────────────────────────────────────────────────────────────────────────────
  const generateNewPassage = async (selectedDifficulty = difficulty, selectedMode = mode) => {
    setLoading(true)
    setError('')
    setFeedback(null)
    setTranscript('')
    recorder.resetRecording()
    stopSpeaking()
    setIsScrolling(false)

    try {
      const token = getToken()
      const response = await fetch(`${API}/practice/reading/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          difficulty: selectedDifficulty,
          mode: selectedMode
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to generate passage')
      }

      setPassage({
        title: data.title,
        content: data.content
      })

      // Reset teleprompter position
      if (teleprompterRef.current) {
        teleprompterRef.current.scrollTop = 0
      }
    } catch (err: any) {
      console.error('Error generating passage:', err)
      setError(err.message ?? 'Error communicating with AI service. Loaded fallback.')
      // Fallback
      setPassage(getFallbackPassage(selectedDifficulty, selectedMode))
    } finally {
      setLoading(false)
    }
  }

  // Generate initial passage on mount
  useEffect(() => {
    generateNewPassage()
  }, [])

  // Rotate ticker messages in TV mode
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % NEWS_TICKERS.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  // Teleprompter requestAnimationFrame scroll loop
  useEffect(() => {
    if (!isScrolling || !teleprompterRef.current) return

    let animationFrameId: number
    const scroll = () => {
      if (teleprompterRef.current) {
        // speed scaling
        const speedMultiplier = scrollSpeed === 1 ? 0.3 : scrollSpeed === 2 ? 0.6 : 1.2
        teleprompterRef.current.scrollTop += speedMultiplier

        const maxScroll = teleprompterRef.current.scrollHeight - teleprompterRef.current.clientHeight
        if (teleprompterRef.current.scrollTop >= maxScroll - 0.5) {
          setIsScrolling(false)
          return
        }
      }
      animationFrameId = requestAnimationFrame(scroll)
    }

    animationFrameId = requestAnimationFrame(scroll)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isScrolling, scrollSpeed])

  // ─────────────────────────────────────────────────────────────────────────────
  // Text-To-Speech Playback
  // ─────────────────────────────────────────────────────────────────────────────
  const speak = (text: string) => {
    if (typeof window === 'undefined') return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = mode === 'journalist' ? 1.0 : 0.88 // news anchor is slightly faster than standard practice
    utterance.pitch = 1.0

    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    setIsPlaying(false)
  }

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // Voice Recording and Feedback Integration
  // ─────────────────────────────────────────────────────────────────────────────
  const handleTranscribeAndAnalyze = async () => {
    if (!recorder.audioBlob || !passage) return
    setError('')
    setIsAnalyzing(true)

    try {
      const token = getToken()
      const fd = new FormData()
      const ext = recorder.audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
      fd.append('audio', recorder.audioBlob, `reading_attempt.${ext}`)
      fd.append('language', 'en')

      // 1. Get Whisper Transcription
      const transcribeRes = await fetch(`${API}/voice/transcribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      })

      const transcribeData = await transcribeRes.json()
      if (!transcribeRes.ok) {
        throw new Error(transcribeData.error ?? 'Audio transcription failed')
      }

      setTranscript(transcribeData.transcript)

      // 2. Query Pronunciation Feedback Alignment
      const feedbackRes = await fetch(`${API}/practice/reading/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transcript: transcribeData.transcript,
          originalText: passage.content,
          difficulty,
          mode
        })
      })

      const feedbackData = await feedbackRes.json()
      if (!feedbackRes.ok) {
        throw new Error(feedbackData.error ?? 'Pronunciation feedback failed')
      }

      setFeedback(feedbackData)
    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message ?? 'Failed to analyze pronunciation feedback.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Highlight mispronounced and correct words
  // ─────────────────────────────────────────────────────────────────────────────
  const renderHighlightedPassage = () => {
    if (!passage) return null
    if (!feedback) {
      return <p className="text-[#1F2937] dark:text-white leading-relaxed text-lg whitespace-pre-wrap">{passage.content}</p>
    }

    const mispronouncedSet = new Set(
      feedback.mispronounced_words.map(w => w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").trim())
    )

    // Match words and keep white spaces/punctuation intact
    const tokens = passage.content.split(/(\s+)/)
    return (
      <p className="text-[#1F2937] dark:text-white leading-relaxed text-lg whitespace-pre-wrap">
        {tokens.map((part, i) => {
          const clean = part.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").trim()
          if (!clean) return part // return punctuation or spaces

          const isMispronounced = mispronouncedSet.has(clean)
          if (isMispronounced) {
            return (
              <span
                key={i}
                onClick={() => speak(clean)}
                className="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold px-1 rounded underline decoration-red-500 decoration-2 cursor-pointer hover:bg-red-200 dark:hover:bg-red-950/70 transition"
                title="Click to hear correct pronunciation"
              >
                {part}
              </span>
            )
          } else {
            return (
              <span key={i} className="text-green-600 dark:text-green-400">
                {part}
              </span>
            )
          }
        })}
      </p>
    )
  }

  // Fallback passsage handler
  const getFallbackPassage = (diff: string, md: string): ReadingPassage => {
    if (md === 'journalist') {
      if (diff === 'beginner') {
        return {
          title: "Breaking News: Local Cat Rescued",
          content: "Good morning. This is LexiFeed News. A small cat is safe today. The cat was in a tall tree. Firefighters helped the cat. Many people came to watch. The cat is now home. I am reporting live from the scene. Back to you in the studio."
        }
      } else if (diff === 'advanced') {
        return {
          title: "Special Report: Global Economic Summit",
          content: "Good evening. Reporting live for LexiFeed, we are broadcasting from the international convention center where world leaders have gathered to address volatile financial fluctuations. Economists warning of impending inflation are urging immediate regulatory interventions. The discourse revolves around fiscal policies, sustainable infrastructure subsidies, and trade deficits. Analysts remain highly skeptical about a consensus being reached, highlighting systemic polarization among member states. We will continue monitoring these high-stakes negotiations as negotiations unfold. This is LexiFeed News, signing off."
        }
      } else {
        return {
          title: "Daily Update: City Park Renovation",
          content: "Good afternoon. This is LexiFeed News, reporting live from City Park. Today, local officials announced a major renovation plan. The project will cost two million dollars and take six months. Workers will build new playgrounds, plant hundreds of trees, and repair walking trails. Residents are excited about these improvements, saying the park has been neglected for too long. We will bring you updates as construction begins. This is LexiFeed News, back to you."
        }
      }
    } else {
      if (diff === 'beginner') {
        return {
          title: "The Big Sun",
          content: "The sun is a very big star. It is hot and bright. The sun gives us light and warm days. Plants need the sun to grow. Animals need the sun too. We can see the sun in the sky during the day. It goes down at night."
        }
      } else if (diff === 'advanced') {
        return {
          title: "Quantum Entanglement",
          content: "Quantum entanglement is a physical phenomenon that occurs when pairs or groups of particles are generated, interact, or share spatial proximity in ways such that the quantum state of each particle cannot be described independently of the state of the others. Even when separated by astronomical distances, measurements of physical properties such as position, momentum, spin, and polarization performed on entangled particles are found to be perfectly correlated. This counterintuitive behavior, which Einstein famously referred to as spooky action at a distance, lies at the heart of quantum computing and cryptographic engineering."
        }
      } else {
        return {
          title: "The Great Barrier Reef",
          content: "The Great Barrier Reef is the world's largest coral reef system. It is located in the Coral Sea, off the coast of Queensland, Australia. The reef is so large that it can be seen from space. It is composed of billions of tiny organisms, known as coral polyps. This vibrant underwater ecosystem supports a wide diversity of marine life, including sea turtles, sharks, and thousands of species of colorful fish. However, climate change poses a major threat to its survival."
        }
      }
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-[#1F2937] dark:text-white flex items-center gap-2">
                  <BookOpen className="w-8 h-8 text-indigo-500" />
                  Passage Practice
                </h1>
                <p className="text-[#6B7280] dark:text-gray-400 mt-1">
                  Improve pronunciation, vocabulary depth, and delivery by reading dynamic passages
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 self-start md:self-auto border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => { setMode('standard'); generateNewPassage(difficulty, 'standard') }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ${
                    mode === 'standard'
                      ? 'bg-white dark:bg-gray-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Standard
                </button>
                <button
                  onClick={() => { setMode('journalist'); generateNewPassage(difficulty, 'journalist') }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ${
                    mode === 'journalist'
                      ? 'bg-white dark:bg-gray-950 text-red-600 dark:text-red-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Tv className="w-4 h-4" />
                  TV News Anchor
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Difficulty Selector and Generation Control */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 self-start sm:self-auto">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Difficulty Level
                </label>
                <div className="flex gap-2 mt-1">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => { setDifficulty(level); generateNewPassage(level, mode) }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition capitalize ${
                        difficulty === level
                          ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500'
                          : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => generateNewPassage(difficulty, mode)}
                disabled={loading}
                variant="outline"
                className="w-full sm:w-auto border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 gap-2 shrink-0 font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    Generate New Passage
                  </>
                )}
              </Button>
            </div>

            {/* ─────────────────────────────────────────────────────────────────────────────
                MODE 1: STANDARD READING MODE
                ───────────────────────────────────────────────────────────────────────────── */}
            {mode === 'standard' && (
              <div className="grid grid-cols-1 gap-6">
                
                {/* Passage card */}
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-6">
                  {loading ? (
                    <div className="h-48 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Crafting a dynamic passage...</p>
                    </div>
                  ) : passage ? (
                    <>
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                        <h2 className="text-xl font-bold text-[#1F2937] dark:text-white">
                          {passage.title}
                        </h2>
                        <span className="text-xs font-bold uppercase px-2 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-900">
                          {difficulty}
                        </span>
                      </div>

                      <div className="p-6 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800/60 min-h-[140px]">
                        {renderHighlightedPassage()}
                      </div>

                      {/* TTS Listener buttons */}
                      <div className="flex justify-center border-t border-gray-50 dark:border-slate-800/40 pt-4">
                        {!isPlaying ? (
                          <Button
                            onClick={() => speak(passage.content)}
                            variant="outline"
                            className="flex items-center gap-2 border-indigo-100 dark:border-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold"
                          >
                            <Volume2 className="w-4 h-4" />
                            Listen to Passage
                          </Button>
                        ) : (
                          <Button
                            onClick={stopSpeaking}
                            variant="destructive"
                            className="flex items-center gap-2 font-semibold"
                          >
                            <VolumeX className="w-4 h-4" />
                            Stop Listening
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No passage loaded. Click generate to start.</div>
                  )}
                </div>

                {/* Recorder Widget */}
                {passage && !loading && (
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-[#1F2937] dark:text-white">Record & Practice</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Click record and read the passage out loud. Review transcription and pronunciation feedback below.
                      </p>
                    </div>

                    <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-950/20 rounded-xl space-y-4">
                      {/* Waveform Visualizer */}
                      {recorder.state === 'recording' && (
                        <div className="flex items-center justify-center gap-0.5 h-10 bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-indigo-100 dark:border-indigo-950">
                          {Array.from({ length: 40 }).map((_, i) => {
                            const jitter = Math.sin(i * 0.8 + Date.now() / 200) * 0.4 + 0.6
                            const height = Math.max(4, (recorder.audioLevel / 100) * 32 * jitter)
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

                      <div className="flex flex-wrap items-center gap-3">
                        {recorder.state === 'idle' && (
                          <Button onClick={recorder.startRecording} className="gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm">
                            <Mic className="w-4 h-4 animate-pulse" /> Start Recording
                          </Button>
                        )}
                        {recorder.state === 'requesting' && (
                          <Button disabled className="gap-2 font-semibold">
                            <Loader2 className="w-4 h-4 animate-spin" /> Accessing Mic...
                          </Button>
                        )}
                        {recorder.state === 'recording' && (
                          <Button onClick={recorder.stopRecording} variant="destructive" className="gap-2 font-semibold shadow-sm">
                            <Square className="w-4 h-4" /> Stop Recording
                          </Button>
                        )}
                        {recorder.state === 'processing' && (
                          <Button disabled className="gap-2 font-semibold">
                            <Loader2 className="w-4 h-4 animate-spin" /> Saving Audio...
                          </Button>
                        )}
                        {recorder.state === 'error' && (
                          <div className="flex items-center gap-3">
                            <Button onClick={recorder.startRecording} className="gap-2 bg-amber-600 hover:bg-amber-700 font-semibold text-white">
                              <Mic className="w-4 h-4" /> Retry Recording
                            </Button>
                            <Button onClick={recorder.resetRecording} variant="ghost" className="text-gray-500 text-xs font-semibold">
                              Dismiss Error
                            </Button>
                          </div>
                        )}

                        {/* Record Timer */}
                        {recorder.state === 'recording' && (
                          <span className="text-sm font-mono text-red-500 font-bold animate-pulse flex items-center gap-1.5 ml-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {Math.floor(recorder.durationMs / 60000)}:{String(Math.floor((recorder.durationMs % 60000) / 1000)).padStart(2, '0')}
                          </span>
                        )}

                        {/* Recorded Audio playback and Submission */}
                        {recorder.state === 'done' && recorder.audioBlob && (
                          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <Button
                              onClick={handleTranscribeAndAnalyze}
                              disabled={isAnalyzing}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-sm"
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  Analyze Pronunciation
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={recorder.resetRecording}
                              disabled={isAnalyzing}
                              className="border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 gap-1.5 font-semibold"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Re-record
                            </Button>
                            <audio
                              src={URL.createObjectURL(recorder.audioBlob)}
                              controls
                              className="h-8 max-w-[200px] shrink-0"
                            />
                          </div>
                        )}
                      </div>

                      {recorder.errorMessage && (
                        <p className="text-xs text-red-500 font-medium">{recorder.errorMessage}</p>
                      )}
                    </div>

                    {/* Feedback report results */}
                    {isAnalyzing && (
                      <div className="p-8 border border-dashed border-indigo-200 dark:border-indigo-900 rounded-xl flex flex-col items-center justify-center gap-3 bg-indigo-50/10 dark:bg-indigo-950/5">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-sm font-semibold text-[#1F2937] dark:text-white">AI Speech Analyst is reviewing your reading...</p>
                        <p className="text-xs text-gray-400 text-center max-w-xs">Comparing your speech signals word-by-word to original text.</p>
                      </div>
                    )}

                    {!isAnalyzing && transcript && (
                      <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-6">
                        {/* Transcript view */}
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            What you read:
                          </h4>
                          <div className="p-4 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-100 dark:border-slate-800/40 text-[#1F2937] dark:text-gray-200">
                            {transcript}
                          </div>
                        </div>

                        {/* Pronunciation breakdown details */}
                        {feedback && (
                          <div className="space-y-4">
                            <h3 className="font-extrabold text-[#1F2937] dark:text-white text-base">Pronunciation Report</h3>
                            
                            {/* Score Cards */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-950/40 rounded-xl p-4 text-center">
                                <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">
                                  {feedback.accuracy_score}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/100</span>
                                </p>
                                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase mt-1 tracking-wider">Accuracy Score</p>
                              </div>
                              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-950/40 rounded-xl p-4 text-center">
                                <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                                  {feedback.fluency_score}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/100</span>
                                </p>
                                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase mt-1 tracking-wider">Fluency Score</p>
                              </div>
                            </div>

                            {/* Markdown coach suggestions */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-[#374151] dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                              {feedback.feedback_markdown.split('\n').map((line, idx) => {
                                if (line.startsWith('###')) {
                                  return <h4 key={idx} className="font-bold text-base text-[#1F2937] dark:text-white mt-4 mb-2 first:mt-0">{line.replace('###', '').trim()}</h4>
                                }
                                if (line.startsWith('**')) {
                                  return <p key={idx} className="font-semibold text-gray-900 dark:text-white mt-2">{line.replace(/\*\*/g, '').trim()}</p>
                                }
                                if (line.startsWith('-')) {
                                  return (
                                    <div key={idx} className="flex items-start gap-2 pl-2 mt-1.5">
                                      <span className="text-indigo-500 mt-1 shrink-0">•</span>
                                      <p>{line.slice(1).trim()}</p>
                                    </div>
                                  )
                                }
                                return <p key={idx} className="mt-1">{line}</p>
                              })}
                            </div>

                            {/* Word drills panel */}
                            {feedback.mispronounced_words.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Mispronounced words (click to hear correct audio):</p>
                                <div className="flex flex-wrap gap-2">
                                  {feedback.mispronounced_words.map((word, index) => (
                                    <button
                                      key={index}
                                      onClick={() => speak(word)}
                                      className="px-3 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-medium rounded-lg text-sm border border-red-100 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-950/40 transition capitalize flex items-center gap-1.5"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                      {word}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────────────────
                MODE 2: TV NEWS ANCHOR MODE (JOURNALIST BROADCAST SKIN)
                ───────────────────────────────────────────────────────────────────────────── */}
            {mode === 'journalist' && (
              <div className="grid grid-cols-1 gap-6">
                
                {/* News Anchor Viewfinder and Teleprompter container */}
                <div className="bg-[#0C1020] rounded-3xl border border-blue-900/60 p-6 shadow-2xl space-y-6 relative overflow-hidden text-white">
                  
                  {/* Studio glow background accents */}
                  <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

                  {/* Corner studio brackets */}
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-slate-600 rounded-tl" />
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-slate-600 rounded-tr" />
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-slate-600 rounded-bl" />
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-slate-600 rounded-br" />

                  {/* Top bar HUD */}
                  <div className="flex items-center justify-between border-b border-blue-950/40 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                      </span>
                      <span className="text-xs uppercase font-extrabold tracking-widest text-red-500 animate-pulse">
                        LIVE STUDIO BROADCAST
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                      <span>CH-108</span>
                      <span>1080P 60FPS</span>
                    </div>
                  </div>

                  {/* Viewfinder section / Video mock with scrolling script */}
                  <div className="relative border border-blue-950 bg-slate-950/80 rounded-2xl p-6 overflow-hidden min-h-[360px] flex flex-col justify-between">
                    
                    {/* Viewfinder scanner line overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none animate-pulse" />

                    {/* Teleprompter Scrolling Script */}
                    {loading ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                        <p className="text-sm font-semibold tracking-wider text-slate-300 uppercase">Teleprompter Loading...</p>
                      </div>
                    ) : passage ? (
                      <div className="flex-1 flex flex-col justify-between space-y-4">
                        {/* Title of broadcast */}
                        <div className="text-center bg-blue-950/40 border border-blue-900/30 py-2 rounded-lg backdrop-blur-sm">
                          <p className="text-xs text-blue-400 uppercase tracking-widest font-bold font-mono">BROADCAST SCRIPT</p>
                          <h3 className="text-lg font-bold text-white tracking-wide">{passage.title}</h3>
                        </div>

                        {/* Scrolling Script container */}
                        <div 
                          ref={teleprompterRef}
                          className="flex-1 overflow-y-auto max-h-[200px] border-y border-slate-900/60 py-4 px-2 scroll-smooth text-center select-none"
                          style={{ scrollbarWidth: 'none' }}
                        >
                          <div className="py-12 space-y-6">
                            <span className="block text-red-400/30 text-xs font-mono font-bold tracking-widest uppercase">--- PROMPTER START ---</span>
                            <p className="text-2xl font-bold leading-relaxed tracking-wide text-white antialiased">
                              {passage.content}
                            </p>
                            <span className="block text-red-400/30 text-xs font-mono font-bold tracking-widest uppercase">--- END OF REPORT ---</span>
                          </div>
                        </div>

                        {/* Teleprompter controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 border border-slate-900/40 p-3 rounded-xl backdrop-blur-sm text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">TELEPROMPTER:</span>
                            {isScrolling ? (
                              <Button
                                size="sm"
                                onClick={() => setIsScrolling(false)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold text-xs gap-1.5"
                              >
                                <Pause className="w-3.5 h-3.5" /> Pause Scroll
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setIsScrolling(true)}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs gap-1.5"
                              >
                                <Play className="w-3.5 h-3.5" /> Start Scroll
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsScrolling(false)
                                if (teleprompterRef.current) teleprompterRef.current.scrollTop = 0
                              }}
                              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1 font-semibold"
                            >
                              <RotateCcw className="w-3 h-3" /> Reset
                            </Button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-slate-400">SPEED:</span>
                            {([1, 2, 3] as const).map((speed) => (
                              <button
                                key={speed}
                                onClick={() => setScrollSpeed(speed)}
                                className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition border ${
                                  scrollSpeed === speed
                                    ? 'bg-red-600 border-red-600 text-white'
                                    : 'bg-transparent border-slate-800 text-slate-400 hover:bg-slate-800'
                                }`}
                              >
                                {speed === 1 ? '1x' : speed === 2 ? '2x' : '3x'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-8">No passage loaded. Click generate to start.</div>
                    )}
                  </div>

                  {/* Dynamic Voice Recording / Broadcast HUD */}
                  {passage && !loading && (
                    <div className="p-4 bg-slate-950/80 border border-blue-950 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-extrabold tracking-wide uppercase text-blue-400">ANALYST MICROPHONE CONTROLS</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Whisper transcribes live broadcast signals. GPT checks delivery.</p>
                        </div>

                        {/* Broadcast indicator */}
                        {recorder.state === 'recording' && (
                          <div className="flex items-center gap-1 bg-red-950/40 text-red-500 border border-red-900/60 px-3 py-1 rounded-full text-xs font-mono font-bold animate-pulse">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-ping" />
                            ON AIR: RECORDING
                          </div>
                        )}
                      </div>

                      {/* Waveform graphic during recording */}
                      {recorder.state === 'recording' && (
                        <div className="flex items-center justify-center gap-1 h-14 bg-[#0a0d1a] border border-red-950/30 rounded-xl overflow-hidden px-4">
                          {Array.from({ length: 48 }).map((_, i) => {
                            const jitter = Math.sin(i * 0.9 + Date.now() / 150) * 0.5 + 0.5
                            const height = Math.max(4, (recorder.audioLevel / 100) * 44 * jitter)
                            return (
                              <div
                                key={i}
                                className="w-1.5 rounded-full bg-red-600 transition-all duration-75"
                                style={{ height: `${height}px` }}
                              />
                            )
                          })}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        {recorder.state === 'idle' && (
                          <Button 
                            onClick={() => {
                              recorder.startRecording()
                              setIsScrolling(true) // Auto start scrolling when recording
                            }} 
                            className="bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-lg shadow-red-900/20 px-6 gap-2 border border-red-500/30"
                          >
                            <Mic className="w-4 h-4 animate-pulse text-white" /> Start Broadcast
                          </Button>
                        )}
                        {recorder.state === 'requesting' && (
                          <Button disabled className="bg-slate-900 text-slate-400 border border-slate-800 gap-2 font-bold">
                            <Loader2 className="w-4 h-4 animate-spin" /> Camera/Mic Permission...
                          </Button>
                        )}
                        {recorder.state === 'recording' && (
                          <Button 
                            onClick={() => {
                              recorder.stopRecording()
                              setIsScrolling(false) // Stop scrolling on stop recording
                            }} 
                            variant="destructive" 
                            className="gap-2 font-extrabold shadow-lg shadow-red-900/30 px-6"
                          >
                            <Square className="w-4 h-4" /> Cut Broadcast
                          </Button>
                        )}
                        {recorder.state === 'processing' && (
                          <Button disabled className="bg-slate-900 text-slate-400 border border-slate-800 gap-2 font-bold">
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" /> Processing Feed...
                          </Button>
                        )}
                        {recorder.state === 'error' && (
                          <div className="flex items-center gap-2">
                            <Button onClick={recorder.startRecording} className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
                              <Mic className="w-4 h-4" /> Recut Broadcast
                            </Button>
                            <Button onClick={recorder.resetRecording} variant="ghost" className="text-slate-400 text-xs font-semibold">
                              Dismiss Error
                            </Button>
                          </div>
                        )}

                        {/* Broadcast Duration Timer */}
                        {recorder.state === 'recording' && (
                          <span className="text-sm font-mono text-red-500 font-bold bg-red-950/20 border border-red-900/40 px-3 py-1.5 rounded-lg flex items-center gap-2">
                            {Math.floor(recorder.durationMs / 60000)}:{String(Math.floor((recorder.durationMs % 60000) / 1000)).padStart(2, '0')}
                          </span>
                        )}

                        {/* Review Playback / Analyze */}
                        {recorder.state === 'done' && recorder.audioBlob && (
                          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <Button
                              onClick={handleTranscribeAndAnalyze}
                              disabled={isAnalyzing}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold gap-2 shadow-lg shadow-blue-900/20"
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  Broadcasting analysis...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  Submit Broadcast Feed
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={recorder.resetRecording}
                              disabled={isAnalyzing}
                              className="border-slate-800 text-slate-400 hover:bg-slate-900 dark:hover:bg-slate-900 hover:text-white gap-1.5 font-bold"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Re-shoot
                            </Button>
                            <audio
                              src={URL.createObjectURL(recorder.audioBlob)}
                              controls
                              className="h-8 max-w-[200px] bg-slate-900 border border-slate-800 rounded text-slate-300"
                            />
                          </div>
                        )}
                      </div>

                      {recorder.errorMessage && (
                        <p className="text-xs text-red-500 font-semibold">{recorder.errorMessage}</p>
                      )}
                    </div>
                  )}

                  {/* Interactive breaking news ticker at bottom */}
                  <div className="bg-[#101530] border-t border-blue-900/50 -mx-6 -mb-6 px-6 py-3 overflow-hidden flex items-center justify-between text-xs font-mono font-bold tracking-wide relative h-10">
                    <span className="bg-red-600 text-white px-2.5 py-1 rounded text-[10px] tracking-widest uppercase mr-3 shrink-0 z-10 border border-red-500/20">
                      BREAKING
                    </span>
                    
                    {/* Sliding Marquee element */}
                    <div className="flex-1 overflow-hidden relative w-full h-full flex items-center">
                      <div className="absolute animate-ticker whitespace-nowrap text-blue-200">
                        {NEWS_TICKERS[tickerIndex]}
                      </div>
                    </div>

                    <style>{`
                      @keyframes marquee {
                        0% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                      }
                      .animate-ticker {
                        animation: marquee 24s linear infinite;
                      }
                    `}</style>
                  </div>
                </div>

                {/* Broadcast Review / Pronunciation feedback */}
                {isAnalyzing && (
                  <div className="bg-slate-950 border border-blue-900/30 rounded-3xl p-8 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                    <p className="text-sm tracking-wider font-extrabold text-blue-400 uppercase">TRANSMITTING BROACAST SEED TO AI ENGINE...</p>
                    <p className="text-xs text-slate-500 text-center max-w-xs font-mono">Whisper audio waveform translation and vocabulary review is underway.</p>
                  </div>
                )}

                {!isAnalyzing && transcript && (
                  <div className="bg-[#0C1020] rounded-3xl border border-blue-900/60 p-6 shadow-xl space-y-6 text-white">
                    <div>
                      <h3 className="font-extrabold text-[#3B82F6] text-lg tracking-wider uppercase">BROADCAST TRANSMISSION LOGS</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Review your voice-to-text broadcast output below.</p>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                      {transcript}
                    </div>

                    {feedback && (
                      <div className="space-y-6 border-t border-blue-950/60 pt-6">
                        {/* Audio report summary stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-5 text-center">
                            <p className="text-4xl font-extrabold text-blue-400 font-mono">
                              {feedback.accuracy_score}<span className="text-sm font-normal text-slate-500 font-sans">/100</span>
                            </p>
                            <p className="text-xs font-bold text-blue-300 uppercase tracking-widest mt-1.5">Anchor Accuracy</p>
                          </div>
                          <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-2xl p-5 text-center">
                            <p className="text-4xl font-extrabold text-indigo-400 font-mono">
                              {feedback.fluency_score}<span className="text-sm font-normal text-slate-500 font-sans">/100</span>
                            </p>
                            <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mt-1.5">Anchor Fluency</p>
                          </div>
                        </div>

                        {/* Broadcast speech alignment highlights */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Visual Accent Review:</h4>
                          <div className="p-5 bg-slate-950 border border-blue-950/30 rounded-2xl min-h-[100px]">
                            {renderHighlightedPassage()}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono pl-1">
                            * Red underlined text signifies missed or mispronounced words. Click any red word to hear its target audio pronunciation.
                          </p>
                        </div>

                        {/* Detailed Coach markup feedback */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Studio Director's Notes:</h4>
                          <div className="p-6 bg-slate-950 border border-slate-900 rounded-2xl text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {feedback.feedback_markdown.split('\n').map((line, idx) => {
                              if (line.trim().length === 0) return null
                              if (line.startsWith('###')) {
                                return <h5 key={idx} className="font-extrabold text-blue-400 tracking-wide text-sm mt-4 mb-2 first:mt-0 uppercase font-mono">{line.replace('###', '').trim()}</h5>
                              }
                              if (line.startsWith('**')) {
                                return <p key={idx} className="font-bold text-slate-200 mt-2 font-mono text-xs uppercase tracking-wider">{line.replace(/\*\*/g, '').trim()}</p>
                              }
                              if (line.startsWith('-')) {
                                return (
                                  <div key={idx} className="flex items-start gap-2.5 pl-2 mt-1.5 font-sans">
                                    <span className="text-blue-500 mt-1 shrink-0">•</span>
                                    <p className="text-slate-300">{line.slice(1).trim()}</p>
                                  </div>
                                )
                              }
                              return <p key={idx} className="mt-1 font-sans text-slate-300">{line}</p>
                            })}
                          </div>
                        </div>

                        {/* Practice items */}
                        {feedback.mispronounced_words.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono">Director's Pronunciation Drills:</h4>
                            <div className="flex flex-wrap gap-2">
                              {feedback.mispronounced_words.map((word, index) => (
                                <button
                                  key={index}
                                  onClick={() => speak(word)}
                                  className="px-3 py-1.5 bg-red-950/20 text-red-400 font-bold font-mono rounded-lg text-xs border border-red-900/40 hover:bg-red-950/50 hover:border-red-500 transition capitalize flex items-center gap-1.5"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                  {word}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
