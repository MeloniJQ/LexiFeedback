import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { topic, prompt } = await request.json()

    if (!topic || !prompt) {
      return NextResponse.json(
        { error: 'Topic and prompt are required' },
        { status: 400 }
      )
    }

    // Generate mock slides
    const slides = generateMockSlides(topic, prompt)

    return NextResponse.json({
      slides,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate slides' },
      { status: 500 }
    )
  }
}

function generateMockSlides(topic: string, prompt: string): string[] {
  return [
    `Slide 1: ${topic} - Introduction`,
    `Slide 2: Key Points about ${topic}`,
    `Slide 3: Benefits and Applications`,
    `Slide 4: Real-world Examples`,
    `Slide 5: ${topic} - Deep Dive`,
    `Slide 6: Challenges and Considerations`,
    `Slide 7: Future Outlook`,
    `Slide 8: Conclusion and Q&A`
  ]
}
