import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const response = generateAIResponse(message)

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    )
  }
}

function generateAIResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase()

  // Simple response generation based on keywords
  if (lowerMessage.includes('weekend')) {
    return 'That sounds interesting! Could you tell me more about what you enjoyed most about it?'
  }

  if (lowerMessage.includes('work') || lowerMessage.includes('job')) {
    return 'I see. How long have you been working there? Do you enjoy what you do?'
  }

  if (lowerMessage.includes('friend') || lowerMessage.includes('family')) {
    return 'That&apos;s wonderful! How often do you get to spend time with them?'
  }

  if (lowerMessage.includes('like') || lowerMessage.includes('enjoy')) {
    return 'That&apos;s great! What is it about that you enjoy the most?'
  }

  if (lowerMessage.includes('movie') || lowerMessage.includes('film')) {
    return 'Oh nice! What was your favorite scene? Would you recommend it to others?'
  }

  if (lowerMessage.includes('travel') || lowerMessage.includes('trip')) {
    return 'Travel is such an amazing experience! What was the highlight of your trip?'
  }

  if (lowerMessage.includes('book') || lowerMessage.includes('read')) {
    return 'Reading is wonderful! What genre do you prefer? Who&apos;s your favorite author?'
  }

  // Default responses
  const responses = [
    'That&apos;s interesting! Can you tell me more about that?',
    'I understand. How did that make you feel?',
    'That sounds like quite an experience. What did you learn from it?',
    'I see what you mean. Do you think you&apos;ll do it again?',
    'That&apos;s a great point! How does that relate to your interests?',
  ]

  return responses[Math.floor(Math.random() * responses.length)]
}
