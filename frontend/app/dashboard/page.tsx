'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Briefcase, Presentation, MessageCircle, Book, TrendingUp, Target, Trophy, X, Info } from 'lucide-react'
import { PracticeModeCard } from '@/components/practice-mode-card'
import { getUser, getToken, setAuth } from '@/lib/auth'
import { getLevelProgress, markLevelChangesSeen, type LevelProgress } from '@/lib/api'

const CEFR_LABELS: Record<string, string> = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper Intermediate', C1: 'Advanced', C2: 'Proficient',
}

export default function DashboardPage() {
  const user = getUser()

  // Automatic level progression: the backend promotes the user's CEFR level
  // as their mock-session scores justify it. Here we (1) show how close they
  // are to the next level, (2) show a dismissible banner after a promotion,
  // and (3) refresh the level cached in sessionStorage so every page that
  // reads getUser().english_level picks up the new value.
  const [progress, setProgress] = useState<LevelProgress | null>(null)
  const [levelOverride, setLevelOverride] = useState<string | null>(null)
  const [showBanner, setShowBanner] = useState(true)

  useEffect(() => {
    let cancelled = false
    getLevelProgress()
      .then(p => {
        if (cancelled) return
        setProgress(p)
        if (p.current_level) {
          setLevelOverride(p.current_level)
          const token = getToken()
          const stored = getUser()
          if (token && stored && stored.english_level !== p.current_level) {
            setAuth(token, { ...stored, english_level: p.current_level })
          }
        }
      })
      .catch(() => { /* non-blocking — the dashboard works fine without it */ })
    return () => { cancelled = true }
  }, [])

  const displayLevel = levelOverride ?? user?.english_level ?? null
  const latestPromotion = progress?.unseen?.[0]

  const dismissBanner = () => {
    setShowBanner(false)
    markLevelChangesSeen().catch(() => {})
  }

  const practiceModes = [
    {
      title: 'Agentic Interview',
      description: 'Run company-specific, multi-round interview simulations with real-time scoring.',
      icon: Briefcase,
      href: '/practice/interview',
      color: 'primary',
    },
    {
      title: 'Presentation Mode',
      description: 'Deliver presentations and receive feedback on delivery and content.',
      icon: Presentation,
      href: '/practice/presentation',
      color: 'success',
    },
    {
      title: 'Conversation Practice',
      description: 'Sharpen fluency and expressive communication for interviews and networking.',
      icon: MessageCircle,
      href: '/practice/conversation',
      color: 'warning',
    },
    {
      title: 'Reading Practice',
      description: 'Improve comprehension and technical reading depth for interview preparation.',
      icon: Book,
      href: '/practice/reading',
      color: 'danger',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h1 className="text-4xl font-bold text-[#1F2937] dark:text-white">
            LexiFeed Interview Command Center
          </h1>
          {displayLevel && (
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 rounded-full border border-[#2C5AA0]/30 bg-[#2C5AA0]/10 px-4 py-1.5 text-sm font-medium text-[#2C5AA0] hover:bg-[#2C5AA0]/20 transition"
              title="Every practice mode is tailored to this level. Click to retake the assessment."
            >
              English Level: {displayLevel} · {CEFR_LABELS[displayLevel] ?? ''}
            </Link>
          )}
        </div>
        <p className="text-[#6B7280] dark:text-gray-400 text-lg">
          Prepare for Google, Microsoft, Amazon, Meta, and beyond with AI-generated reports and coaching.
        </p>
      </div>

      {/* Promotion banner — shown until the user dismisses it */}
      {latestPromotion && showBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
          <Trophy className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-green-800 dark:text-green-300">
              You've levelled up: {latestPromotion.from_level} → {latestPromotion.to_level}
              {' '}({CEFR_LABELS[latestPromotion.to_level] ?? ''})
            </p>
            <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
              {latestPromotion.reason} Your reading passages and interview questions will now be a bit more challenging.
            </p>
          </div>
          <button onClick={dismissBanner} aria-label="Dismiss" className="text-green-700 dark:text-green-400 hover:opacity-70">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Progress toward the next CEFR level */}
      {progress?.next_level && progress.sessions_needed !== undefined && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Progress to {progress.next_level} ({CEFR_LABELS[progress.next_level] ?? ''})
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {progress.sessions_counted}/{progress.sessions_needed} scored sessions
            </p>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-[#2C5AA0] transition-all"
              style={{ width: `${Math.min(100, ((progress.sessions_counted ?? 0) / (progress.sessions_needed || 1)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            To level up: average {progress.avg_score_needed}+/10 over {progress.sessions_needed} sessions
            (now {progress.avg_score}), across {progress.modes_needed}+ practice modes
            (now {progress.distinct_modes}) on {progress.days_needed}+ different days (now {progress.distinct_days})
            {progress.cooldown_days_left ? ` · next promotion possible in ${progress.cooldown_days_left} day(s)` : ''}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {practiceModes.map((mode) => (
          <PracticeModeCard key={mode.title} {...mode} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/progress" className="block">
          <div className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg p-6 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-lg text-[#1F2937] dark:text-white">📊 Analytics</h3>
            </div>
            <p className="text-[#6B7280] dark:text-gray-400">Track score trends, skills growth, and interview momentum.</p>
          </div>
        </Link>

        <Link href="/dashboard/goals" className="block">
          <div className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-lg p-6 border border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-lg text-[#1F2937] dark:text-white">🎯 Goals</h3>
            </div>
            <p className="text-[#6B7280] dark:text-gray-400">Prioritize weak topics and turn feedback into measurable progress.</p>
          </div>
        </Link>

        <Link href="/about" className="block">
          <div className="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 rounded-lg p-6 border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-6 h-6 text-orange-600" />
              <h3 className="font-semibold text-lg text-[#1F2937] dark:text-white">ℹ️ About Lexical</h3>
            </div>
            <p className="text-[#6B7280] dark:text-gray-400">Learn what Lexical does, how CEFR levels work, and who built it.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
