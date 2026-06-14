import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcript, topic, conversation } = body

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      )
    }

    const aiResponse = generateAIResponse(transcript, topic)
    const feedback = generateFeedback(transcript)

    return NextResponse.json({
      response: aiResponse,
      feedback: feedback,
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

function generateAIResponse(userMessage: string, topic?: string): string {
  const lowerMessage = userMessage.toLowerCase()

  // Topic-based responses
  if (topic) {
    const topicResponses: { [key: string]: string[] } = {
      'Daily Routine': [
        'That sounds like a productive routine! What time do you usually have lunch?',
        'Interesting! How do you manage to stay so organized?',
        'Do you always follow this schedule, or is it flexible?'
      ],
      'Hobbies and Interests': [
        'That\'s fascinating! How long have you been interested in that?',
        'How often do you get to pursue this hobby?',
        'What inspired you to start doing this?'
      ],
      'Travel Experiences': [
        'That sounds amazing! Which destination would you visit again?',
        'What was the most memorable moment of your trip?',
        'How long did you stay there?'
      ],
      'Food and Cooking': [
        'Delicious! Do you cook often?',
        'What\'s your favorite ingredient to work with?',
        'Have you taken any cooking classes?'
      ],
      'Movies and Entertainment': [
        'Great taste! What was your favorite scene?',
        'Would you recommend it to others?',
        'Have you watched any similar movies?'
      ],
      'Work and Career': [
        'That\'s impressive! What do you find most rewarding?',
        'How long have you been in this field?',
        'What are your career goals?'
      ],
      'Family and Friends': [
        'That\'s wonderful! How often do you spend time together?',
        'What do you enjoy doing with them?',
        'Do you have any special traditions?'
      ],
      'Weather and Seasons': [
        'I agree! Do you prefer warm or cold weather?',
        'What activities do you enjoy in this season?',
        'How does the weather affect your mood?'
      ]
    }

    const responses = topicResponses[topic] || [
      'That\'s interesting! Tell me more about that.',
      'How does that make you feel?',
      'Can you elaborate on that?'
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  // Keyword-based fallback
  if (lowerMessage.includes('weekend') || lowerMessage.includes('free')) {
    return 'That sounds interesting! Could you tell me more about what you enjoyed most about it?'
  }

  if (lowerMessage.includes('work') || lowerMessage.includes('job')) {
    return 'I see. How long have you been working there? Do you enjoy what you do?'
  }

  if (lowerMessage.includes('friend') || lowerMessage.includes('family')) {
    return 'That\'s wonderful! How often do you get to spend time with them?'
  }

  if (lowerMessage.includes('like') || lowerMessage.includes('enjoy')) {
    return 'That\'s great! What is it about that you enjoy the most?'
  }

  if (lowerMessage.includes('movie') || lowerMessage.includes('film')) {
    return 'Oh nice! What was your favorite scene? Would you recommend it to others?'
  }

  return 'That\'s interesting! Could you tell me more about that?'
}

function generateFeedback(transcript: string): string {
  const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length
  const sentenceCount = (transcript.match(/[.!?]/g) || []).length
  const hasQuestionMark = transcript.includes('?')
  const hasPunctuation = /[.!?]/.test(transcript)
  const words = transcript.split(/\s+/)
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size

  let feedback = '✓ Good effort! Here\'s my feedback:\n\n'
  
  if (wordCount < 5) {
    feedback += '• Response is too short - try to give longer answers (aim for 20+ words)\n'
  } else if (wordCount < 20) {
    feedback += '• Try to give more detailed responses\n'
  } else {
    feedback += '• ✓ Good response length!\n'
  }
  
  if (!hasQuestionMark && sentenceCount > 0) {
    feedback += '• Try asking questions to keep the conversation flowing naturally\n'
  } else if (hasQuestionMark) {
    feedback += '• ✓ Great! You asked a question to keep the conversation going\n'
  }
  
  if (!hasPunctuation) {
    feedback += '• Remember to use proper punctuation (.!?) to make your sentences clear\n'
  } else {
    feedback += '• ✓ Good use of punctuation\n'
  }

  if (uniqueWords < wordCount / 2) {
    feedback += '• Try using a variety of different words instead of repeating the same ones\n'
  } else {
    feedback += '• ✓ Nice vocabulary variety!\n'
  }
  
  feedback += '\nKeep practicing! Natural conversations improve with time.'
  
  return feedback
}
