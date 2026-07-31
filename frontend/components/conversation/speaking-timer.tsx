'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Mic } from 'lucide-react'

interface SpeakingTimerProps {
    topicTitle: string
    elapsedMs: number
    totalSeconds: number
    /** 0–100, live microphone input level from useVoiceRecorder — drives the level meter. */
    audioLevel: number
    onFinish: () => void
    /** Called exactly once, automatically, the moment elapsed time reaches totalSeconds. */
    onAutoComplete: () => void
}

function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60)
    const s = Math.floor(totalSeconds % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const METER_BAR_COUNT = 12

/** Live equalizer-style bars driven by the mic's real-time input level (0–100). */
function VoiceLevelMeter({ level }: { level: number }) {
    const activeBars = Math.round((level / 100) * METER_BAR_COUNT)
    const isHearingVoice = level > 6 // small noise-floor threshold so idle silence doesn't look "active"

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-end gap-1 h-10">
                {Array.from({ length: METER_BAR_COUNT }).map((_, i) => {
                    const isActive = i < activeBars
                    // Bars grow taller toward the center for a natural equalizer look
                    const heightPercent = 35 + Math.abs(i - METER_BAR_COUNT / 2) * -4 + 40
                    return (
                        <span
                            key={i}
                            style={{ height: `${Math.max(heightPercent, 25)}%` }}
                            className={`w-1.5 rounded-full transition-all duration-100 ${isActive
                                    ? 'bg-red-500 dark:bg-red-400'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                        />
                    )
                })}
            </div>
            <p
                className={`text-xs transition-colors ${isHearingVoice
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-[#9CA3AF] dark:text-gray-500'
                    }`}
            >
                {isHearingVoice ? "We're hearing you clearly" : 'Waiting for your voice…'}
            </p>
        </div>
    )
}

export function SpeakingTimer({
    topicTitle,
    elapsedMs,
    totalSeconds,
    audioLevel,
    onFinish,
    onAutoComplete,
}: SpeakingTimerProps) {
    const elapsedSeconds = Math.min(elapsedMs / 1000, totalSeconds)
    const progressPercent = Math.min((elapsedSeconds / totalSeconds) * 100, 100)
    const hasAutoCompleted = useRef(false)

    useEffect(() => {
        if (elapsedMs / 1000 >= totalSeconds && !hasAutoCompleted.current) {
            hasAutoCompleted.current = true
            onAutoComplete()
        }
    }, [elapsedMs, totalSeconds, onAutoComplete])

    // Mic icon subtly scales with voice level for an at-a-glance "it's hearing me" cue
    const micScale = 1 + Math.min(audioLevel / 100, 1) * 0.25

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-6 text-center">
                <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white">{topicTitle}</h2>

                <div className="relative">
                    <div
                        style={{ transform: `scale(${micScale})` }}
                        className="w-20 h-20 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 transition-transform duration-100"
                    >
                        <Mic className="w-8 h-8 text-red-500" />
                    </div>
                    <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-40" />
                </div>

                <VoiceLevelMeter level={audioLevel} />

                <div>
                    <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-1">
                        Speaking Time
                    </p>
                    <p className="text-4xl font-bold tabular-nums text-[#1F2937] dark:text-white">
                        {formatTime(elapsedSeconds)}{' '}
                        <span className="text-lg text-[#9CA3AF] dark:text-gray-500 font-normal">
                            / {formatTime(totalSeconds)}
                        </span>
                    </p>
                </div>

                <div className="w-full">
                    <Progress value={progressPercent} className="h-3 transition-all duration-500" />
                </div>

                <div className="flex items-center gap-2 text-red-500 font-medium text-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Recording...
                </div>

                <Button size="lg" variant="destructive" onClick={onFinish} className="min-w-[160px]">
                    Finish
                </Button>
            </div>
        </div>
    )
}