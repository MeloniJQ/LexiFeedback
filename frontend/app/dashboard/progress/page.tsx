'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { loadAnalytics, peekAnalyticsCache } from '@/lib/api'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Calendar, Target, Award, BookOpen } from 'lucide-react'
import { PracticeGraphs, AnalyticsBanner, StatCard, modeLabel, sessionMode, TYPE_COLORS } from '@/components/analytics/practice-charts'

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
    // Show the last result instantly if we have one, then refresh in the background.
    const cached = peekAnalyticsCache()
    if (cached) {
      setStats(cached.stats)
      setSessions(cached.sessions)
      setIsLoading(false)
    }
    async function loadStats() {
      try {
        const { sessions: fetchedSessions, stats: fetchedStats } = await loadAnalytics(!!cached)
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

  const totalVocabLearned = stats.vocabulary?.total_learned ?? 0
  const vocabThisWeek = stats.vocabulary?.learned_this_week ?? 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <AnalyticsBanner
        title="Analytics & Feedback"
        subtitle="Track your learning journey across every practice mode and see how you're improving"
      />

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard label="Total Sessions" icon={<Calendar className="w-5 h-5" />} value={stats.total_sessions} sub="All-time count" color="blue" />
        <StatCard label="Average Score" icon={<TrendingUp className="w-5 h-5" />} value={`${stats.avg_score_pct}%`} sub="Overall efficiency" color="emerald" />
        <StatCard label="Goals Achieved" icon={<Target className="w-5 h-5" />} value={goalsAchieved} sub="Milestones completed" color="purple" />
        <StatCard label="Current Streak" icon={<Award className="w-5 h-5" />} value={stats.streak} sub={stats.streak === 1 ? 'Day' : 'Days'} color="orange" />
        <StatCard label="Words Learned" icon={<BookOpen className="w-5 h-5" />} value={totalVocabLearned} sub={`+${vocabThisWeek} this week`} color="teal" />
      </div>

      {/* Skill Progress */}
      <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-gray-200 dark:border-gray-700 border-t-4 border-t-[#8B5CF6] shadow-sm p-6">
        <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-6">
          🎯 Skill Progress
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

      {/* Graphs — shared with the Feedback page; every graph labels its axes + scale */}
      <PracticeGraphs stats={stats} sessions={sessions} />

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-gray-200 dark:border-gray-700 border-t-4 border-t-[#10B981] shadow-sm p-6">
        <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-6">
          ⚡ Recent Activity
        </h2>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280] dark:text-gray-400">
              No recent practice sessions recorded. Go to <Link href="/practice/interview" className="text-[#2C5AA0] font-semibold hover:underline">Interview Practice</Link> to start!
            </div>
          ) : (
            sessions.slice(0, 3).map((session) => {
              const dotColor = TYPE_COLORS[sessionMode(session)] || '#6B7280'
              const dateStr = new Date(session.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })

              return (
                <div key={session.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#374151] rounded-lg hover:shadow-sm transition-shadow">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dotColor }}></div>
                  <div className="flex-1">
                    <p className="text-[#1F2937] dark:text-white font-medium">
                      Completed {modeLabel(sessionMode(session))} Session
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