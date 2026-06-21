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
          </div>
        </main>
      </div>
    </div>
  )
}