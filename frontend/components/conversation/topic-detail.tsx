'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, Clock, Mic } from 'lucide-react'
import { getTopicIcon } from './topic-card'

export interface ConversationTopicDetail {
    id: string
    title: string
    icon: string
    description: string
    prompt: string
    instructions: string[]
    estimatedTimeSeconds: number
}

interface TopicDetailProps {
    topic: ConversationTopicDetail
    onBack: () => void
    onStartSpeaking: () => void
}

const SPEAKING_TIPS = [
    "Speak continuously for the full duration.",
    "Don't worry about making mistakes.",
    'Try to give detailed explanations.',
    'Avoid reading from notes.',
    'Speak naturally.',
    'Use examples whenever possible.',
]

export function TopicDetail({ topic, onBack, onStartSpeaking }: TopicDetailProps) {
    const Icon = getTopicIcon(topic.icon)
    const minutes = Math.floor(topic.estimatedTimeSeconds / 60)
    const seconds = topic.estimatedTimeSeconds % 60
    const timeLabel = seconds > 0 ? `${minutes} min ${seconds} sec` : `${minutes} minutes`

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Back to topics
            </Button>

            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]">
                <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <Icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-1">Topic</p>
                            <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">{topic.title}</h2>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">Prompt</p>
                        <p className="text-lg text-[#1F2937] dark:text-white font-medium">{topic.prompt}</p>
                        <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1">
                            Talk for about {timeLabel}.
                        </p>
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">
                            You can explain
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {topic.instructions.map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-2 text-sm text-[#1F2937] dark:text-gray-200"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">
                            Instructions
                        </p>
                        <ul className="space-y-1.5">
                            {SPEAKING_TIPS.map((tip) => (
                                <li key={tip} className="flex items-start gap-2 text-sm text-[#374151] dark:text-gray-300">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <Badge variant="outline" className="flex items-center gap-1.5 text-[#6B7280] dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5" />
                            Estimated Time: {timeLabel}
                        </Badge>
                        <Button size="lg" onClick={onStartSpeaking} className="flex items-center gap-2">
                            <Mic className="w-4 h-4" />
                            Start Speaking
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}