'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

const progressData = [
  { category: 'Grammar', score: 75 },
  { category: 'Vocabulary', score: 82 },
  { category: 'Fluency', score: 68 },
  { category: 'Pronunciation', score: 72 },
  { category: 'Listening', score: 78 },
]

const sessionData = [
  { week: 'Week 1', sessions: 3, duration: 45 },
  { week: 'Week 2', sessions: 5, duration: 120 },
  { week: 'Week 3', sessions: 4, duration: 95 },
  { week: 'Week 4', sessions: 6, duration: 180 },
]

const recentSessions = [
  {
    id: 1,
    mode: 'Interview Practice',
    date: '2024-04-20',
    duration: 15,
    score: 82,
    feedback: 'Great interview responses with strong examples.',
  },
  {
    id: 2,
    mode: 'Presentation Mode',
    date: '2024-04-19',
    duration: 12,
    score: 76,
    feedback: 'Good presentation delivery. Work on pacing.',
  },
  {
    id: 3,
    mode: 'Conversation',
    date: '2024-04-18',
    duration: 20,
    score: 79,
    feedback: 'Natural conversation flow. Improve vocabulary usage.',
  },
  {
    id: 4,
    mode: 'Reading Practice',
    date: '2024-04-17',
    duration: 8,
    score: 85,
    feedback: 'Excellent comprehension of the passage.',
  },
]

export default function FeedbackDashboard() {
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
              <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <p className="text-[#6B7280] dark:text-gray-400 text-sm font-medium">
                  Total Sessions
                </p>
                <p className="text-3xl font-bold text-[#1F2937] dark:text-white mt-2">
                  18
                </p>
              </div>

              <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <p className="text-[#6B7280] dark:text-gray-400 text-sm font-medium">
                  Total Hours
                </p>
                <p className="text-3xl font-bold text-[#1F2937] dark:text-white mt-2">
                  8.5
                </p>
              </div>

              <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <p className="text-[#6B7280] dark:text-gray-400 text-sm font-medium">
                  Average Score
                </p>
                <p className="text-3xl font-bold text-[#2C5AA0] dark:text-white mt-2">
                  78.8%
                </p>
              </div>

              <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <p className="text-[#6B7280] dark:text-gray-400 text-sm font-medium">
                  Current Streak
                </p>
                <p className="text-3xl font-bold text-[#10B981] dark:text-[#68D391] mt-2">
                  5 days
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
                    <YAxis stroke="#6B7280" />
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
                  Weekly Activity
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
                    <Line type="monotone" dataKey="sessions" stroke="#2C5AA0" strokeWidth={2} />
                    <Line type="monotone" dataKey="duration" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">
                Recent Sessions
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-[#6B7280] dark:text-gray-400 font-medium">
                        Mode
                      </th>
                      <th className="text-left py-3 px-4 text-[#6B7280] dark:text-gray-400 font-medium">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-[#6B7280] dark:text-gray-400 font-medium">
                        Duration
                      </th>
                      <th className="text-left py-3 px-4 text-[#6B7280] dark:text-gray-400 font-medium">
                        Score
                      </th>
                      <th className="text-left py-3 px-4 text-[#6B7280] dark:text-gray-400 font-medium">
                        Feedback
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.map((session) => (
                      <tr
                        key={session.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#374151]"
                      >
                        <td className="py-3 px-4 text-[#1F2937] dark:text-white font-medium">
                          {session.mode}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280] dark:text-gray-400">
                          {session.date}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280] dark:text-gray-400">
                          {session.duration} min
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-3 py-1 rounded-full text-white text-sm font-medium bg-black">
                            {session.score}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#6B7280] dark:text-gray-400 text-xs max-w-xs truncate">
                          {session.feedback}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
  )
}
