'use client'

import Link from 'next/link'
import { Briefcase, Presentation, MessageCircle, Book, TrendingUp, Target, Brain, Sparkles, ShieldCheck } from 'lucide-react'
import { PracticeModeCard } from '@/components/practice-mode-card'

export default function DashboardPage() {
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
        <h1 className="text-4xl font-bold text-[#1F2937] dark:text-white mb-2">
          LexiFeed Interview Command Center
        </h1>
        <p className="text-[#6B7280] dark:text-gray-400 text-lg">
          Prepare for Google, Microsoft, Amazon, Meta, and beyond with AI-generated reports and coaching.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {practiceModes.map((mode) => (
          <PracticeModeCard key={mode.title} {...mode} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        <Link href="/dashboard/feedback" className="block">
          <div className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 rounded-lg p-6 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-lg text-[#1F2937] dark:text-white">💡 Recommendations</h3>
            </div>
            <p className="text-[#6B7280] dark:text-gray-400">Receive personalized courses, resources, and practice roadmaps.</p>
          </div>
        </Link>

        <Link href="/about" className="block">
          <div className="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 rounded-lg p-6 border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-6 h-6 text-orange-600" />
              <h3 className="font-semibold text-lg text-[#1F2937] dark:text-white">🛡️ Production Ready</h3>
            </div>
            <p className="text-[#6B7280] dark:text-gray-400">A secure, deployment-ready interview platform with analytics and reporting.</p>
          </div>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Production highlights
        </div>
        <ul className="mt-3 list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
          <li>Multi-company and multi-round interview modes</li>
          <li>Printable and exportable reports</li>
          <li>Recommendations, analytics, history, and badges</li>
          <li>Secure deployment configuration and health monitoring hooks</li>
        </ul>
      </div>
    </div>
  )
}
