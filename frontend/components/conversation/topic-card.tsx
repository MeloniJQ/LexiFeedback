'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
    Briefcase,
    Building2,
    Calendar,
    Clapperboard,
    Dumbbell,
    GraduationCap,
    HeartHandshake,
    Leaf, Lightbulb, MessageCircle,
    Palette,
    PartyPopper,
    Plane,
    Share2,
    ShoppingBag,
    Smartphone,
    Star,
    Sun,
    Target,
    Users,
    Utensils,
    type LucideIcon,
} from 'lucide-react'

export interface ConversationTopicSummary {
    id: string
    title: string
    icon: string
    description: string
    estimatedTimeSeconds: number
}

const ICON_MAP: Record<string, LucideIcon> = {
    sun: Sun,
    users: Users,
    palette: Palette,
    'graduation-cap': GraduationCap,
    utensils: Utensils,
    'heart-handshake': HeartHandshake,
    calendar: Calendar,
    plane: Plane,
    target: Target,
    star: Star,
    smartphone: Smartphone,
    clapperboard: Clapperboard,
    'party-popper': PartyPopper,
    dumbbell: Dumbbell,
    'shopping-bag': ShoppingBag,
    'share-2': Share2,
    'building-2': Building2,
    briefcase: Briefcase,
    leaf: Leaf,
    lightbulb: Lightbulb,
}

export function getTopicIcon(icon: string): LucideIcon {
    return ICON_MAP[icon] || MessageCircle
}

interface TopicCardProps {
    topic: ConversationTopicSummary
    onSelect: (topic: ConversationTopicSummary) => void
}

export function TopicCard({ topic, onSelect }: TopicCardProps) {
    const Icon = getTopicIcon(topic.icon)
    const minutes = Math.round(topic.estimatedTimeSeconds / 60)

    return (
        <Card
            onClick={() => onSelect(topic)}
            className="group cursor-pointer border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937] transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700"
        >
            <CardContent className="p-5 flex flex-col gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-[#1F2937] dark:text-white">{topic.title}</h3>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1 leading-snug">
                        {topic.description}
                    </p>
                </div>
                <span className="text-xs text-[#9CA3AF] dark:text-gray-500 mt-auto">
                    ~{minutes} min
                </span>
            </CardContent>
        </Card>
    )
}