'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Mic, Square, Send, Upload, FileText, Wand2 } from 'lucide-react'

export default function PresentationPracticePage() {
  const [mode, setMode] = useState<'upload' | 'generate'>('upload')
  const [pptFile, setPptFile] = useState<File | null>(null)
  const [topic, setTopic] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<string[]>([])
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPptFile(file)
      // TODO: Parse PPT and extract slides
      setSlides(['Slide 1: Introduction', 'Slide 2: Main Content', 'Slide 3: Conclusion'])
    }
  }

  const handleGeneratePPT = async () => {
    if (!topic.trim() || !prompt.trim()) return

    try {
      const response = await fetch('/api/practice/presentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, prompt }),
      })

      if (response.ok) {
        const data = await response.json()
        setSlides(data.slides)
      }
    } catch (error) {
      console.error('Error generating PPT:', error)
    }
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
      const response = await fetch('/api/practice/presentation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          currentSlide: slides[currentSlide],
          allSlides: slides
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

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
      setTranscript('')
      setFeedback(null)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
      setTranscript('')
      setFeedback(null)
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Presentation Practice
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Practice your presentation skills with AI feedback
              </p>
            </div>

            {/* Mode Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Choose Presentation Mode
              </h2>
              <div className="flex gap-4">
                <Button
                  variant={mode === 'upload' ? 'default' : 'outline'}
                  onClick={() => setMode('upload')}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload PPT
                </Button>
                <Button
                  variant={mode === 'generate' ? 'default' : 'outline'}
                  onClick={() => setMode('generate')}
                  className="flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate PPT
                </Button>
              </div>
            </div>

            {/* Upload Mode */}
            {mode === 'upload' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Upload Presentation
                </h2>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".ppt,.pptx,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="ppt-upload"
                  />
                  <label
                    htmlFor="ppt-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    {pptFile ? pptFile.name : 'Choose File'}
                  </label>
                  {pptFile && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPptFile(null)
                        setSlides([])
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Generate Mode */}
            {mode === 'generate' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Generate Presentation
                </h2>
                <div className="space-y-4">
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter presentation topic..."
                  />
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want in your presentation..."
                    rows={3}
                  />
                  <Button onClick={handleGeneratePPT} disabled={!topic.trim() || !prompt.trim()}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate PPT
                  </Button>
                </div>
              </div>
            )}

            {/* Presentation Display */}
            {slides.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Slide {currentSlide + 1} of {slides.length}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={prevSlide}
                      disabled={currentSlide === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={nextSlide}
                      disabled={currentSlide === slides.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <div className="mb-6 p-8 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[300px] flex items-center justify-center">
                  <p className="text-gray-900 dark:text-white text-center">
                    {slides[currentSlide]}
                  </p>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  {!isRecording ? (
                    <Button onClick={handleStartRecording} className="bg-red-600 hover:bg-red-700">
                      <Mic className="w-4 h-4 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button onClick={handleStopRecording} variant="destructive">
                      <Square className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}

                  <Button onClick={handleSubmit} disabled={!transcript.trim()}>
                    <Send className="w-4 h-4 mr-2" />
                    Get Feedback
                  </Button>
                </div>

                {transcript && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Your Presentation:
                    </h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-900 dark:text-white">{transcript}</p>
                    </div>
                  </div>
                )}

                {feedback && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      AI Feedback:
                    </h3>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-gray-900 dark:text-white whitespace-pre-line">
                        {feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}