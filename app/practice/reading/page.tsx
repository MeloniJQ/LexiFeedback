'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface Question {
  id: string
  text: string
  options: string[]
  correct: number
}

export default function ReadingPracticePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [score, setScore] = useState<number | null>(null)

  const passage = `
    The Industrial Revolution, which began in Britain in the late 18th century, 
    fundamentally transformed human society. It marked the transition from agrarian, 
    handcraft economies to industrial, machine-based manufacturing. This period witnessed 
    the invention of new technologies such as the steam engine, the spinning jenny, 
    and the power loom, which revolutionized production processes.
    
    The revolution spread gradually from Britain to Europe and North America, 
    reshaping social structures, labor practices, and urban landscapes. While it brought 
    prosperity and technological advancement, it also created challenging working conditions 
    for laborers and contributed to environmental degradation. The Industrial Revolution 
    laid the foundation for modern industrial society and continues to influence our world today.
  `

  const questions: Question[] = [
    {
      id: '1',
      text: 'Where did the Industrial Revolution begin?',
      options: ['France', 'Britain', 'Germany', 'America'],
      correct: 1,
    },
    {
      id: '2',
      text: 'Which of the following was NOT mentioned as an invention?',
      options: ['Steam engine', 'Telegraph', 'Spinning jenny', 'Power loom'],
      correct: 1,
    },
    {
      id: '3',
      text: 'What was a negative consequence mentioned in the passage?',
      options: [
        'Increased agriculture',
        'Better working conditions',
        'Environmental degradation',
        'Traditional crafts flourishing',
      ],
      correct: 2,
    },
  ]

  const handleSelectAnswer = (optionIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: optionIndex,
    })
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handleSubmit = () => {
    let correctCount = 0
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correct) {
        correctCount++
      }
    })

    const finalScore = Math.round((correctCount / questions.length) * 100)
    setScore(finalScore)
    setShowFeedback(true)
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
                Reading Practice
              </h1>
              <p className="text-[#6B7280] dark:text-gray-400">
                Read the passage and answer comprehension questions
              </p>
            </div>

            {!showFeedback ? (
              <>
                {/* Passage */}
                <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-8 mb-8">
                  <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
                    Passage
                  </h2>
                  <p className="text-[#6B7280] dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                    {passage}
                  </p>
                </div>

                {/* Question */}
                <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-8 mb-8">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white">
                        Question {currentQuestion + 1}
                      </h3>
                      <span className="text-sm text-[#6B7280] dark:text-gray-400">
                        {currentQuestion + 1} of {questions.length}
                      </span>
                    </div>
                    <p className="text-lg text-[#1F2937] dark:text-white mb-6">
                      {questions[currentQuestion].text}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-3 mb-8">
                    {questions[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectAnswer(index)}
                        className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                          selectedAnswers[currentQuestion] === index
                            ? 'border-[#2C5AA0] bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            selectedAnswers[currentQuestion] === index
                              ? 'text-[#2C5AA0]'
                              : 'text-[#6B7280] dark:text-gray-400'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}.{' '}
                          <span className="text-gray-700 dark:text-gray-300">
                            {option}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="flex gap-4">
                    <Button
                      onClick={handleNext}
                      disabled={currentQuestion === questions.length - 1}
                      className="bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next Question
                    </Button>

                    {currentQuestion === questions.length - 1 && (
                      <Button
                        onClick={handleSubmit}
                        className="bg-[#10B981] hover:bg-[#059669] text-white flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Submit Quiz
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Results */}
                <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-8 mb-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#E6EFF7] dark:bg-[#2C5AA0]/20 mb-4">
                      <span className="text-4xl font-bold text-[#2C5AA0]">
                        {score}%
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-2">
                      {score! >= 80
                        ? 'Excellent!'
                        : score! >= 60
                          ? 'Good Job!'
                          : 'Keep Practicing'}
                    </h2>
                    <p className="text-[#6B7280] dark:text-gray-400">
                      You answered{' '}
                      {Object.values(selectedAnswers).filter(
                        (answer, index) =>
                          answer === questions[index]?.correct
                      ).length}{' '}
                      out of {questions.length} questions correctly
                    </p>
                  </div>

                  {/* Detailed Feedback */}
                  <div className="space-y-4 mb-8">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className={`p-4 rounded-lg border-l-4 ${
                          selectedAnswers[index] === question.correct
                            ? 'border-[#10B981] bg-green-50 dark:bg-green-900/20'
                            : 'border-[#EF4444] bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        <p
                          className={`font-semibold mb-2 ${
                            selectedAnswers[index] === question.correct
                              ? 'text-[#10B981]'
                              : 'text-[#EF4444]'
                          }`}
                        >
                          Question {index + 1}:{' '}
                          {selectedAnswers[index] === question.correct
                            ? '✓ Correct'
                            : '✗ Incorrect'}
                        </p>
                        <p className="text-[#6B7280] dark:text-gray-400 text-sm mb-2">
                          {question.text}
                        </p>
                        {selectedAnswers[index] !== question.correct && (
                          <p className="text-sm text-[#1F2937] dark:text-white">
                            <span className="font-semibold">Correct answer:</span>{' '}
                            {
                              question.options[
                                question.correct
                              ]
                            }
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => {
                      setCurrentQuestion(0)
                      setSelectedAnswers({})
                      setShowFeedback(false)
                      setScore(null)
                    }}
                    className="w-full bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white"
                  >
                    Try Again
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
