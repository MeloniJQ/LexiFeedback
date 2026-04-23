'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Calendar, Target, Award } from 'lucide-react'

export default function ProgressPage() {
  const progressData = [
    {
      skill: 'Interview Practice',
      progress: 75,
      sessions: 12,
      improvement: '+15%'
    },
    {
      skill: 'Presentation Skills',
      progress: 60,
      sessions: 8,
      improvement: '+10%'
    },
    {
      skill: 'Reading Comprehension',
      progress: 85,
      sessions: 15,
      improvement: '+20%'
    },
    {
      skill: 'Conversation Fluency',
      progress: 45,
      sessions: 6,
      improvement: '+8%'
    }
  ]

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-[#1F2937] dark:text-white">Total Sessions</h3>
                </div>
                <p className="text-3xl font-bold text-[#1F2937] dark:text-white">41</p>
                <p className="text-sm text-[#6B7280] dark:text-gray-400">This month</p>
              </div>

              <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-[#1F2937] dark:text-white">Average Improvement</h3>
                </div>
                <p className="text-3xl font-bold text-[#1F2937] dark:text-white">+13%</p>
                <p className="text-sm text-[#6B7280] dark:text-gray-400">Last 30 days</p>
              </div>

              <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-[#1F2937] dark:text-white">Goals Achieved</h3>
                </div>
                <p className="text-3xl font-bold text-[#1F2937] dark:text-white">7</p>
                <p className="text-sm text-[#6B7280] dark:text-gray-400">This month</p>
              </div>

              <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-6 h-6 text-orange-600" />
                  <h3 className="font-semibold text-[#1F2937] dark:text-white">Current Streak</h3>
                </div>
                <p className="text-3xl font-bold text-[#1F2937] dark:text-white">12</p>
                <p className="text-sm text-[#6B7280] dark:text-gray-400">Days</p>
              </div>
            </div>

            {/* Skill Progress */}
            <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-6">
                Skill Progress
              </h2>

              <div className="space-y-6">
                {progressData.map((skill) => (
                  <div key={skill.skill} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#1F2937] dark:text-white">
                        {skill.skill}
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[#6B7280] dark:text-gray-400">
                          {skill.sessions} sessions
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
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-6">
                Recent Activity
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#374151] rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-[#1F2937] dark:text-white font-medium">
                      Completed Interview Practice Session
                    </p>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400">
                      2 hours ago • Score: 85%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#374151] rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-[#1F2937] dark:text-white font-medium">
                      Achieved Reading Comprehension Goal
                    </p>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400">
                      1 day ago • +5% improvement
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#374151] rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-[#1F2937] dark:text-white font-medium">
                      Started Presentation Practice
                    </p>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400">
                      2 days ago • First session
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
  )
}