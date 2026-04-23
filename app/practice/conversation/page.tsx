'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Send, Mic } from 'lucide-react'

interface Message {
  id: string
  speaker: 'user' | 'ai'
  text: string
  timestamp: Date
}

export default function ConversationPracticePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      speaker: 'ai',
      text: 'Hello! I&apos;m your English conversation partner. What did you do last weekend?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      speaker: 'user',
      text: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/practice/conversation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          previousMessages: messages,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          speaker: 'ai',
          text: data.response,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 overflow-auto flex flex-col">
          <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white">
                Casual Conversation
              </h1>
              <p className="text-[#6B7280] dark:text-gray-400 text-sm">
                Practice natural English conversation with our AI partner
              </p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.speaker === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      message.speaker === 'user'
                        ? 'bg-[#2C5AA0] text-white rounded-br-none'
                        : 'bg-gray-200 dark:bg-gray-700 text-[#1F2937] dark:text-white rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 dark:bg-gray-700 px-4 py-3 rounded-lg rounded-bl-none">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-[#1F2937]">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your response..."
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                  disabled={isLoading}
                />

                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
