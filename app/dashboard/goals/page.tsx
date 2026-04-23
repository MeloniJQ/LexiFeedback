'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Target, Plus, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { useState } from 'react'

interface Goal {
  id: string
  title: string
  description: string
  type: 'sessions' | 'skill' | 'time'
  target: number
  current: number
  deadline: string
  status: 'active' | 'completed' | 'overdue'
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Complete 20 Interview Sessions',
      description: 'Practice interview skills with various scenarios',
      type: 'sessions',
      target: 20,
      current: 12,
      deadline: '2024-02-15',
      status: 'active'
    },
    {
      id: '2',
      title: 'Improve Pronunciation Score',
      description: 'Achieve 80% or higher in pronunciation assessments',
      type: 'skill',
      target: 80,
      current: 65,
      deadline: '2024-02-20',
      status: 'active'
    },
    {
      id: '3',
      title: 'Practice Daily for 30 Days',
      description: 'Maintain a daily practice streak',
      type: 'time',
      target: 30,
      current: 15,
      deadline: '2024-02-10',
      status: 'active'
    }
  ])

  const [showNewGoalForm, setShowNewGoalForm] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    type: 'sessions' as const,
    target: '',
    deadline: ''
  })

  const handleCreateGoal = () => {
    if (!newGoal.title || !newGoal.target || !newGoal.deadline) return

    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      description: newGoal.description,
      type: newGoal.type,
      target: parseInt(newGoal.target),
      current: 0,
      deadline: newGoal.deadline,
      status: 'active'
    }

    setGoals([...goals, goal])
    setNewGoal({
      title: '',
      description: '',
      type: 'sessions',
      target: '',
      deadline: ''
    })
    setShowNewGoalForm(false)
  }

  const getProgressPercentage = (goal: Goal) => {
    return Math.min((goal.current / goal.target) * 100, 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'overdue': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5" />
      case 'overdue': return <Clock className="w-5 h-5" />
      default: return <Target className="w-5 h-5" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
                  Set Goals
                </h1>
                <p className="text-[#6B7280] dark:text-gray-400">
                  Define your learning objectives and track your progress
                </p>
              </div>
              <Button
                onClick={() => setShowNewGoalForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Goal
              </Button>
            </div>

            {/* New Goal Form */}
            {showNewGoalForm && (
              <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
                  Create New Goal
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                      Goal Title
                    </label>
                    <Input
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                      placeholder="e.g., Complete 10 interview sessions"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                      Goal Type
                    </label>
                    <Select
                      value={newGoal.type}
                      onValueChange={(value: 'sessions' | 'skill' | 'time') =>
                        setNewGoal({...newGoal, type: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sessions">Practice Sessions</SelectItem>
                        <SelectItem value="skill">Skill Level</SelectItem>
                        <SelectItem value="time">Time-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                      Target Value
                    </label>
                    <Input
                      type="number"
                      value={newGoal.target}
                      onChange={(e) => setNewGoal({...newGoal, target: e.target.value})}
                      placeholder="e.g., 10, 80, 30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                      Deadline
                    </label>
                    <Input
                      type="date"
                      value={newGoal.deadline}
                      onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Description (Optional)
                  </label>
                  <Textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                    placeholder="Describe your goal in more detail..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateGoal}>
                    Create Goal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewGoalForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Goals List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((goal) => (
                <div key={goal.id} className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={getStatusColor(goal.status)}>
                        {getStatusIcon(goal.status)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1F2937] dark:text-white">
                          {goal.title}
                        </h3>
                        <p className="text-sm text-[#6B7280] dark:text-gray-400">
                          {goal.description}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      goal.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : goal.status === 'overdue'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {goal.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6B7280] dark:text-gray-400">
                        Progress: {goal.current} / {goal.target}
                      </span>
                      <span className="text-[#1F2937] dark:text-white font-medium">
                        {Math.round(getProgressPercentage(goal))}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(goal)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6B7280] dark:text-gray-400">
                      Deadline: {new Date(goal.deadline).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>On track</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
                Recommended Goals
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-medium text-[#1F2937] dark:text-white mb-2">
                    Consistency Goal
                  </h3>
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-3">
                    Practice for 15 minutes daily for the next 30 days
                  </p>
                  <Button size="sm" variant="outline">
                    Set This Goal
                  </Button>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-medium text-[#1F2937] dark:text-white mb-2">
                    Skill Mastery
                  </h3>
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-3">
                    Achieve 85% or higher in presentation delivery
                  </p>
                  <Button size="sm" variant="outline">
                    Set This Goal
                  </Button>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-medium text-[#1F2937] dark:text-white mb-2">
                    Challenge Goal
                  </h3>
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-3">
                    Complete 50 practice sessions this month
                  </p>
                  <Button size="sm" variant="outline">
                    Set This Goal
                  </Button>
                </div>
              </div>
            </div>
          </div>
  )
}