'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPracticeSessions, getPracticeStats } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function FeedbackDashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [stats, setStats] = useState<any>({
    total_sessions: 0,
    total_hours: 0,
    avg_score_pct: 0,
    streak: 0,
    skills_progress: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const fetchedSessions = await getPracticeSessions()
        const fetchedStats = await getPracticeStats()
        setSessions(fetchedSessions)
        setStats(fetchedStats)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  // Map backend stats.skills_progress or fallback to categories
  const progressData = stats.skills_progress && stats.skills_progress.length > 0
    ? stats.skills_progress.map((s: any) => ({ category: s.skill.replace(' Practice', '').replace(' Skills', '').replace(' Fluency', '').replace(' Comprehension', ''), score: s.progress }))
    : [
        { category: 'Interview', score: 0 },
        { category: 'Presentation', score: 0 },
        { category: 'Conversation', score: 0 },
        { category: 'Reading', score: 0 },
      ]

  // Map weekly sessions activity from dynamic session dates or mock if empty
  const sessionData = sessions.length > 0
    ? sessions.slice(0, 10).reverse().map((s: any, idx: number) => ({
        week: `S${idx + 1}`,
        sessions: 1,
        duration: 10
      }))
    : [
        { week: 'Week 1', sessions: 0, duration: 0 },
        { week: 'Week 2', sessions: 0, duration: 0 },
      ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#2C5AA0] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading your progress profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
          Your Progress
        </h1>
        <p className="text-[#6B7280] dark:text-gray-400">
          Track your English learning improvements and performance metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
          <p className="text-[#6B7280] dark:text-gray-400 text-sm font-medium">
            Total Sessions
          </p>
          <p className="text-3xl font-bold text-[#1F2937] dark:text-white mt-2">
            {stats.total_sessions}
          </p>
        </div>

        <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
          <p className="text-[#6B7280] dark:text-gray-400 text-sm font-medium">
            Estimated Hours
          </p>
          <p className="text-3xl font-bold text-[#1F2937] dark:text-white mt-2">
            {stats.total_hours}h
          </p>
        </div>

        <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
          <p className="text-[#6B7280] dark:text-gray-400 text-sm font-medium">
            Average Score
          </p>
          <p className="text-3xl font-bold text-[#2C5AA0] dark:text-white mt-2">
            {stats.avg_score_pct}%
          </p>
        </div>

        <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
          <p className="text-[#6B7280] dark:text-gray-400 text-sm font-medium">
            Current Streak
          </p>
          <p className="text-3xl font-bold text-[#10B981] dark:text-[#68D391] mt-2">
            {stats.streak} {stats.streak === 1 ? 'day' : 'days'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Skills Progress */}
        <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">
            Skills Progress
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" stroke="#6B7280" />
              <YAxis stroke="#6B7280" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #4B5563',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#F9FAFB' }}
              />
              <Bar dataKey="score" fill="#2C5AA0" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Session Activity */}
        <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">
            Activity Timeline
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sessionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="week" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #4B5563',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#F9FAFB' }}
              />
              <Legend />
              <Line type="monotone" name="Session Duration (min)" dataKey="duration" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">
          Session Feedback History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-[#6B7280] dark:text-gray-400">
                <th className="text-left py-3 px-4 font-medium">Mode</th>
                <th className="text-left py-3 px-4 font-medium">Title</th>
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Duration</th>
                <th className="text-left py-3 px-4 font-medium">Score</th>
                <th className="text-left py-3 px-4 font-medium">AI Feedback Extract</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280] dark:text-gray-400">
                    No sessions generated yet. Practice an <Link href="/practice/interview" className="text-[#2C5AA0] font-semibold hover:underline">Interview Session</Link> to receive AI feedback and start tracking!
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#374151] transition-colors"
                  >
                    <td className="py-3 px-4 text-[#1F2937] dark:text-white font-medium capitalize">
                      {session.session_type}
                    </td>
                    <td className="py-3 px-4 text-[#1F2937] dark:text-white">
                      {session.title || 'Untitled Session'}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] dark:text-gray-400">
                      {new Date(session.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] dark:text-gray-400">
                      10 min
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-3 py-1 rounded-full text-white text-xs font-semibold bg-[#2C5AA0]">
                        {session.score || '8/10'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] dark:text-gray-400 text-xs max-w-xs truncate" title={session.feedback}>
                      {session.feedback}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
