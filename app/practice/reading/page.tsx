'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Mic, Square, Send, Volume2 } from 'lucide-react'

interface ReadingPassage {
  id: string
  title: string
  content: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export default function ReadingPracticePage() {
  const [currentPassage, setCurrentPassage] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const passages: ReadingPassage[] = [
    {
      id: '1',
      title: 'The Industrial Revolution',
      content: `The Industrial Revolution, which began in Britain in the late 18th century, fundamentally transformed human society. It marked the transition from agrarian, handcraft economies to industrial, machine-based manufacturing. This period witnessed the invention of new technologies such as the steam engine, the spinning jenny, and the power loom, which revolutionized production processes.`,
      difficulty: 'intermediate'
    },
    {
      id: '2',
      title: 'Climate Change',
      content: `Climate change refers to long-term shifts in temperatures and weather patterns. These shifts may be natural, but since the 1800s, human activities have been the main driver of climate change, primarily due to burning fossil fuels like coal, oil, and gas. This has increased the concentration of greenhouse gases in the atmosphere.`,
      difficulty: 'intermediate'
    },
    {
      id: '3',
      title: 'Artificial Intelligence',
      content: `Artificial intelligence is the simulation of human intelligence processes by machines, especially computer systems. These processes include learning, reasoning, and self-correction. AI has become an essential part of the technology industry, helping to solve complex problems in various fields including healthcare, finance, and transportation.`,
      difficulty: 'advanced'
    }
  ]

  const playPassage = () => {
    setIsPlaying(true)
    // TODO: Implement text-to-speech
    // For now, simulate playing
    setTimeout(() => {
      setIsPlaying(false)
    }, 3000)
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
    setTranscript('Sample transcript from pronunciation recording...')
  }

  const handleSubmit = async () => {
    if (!transcript.trim()) return

    try {
      // TODO: Create a reading feedback API that analyzes pronunciation
      const response = await fetch('/api/practice/reading/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          originalText: passages[currentPassage].content,
          passageId: passages[currentPassage].id
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback)
      } else {
        // Fallback feedback for now
        setFeedback(`**Pronunciation Feedback**

**Accuracy:** Good attempt at reading the passage aloud.

**Fluency:** Try to read more smoothly without long pauses.

**Suggestions:**
- Focus on word stress and intonation
- Practice difficult words separately
- Read at a natural pace

Keep practicing to improve your pronunciation!`)
      }
    } catch (error) {
      console.error('Error getting feedback:', error)
      setFeedback(`**Pronunciation Feedback**

**Accuracy:** Good attempt at reading the passage aloud.

**Fluency:** Try to read more smoothly without long pauses.

**Suggestions:**
- Focus on word stress and intonation
- Practice difficult words separately
- Read at a natural pace

Keep practicing to improve your pronunciation!`)
    }
  }

  const nextPassage = () => {
    if (currentPassage < passages.length - 1) {
      setCurrentPassage(currentPassage + 1)
      setTranscript('')
      setFeedback(null)
    }
  }

  const prevPassage = () => {
    if (currentPassage > 0) {
      setCurrentPassage(currentPassage - 1)
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
                Reading & Pronunciation Practice
              </h1>
              <p className="text-[#6B7280] dark:text-gray-400">
                Read passages aloud and receive feedback on your pronunciation
              </p>
            </div>

            {/* Passage Navigation */}
            <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white">
                    Passage {currentPassage + 1} of {passages.length}
                  </h2>
                  <p className="text-sm text-[#6B7280] dark:text-gray-400">
                    Difficulty: {passages[currentPassage].difficulty}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={prevPassage}
                    disabled={currentPassage === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={nextPassage}
                    disabled={currentPassage === passages.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-medium text-[#1F2937] dark:text-white mb-2">
                  {passages[currentPassage].title}
                </h3>
                <div className="p-6 bg-gray-50 dark:bg-[#374151] rounded-lg">
                  <p className="text-[#1F2937] dark:text-white leading-relaxed text-lg">
                    {passages[currentPassage].content}
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={playPassage}
                  disabled={isPlaying}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  {isPlaying ? 'Playing...' : 'Listen to Passage'}
                </Button>
              </div>
            </div>

            {/* Recording Section */}
            <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
                Record Your Reading
              </h2>

              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-[#1F2937] dark:text-white">
                  📖 Read the passage aloud clearly. Focus on proper pronunciation, intonation, and fluency.
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
                  Get Pronunciation Feedback
                </Button>
              </div>

              {transcript && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-[#1F2937] dark:text-white mb-2">
                    Your Reading:
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-[#374151] rounded-lg">
                    <p className="text-[#1F2937] dark:text-white">{transcript}</p>
                  </div>
                </div>
              )}

              {feedback && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-[#1F2937] dark:text-white mb-2">
                    Pronunciation Feedback:
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
