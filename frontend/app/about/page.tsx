'use client'

import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  Presentation,
  MessageCircle,
  BookOpen,
  Zap,
  TrendingUp,
  Flag,
  UserCheck,
  ListChecks,
  Mic2,
  Layers,
  MessageSquare,
  BarChart3,
  Heart,
} from 'lucide-react'

export default function AboutPage() {
  const features = [
    {
      icon: <Briefcase className="w-8 h-8 text-sky-500" />,
      title: 'Interview Practice',
      description:
        'Mock interview sessions with AI-generated questions, voice recording, and structured feedback on your responses.',
    },
    {
      icon: <Presentation className="w-8 h-8 text-violet-500" />,
      title: 'Presentation Training',
      description:
        'Practice slide-based delivery and receive guidance on clarity, pacing, and presentation structure.',
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-emerald-500" />,
      title: 'Casual Conversation',
      description:
        'Build speaking fluency through informal dialogue practice, topic prompts, and AI conversation responses.',
    },
    {
      icon: <BookOpen className="w-8 h-8 text-orange-500" />,
      title: 'Reading Practice',
      description:
        'Read passages aloud, compare your transcript with source text, and improve pronunciation and intonation.',
    },
    {
      icon: <Zap className="w-8 h-8 text-amber-500" />,
      title: 'AI Feedback & Analysis',
      description:
        'The backend analyzes responses and returns actionable feedback on vocabulary, delivery, grammar, and relevance.',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-cyan-500" />,
      title: 'Progress Tracking',
      description:
        'Review session history, feedback notes, and performance trends on the dashboard to see improvement over time.',
    },
    {
      icon: <Flag className="w-8 h-8 text-rose-500" />,
      title: 'Goal Setting',
      description:
        'Define learning goals and focus on specific practice areas to make progress more intentional.',
    },
    {
      icon: <UserCheck className="w-8 h-8 text-lime-500" />,
      title: 'Personalized Learning',
      description:
        'Choose the practice paths that matter most to you and receive feedback that supports your speaking goals.',
    },
  ]

  const workSteps = [
    {
      icon: <ListChecks className="w-8 h-8 text-sky-500" />,
      title: 'Choose Practice Mode',
      description: 'Select interview, presentation, conversation, or reading practice from the dashboard.',
    },
    {
      icon: <Mic2 className="w-8 h-8 text-emerald-500" />,
      title: 'Respond by Speaking or Typing',
      description: 'Record your answer or submit a typed response inside the practice session.',
    },
    {
      icon: <Layers className="w-8 h-8 text-violet-500" />,
      title: 'AI Analyzes Responses',
      description: 'Server-side feedback routes evaluate your transcript and identify strengths and improvement areas.',
    },
    {
      icon: <MessageSquare className="w-8 h-8 text-orange-500" />,
      title: 'Receive Feedback',
      description: 'Review detailed notes on vocabulary, fluency, pronunciation, grammar, and structure.',
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-cyan-500" />,
      title: 'Track Improvement',
      description: 'Use the dashboard to monitor your learning journey and revisit practice sessions over time.',
    },
  ]

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-12">
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] p-10">
              <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    About Lexical
                  </p>
                  <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    AI-powered practice for spoken English, interviews, presentations, conversations, and reading.
                  </h1>
                  <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
                    Lexical is a student-focused English communication platform that combines targeted practice modes with AI feedback.
                    Learners can practice real speaking tasks, receive personalized analysis, and build confidence through measurable progress.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button asChild>
                      <a href="/dashboard" className="w-full text-center sm:w-auto">
                        Start practicing
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="/dashboard/feedback" className="w-full text-center sm:w-auto">
                        See feedback dashboard
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-8 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Why learners choose Lexical
                  </p>
                  <ul className="mt-6 space-y-4 text-slate-700 dark:text-slate-300">
                    <li className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                      <p className="font-semibold">Focused speaking practice</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Practice with mode-specific exercises designed for real English speaking scenarios.
                      </p>
                    </li>
                    <li className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                      <p className="font-semibold">Personalized feedback</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Receive feedback that targets vocabulary, delivery, pronunciation, and communication clarity.
                      </p>
                    </li>
                    <li className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                      <p className="font-semibold">Progress tracking</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Track your sessions, review past feedback, and stay on course with learning goals.
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8">
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Problem We Solve</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-300 leading-7">
                  Many learners struggle with limited speaking practice, unclear vocabulary choices, interview anxiety,
                  and a lack of structured feedback. Lexical offers a practical way to practice real English and get focused improvement guidance.
                </p>
                <div className="mt-6 space-y-4">
                  {[
                    'Limited vocabulary and phrase variety in spoken English.',
                    'Difficulty finding realistic speaking practice.',
                    'Interview and presentation anxiety without feedback.',
                    'No clear path for tracking spoken language progress.',
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 text-slate-700 dark:text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8">
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Our Solution</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-300 leading-7">
                  Lexical provides practice modes, AI-assisted feedback, and progress tracking so learners can practice purposefully
                  and grow speaking confidence across interviews, presentations, conversations, and reading exercises.
                </p>
                <div className="mt-6 grid gap-4">
                  {[
                    'Interview Practice with mock questions and answer analysis.',
                    'Presentation Practice for delivery and structure feedback.',
                    'Casual Conversation Practice for natural speaking fluency.',
                    'Reading Practice to improve pronunciation and comprehension.',
                    'AI analysis of responses with actionable feedback.',
                    'Progress insights and goal-based learning pathways.',
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 text-slate-700 dark:text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] p-8">
              <h2 className="text-3xl font-semibold text-slate-950 dark:text-white text-center mb-8">Key Features</h2>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {features.map((feature) => (
                  <div key={feature.title} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-6 shadow-sm">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-950 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-7">{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8">
              <h2 className="text-3xl font-semibold text-slate-950 dark:text-white text-center mb-8">How It Works</h2>
              <div className="grid gap-6 md:grid-cols-5">
                {workSteps.map((step) => (
                  <div key={step.title} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111827] p-6 text-center">
                    <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                      {step.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white mb-2">{step.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/20 p-10">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center justify-center rounded-3xl bg-slate-900/5 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-200">
                  <Heart className="mr-2 h-4 w-4 text-rose-500" />
                  Project Vision
                </div>
                <h2 className="mt-6 text-3xl font-semibold text-slate-950 dark:text-white">A platform for confident English communication</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-300 leading-8">
                  Lexical helps learners practice speaking in real-world scenarios, reduce communication anxiety, and make English practice
                  more consistent by combining intelligent feedback with accessible full-stack tools.
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {[
                    'Improve communication skills for interviews, presentations, and everyday conversation.',
                    'Build confidence through structured practice and thoughtful AI guidance.',
                    'Make English practice accessible with personalized learning pathways and progress monitoring.',
                  ].map((item) => (
                    <div key={item} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-6 text-slate-600 dark:text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>
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
