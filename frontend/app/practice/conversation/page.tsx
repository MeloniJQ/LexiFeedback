'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, ArrowLeft, RotateCcw, MessageCircle, Home } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { API_URL as API } from '@/lib/api'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import { TopicCard, type ConversationTopicSummary } from '@/components/conversation/topic-card'
import { TopicDetail, type ConversationTopicDetail } from '@/components/conversation/topic-detail'
import { CustomTopicCard } from '@/components/conversation/custom-topic-card'
import { SpeakingTimer } from '@/components/conversation/speaking-timer'
import { RecordingPlayback } from '@/components/conversation/recording-playback'
import { FeedbackReport, type ConversationFeedback } from '@/components/conversation/feedback-report'

type Stage = 'topics' | 'detail' | 'recording' | 'processing' | 'feedback'

async function authedFetch(url: string, options: RequestInit = {}, timeoutMs = 60_000) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
    return data
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export default function CasualConversationPage() {
  const [stage, setStage] = useState<Stage>('topics')

  const [topics, setTopics] = useState<ConversationTopicSummary[] | null>(null)
  const [topicsError, setTopicsError] = useState('')

  const [selectedTopic, setSelectedTopic] = useState<ConversationTopicDetail | null>(null)

  const [processingLabel, setProcessingLabel] = useState('Transcribing your answer...')
  const [error, setError] = useState('')

  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null)
  const [, setFinalDurationSeconds] = useState(0)

  const recorder = useVoiceRecorder()
  const processedBlobRef = useRef<Blob | null>(null)

  // ── Load topics on mount ────────────────────────────────────────────────
  useEffect(() => {
    authedFetch(`${API}/practice/conversation/topics`)
      .then((data: ConversationTopicSummary[]) => setTopics(data))
      .catch((e: Error) => setTopicsError(e.message))
  }, [])

  // ── Select a predefined topic → fetch full detail ───────────────────────
  const handleSelectTopic = async (topic: ConversationTopicSummary) => {
    setError('')
    try {
      const detail: ConversationTopicDetail = await authedFetch(
        `${API}/practice/conversation/topics/${topic.id}`
      )
      setSelectedTopic(detail)
      setStage('detail')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load topic')
    }
  }

  // ── User typed their own topic — already fully built client-side ───────
  const handleCustomTopic = (topic: ConversationTopicDetail) => {
    setError('')
    setSelectedTopic(topic)
    setStage('detail')
  }

  const handleBackToTopics = () => {
    recorder.resetRecording()
    processedBlobRef.current = null
    setSelectedTopic(null)
    setFeedback(null)
    setTranscript('')
    setError('')
    setStage('topics')
  }

  // ── Start Speaking ───────────────────────────────────────────────────────
  const handleStartSpeaking = async () => {
    setError('')
    recorder.resetRecording()
    processedBlobRef.current = null
    await recorder.startRecording()
    setStage('recording')
  }

  // ── Finish (manual or automatic at time limit) ──────────────────────────
  const handleFinishRecording = useCallback(() => {
    recorder.stopRecording()
  }, [recorder])

  // ── Once the recorder has produced a blob, transcribe + analyze ────────
  // NOTE: `stage` is intentionally NOT a dependency here. Calling
  // setStage('processing') inside this effect would otherwise re-trigger
  // this same effect (since `stage` changed), which runs this effect's own
  // cleanup and sets `cancelled = true` on the in-flight request — silently
  // killing it right after transcription succeeds but before the feedback
  // call ever fires. `processedBlobRef` guards against double-processing
  // the same recording instead.
  useEffect(() => {
    if (recorder.state !== 'done' || !recorder.audioBlob || !selectedTopic) return
    if (processedBlobRef.current === recorder.audioBlob) return
    processedBlobRef.current = recorder.audioBlob

    let cancelled = false

    const run = async () => {
      setStage('processing')
      setProcessingLabel('Transcribing your answer...')
      setError('')

      try {
        const token = getToken()
        const ext = recorder.audioBlob!.type.includes('mp4') ? 'mp4' : 'webm'
        const fd = new FormData()
        fd.append('audio', recorder.audioBlob!, `answer.${ext}`)
        fd.append('language', 'en')

        // Long recordings (up to 2 minutes) take real time to transcribe —
        // give this a generous timeout so a slow-but-working request isn't
        // mistaken for a hang, while still guaranteeing the UI never spins
        // forever silently.
        const transcribeController = new AbortController()
        const transcribeTimer = setTimeout(() => transcribeController.abort(), 180_000)

        let transcribeRes: Response
        try {
          transcribeRes = await fetch(`${API}/voice/transcribe`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
            signal: transcribeController.signal,
          })
        } catch (fetchErr) {
          if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
            throw new Error('Transcription timed out after 3 minutes. Please try again.')
          }
          throw fetchErr
        } finally {
          clearTimeout(transcribeTimer)
        }

        const transcribeData = await transcribeRes.json()
        if (!transcribeRes.ok) throw new Error(transcribeData.error || 'Transcription failed')

        if (cancelled) return
        setTranscript(transcribeData.transcript || '')
        setProcessingLabel('Analyzing your speaking...')

        const durationSeconds = transcribeData.duration_seconds || 0
        setFinalDurationSeconds(durationSeconds)

        // Custom topics have no real backend topic_id — send the
        // title/prompt directly instead, which the /feedback endpoint
        // already supports as a fallback.
        const feedbackBody =
          selectedTopic.id === 'custom'
            ? {
                transcript: transcribeData.transcript,
                topic_title: selectedTopic.title,
                topic_prompt: selectedTopic.prompt,
                duration_seconds: durationSeconds,
              }
            : {
                transcript: transcribeData.transcript,
                topic_id: selectedTopic.id,
                duration_seconds: durationSeconds,
              }

        // Feedback generation produces a large 10-section report — allow
        // more time than a typical request, but still bounded.
        const feedbackData: ConversationFeedback = await authedFetch(
          `${API}/practice/conversation/feedback`,
          {
            method: 'POST',
            body: JSON.stringify(feedbackBody),
          },
          120_000
        )

        if (cancelled) return
        setFeedback(feedbackData)
        setStage('feedback')
      } catch (e) {
        if (cancelled) return
        // Always log the full error to the console so it's easy to grab
        // exact diagnostic details, even though the UI shows a shorter message.
        console.error('[CasualConversation] transcribe/feedback failed:', e)
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setStage('detail')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [recorder.state, recorder.audioBlob, selectedTopic])

  const handleTryAnotherTopic = () => {
    recorder.resetRecording()
    processedBlobRef.current = null
    setSelectedTopic(null)
    setFeedback(null)
    setTranscript('')
    setError('')
    setStage('topics')
  }

  const handleRetrySameTopic = () => {
    recorder.resetRecording()
    processedBlobRef.current = null
    setFeedback(null)
    setTranscript('')
    setError('')
    setStage('detail')
  }

  const handleFullRestart = () => {
    recorder.resetRecording()
    processedBlobRef.current = null
    setSelectedTopic(null)
    setFeedback(null)
    setTranscript('')
    setError('')
    setStage('topics')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="absolute top-6 right-6 flex gap-2">
        {stage !== 'topics' && (
          <Button variant="ghost" onClick={handleFullRestart} className="gap-2 text-sm">
            <RotateCcw className="w-4 h-4" /> Restart
          </Button>
        )}
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <Home className="w-4 h-4" /> Dashboard
          </Button>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto space-y-6 px-6 py-10">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2 flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Casual Conversation
          </h1>
          <p className="text-[#6B7280] dark:text-gray-400">
            Pick a topic, speak naturally for a couple of minutes, and get a detailed speaking evaluation.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Topic grid ─────────────────────────────────────────────────── */}
        {stage === 'topics' && (
          <>
            {!topics && !topicsError && (
              <div className="flex items-center justify-center py-20 text-[#6B7280] dark:text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading topics…
              </div>
            )}
            {topicsError && (
              <div className="flex items-center gap-2 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {topicsError}
              </div>
            )}
            {topics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} onSelect={handleSelectTopic} />
                ))}
                <CustomTopicCard onCreate={handleCustomTopic} />
              </div>
            )}
          </>
        )}

        {/* ── Topic detail / pre-recording screen ───────────────────────── */}
        {stage === 'detail' && selectedTopic && (
          <TopicDetail
            topic={selectedTopic}
            onBack={handleBackToTopics}
            onStartSpeaking={handleStartSpeaking}
          />
        )}

        {/* ── Live recording screen ─────────────────────────────────────── */}
        {stage === 'recording' && selectedTopic && (
          <SpeakingTimer
            topicTitle={selectedTopic.title}
            elapsedMs={recorder.durationMs}
            totalSeconds={selectedTopic.estimatedTimeSeconds}
            audioLevel={recorder.audioLevel}
            onFinish={handleFinishRecording}
            onAutoComplete={handleFinishRecording}
          />
        )}

        {/* ── Processing (transcribing / analyzing) ─────────────────────── */}
        {stage === 'processing' && (
          <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="font-medium text-[#1F2937] dark:text-white">{processingLabel}</p>
            <p className="text-sm text-[#6B7280] dark:text-gray-400">This takes a few seconds.</p>
          </div>
        )}

        {/* ── Feedback report ────────────────────────────────────────────── */}
        {stage === 'feedback' && feedback && selectedTopic && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Button variant="ghost" size="sm" onClick={handleTryAnotherTopic} className="flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Choose another topic
              </Button>
              <Button variant="outline" size="sm" onClick={handleRetrySameTopic} className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                Try this topic again
              </Button>
            </div>
            <RecordingPlayback audioBlob={recorder.audioBlob} />
            <FeedbackReport feedback={feedback} topicTitle={selectedTopic.title} transcript={transcript} />
          </div>
        )}
      </div>
    </div>
  )
}