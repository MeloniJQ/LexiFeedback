'use client'

import { Button } from '@/components/ui/button'
import { Plus, Target } from 'lucide-react'

interface EmptyStateProps {
    onCreateGoal: () => void
    isFiltered?: boolean
}

export function EmptyState({ onCreateGoal, isFiltered }: EmptyStateProps) {
    if (isFiltered) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Target className="w-8 h-8 text-[#6B7280] dark:text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-1">
                    No goals match your filters
                </h3>
                <p className="text-sm text-[#6B7280] dark:text-gray-400">
                    Try adjusting your search, filter, or sort options.
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-5 text-4xl">
                🎯
            </div>
            <h3 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-2">
                No Goals Yet
            </h3>
            <p className="text-sm text-[#6B7280] dark:text-gray-400 max-w-sm mb-6">
                Create your first learning goal and start tracking your progress.
            </p>
            <Button onClick={onCreateGoal} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Goal
            </Button>
        </div>
    )
}