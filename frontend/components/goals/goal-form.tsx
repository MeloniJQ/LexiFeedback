'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Goal, GoalType } from '@/lib/api'
import { GOAL_SUGGESTIONS, GOAL_TYPES } from '@/lib/goal-suggestions'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DeadlinePicker } from './deadline-picker'

export interface GoalFormValues {
    title: string
    description: string
    goalType: GoalType
    targetValue: string
    deadline: string
}

const emptyForm: GoalFormValues = {
    title: '',
    description: '',
    goalType: 'Interview Practice',
    targetValue: '',
    deadline: '',
}

interface GoalFormProps {
    initialGoal?: Goal | null
    onSubmit: (values: GoalFormValues) => Promise<void> | void
    onCancel: () => void
    submitLabel?: string
    externalErrors?: Record<string, string>
}

export function GoalForm({ initialGoal, onSubmit, onCancel, submitLabel = 'Create Goal', externalErrors }: GoalFormProps) {
    const [values, setValues] = useState<GoalFormValues>(
        initialGoal
            ? {
                title: initialGoal.title,
                description: initialGoal.description || '',
                goalType: initialGoal.goalType,
                targetValue: String(initialGoal.targetValue),
                deadline: initialGoal.deadline,
            }
            : emptyForm
    )
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)
    const isEdit = Boolean(initialGoal)

    useEffect(() => {
        if (externalErrors) setErrors((prev) => ({ ...prev, ...externalErrors }))
    }, [externalErrors])

    const setField = <K extends keyof GoalFormValues>(key: K, val: GoalFormValues[K]) => {
        setValues((v) => ({ ...v, [key]: val }))
        setErrors((e) => ({ ...e, [key]: '' }))
    }

    const todayIso = new Date().toISOString().slice(0, 10)

    const validate = (): Record<string, string> => {
        const next: Record<string, string> = {}
        if (!values.title.trim()) next.title = 'Title is required'
        else if (values.title.trim().length > 100) next.title = 'Title cannot exceed 100 characters'

        if (values.description.length > 500) next.description = 'Description cannot exceed 500 characters'

        if (!values.targetValue || Number(values.targetValue) <= 0) {
            next.targetValue = 'Target must be greater than 0'
        }

        if (!values.deadline) next.deadline = 'Deadline is required'
        else if (values.deadline < todayIso) next.deadline = 'Deadline cannot be in the past'

        return next
    }

    const handleSubmit = async () => {
        const validationErrors = validate()
        setErrors(validationErrors)
        if (Object.keys(validationErrors).length > 0) return

        setSubmitting(true)
        try {
            await onSubmit(values)
        } finally {
            setSubmitting(false)
        }
    }

    const suggestions = GOAL_SUGGESTIONS[values.goalType] || []

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                        Goal Title
                    </label>
                    <Input
                        value={values.title}
                        maxLength={100}
                        onChange={(e) => setField('title', e.target.value)}
                        placeholder="e.g., Complete 20 interview sessions"
                        className={errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                        Goal Type
                    </label>
                    <Select
                        value={values.goalType}
                        onValueChange={(value: GoalType) => setField('goalType', value)}
                    >
                        <SelectTrigger className={errors.goalType ? 'border-red-500' : ''}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {GOAL_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.goalType && <p className="text-xs text-red-500 mt-1">{errors.goalType}</p>}
                </div>
            </div>

            {!isEdit && suggestions.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        Suggested goals for {values.goalType}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                            <button
                                key={s.title}
                                type="button"
                                onClick={() => {
                                    setField('title', s.title)
                                    setField('targetValue', String(s.target))
                                }}
                                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[#1F2937] dark:text-white hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 transition-colors"
                            >
                                {s.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                        Target Value
                    </label>
                    <Input
                        type="number"
                        min={1}
                        value={values.targetValue}
                        onChange={(e) => setField('targetValue', e.target.value)}
                        placeholder="e.g., 10, 20, 30"
                        className={errors.targetValue ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.targetValue && <p className="text-xs text-red-500 mt-1">{errors.targetValue}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                        Deadline
                    </label>
                    <DeadlinePicker
                        value={values.deadline}
                        onChange={(iso) => setField('deadline', iso)}
                        error={errors.deadline}
                    />
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Description (Optional)
                </label>
                <Textarea
                    value={values.description}
                    maxLength={500}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Describe your goal in more detail..."
                    rows={3}
                    className={errors.description ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                <div className="flex justify-between mt-1">
                    {errors.description ? (
                        <p className="text-xs text-red-500">{errors.description}</p>
                    ) : (
                        <span />
                    )}
                    <span className="text-xs text-[#6B7280] dark:text-gray-400">
                        {values.description.length}/500
                    </span>
                </div>
            </div>

            <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Saving…' : submitLabel}
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={submitting}>
                    Cancel
                </Button>
            </div>
        </div>
    )
}