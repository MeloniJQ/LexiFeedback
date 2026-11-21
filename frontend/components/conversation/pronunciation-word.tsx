'use client'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import { API_URL as API } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { CheckCircle2, Mic, Square, Volume2, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface MispronouncedWord {
    word: string
    phonetic_spelling: string
    ipa: string
    syllables: string
    stress: string
}

interface PronunciationWordProps {
    data: MispronouncedWord
    /** Text to display on screen (e.g. the word exactly as it appeared in the
     * transcript, preserving original casing). Defaults to data.word. TTS
     * playback and the practice comparison always use the canonical
     * data.word, regardless of what's displayed. */
    displayText?: string
}

/** Speaks a word aloud using the browser's built-in text-to-speech (free, no API key). */
function speakWord(word: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel() // stop anything already playing so replays feel instant
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.85 // slightly slower than natural speech, easier to follow for practice
    window.speechSynthesis.speak(utterance)
}

/** Simple Levenshtein edit distance — used to give a lenient "close enough" verdict. */
function levenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] =
                a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
        }
    }
    return dp[m][n]
}

type PracticeVerdict = 'match' | 'close' | 'retry' | null

function PracticeAgain({ word }: { word: string }) {
    const recorder = useVoiceRecorder()
    const [busy, setBusy] = useState(false)
    const [verdict, setVerdict] = useState<PracticeVerdict>(null)
    const [heardText, setHeardText] = useState('')
    const processedRef = useRef<Blob | null>(null)

    const handleRecordToggle = async () => {
        if (recorder.state === 'recording') {
            recorder.stopRecording()
            return
        }
        setVerdict(null)
        setHeardText('')
        recorder.resetRecording()
        processedRef.current = null
        await recorder.startRecording()
    }

    // Once a recording finishes, transcribe it and compare to the target word.
    // This runs as a proper effect (not inline during render) to avoid
    // triggering state updates while React is mid-render.
    useEffect(() => {
        if (recorder.state !== 'done' || !recorder.audioBlob) return
        if (processedRef.current === recorder.audioBlob) return
        processedRef.current = recorder.audioBlob

        let cancelled = false

        const run = async () => {
            setBusy(true)
            try {
                const token = getToken()
                const fd = new FormData()
                fd.append('audio', recorder.audioBlob!, 'word.webm')
                fd.append('language', 'en')
                const res = await fetch(`${API}/voice/transcribe`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                })
                const data = await res.json()
                if (cancelled) return

                const heard = (data.transcript || '').trim().toLowerCase().replace(/[.,!?]/g, '')
                setHeardText(data.transcript || '')

                const target = word.toLowerCase()
                if (!heard) {
                    setVerdict('retry')
                } else if (heard === target) {
                    setVerdict('match')
                } else {
                    const dist = levenshtein(heard, target)
                    setVerdict(dist <= Math.max(1, Math.floor(target.length * 0.3)) ? 'close' : 'retry')
                }
            } catch {
                if (!cancelled) setVerdict('retry')
            } finally {
                if (!cancelled) setBusy(false)
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [recorder.state, recorder.audioBlob, word])

    return (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
            <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">
                Practice Again
            </p>
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant={recorder.state === 'recording' ? 'destructive' : 'outline'}
                    onClick={handleRecordToggle}
                    disabled={busy}
                    className="flex items-center gap-1.5"
                >
                    {recorder.state === 'recording' ? (
                        <>
                            <Square className="w-3.5 h-3.5" /> Stop
                        </>
                    ) : (
                        <>
                            <Mic className="w-3.5 h-3.5" /> Record &ldquo;{word}&rdquo;
                        </>
                    )}
                </Button>
                {busy && <span className="text-xs text-[#6B7280] dark:text-gray-400">Checking…</span>}
            </div>

            {verdict && !busy && (
                <div className="mt-2 flex items-start gap-1.5 text-xs">
                    {verdict === 'match' && (
                        <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-green-700 dark:text-green-400">
                                Great pronunciation! That matched perfectly.
                            </span>
                        </>
                    )}
                    {verdict === 'close' && (
                        <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-amber-700 dark:text-amber-400">
                                Close! We heard &ldquo;{heardText}&rdquo; — keep practicing.
                            </span>
                        </>
                    )}
                    {verdict === 'retry' && (
                        <>
                            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-red-700 dark:text-red-400">
                                {heardText ? `We heard "${heardText}" — try again.` : "We didn't catch that — try again."}
                            </span>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export function PronunciationWord({ data, displayText }: PronunciationWordProps) {
    const [open, setOpen] = useState(false)
    const label = displayText ?? data.word

    return (
        <span className="inline-flex items-center gap-0.5 mr-1">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="underline decoration-dotted decoration-2 decoration-amber-500 underline-offset-4 font-medium text-[#1F2937] dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                        {label}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="start">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-[#1F2937] dark:text-white">{data.word}</p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => speakWord(data.word)}
                                className="flex items-center gap-1.5 h-7 px-2"
                            >
                                <Volume2 className="w-3.5 h-3.5" />
                                Play
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                            {data.phonetic_spelling && (
                                <>
                                    <span className="text-[#6B7280] dark:text-gray-400">Phonetic</span>
                                    <span className="text-[#1F2937] dark:text-white">{data.phonetic_spelling}</span>
                                </>
                            )}
                            {data.ipa && (
                                <>
                                    <span className="text-[#6B7280] dark:text-gray-400">IPA</span>
                                    <span className="text-[#1F2937] dark:text-white">{data.ipa}</span>
                                </>
                            )}
                            {data.syllables && (
                                <>
                                    <span className="text-[#6B7280] dark:text-gray-400">Syllables</span>
                                    <span className="text-[#1F2937] dark:text-white">{data.syllables}</span>
                                </>
                            )}
                            {data.stress && (
                                <>
                                    <span className="text-[#6B7280] dark:text-gray-400">Stress</span>
                                    <span className="text-[#1F2937] dark:text-white">{data.stress}</span>
                                </>
                            )}
                        </div>

                        {open && <PracticeAgain word={data.word} />}
                    </div>
                </PopoverContent>
            </Popover>
            <button
                type="button"
                onClick={() => speakWord(data.word)}
                aria-label={`Play pronunciation of ${data.word}`}
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
                <Volume2 className="w-3.5 h-3.5" />
            </button>
        </span>
    )
}