'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface RecordingPlaybackProps {
    audioBlob: Blob | null
}

export function RecordingPlayback({ audioBlob }: RecordingPlaybackProps) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!audioBlob) {
            setObjectUrl(null)
            return
        }
        const url = URL.createObjectURL(audioBlob)
        setObjectUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [audioBlob])

    if (!objectUrl) return null

    return (
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-[#1F2937] dark:text-white">Your Recording</h3>
                </div>
                <audio controls src={objectUrl} className="w-full h-10">
                    Your browser does not support audio playback.
                </audio>
            </CardContent>
        </Card>
    )
}