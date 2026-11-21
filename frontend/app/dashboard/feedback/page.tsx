'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { loadAnalytics, peekAnalyticsCache } from '@/lib/api'
import { PracticeGraphs, AnalyticsBanner, StatCard, ModeBadge, ScoreBadge, modeLabel, sessionMode } from '@/components/analytics/practice-charts'

// Full date + time for a session's created_at timestamp (ISO datetime,
// unlike the plain "YYYY-MM-DD" used by the activity/vocab timelines above).
function formatSessionDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// mm:ss (or Xh Ym for long sessions) from a duration in seconds.
function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '—'
  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

export default function FeedbackDashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [stats, setStats] = useState<any>({
    total_sessions: 0,
    total_hours: 0,
    avg_score_pct: 0,
    streak: 0,
    skills_progress: [],
    activity_timeline: [],
    vocabulary: { total_learned: 0, learned_this_week: 0, timeline: [] },
  })
  const [isLoading, setIsLoading] = useState(true)
  // The session currently open in the "full feedback" modal, so users can
  // read the entire AI write-up (not just the truncated table preview) and
  // actually see what changed/improved between sessions.
  const [selectedSession, setSelectedSession] = useState<any>(null)

  useEffect(() => {
    // Show the last result instantly if we have one, then refresh in the background.
    const cached = peekAnalyticsCache()
    if (cached) {
      setSessions(cached.sessions)
      setStats(cached.stats)
      setIsLoading(false)
    }
    async function loadDashboardData() {
      try {
        const { sessions: fetchedSessions, stats: fetchedStats } = await loadAnalytics(!!cached)
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
      <AnalyticsBanner
        title="Analytics & Feedback"
        subtitle="Track your English learning improvements across Interview, Presentation, Conversation, Reading and TV News Anchor practice"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Sessions" icon={<span>📊</span>} value={stats.total_sessions} color="blue" />
        <StatCard label="Estimated Hours" icon={<span>⏱️</span>} value={`${stats.total_hours}h`} color="purple" />
        <StatCard label="Average Score" icon={<span>⭐</span>} value={`${stats.avg_score_pct}%`} color="emerald" />
        <StatCard
          label="Current Streak"
          icon={<span>🔥</span>}
          value={`${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`}
          color="orange"
        />
      </div>

      {/* Graphs — shared with the Analytics page; every graph labels its axes + scale */}
      <PracticeGraphs stats={stats} sessions={sessions} />

      {/* Recent Sessions */}
      <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 border-t-4 border-t-[#2C5AA0] rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">
          🗂️ Session Feedback History
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
                    <td className="py-3 px-4">
                      <ModeBadge session={session} />
                    </td>
                    <td className="py-3 px-4 text-[#1F2937] dark:text-white">
                      {session.title || 'Untitled Session'}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] dark:text-gray-400">
                      {formatSessionDate(session.created_at)}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] dark:text-gray-400">
                      {formatDuration(session.duration_seconds)}
                    </td>
                    <td className="py-3 px-4">
                      <ScoreBadge score={session.score} />
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] dark:text-gray-400 text-xs max-w-xs">
                      {session.feedback ? (
                        <button
                          type="button"
                          onClick={() => setSelectedSession(session)}
                          className="flex items-center gap-1.5 text-left hover:text-[#2C5AA0] dark:hover:text-[#68A0E0] transition-colors group"
                        >
                          <span className="truncate">{session.feedback}</span>
                          <span className="shrink-0 text-[#2C5AA0] dark:text-[#68A0E0] font-semibold underline-offset-2 group-hover:underline">
                            View full →
                          </span>
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full AI Feedback modal — lets the user actually read the entire
          write-up for a past session (not just the truncated table
          preview), so they can compare notes across sessions and see how
          their feedback/scores have changed over time. */}
      {selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white dark:bg-[#1F2937] rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2C5AA0] dark:text-[#68A0E0] mb-1">
                  {modeLabel(sessionMode(selectedSession))}
                </p>
                <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">
                  {selectedSession.title || 'Untitled Session'}
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
                  {formatSessionDate(selectedSession.created_at)} · {formatDuration(selectedSession.duration_seconds)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <ScoreBadge score={selectedSession.score} />
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  aria-label="Close"
                  className="text-[#6B7280] dark:text-gray-400 hover:text-[#1F2937] dark:hover:text-white text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-[#374151] dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {selectedSession.feedback || 'No feedback text was recorded for this session.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}