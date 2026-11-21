'use client'

import { Button } from '@/components/ui/button'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  createGoal,
  deleteGoal,
  getGoalStats,
  getGoals,
  updateGoal,
  updateGoalProgress,
  type Goal,
  type GoalStats,
  GoalValidationError,
} from '@/lib/api'
import { GoalForm, type GoalFormValues } from '@/components/goals/goal-form'
import { GoalCard } from '@/components/goals/goal-card'
import { GoalStatsCards } from '@/components/goals/goal-stats-cards'
import { GoalsToolbar, type FilterOption, type SortOption } from '@/components/goals/goals-toolbar'
import { EmptyState } from '@/components/goals/empty-state'
import { DeleteGoalDialog } from '@/components/goals/delete-goal-dialog'

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [stats, setStats] = useState<GoalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string> | undefined>(undefined)

  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<number | null>(null)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [filter, setFilter] = useState<FilterOption>('all')

  const formRef = useRef<HTMLDivElement | null>(null)

  const loadData = async () => {
    try {
      setError(null)
      const [goalsData, statsData] = await Promise.all([getGoals(), getGoalStats()])
      setGoals(goalsData)
      setStats(statsData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load goals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const refreshStats = async () => {
    try {
      setStats(await getGoalStats())
    } catch {
      // stats are non-critical; ignore refresh failures
    }
  }

  // ── New Goal button ───────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingGoal(null)
    setFormErrors(undefined)
    setShowForm(true)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingGoal(null)
    setFormErrors(undefined)
  }

  // ── Create / Edit submit ──────────────────────────────────────────────
  const handleFormSubmit = async (values: GoalFormValues) => {
    try {
      if (editingGoal) {
        const { goal } = await updateGoal(editingGoal.id, {
          title: values.title.trim(),
          description: values.description.trim(),
          goalType: values.goalType,
          targetValue: Number(values.targetValue),
          deadline: values.deadline,
        })
        setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)))
        toast.success('Goal Updated')
      } else {
        const { goal } = await createGoal({
          title: values.title.trim(),
          description: values.description.trim(),
          goalType: values.goalType,
          targetValue: Number(values.targetValue),
          deadline: values.deadline,
        })
        setGoals((prev) => [goal, ...prev])
        toast.success('Goal Created Successfully')
      }
      closeForm()
      refreshStats()
    } catch (e) {
      if (e instanceof GoalValidationError) {
        setFormErrors(e.errors)
      } else {
        toast.error(e instanceof Error ? e.message : 'Something went wrong')
      }
    }
  }

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setFormErrors(undefined)
    setShowForm(true)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    try {
      await deleteGoal(target.id)
      setGoals((prev) => prev.filter((g) => g.id !== target.id))
      toast.success('Goal Deleted')
      refreshStats()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete goal')
    }
  }

  // ── Progress updates ──────────────────────────────────────────────────
  const handleUpdateProgress = async (goal: Goal, mode: 'increment' | 'set', value: number) => {
    try {
      const prevStreak = goal.streakCount
      const body = mode === 'increment' ? ({ mode: 'increment', amount: value } as const) : ({ mode: 'set', value } as const)
      const { goal: updated, justCompleted, streakIncreased } = await updateGoalProgress(goal.id, body)

      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
      setRecentlyUpdatedId(updated.id)
      setTimeout(() => setRecentlyUpdatedId((id) => (id === updated.id ? null : id)), 1200)

      if (justCompleted) {
        toast.success('Goal Completed 🎉')
      } else {
        toast.success('Progress Updated')
      }
      if (streakIncreased && updated.streakCount > prevStreak) {
        toast('🔥 Streak Increased', { description: `${updated.streakCount} day streak on "${updated.title}"` })
      }
      refreshStats()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update progress')
    }
  }

  // ── Derived list: search + filter + sort ──────────────────────────────
  const visibleGoals = useMemo(() => {
    let list = [...goals]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((g) => g.title.toLowerCase().includes(q))
    }

    if (filter !== 'all') {
      list = list.filter((g) => g.status === filter)
    }

    switch (sort) {
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'deadline':
        list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        break
      case 'progress':
        list.sort((a, b) => b.progressPercentage - a.progressPercentage)
        break
      case 'completed':
        list.sort((a, b) => Number(b.completed) - Number(a.completed))
        break
      case 'alphabetical':
        list.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'newest':
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }

    return list
  }, [goals, search, filter, sort])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">Set Goals</h1>
          <p className="text-[#6B7280] dark:text-gray-400">
            Define your learning objectives and track your progress
          </p>
        </div>
        {!showForm && (
          <Button onClick={openCreateForm} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Goal
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-[#6B7280] dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading your goals…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <Button size="sm" variant="outline" className="ml-auto" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <>
          {stats && <GoalStatsCards stats={stats} />}

          {/* Create / Edit Goal Form */}
          {showForm && (
            <div
              ref={formRef}
              className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </h2>
              <GoalForm
                initialGoal={editingGoal}
                onSubmit={handleFormSubmit}
                onCancel={closeForm}
                submitLabel={editingGoal ? 'Save Changes' : 'Create Goal'}
                externalErrors={formErrors}
              />
            </div>
          )}

          {goals.length > 0 && (
            <GoalsToolbar
              search={search}
              onSearchChange={setSearch}
              sort={sort}
              onSortChange={setSort}
              filter={filter}
              onFilterChange={setFilter}
            />
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <EmptyState onCreateGoal={openCreateForm} />
          ) : visibleGoals.length === 0 ? (
            <EmptyState onCreateGoal={openCreateForm} isFiltered />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onUpdateProgress={handleUpdateProgress}
                  justUpdated={recentlyUpdatedId === goal.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      <DeleteGoalDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        goalTitle={deleteTarget?.title}
      />
    </div>
  )
}