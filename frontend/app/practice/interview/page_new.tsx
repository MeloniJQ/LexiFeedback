'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Mic, Square, Send, Upload, Plus, Trash2 } from 'lucide-react'

interface InterviewQuestion {
  id: string
  question: string
}

export default function InterviewPracticePage() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([
    { id: '1', question: 'Tell me about yourself.' },
    { id: '2', question: 'What are your strengths?' },
  ])
  const [newQuestion, setNewQuestion] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const addQuestion = () => {
    if (newQuestion.trim()) {
      const question: InterviewQuestion = {
        id: Date.now().toString(),
        question: newQuestion.trim(),
      }
      setQuestions([...questions, question])
      setNewQuestion('')
    }
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setResumeFile(file)
    }
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    setTranscript('')
    setFeedback(null)
    // TODO: Implement actual audio recording
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    // TODO: Process audio and get transcript
    setTranscript('Sample transcript from audio recording...')
  }

  const handleSubmit = async () => {
    if (!transcript.trim()) return

    try {
      const response = await fetch('/api/practice/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          questions: questions.map(q => q.question),
          currentQuestion: questions[currentQuestionIndex]?.question
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback)
      }
    } catch (error) {
      console.error('Error getting feedback:', error)
    }
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setTranscript('')
      setFeedback(null)
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setTranscript('')
      setFeedback(null)
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
                Interview Practice
              </h1>
              <p className="text-[#6B7280] dark:text-gray-400">
                Prepare for your job interview with AI-powered feedback
              </p>
            </div>

            {/* Resume Upload Section */}
            <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
                Upload Resume/CV (Optional)
              </h2>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-[#2C5AA0] text-white rounded-lg hover:bg-[#1E3A5F] cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {resumeFile ? resumeFile.name : 'Choose File'}
                </label>
                {resumeFile && (
                  <Button
                    variant="outline"
                    onClick={() => setResumeFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Questions Section */}
            <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
                Interview Questions
              </h2>

              <div className="space-y-4 mb-6">
                {questions.map((q, index) => (
                  <div key={q.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#374151] rounded-lg">
                    <span className="text-sm font-medium text-[#6B7280] dark:text-gray-400 min-w-[24px]">
                      {index + 1}.
                    </span>
                    <span className="flex-1 text-[#1F2937] dark:text-white">{q.question}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(q.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Add a new interview question..."
                  onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
                  className="flex-1"
                />
                <Button onClick={addQuestion} className="px-4">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Recording Section */}
            <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={prevQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={nextQuestion}
                    disabled={currentQuestionIndex === questions.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-[#1F2937] dark:text-white font-medium">
                  {questions[currentQuestionIndex]?.question}
                </p>
              </div>

              <div className="flex items-center gap-4 mb-4">
                {!isRecording ? (
                  <Button
                    onClick={handleStartRecording}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopRecording}
                    variant="destructive"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Recording
                  </Button>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={!transcript.trim() || isRecording}
                  className="ml-auto"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Get Feedback
                </Button>
              </div>

              {transcript && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-[#1F2937] dark:text-white mb-2">
                    Your Response:
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-[#374151] rounded-lg">
                    <p className="text-[#1F2937] dark:text-white">{transcript}</p>
                  </div>
                </div>
              )}

              {feedback && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-[#1F2937] dark:text-white mb-2">
                    AI Feedback:
                  </h3>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-[#1F2937] dark:text-white whitespace-pre-line">
                      {feedback}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
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
          </div>
        </main>
      </div>
    </div>
  )
}
