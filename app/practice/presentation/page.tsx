'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Mic, Square, Send } from 'lucide-react'

export default function PresentationPracticePage() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(1)

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
      const response = await fetch('/api/practice/presentation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, slideNumber: currentSlide }),
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
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
                Presentation Practice
              </h1>
              <p className="text-[#6B7280] dark:text-gray-400">
                Deliver your presentation and receive detailed feedback
              </p>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Slide Preview */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-8 aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-4xl font-bold text-[#2C5AA0] mb-4">
                      Slide {currentSlide}
                    </h2>
                    <p className="text-xl text-[#6B7280] dark:text-gray-400">
                      {currentSlide === 1 && 'Introduction: The Future of AI'}
                      {currentSlide === 2 && 'Key Benefits and Applications'}
                      {currentSlide === 3 && 'Implementation Strategy'}
                      {currentSlide === 4 && 'Conclusion and Questions'}
                    </p>
                  </div>
                </div>

                {/* Slide Controls */}
                <div className="flex gap-4 mt-4 justify-between">
                  <Button
                    onClick={() => setCurrentSlide(Math.max(1, currentSlide - 1))}
                    disabled={currentSlide === 1}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <span className="flex items-center text-[#6B7280] dark:text-gray-400">
                    Slide {currentSlide} of 4
                  </span>
                  <Button
                    onClick={() => setCurrentSlide(Math.min(4, currentSlide + 1))}
                    disabled={currentSlide === 4}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Recording Controls */}
              <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                {isRecording && (
                  <div className="mb-6 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
                      Recording...
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Your Speech
                  </label>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Your speech will appear here..."
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#374151] text-[#1F2937] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2C5AA0] text-sm"
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  {!isRecording ? (
                    <Button
                      onClick={handleStartRecording}
                      className="w-full bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white flex items-center justify-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopRecording}
                      className="w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={!transcript.trim()}
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    Get Feedback
                  </Button>
                </div>
              </div>
            </div>

            {/* Feedback Section */}
            {feedback && (
              <div className="mt-8 bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">
                  Presentation Feedback
                </h3>
                <div className="text-[#6B7280] dark:text-gray-400 space-y-3 whitespace-pre-wrap text-sm">
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
