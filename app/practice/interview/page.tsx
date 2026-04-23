'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Mic, Square, Send } from 'lucide-react'

export default function InterviewPracticePage() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleStartRecording = () => {
    setIsRecording(true)
    setTranscript('')
    setFeedback(null)
  }

  const handleStopRecording = () => {
    setIsRecording(false)
  }

  const handleSubmit = async () => {
    if (!transcript.trim()) return

    try {
      const response = await fetch('/api/practice/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })

      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback)
      }
    } catch (error) {
      console.error('Error getting feedback:', error)
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
                Interview Practice
              </h1>
              <p className="text-[#6B7280] dark:text-gray-400">
                Practice your interview skills with AI-powered feedback
              </p>
            </div>

            {/* Interview Question */}
            <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">
                Interview Question
              </h2>
              <p className="text-[#6B7280] dark:text-gray-400 text-lg mb-6">
                &quot;Tell me about a time when you had to overcome a significant challenge in your previous role.&quot;
              </p>
            </div>

            {/* Recording Area */}
            <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-8 mb-8">
              {isRecording && (
                <div className="mb-6 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-500 font-semibold">Recording...</span>
                </div>
              )}

              {/* Transcript Display */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                  Your Response
                </label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Your response will appear here..."
                  className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#374151] text-[#1F2937] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                  rows={6}
                />
              </div>

              {/* Controls */}
              <div className="flex gap-4">
                {!isRecording ? (
                  <Button
                    onClick={handleStartRecording}
                    className="bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopRecording}
                    className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </Button>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={!transcript.trim()}
                  className="bg-[#10B981] hover:bg-[#059669] text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Get Feedback
                </Button>
              </div>
            </div>

            {/* Feedback Section */}
            {feedback && (
              <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">
                  AI Feedback
                </h3>
                <div className="text-[#6B7280] dark:text-gray-400 space-y-3 whitespace-pre-wrap">
                  {feedback}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
