'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Goal } from '@/lib/api'
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    Flame,
    PauseCircle,
    Pencil,
    Target,
    Trash2,
    Trophy,
} from 'lucide-react'
import { UpdateProgressPopover } from './update-progress-popover'

interface GoalCardProps {
    goal: Goal
    onEdit: (goal: Goal) => void
    onDelete: (goal: Goal) => void
    onUpdateProgress: (goal: Goal, mode: 'increment' | 'set', value: number) => Promise<void> | void
    justUpdated?: boolean
}

function formatDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(`${iso}T00:00:00`)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusConfig: Record<
    Goal['status'],
    {
        label: string
        className: string
        icon: typeof Target
    }
> = {
    active: {
        label: 'Active',
        className:
            'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        icon: Target,
    },
    completed: {
        label: 'Completed ✅',
        className:
            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
        icon: CheckCircle2,
    },
    overdue: {
        label: 'Overdue',
        className:
            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
        icon: Clock,
    },
    paused: {
        label: 'Paused',
        className:
            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        icon: PauseCircle,
    },
}
export function GoalCard({ goal, onEdit, onDelete, onUpdateProgress, justUpdated }: GoalCardProps) {
    const status = statusConfig[goal.status]
    const StatusIcon = status.icon

    const daysRemaining = goal.daysRemaining
    const daysLabel =
        goal.status === 'completed'
            ? 'Reached 🎉'
            : daysRemaining === null
                ? '—'
                : daysRemaining < 0
                    ? `${Math.abs(daysRemaining)} days overdue`
                    : daysRemaining === 0
                        ? 'Due today'
                        : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`

    return (
        <div
            className={`bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-4 transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 ${justUpdated ? 'ring-2 ring-blue-400' : ''
                }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-[#6B7280] dark:text-gray-400">
                            {goal.goalType}
                        </Badge>
                    </div>
                    <h3 className="font-semibold text-[#1F2937] dark:text-white break-words">{goal.title}</h3>
                    {goal.description && (
                        <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1 break-words">{goal.description}</p>
                    )}
                </div>
                <Badge className={`flex items-center gap-1 border shrink-0 ${status.className}`} variant="outline">
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                </Badge>
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-gray-400">
                        Progress: {goal.currentProgress} / {goal.targetValue}
                    </span>
                    <span className="text-[#1F2937] dark:text-white font-medium">
                        {goal.progressPercentage}%
                    </span>
                </div>
                <Progress value={goal.progressPercentage} className="transition-all duration-500" />
            </div>

            {/* Streak */}
            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                    <Flame className={`w-4 h-4 ${goal.streakCount > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                    <span className="text-[#1F2937] dark:text-white font-medium">{goal.streakCount}</span>
                    <span className="text-[#6B7280] dark:text-gray-400 text-xs">day streak</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-[#1F2937] dark:text-white font-medium">{goal.longestStreak}</span>
                    <span className="text-[#6B7280] dark:text-gray-400 text-xs">best</span>
                </div>
            </div>

            {/* Deadline row */}
            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Deadline: {formatDate(goal.deadline)}
                </div>
                <span className={goal.status === 'overdue' ? 'text-red-500 font-medium' : ''}>{daysLabel}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] dark:text-gray-500">
                <span>Created {formatDate(goal.createdAt.slice(0, 10))}</span>
                <span>Updated {formatDate(goal.updatedAt.slice(0, 10))}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
                <UpdateProgressPopover
                    current={goal.currentProgress}
                    target={goal.targetValue}
                    disabled={goal.status === 'completed'}
                    onUpdate={(mode, value) => onUpdateProgress(goal, mode, value)}
                />
                <Button variant="outline" size="sm" onClick={() => onEdit(goal)} className="flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(goal)}
                    className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                </Button>
            </div>
        </div>
    )
}