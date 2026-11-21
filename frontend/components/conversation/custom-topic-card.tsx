'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowRight, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { ConversationTopicDetail } from './topic-detail'

interface CustomTopicCardProps {
    onCreate: (topic: ConversationTopicDetail) => void
}

// Generic speaking instructions that work for any topic, since a
// user-typed topic has no backend-authored talking points of its own.
const GENERIC_INSTRUCTIONS = [
    'Introduce your topic and why you chose it',
    'Share your personal thoughts or experience',
    'Give specific examples',
    'Explain how it affects your daily life',
    'Share your opinion on it',
]

export function CustomTopicCard({ onCreate }: CustomTopicCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [value, setValue] = useState('')

    const handleSubmit = () => {
        const topic = value.trim()
        if (!topic) return

        onCreate({
            id: 'custom',
            title: topic,
            icon: 'custom', // not in ICON_MAP — topic-card.tsx's getTopicIcon() falls back to a generic message icon
            description: `A topic you chose yourself.`,
            prompt: `Talk about ${topic} for approximately 2 minutes.`,
            instructions: GENERIC_INSTRUCTIONS,
            estimatedTimeSeconds: 120,
        })

        setValue('')
        setExpanded(false)
    }

    if (expanded) {
        return (
            <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10">
                <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[#1F2937] dark:text-white">Custom Topic</h3>
                        <button
                            type="button"
                            onClick={() => {
                                setExpanded(false)
                                setValue('')
                            }}
                            className="text-[#9CA3AF] hover:text-[#6B7280] dark:hover:text-gray-300 transition-colors"
                            aria-label="Cancel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <Input
                        autoFocus
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit()
                        }}
                        placeholder="e.g. My Favorite Movie"
                        maxLength={80}
                    />
                    <Button onClick={handleSubmit} disabled={!value.trim()} size="sm" className="flex items-center gap-1.5 self-end">
                        Start
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card
            onClick={() => setExpanded(true)}
            className="group cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
        >
            <CardContent className="p-5 flex flex-col gap-3 items-center justify-center text-center h-full min-h-[172px]">
                <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <Plus className="w-5 h-5 text-[#6B7280] dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-[#1F2937] dark:text-white">Custom Topic</h3>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1">
                        Practice speaking about anything you choose.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}