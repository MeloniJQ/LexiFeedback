'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Mic, Square, Send, Upload, FileText } from 'lucide-react'

export default function InterviewPracticePage() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [interviewSetup, setInterviewSetup] = useState({
    jobTitle: '',
    company: '',
    jobDescription: '',
    keySkills: '',
    resume: null as File | null
  })
  const [setupComplete, setSetupComplete] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setInterviewSetup({ ...interviewSetup, resume: file })
    }
  }

  const handleStartSetup = () => {
    setSetupComplete(true)
  }

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
        body: JSON.stringify({ 
          transcript,
          interviewSetup 
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
          Interview Practice
        </h1>
        <p className="text-[#6B7280] dark:text-gray-400">
          Practice your interview skills with AI feedback
        </p>
      </div>

      {/* Interview Setup */}
      {!setupComplete && (
        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-6">
            Interview Setup
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label htmlFor="jobTitle" className="text-[#1F2937] dark:text-white">
                Job Title
              </Label>
              <Input
                id="jobTitle"
                value={interviewSetup.jobTitle}
                onChange={(e) => setInterviewSetup({ ...interviewSetup, jobTitle: e.target.value })}
                placeholder="e.g., Software Engineer"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="company" className="text-[#1F2937] dark:text-white">
                Company
              </Label>
              <Input
                id="company"
                value={interviewSetup.company}
                onChange={(e) => setInterviewSetup({ ...interviewSetup, company: e.target.value })}
                placeholder="e.g., Google"
                className="mt-1"
              />
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="jobDescription" className="text-[#1F2937] dark:text-white">
              Job Description
            </Label>
            <Textarea
              id="jobDescription"
              value={interviewSetup.jobDescription}
              onChange={(e) => setInterviewSetup({ ...interviewSetup, jobDescription: e.target.value })}
              placeholder="Describe the job requirements and responsibilities..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="keySkills" className="text-[#1F2937] dark:text-white">
              Key Skills Required
            </Label>
            <Textarea
              id="keySkills"
              value={interviewSetup.keySkills}
              onChange={(e) => setInterviewSetup({ ...interviewSetup, keySkills: e.target.value })}
              placeholder="List the key skills and technologies required..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="mb-6">
            <Label className="text-[#1F2937] dark:text-white">
              Resume/CV Upload
            </Label>
            <div className="mt-1">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
              />
              <Label
                htmlFor="resume-upload"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {interviewSetup.resume ? interviewSetup.resume.name : 'Choose Resume File'}
              </Label>
              {interviewSetup.resume && (
                <div className="flex items-center gap-2 mt-2 text-sm text-[#6B7280] dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                  {interviewSetup.resume.name}
                </div>
              )}
            </div>
          </div>

          <Button 
            onClick={handleStartSetup}
            disabled={!interviewSetup.jobTitle.trim() || !interviewSetup.company.trim()}
            className="w-full"
          >
            Start Interview Practice
          </Button>
        </div>
      )}

      {/* Interview Practice */}
      {setupComplete && (
        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white">
                  Interview Session
                </h2>
                <p className="text-sm text-[#6B7280] dark:text-gray-400">
                  {interviewSetup.jobTitle} at {interviewSetup.company}
                </p>
              </div>
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button onClick={handleStartRecording} className="flex items-center gap-2 bg-red-600 hover:bg-red-700">
                    <Mic className="w-4 h-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button onClick={handleStopRecording} variant="destructive" className="flex items-center gap-2">
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </Button>
                )}
              </div>
            </div>

            <div className="min-h-[200px] border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-black">
              <p className="text-[#6B7280] dark:text-gray-300">
                {transcript || 'Your interview response will appear here...'}
              </p>
            </div>

            {transcript && (
              <Button onClick={handleSubmit} className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Get Feedback
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
            AI Feedback
          </h2>
          <p className="text-[#6B7280] dark:text-gray-400 whitespace-pre-line">
            {feedback}
          </p>
        </div>
      )}
    </div>
  )
}