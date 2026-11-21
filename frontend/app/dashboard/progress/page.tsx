'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPracticeStats, getPracticeSessions } from '@/lib/api'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Calendar, Target, Award, BookOpen } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

const TYPE_COLORS: Record<string, string> = {
  interview: '#2C5AA0',
  presentation: '#8B5CF6',
  conversation: '#10B981',
  reading: '#F59E0B',
}

function formatShortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ProgressPage() {
  const [stats, setStats] = useState<any>({
    total_sessions: 0,
    total_hours: 0,
    avg_score_pct: 0,
    streak: 0,
    skills_progress: [],
    activity_timeline: [],
    vocabulary: { total_learned: 0, learned_this_week: 0, timeline: [] },
  })
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const fetchedStats = await getPracticeStats()
        const fetchedSessions = await getPracticeSessions()
        setStats(fetchedStats)
        setSessions(fetchedSessions)
      } catch (err) {
        console.error('Error fetching progress stats:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#2C5AA0] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading your stats...</p>
        </div>
      </div>
    )
  }

  // Calculate dynamic goals based on session milestones
  const goalsAchieved = Math.floor(stats.total_sessions / 2)

  const activityChartData = (stats.activity_timeline || []).map((d: any) => ({
    ...d,
    label: formatShortDate(d.date),
  }))
  const vocabChartData = (stats.vocabulary?.timeline || []).map((d: any) => ({
    ...d,
    label: formatShortDate(d.date),
  }))
  const totalVocabLearned = stats.vocabulary?.total_learned ?? 0
  const vocabThisWeek = stats.vocabulary?.learned_this_week ?? 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
          Your Progress
        </h1>
        <p className="text-[#6B7280] dark:text-gray-400">
          Track your learning journey and see how you're improving
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold text-[#1F2937] dark:text-white">Total Sessions</h3>
          </div>
          <p className="text-3xl font-bold text-[#1F2937] dark:text-white">{stats.total_sessions}</p>
          <p className="text-sm text-[#6B7280] dark:text-gray-400">All-time count</p>
        </div>

        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-[#1F2937] dark:text-white">Average Score</h3>
          </div>
          <p className="text-3xl font-bold text-[#1F2937] dark:text-white">{stats.avg_score_pct}%</p>
          <p className="text-sm text-[#6B7280] dark:text-gray-400">Overall efficiency</p>
        </div>

        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-purple-600" />
            <h3 className="font-semibold text-[#1F2937] dark:text-white">Goals Achieved</h3>
          </div>
          <p className="text-3xl font-bold text-[#1F2937] dark:text-white">{goalsAchieved}</p>
          <p className="text-sm text-[#6B7280] dark:text-gray-400">Milestones completed</p>
        </div>

        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-6 h-6 text-orange-600" />
            <h3 className="font-semibold text-[#1F2937] dark:text-white">Current Streak</h3>
          </div>
          <p className="text-3xl font-bold text-[#1F2937] dark:text-white">{stats.streak}</p>
          <p className="text-sm text-[#6B7280] dark:text-gray-400">{stats.streak === 1 ? 'Day' : 'Days'}</p>
        </div>

        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-6 h-6 text-teal-600" />
            <h3 className="font-semibold text-[#1F2937] dark:text-white">Words Learned</h3>
          </div>
          <p className="text-3xl font-bold text-[#1F2937] dark:text-white">{totalVocabLearned}</p>
          <p className="text-sm text-[#6B7280] dark:text-gray-400">+{vocabThisWeek} this week</p>
        </div>
      </div>

      {/* Skill Progress */}
      <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-6">
          Skill Progress
        </h2>

        <div className="space-y-6">
          {stats.skills_progress && stats.skills_progress.length > 0 ? (
            stats.skills_progress.map((skill: any) => (
              <div key={skill.skill} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-[#1F2937] dark:text-white">
                    {skill.skill}
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[#6B7280] dark:text-gray-400">
                      {skill.sessions} {skill.sessions === 1 ? 'session' : 'sessions'}
                    </span>
                    <span className="text-green-600 font-medium">
                      {skill.improvement}
                    </span>
                    <span className="text-[#1F2937] dark:text-white font-medium">
                      {skill.progress}%
                    </span>
                  </div>
                </div>
                <Progress value={skill.progress} className="h-2" />
              </div>
            ))
          ) : (
            <p className="text-[#6B7280] dark:text-gray-400 text-sm">No skill analytics generated yet.</p>
          )}
        </div>
      </div>

      {/* Activity + Vocabulary Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-1">
            Practice Activity
          </h2>
          <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-4">
            Sessions per day, last 30 days — every mode
          </p>
          {activityChartData.some((d: any) => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={activityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" stroke="#6B7280" interval={4} />
                <YAxis stroke="#6B7280" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Legend />
                <Bar dataKey="interview" name="Interview" stackId="a" fill={TYPE_COLORS.interview} />
                <Bar dataKey="presentation" name="Presentation" stackId="a" fill={TYPE_COLORS.presentation} />
                <Bar dataKey="conversation" name="Conversation" stackId="a" fill={TYPE_COLORS.conversation} />
                <Bar dataKey="reading" name="Reading" stackId="a" fill={TYPE_COLORS.reading} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#6B7280] dark:text-gray-400 text-sm py-16 text-center">
              No practice sessions in the last 30 days yet.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-1">
            Vocabulary Growth
          </h2>
          <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-4">
            Words &amp; idioms saved from Word of the Day, last 30 days
          </p>
          {totalVocabLearned > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={vocabChartData}>
                <defs>
                  <linearGradient id="vocabGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" stroke="#6B7280" interval={4} />
                <YAxis stroke="#6B7280" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Total words learned"
                  stroke="#0D9488"
                  fill="url(#vocabGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#6B7280] dark:text-gray-400 text-sm py-16 text-center">
              No words saved yet. Save words from your daily Word of the Day to see progress here.
            </p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-6">
          Recent Activity
        </h2>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280] dark:text-gray-400">
              No recent practice sessions recorded. Go to <Link href="/practice/interview" className="text-[#2C5AA0] font-semibold hover:underline">Interview Practice</Link> to start!
            </div>
          ) : (
            sessions.slice(0, 3).map((session, index) => {
              const colors = ["bg-green-500", "bg-blue-500", "bg-purple-500"]
              const color = colors[index % colors.length]
              const dateStr = new Date(session.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })

              return (
                <div key={session.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#374151] rounded-lg hover:shadow-sm transition-shadow">
                  <div className={`w-2 h-2 ${color} rounded-full`}></div>
                  <div className="flex-1">
                    <p className="text-[#1F2937] dark:text-white font-medium capitalize">
                      Completed {session.session_type} Session
                    </p>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400">
                      {dateStr} • Score: {session.score || '8/10'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}