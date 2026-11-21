'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GoalStatus } from '@/lib/api'
import { Search } from 'lucide-react'

export type SortOption = 'newest' | 'oldest' | 'deadline' | 'progress' | 'completed' | 'alphabetical'
export type FilterOption = 'all' | GoalStatus

interface GoalsToolbarProps {
    search: string
    onSearchChange: (value: string) => void
    sort: SortOption
    onSortChange: (value: SortOption) => void
    filter: FilterOption
    onFilterChange: (value: FilterOption) => void
}

const FILTERS: { value: FilterOption; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'paused', label: 'Paused' },
]

const SORTS: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'progress', label: 'Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'alphabetical', label: 'Alphabetical' },
]

export function GoalsToolbar({ search, onSearchChange, sort, onSortChange, filter, onFilterChange }: GoalsToolbarProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] dark:text-gray-400" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search goals by title..."
                    className="pl-9"
                />
            </div>

            <div className="flex gap-2">
                <Select value={sort} onValueChange={(v: SortOption) => onSortChange(v)}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        {SORTS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                                {s.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                    <Button
                        key={f.value}
                        size="sm"
                        variant={filter === f.value ? 'default' : 'outline'}
                        onClick={() => onFilterChange(f.value)}
                        className="h-8"
                    >
                        {f.label}
                    </Button>
                ))}
            </div>
        </div>
    )
}