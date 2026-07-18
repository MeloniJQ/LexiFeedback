'use client'

import type { GoalStats } from '@/lib/api'
import { CheckCircle2, Flame, Hourglass, Target, TrendingUp, Trophy } from 'lucide-react'

interface GoalStatsCardsProps {
    stats: GoalStats
}

export function GoalStatsCards({ stats }: GoalStatsCardsProps) {
    const cards = [
        { label: 'Total Goals', value: stats.totalGoals, icon: Target, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Completed', value: stats.completedGoals, icon: CheckCircle2, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
        { label: 'Current Streak', value: stats.currentStreak, icon: Flame, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
        { label: 'Longest Streak', value: stats.longestStreak, icon: Trophy, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
        { label: 'Avg Progress', value: `${stats.averageProgress}%`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
        { label: 'Active Goals', value: stats.activeGoals, icon: Hourglass, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <div
                        key={card.label}
                        className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2 transition-transform hover:-translate-y-0.5"
                    >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                            <Icon className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-[#1F2937] dark:text-white leading-tight">{card.value}</p>
                            <p className="text-xs text-[#6B7280] dark:text-gray-400">{card.label}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}