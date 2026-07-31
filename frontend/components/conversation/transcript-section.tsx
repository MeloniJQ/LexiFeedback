'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'
import { PronunciationWord, type MispronouncedWord } from './pronunciation-word'

interface TranscriptSectionProps {
    /** The raw, unedited transcript exactly as returned by speech-to-text —
     * never paraphrased, corrected, or cleaned up. */
    transcript: string
    mispronouncedWords: MispronouncedWord[]
}

// Splits on runs of letters/apostrophes, keeping every other character
// (spaces, punctuation, line breaks) completely untouched via the capturing
// group. This lets us swap in the interactive component for matched words
// only, without altering a single character of the original transcript.
const WORD_TOKEN_REGEX = /([A-Za-z']+)/
const IS_WORD = /^[A-Za-z']+$/

export function TranscriptSection({ transcript, mispronouncedWords }: TranscriptSectionProps) {
    if (!transcript.trim()) return null

    const lookup = new Map(mispronouncedWords.map((w) => [w.word.toLowerCase(), w]))
    const parts = transcript.split(WORD_TOKEN_REGEX)

    return (
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]">
            <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white">Transcript</h3>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-gray-400 mb-4">
                    Exactly what you said, unedited. Underlined words were flagged for pronunciation —
                    click one to hear it said correctly.
                </p>
                <p className="text-sm text-[#374151] dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {parts.map((part, i) => {
                        if (IS_WORD.test(part)) {
                            const match = lookup.get(part.toLowerCase())
                            if (match) {
                                return <PronunciationWord key={i} data={match} displayText={part} />
                            }
                        }
                        return <span key={i}>{part}</span>
                    })}
                </p>
                {mispronouncedWords.length === 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                        No pronunciation issues detected in this recording — great job!
                    </p>
                )}
            </CardContent>
        </Card>
    )
}