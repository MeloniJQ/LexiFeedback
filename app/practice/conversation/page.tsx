'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mic, Square, Send, Volume2, User, Home } from 'lucide-react'
import Link from 'next/link'

export default function ConversationPracticePage() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [conversation, setConversation] = useState<Array<{speaker: 'system' | 'user', text: string}>>([])
  const [isSystemTurn, setIsSystemTurn] = useState(true)

  const topics = [
    'Daily Routine',
    'Hobbies and Interests',
    'Travel Experiences',
    'Food and Cooking',
    'Movies and Entertainment',
    'Work and Career',
    'Family and Friends',
    'Weather and Seasons'
  ]

  const startConversation = () => {
    if (!selectedTopic) return

    const initialMessage = `Let's talk about ${selectedTopic.toLowerCase()}. How do you feel about ${selectedTopic.toLowerCase()}?`
    setConversation([{ speaker: 'system', text: initialMessage }])
    setIsSystemTurn(false)
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    setTranscript('')
  }

  const handleStopRecording = () => {
    setIsRecording(false)
  }

  const handleSubmit = async () => {
    if (!transcript.trim()) return

    // Add user message to conversation
    const newConversation = [...conversation, { speaker: 'user', text: transcript }]
    setConversation(newConversation)
    setTranscript('')
    setIsSystemTurn(true)

    try {
      const response = await fetch('/api/practice/conversation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript, 
          topic: selectedTopic,
          conversation: newConversation 
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Add system response
        setConversation([...newConversation, { speaker: 'system', text: data.response }])
        setFeedback(data.feedback)
        setIsSystemTurn(false)
      }
    } catch (error) {
      console.error('Error getting response:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="absolute top-6 right-6">
        <Link href="/dashboard">
          <Button variant="outline" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Home
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <div>
          <h1 className="text-4xl font-bold text-[#1F2937] dark:text-white mb-2">
            Casual Conversation Practice
          </h1>
          <p className="text-lg text-[#6B7280] dark:text-gray-400">
            Practice natural English in informal conversations with AI
          </p>
        </div>

        {/* Topic Selection */}
        <div className="bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
          Choose a Topic
        </h2>
        <div className="flex gap-4 items-center">
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-64 bg-gray-100 dark:bg-[#1F2937]">
              <SelectValue placeholder="Select a conversation topic" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={startConversation} 
            disabled={!selectedTopic || conversation.length > 0}
            className="flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            Start Conversation
          </Button>
        </div>
      </div>

        {/* Conversation Display */}
        {conversation.length > 0 && (
          <div className="bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
            Conversation
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {conversation.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${message.speaker === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.speaker === 'system' 
                      ? 'bg-[#1F2937] dark:bg-white text-white dark:text-black' 
                      : 'bg-[#10B981] text-white'
                  }`}>
                    {message.speaker === 'system' ? <Volume2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    message.speaker === 'system'
                      ? 'bg-[#F3F4F6] dark:bg-[#374151] text-[#1F2937] dark:text-white'
                      : 'bg-[#1F2937] dark:bg-[#10B981] text-white'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        {/* Recording Section */}
        {!isSystemTurn && conversation.length > 0 && (
          <div className="bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white">
                Your Turn to Respond
              </h2>
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

            <div className="min-h-[100px] border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-black">
              <p className="text-[#6B7280] dark:text-gray-300">
                {transcript || 'Your response will appear here...'}
              </p>
            </div>

            {transcript && (
              <Button onClick={handleSubmit} className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send Response
              </Button>
            )}
          </div>
        </div>
      )}

        {/* Feedback */}
        {feedback && (
          <div className="bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">
            AI Feedback
          </h2>
          <p className="text-[#6B7280] dark:text-gray-400 whitespace-pre-line">
            {feedback}
          </p>
        </div>
        )}
      </div>
    </div>
  )
}