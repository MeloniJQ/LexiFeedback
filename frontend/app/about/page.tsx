'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Code2,
  GraduationCap,
  Mail,
  Building2,
} from 'lucide-react'

function AboutInner() {
  // /about -> overview, /about?section=cefr -> only the CEFR section, etc.
  // The sidebar's "About" group links to these URLs.
  const searchParams = useSearchParams()
  const requested = searchParams.get('section') ?? 'overview'
  const validSections = ['overview', 'problem-solution', 'features', 'how-it-works', 'cefr', 'vision', 'authors']
  const activeSection = validSections.includes(requested) ? requested : 'overview'
  const isActive = (id: string) => activeSection === id

  const features = [
    {
      icon: <Briefcase className="w-8 h-8 text-sky-500" />,
      title: 'Interview Practice',
      description:
        'Mock interview sessions with AI-generated questions, voice recording, and structured feedback on your responses.',
      novelty:
        'Questions are generated fresh per session from your resume, the job description, and the target company — not a fixed question bank. Follow-up questions probe your actual answer, and each follow-up is scored with the same rigor as the main question.',
    },
    {
      icon: <Code2 className="w-8 h-8 text-indigo-500" />,
      title: 'Real Coding Rounds',
      description:
        'Optional hands-on coding questions for technical roles — written and run in Python or JavaScript, not just talked about.',
      novelty:
        "Submitted code is executed against real test cases by an actual interpreter, so correctness is a fact from execution, never an AI's guess. The candidate opts in explicitly, and if they don't know Python/JavaScript, no coding question is ever generated — questions stay purely conversational instead.",
    },
    {
      icon: <Presentation className="w-8 h-8 text-violet-500" />,
      title: 'Presentation Training',
      description:
        'Practice slide-based delivery and receive guidance on clarity, pacing, and presentation structure.',
      novelty:
        'Feedback is tied to the specific slide you were presenting, not a generic rubric — so notes reference what you actually said for that slide, in that moment.',
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-emerald-500" />,
      title: 'Casual Conversation',
      description:
        'Build speaking fluency through informal dialogue practice, topic prompts, and AI conversation responses.',
      novelty:
        'A single spoken response is broken down into a full report — vocabulary, grammar, pronunciation, and fluency — instead of one flat score, so you know exactly which part of your English to work on next.',
    },
    {
      icon: <BookOpen className="w-8 h-8 text-orange-500" />,
      title: 'Reading Practice',
      description:
        'Read passages aloud, compare your transcript with source text, and improve pronunciation and intonation.',
      novelty:
        'Passages are generated at your assessed CEFR level and topic difficulty, never repeating recent ones, and a "TV News Anchor" mode adds teleprompter-style delivery practice on top of plain reading.',
    },
    {
      icon: <Zap className="w-8 h-8 text-amber-500" />,
      title: 'AI Feedback & Analysis',
      description:
        'The backend analyzes responses and returns actionable feedback on vocabulary, delivery, grammar, and relevance.',
      novelty:
        'When the AI reviewer is genuinely unavailable, the system never silently hands you a made-up "good" score — it falls back to an honest, clearly-labelled estimate so you always know whether a score is a real evaluation or a placeholder.',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-cyan-500" />,
      title: 'Progress Tracking',
      description:
        'Review session history, feedback notes, and performance trends on the dashboard to see improvement over time.',
      novelty:
        'Every past session\'s full AI feedback is stored and viewable in full, not just summarized — so you can compare exactly what changed between an old session and a recent one.',
    },
    {
      icon: <GraduationCap className="w-8 h-8 text-pink-500" />,
      title: 'Adaptive CEFR Leveling',
      description:
        'Your English level (A1–C2) is assessed once, then automatically raised as your real practice performance justifies it.',
      novelty:
        'No separate re-test is required — consistently strong performance across multiple practice modes and multiple days automatically raises your level and unlocks harder content, with the platform notifying you when it happens. Levels only ever move up automatically, keeping placement honest.',
    },
    {
      icon: <Flag className="w-8 h-8 text-rose-500" />,
      title: 'Goal Setting',
      description:
        'Define learning goals and focus on specific practice areas to make progress more intentional.',
      novelty:
        'Goals track automatically against real session activity — completing a relevant practice session updates progress without any manual check-in.',
    },
    {
      icon: <UserCheck className="w-8 h-8 text-lime-500" />,
      title: 'Personalized Learning',
      description:
        'Choose the practice paths that matter most to you and receive feedback that supports your speaking goals.',
      novelty:
        'The language used in questions and feedback itself scales to your CEFR level — an A2 learner and a C1 learner preparing for the same role are asked the same substance in different words.',
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

  const cefrLevels = [
    {
      code: 'A1',
      label: 'Beginner',
      description:
        'Can understand and use very basic everyday expressions and simple phrases. Can introduce themselves and answer simple personal questions with help from the listener.',
    },
    {
      code: 'A2',
      label: 'Elementary',
      description:
        'Can communicate in simple, routine situations involving direct exchange of familiar information — shopping, local area, immediate needs — using short, simple sentences.',
    },
    {
      code: 'B1',
      label: 'Intermediate',
      description:
        'Can handle most everyday situations while travelling or working, describe experiences and opinions, and give reasons and explanations for plans in simple connected text.',
    },
    {
      code: 'B2',
      label: 'Upper Intermediate',
      description:
        'Can interact with fluency and spontaneity that makes regular interaction with native speakers possible, and can produce clear, detailed text on a wide range of subjects.',
    },
    {
      code: 'C1',
      label: 'Advanced',
      description:
        'Can express ideas fluently and spontaneously without obvious searching for words, and use language flexibly for social, academic, and professional purposes.',
    },
    {
      code: 'C2',
      label: 'Proficient',
      description:
        'Can understand virtually everything read or heard, summarize information from different sources, and express themselves spontaneously with precision even in complex situations.',
    },
  ]

  const authors = [
    { name: 'Ishal Anisha Pereira', email: 'ishalpereira12@gmail.com' },
    { name: 'Jenisha Nazareth', email: 'jenishanazareth99@gmail.com' },
    { name: 'Lavisha Priya D Almeida', email: 'lavishapriyadalmeida@gmail.com' },
    { name: 'Meloni Jonita Quadras', email: 'meloniqrs@gmail.com' },
  ]

  const guide = { name: 'Dr. Sridevi Saralaya', email: 'sridevis@sjec.ac.in' }

  const affiliation = {
    department: 'Department of Computer Science and Engineering',
    institution: 'St. Joseph Engineering College',
    location: 'Mangaluru, India',
  }

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-12">
            {isActive('overview') && (
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
            )}

            {isActive('problem-solution') && (
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
            )}

            {isActive('features') && (
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] p-8">
              <h2 className="text-3xl font-semibold text-slate-950 dark:text-white text-center mb-8">Key Features</h2>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {features.map((feature) => (
                  <div key={feature.title} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-6 shadow-sm flex flex-col">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-950 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-7">{feature.description}</p>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 mb-1">
                        What&apos;s novel
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-6">{feature.novelty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            )}

            {isActive('how-it-works') && (
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
            )}

            {isActive('cefr') && (
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] p-8">
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-semibold text-slate-950 dark:text-white">Your English Level: CEFR</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-300 leading-7">
                  Lexical measures your spoken English using the CEFR (Common European Framework of Reference for
                  Languages) — the same six-level scale used internationally for language proficiency, from A1
                  (Beginner) to C2 (Proficient). A short placement assessment sets your starting level, and every
                  practice mode — reading passages, interview question wording, feedback language — automatically
                  adjusts to match it.
                </p>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cefrLevels.map((level) => (
                  <div key={level.code} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#2C5AA0] text-white font-bold text-sm">
                        {level.code}
                      </span>
                      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{level.label}</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-6">{level.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-3xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-6 text-center">
                <p className="text-slate-700 dark:text-slate-200 font-semibold">
                  You don&apos;t need to retake the assessment to level up.
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-6">
                  As you complete mock sessions and consistently perform well across different practice modes and
                  different days, Lexical automatically raises your CEFR level and lets you know — so simply
                  practicing regularly, and doing well, is what moves you forward.
                </p>
              </div>
            </section>
            )}

            {isActive('vision') && (
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/20 p-10">
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
            )}

            {isActive('authors') && (
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8">
              <h2 className="text-3xl font-semibold text-slate-950 dark:text-white text-center mb-2">Authors</h2>
              <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
                {affiliation.department} · {affiliation.institution} · {affiliation.location}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {authors.map((author) => (
                  <div key={author.email} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111827] p-6 text-center">
                    <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm">
                      <GraduationCap className="w-7 h-7 text-sky-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{author.name}</h3>
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Building2 className="w-3.5 h-3.5" /> {affiliation.institution}
                    </p>
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 break-all">
                      <Mail className="w-3.5 h-3.5 shrink-0" /> {author.email}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111827] p-6 max-w-md mx-auto text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                  Guided by
                </p>
                <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm">
                  <UserCheck className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{guide.name}</h3>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Building2 className="w-3.5 h-3.5" /> {affiliation.institution}
                </p>
                <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 break-all">
                  <Mail className="w-3.5 h-3.5 shrink-0" /> {guide.email}
                </p>
              </div>
            </section>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <Suspense fallback={null}>
      <AboutInner />
    </Suspense>
  )
}
