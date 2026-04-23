'use client'

import { Briefcase, Presentation, MessageCircle, Book } from 'lucide-react'
import { PracticeModeCard } from '@/components/practice-mode-card'

export default function DashboardPage() {
  const practiceModes = [
    {
      title: 'Interview Practice',
      description: 'Prepare for interviews with mock conversations and real-time feedback',
      icon: Briefcase,
      href: '/practice/interview',
      color: 'primary',
    },
    {
      title: 'Presentation Mode',
      description: 'Deliver presentations and receive feedback on delivery and content',
      icon: Presentation,
      href: '/practice/presentation',
      color: 'success',
    },
    {
      title: 'Casual Conversation',
      description: 'Practice natural English in informal conversations',
      icon: MessageCircle,
      href: '/practice/conversation',
      color: 'warning',
    },
    {
      title: 'Reading Practice',
      description: 'Improve reading comprehension with texts and exercises',
      icon: Book,
      href: '/practice/reading',
      color: 'danger',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-[#1F2937] dark:text-white mb-2">
          Welcome to Lexical
        </h1>
        <p className="text-[#6B7280] dark:text-gray-400 text-lg">
          Choose a practice mode to start improving your English
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {practiceModes.map((mode) => (
          <PracticeModeCard key={mode.title} {...mode} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-lg text-[#1F2937] dark:text-white mb-2">
            📊 Your Progress
          </h3>
          <p className="text-[#6B7280] dark:text-gray-400">
            Track your learning journey with detailed analytics and insights
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <h3 className="font-semibold text-lg text-[#1F2937] dark:text-white mb-2">
            🎯 Set Goals
          </h3>
          <p className="text-[#6B7280] dark:text-gray-400">
            Define your learning goals and get personalized recommendations
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <h3 className="font-semibold text-lg text-[#1F2937] dark:text-white mb-2">
            💡 AI Feedback
          </h3>
          <p className="text-[#6B7280] dark:text-gray-400">
            Get instant, detailed feedback powered by advanced AI
          </p>
        </div>
      </div>
    </div>
  )
}
