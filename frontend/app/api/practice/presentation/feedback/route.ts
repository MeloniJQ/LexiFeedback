import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { transcript, slideNumber } = await request.json()

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      )
    }

    const feedback = generateMockPresentationFeedback(transcript, slideNumber)

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

function generateMockPresentationFeedback(transcript: string, slideNumber: number): string {
  const wordCount = transcript.split(/\s+/).length
  const avgWordsPerMinute = Math.round(wordCount / 1.5)

  let feedback = `**Slide ${slideNumber} Presentation Feedback**\n\n`

  feedback += '**Delivery Metrics:**\n'
  feedback += `- Word count: ${wordCount} words\n`
  feedback += `- Estimated speaking pace: ${avgWordsPerMinute} words/minute\n`
  feedback += '- Clarity: Good articulation and pacing\n\n'

  feedback += '**Content Strengths:**\n'
  feedback += '- Clear main message communicated\n'
  feedback += '- Relevant details provided\n'
  feedback += '- Good use of transitions\n\n'

  feedback += '**Presentation Skills:**\n'
  feedback += '- Eye contact suggested with audience\n'
  feedback += '- Maintain consistent speaking pace\n'
  feedback += '- Engage audience with questions or interactive elements\n\n'

  feedback += '**Suggestions for Improvement:**\n'
  feedback += '- Add more specific examples or data points\n'
  feedback += '- Consider pausing for emphasis\n'
  feedback += '- Use hand gestures to emphasize key points\n\n'

  feedback += '**Overall Score: 7.5/10**\n'
  feedback += 'Good presentation with clear communication. Focus on adding more engagement techniques and supporting data to elevate your delivery.'

  return feedback
}
