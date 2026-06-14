import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json()

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      )
    }

    // Simulate AI feedback generation
    // In production, this would call an AI service like OpenAI, Anthropic, or Groq
    const feedback = generateMockFeedback(transcript)

    return NextResponse.json({
      feedback,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate feedback' },
      { status: 500 }
    )
  }
}

function generateMockFeedback(transcript: string): string {
  const wordCount = transcript.split(/\s+/).length
  const hasFillers = /\b(um|uh|like|you know|basically|actually)\b/i.test(transcript)
  const hasPauses = /\.\.\.|—|-$/.test(transcript)

  let feedback = '**Interview Feedback Analysis**\n\n'

  // Grammar & Language
  feedback += '**Language Quality:**\n'
  feedback += `- Word count: ${wordCount} words (Good length for interview response)\n`
  feedback += '- Sentence structure is clear and well-organized\n'
  if (hasFillers) {
    feedback += '- Try to reduce filler words (um, uh, like) for more professional delivery\n'
  } else {
    feedback += '- Excellent use of filler words - none detected!\n'
  }
  if (hasPauses) {
    feedback += '- Consider reducing pauses for smoother delivery\n'
  }
  feedback += '\n'

  // Content Analysis
  feedback += '**Content Strengths:**\n'
  feedback += '- Provides a concrete example with clear context\n'
  feedback += '- Demonstrates problem-solving ability\n'
  feedback += '- Shows positive outcome and learning\n'
  feedback += '\n'

  // Suggestions
  feedback += '**Areas for Improvement:**\n'
  feedback += '- Consider adding more specific metrics or outcomes (numbers, percentages)\n'
  feedback += '- Could emphasize your personal learning or growth from the experience\n'
  feedback += '- Try to keep responses between 1-2 minutes for optimal impact\n'
  feedback += '\n'

  // Overall Score
  feedback += '**Overall Score: 8/10**\n'
  feedback += 'Your response demonstrates strong communication skills and relevant experience. With minor refinements to eliminate fillers and add more quantifiable results, this would be an excellent interview answer.'

  return feedback
}
