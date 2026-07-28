import { NextRequest, NextResponse } from 'next/server'

interface Slide {
  title: string
  subtitle: string
  content: string
  bullets: string[]
  category: string
  highlight: string
  imageQuery: string
}

interface SlideWithImage extends Slide {
  imageBase64?: string
  imageMime?: string
}

export async function GET() {
  return NextResponse.json({
    groqKeyPresent:   !!process.env.GROQ_API_KEY,
    geminiKeyPresent: !!process.env.GEMINI_API_KEY,
    pexelsKeyPresent: !!process.env.PEXELS_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const {
      topic,
      prompt,
      slideCount = 10,
      contentMode = 'bullets',
      description = '',
      slideHeadings = [],
      englishLevel = null,
    } = await request.json()

    if (!topic || !prompt) {
      return NextResponse.json({ error: 'Topic and prompt are required' }, { status: 400 })
    }

    const count = Math.min(Math.max(parseInt(slideCount) || 10, 3), 20)

    console.log('\n=== GENERATE PPT ===')
    console.log('Topic:', topic, '| Slides:', count, '| Mode:', contentMode, '| Level:', englishLevel ?? 'n/a')

    const slides = await generateSlides(topic, prompt, count, contentMode, description, slideHeadings, englishLevel)
    console.log('Slide count:', slides.length)

    const slidesWithImages = await attachImages(slides, topic)
    const pptxBase64 = await buildPptx(slidesWithImages, topic, contentMode)

    return NextResponse.json({
      slides: slidesWithImages,
      pptxBase64,
      filename: `${topic.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.pptx`,
    })
  } catch (error: any) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

// ── CEFR language complexity (Feature 1 → presentation content integration) ────
// Scales the WORDING of slide text (vocabulary, sentence complexity) to the
// presenter's assessed English level — the facts/topic depth stay the same,
// only how densely/idiomatically they're phrased changes.
function cefrLanguageClause(englishLevel: string | null): string {
  if (!englishLevel) return ''
  const level = String(englishLevel).toUpperCase()
  const guidance: Record<string, string> = {
    A1: 'Use very short sentences and the most common everyday words. No idioms. One simple fact per bullet.',
    A2: 'Use short, simple sentences and common vocabulary. Avoid idioms and complex grammar.',
    B1: 'Use clear, moderately simple sentences. Avoid dense jargon; explain any technical term briefly.',
    B2: 'Normal presentation phrasing is fine — moderately complex sentences and standard idioms are OK.',
    C1: 'Use fluent, professional English including idiomatic phrasing and nuanced sentence structures.',
    C2: 'Use sophisticated, idiomatic, native-level professional English freely.',
  }
  if (!guidance[level]) return ''
  return `\n5. LANGUAGE LEVEL: The presenter's English level is ${level}. Word every title, subtitle, bullet, and highlight so the LANGUAGE (not the facts) matches this level — ${guidance[level]} Keep facts/numbers precise regardless of level; only the phrasing changes.`
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(
  topic: string,
  userPrompt: string,
  slideCount: number,
  contentMode: string,
  description: string,
  slideHeadings: string[],
  englishLevel: string | null = null
): string {
  const headingsInstruction = slideHeadings.length > 0
    ? `Use EXACTLY these slide titles in order: ${slideHeadings.map((h, i) => `${i + 1}. "${h}"`).join(', ')}. Fill remaining slides if fewer headings provided.`
    : `Generate ${slideCount} slides covering different angles of "${topic}".`

  const contentInstruction = contentMode === 'paragraphs'
    ? `For each slide, write a "content" field: a detailed 3-4 sentence paragraph with specific facts, numbers, and names. Leave "bullets" as empty array [].`
    : `For each slide, write a "bullets" array of exactly 4 bullet points, each a specific fact with real numbers/names. Leave "content" as empty string "".`

  const descriptionBlock = description ? `User description / context: ${description}` : ''

  return `Create a highly specific, factual PowerPoint presentation about: "${topic}"
User requirements: ${userPrompt}
${descriptionBlock}

STRICT RULES:
1. Every fact must be SPECIFIC to "${topic}" with real measurements, real names, real numbers
2. NEVER write vague phrases like "is fascinating" or "plays an important role"
3. imageQuery: write a very specific 3-5 word phrase for a background photo that is DIRECTLY related to the slide content
   - For a slide about "The Sun": imageQuery = "sun surface solar flare closeup"
   - For a slide about "Saturn's Rings": imageQuery = "saturn rings planet space"
   - For a slide about "Climate Change glaciers": imageQuery = "glacier melting arctic aerial"
   - Make it visually specific so image search finds a stunning relevant photo
4. ${contentInstruction}${cefrLanguageClause(englishLevel)}

${headingsInstruction}

Return ONLY a raw JSON array. No markdown, no backticks, no explanation. Start with [ end with ].

Generate exactly ${slideCount} slides:
[
  {
    "title": "specific slide title",
    "subtitle": "one real fact or stat as subtitle",
    "category": "OVERVIEW",
    "highlight": "most stunning single fact with real number",
    "imageQuery": "specific 4-5 word visual description for background photo",
    "content": "${contentMode === 'paragraphs' ? '3-4 sentence detailed paragraph here' : ''}",
    "bullets": ${contentMode === 'bullets' ? '["fact 1 with numbers", "fact 2 with names", "fact 3 with data", "fact 4 with evidence"]' : '[]'}
  }
]`
}

function parseSlides(rawText: string, topic: string): Slide[] | null {
  const clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  if (start === -1 || end === -1) return null
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1))
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed.map((s: any, i: number): Slide => ({
      title:      String(s.title      ?? `Slide ${i + 1}`),
      subtitle:   String(s.subtitle   ?? ''),
      category:   String(s.category   ?? 'OVERVIEW'),
      highlight:  String(s.highlight  ?? ''),
      imageQuery: String(s.imageQuery ?? topic),
      content:    String(s.content    ?? ''),
      bullets: Array.isArray(s.bullets)
        ? s.bullets.map((b: any) => String(b)).filter(Boolean)
        : [],
    }))
  } catch { return null }
}

// ── Groq (primary, free) ──────────────────────────────────────────────────────
async function tryGroq(
  topic: string, userPrompt: string, slideCount: number,
  contentMode: string, description: string, slideHeadings: string[], englishLevel: string | null = null
): Promise<Slide[] | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it']
  const prompt = buildPrompt(topic, userPrompt, slideCount, contentMode, description, slideHeadings, englishLevel)

  for (const model of GROQ_MODELS) {
    try {
      console.log(`🔄 Groq [${model}]`)
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 6000,
        }),
      })
      if (!res.ok) { console.warn(`⚠️ Groq [${model}] ${res.status}`); continue }
      const data = await res.json()
      const rawText: string = data.choices?.[0]?.message?.content ?? ''
      const slides = parseSlides(rawText, topic)
      if (slides) { console.log(`✅ Groq [${model}] → ${slides.length} slides`); return slides }
    } catch (err: any) { console.error(`❌ Groq [${model}]:`, err.message) }
  }
  return null
}

// ── Gemini (fallback, free) ───────────────────────────────────────────────────
async function tryGemini(
  topic: string, userPrompt: string, slideCount: number,
  contentMode: string, description: string, slideHeadings: string[], englishLevel: string | null = null
): Promise<Slide[] | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const GEMINI_MODELS = [
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
  ]
  const prompt = buildPrompt(topic, userPrompt, slideCount, contentMode, description, slideHeadings, englishLevel)

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`🔄 Gemini [${model}]`)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 6000 },
          }),
        }
      )
      if (!res.ok) { console.warn(`⚠️ Gemini [${model}] ${res.status}`); continue }
      const data = await res.json()
      const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const slides = parseSlides(rawText, topic)
      if (slides) { console.log(`✅ Gemini [${model}] → ${slides.length} slides`); return slides }
    } catch (err: any) { console.error(`❌ Gemini [${model}]:`, err.message) }
  }
  return null
}

async function generateSlides(
  topic: string, userPrompt: string, slideCount: number,
  contentMode: string, description: string, slideHeadings: string[], englishLevel: string | null = null
): Promise<Slide[]> {
  const slides =
    (await tryGroq(topic, userPrompt, slideCount, contentMode, description, slideHeadings, englishLevel)) ??
    (await tryGemini(topic, userPrompt, slideCount, contentMode, description, slideHeadings, englishLevel))
  if (slides) return slides
  console.error('❌ All providers failed')
  return buildFallback(topic, slideCount)
}

// ── Images: Pexels (content-specific) → loremflickr → picsum fallback ────────
async function attachImages(slides: Slide[], topic: string): Promise<SlideWithImage[]> {
  const results: SlideWithImage[] = []
  const pexelsKey = process.env.PEXELS_API_KEY

  for (const slide of slides) {
    const rawQuery = slide.imageQuery || `${topic} background`
    let fetched = false

    // ── 1. Pexels (best: real content-specific photos, free API) ──────────
    if (pexelsKey && !fetched) {
      try {
        const searchRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(rawQuery)}&per_page=3&orientation=landscape`,
          {
            headers: { Authorization: pexelsKey },
            signal: AbortSignal.timeout(6000),
          }
        )
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          // Pick the best photo (first result)
          const photoUrl = searchData.photos?.[0]?.src?.large2x
            ?? searchData.photos?.[0]?.src?.large
            ?? searchData.photos?.[0]?.src?.medium

          if (photoUrl) {
            const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(8000) })
            if (imgRes.ok) {
              const buffer = await imgRes.arrayBuffer()
              const mime = imgRes.headers.get('content-type') ?? 'image/jpeg'
              if (mime.startsWith('image/')) {
                const base64 = Buffer.from(buffer).toString('base64')
                results.push({ ...slide, imageBase64: base64, imageMime: mime })
                console.log(`✅ Pexels image for "${rawQuery}"`)
                fetched = true
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ Pexels failed for "${rawQuery}": ${err.message}`)
      }
    }

    // ── 2. Loremflickr (keyword-based, no key needed) ─────────────────────
    if (!fetched) {
      try {
        const keywords = rawQuery.split(' ').slice(0, 3).join(',')
        const url = `https://loremflickr.com/1280/720/${encodeURIComponent(keywords)}`
        const res = await fetch(url, {
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(6000),
        })
        if (res.ok) {
          const buffer = await res.arrayBuffer()
          const mime = res.headers.get('content-type') ?? 'image/jpeg'
          if (mime.startsWith('image/')) {
            const base64 = Buffer.from(buffer).toString('base64')
            results.push({ ...slide, imageBase64: base64, imageMime: mime })
            console.log(`✅ Loremflickr image for "${rawQuery}"`)
            fetched = true
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ Loremflickr failed: ${err.message}`)
      }
    }

    // ── 3. Picsum (random beautiful photo, seed-based) ────────────────────
    if (!fetched) {
      try {
        const seed = encodeURIComponent(rawQuery.slice(0, 20))
        const url = `https://picsum.photos/seed/${seed}/1280/720`
        const res = await fetch(url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        })
        if (res.ok) {
          const buffer = await res.arrayBuffer()
          const mime = res.headers.get('content-type') ?? 'image/jpeg'
          if (mime.startsWith('image/')) {
            const base64 = Buffer.from(buffer).toString('base64')
            results.push({ ...slide, imageBase64: base64, imageMime: mime })
            console.log(`✅ Picsum image for "${rawQuery}"`)
            fetched = true
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ Picsum failed: ${err.message}`)
      }
    }

    if (!fetched) {
      console.warn(`⚠️ No image found for "${rawQuery}"`)
      results.push({ ...slide })
    }
  }

  return results
}

// ── Build .pptx ───────────────────────────────────────────────────────────────
async function buildPptx(slides: SlideWithImage[], topic: string, contentMode: string): Promise<string> {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = topic
  pptx.author = 'LexiFeedback AI'

  const C = {
    bg: '0A0F1E', panel: '111827', dim: '1F2937',
    accent: '3B82F6', accent2: '8B5CF6', accent3: '10B981',
    accent4: 'F59E0B', accent5: 'EF4444',
    white: 'FFFFFF', offWhite: 'F1F5F9', muted: '94A3B8',
  }
  const catAccent: Record<string, string> = {
    OVERVIEW: C.accent, SCIENCE: C.accent2, FACTS: C.accent3,
    HISTORY: C.accent4, EXAMPLES: C.accent3, DATA: C.accent,
    DISCOVERY: C.accent4, EXPLORATION: C.accent2,
    CHALLENGES: C.accent5, FUTURE: C.accent2,
  }
  const getA = (cat: string) => catAccent[cat?.toUpperCase()] ?? C.accent
  const bColors = [C.accent, C.accent3, C.accent4, C.accent2]

  // Light overlay so image shows through clearly
  const addBg = (slide: SlideWithImage, pSlide: any, overlayTransparency = 65) => {
    if (slide.imageBase64) {
      pSlide.addImage({
        data: `data:${slide.imageMime ?? 'image/jpeg'};base64,${slide.imageBase64}`,
        x: 0, y: 0, w: '100%', h: '100%',
      })
      // Light overlay — higher transparency = more image visible
      pSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: '100%',
        fill: { color: '000000', transparency: overlayTransparency },
        line: { color: '000000', width: 0 },
      })
    } else {
      pSlide.background = { color: C.bg }
    }
  }

  // ── Title slide ───────────────────────────────────────────────────────────
  const t0 = slides[0]
  const ts = pptx.addSlide()
  addBg(t0, ts, 60)  // 60% transparent overlay = image clearly visible
  const a0 = getA(t0.category)

  // Bottom gradient band
  ts.addShape(pptx.ShapeType.rect, {
    x: 0, y: 4.8, w: '100%', h: 2.7,
    fill: { color: '000000', transparency: 30 },
    line: { color: '000000', width: 0 },
  })

  // Category pill
  ts.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 0.5, w: 2.2, h: 0.38,
    fill: { color: a0, transparency: 20 },
    line: { color: a0, width: 1 }, rectRadius: 0.19,
  })
  ts.addText(t0.category, {
    x: 0.6, y: 0.5, w: 2.2, h: 0.38,
    fontSize: 9, bold: true, color: C.white,
    align: 'center', valign: 'middle', fontFace: 'Calibri', charSpacing: 2,
  })

  // Title
  ts.addText(t0.title, {
    x: 0.6, y: 1.2, w: 9.0, h: 2.4,
    fontSize: 44, bold: true, color: C.white, fontFace: 'Calibri',
    shadow: { type: 'outer', color: '000000', blur: 15, offset: 5, angle: 45 },
  })

  // Subtitle
  ts.addText(t0.subtitle, {
    x: 0.6, y: 3.65, w: 8.5, h: 0.6,
    fontSize: 17, color: C.offWhite, fontFace: 'Calibri', italic: true,
  })

  // Highlight box
  if (t0.highlight) {
    ts.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y: 4.45, w: 9.0, h: 0.72,
      fill: { color: a0, transparency: 30 },
      line: { color: a0, width: 1.5 }, rectRadius: 0.06,
    })
    ts.addText(`★  ${t0.highlight}`, {
      x: 0.6, y: 4.45, w: 9.0, h: 0.72,
      fontSize: 13, bold: true, color: C.white,
      align: 'center', valign: 'middle', fontFace: 'Calibri',
    })
  }

  ts.addText(`${topic}  •  ${slides.length} Slides  •  LexiFeedback AI`, {
    x: 0.6, y: 6.7, w: 9.0, h: 0.28,
    fontSize: 8, color: C.muted, align: 'center', fontFace: 'Calibri',
  })

  // ── Content slides ────────────────────────────────────────────────────────
  for (let idx = 1; idx < slides.length - 1; idx++) {
    const slide = slides[idx]
    const pSlide = pptx.addSlide()
    const a = getA(slide.category)

    // Light overlay — image clearly visible in background
    addBg(slide, pSlide, 62)

    // Very light content panel so image shows through
    pSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { color: '000814', transparency: 55 },
      line: { color: '000000', width: 0 },
    })

    // Top accent bar
    pSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.06,
      fill: { color: a }, line: { color: a, width: 0 },
    })

    // Category pill + slide number
    pSlide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 0.2, w: 1.8, h: 0.34,
      fill: { color: a, transparency: 20 },
      line: { color: a, width: 0 }, rectRadius: 0.17,
    })
    pSlide.addText(slide.category, {
      x: 0.5, y: 0.2, w: 1.8, h: 0.34,
      fontSize: 8, bold: true, color: C.white,
      align: 'center', valign: 'middle', fontFace: 'Calibri', charSpacing: 1.5,
    })
    pSlide.addText(`${idx + 1} / ${slides.length}`, {
      x: 9.0, y: 0.2, w: 0.8, h: 0.34,
      fontSize: 9, color: C.muted, align: 'right', fontFace: 'Calibri',
    })

    // Title with shadow for readability over light image
    pSlide.addText(slide.title, {
      x: 0.5, y: 0.65, w: 9.2, h: 1.0,
      fontSize: 26, bold: true, color: C.white, fontFace: 'Calibri',
      shadow: { type: 'outer', color: '000000', blur: 10, offset: 3, angle: 45 },
    })

    // Subtitle
    if (slide.subtitle) {
      pSlide.addText(slide.subtitle, {
        x: 0.5, y: 1.68, w: 9.2, h: 0.38,
        fontSize: 11, color: a, fontFace: 'Calibri', italic: true, bold: true,
      })
    }

    // Highlight box
    if (slide.highlight) {
      pSlide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 2.12, w: 9.2, h: 0.52,
        fill: { color: a, transparency: 60 },
        line: { color: a, width: 1 }, rectRadius: 0.05,
      })
      pSlide.addText(`⚡  ${slide.highlight}`, {
        x: 0.5, y: 2.12, w: 9.2, h: 0.52,
        fontSize: 10, bold: true, color: C.white,
        align: 'center', valign: 'middle', fontFace: 'Calibri',
      })
    }

    const contentY = slide.highlight ? 2.75 : 2.15

    if (contentMode === 'paragraphs' && slide.content) {
      pSlide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: contentY, w: 9.2, h: 4.0,
        fill: { color: '000000', transparency: 40 },
        line: { color: C.dim, width: 0.5 }, rectRadius: 0.08,
      })
      pSlide.addText(slide.content, {
        x: 0.65, y: contentY + 0.15, w: 8.9, h: 3.7,
        fontSize: 14, color: C.offWhite, fontFace: 'Calibri',
        valign: 'top', align: 'left',
      })
    } else {
      slide.bullets.forEach((bullet, bIdx) => {
        const yPos = contentY + bIdx * 1.0
        const bc = bColors[bIdx % bColors.length]
        // Semi-transparent bullet cards so image shows through
        pSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5, y: yPos, w: 9.2, h: 0.88,
          fill: { color: '000000', transparency: 40 },
          line: { color: bc, transparency: 30, width: 0.5 }, rectRadius: 0.06,
        })
        pSlide.addShape(pptx.ShapeType.ellipse, {
          x: 0.7, y: yPos + 0.22, w: 0.44, h: 0.44,
          fill: { color: bc }, line: { color: bc, width: 0 },
        })
        pSlide.addText(String(bIdx + 1), {
          x: 0.7, y: yPos + 0.22, w: 0.44, h: 0.44,
          fontSize: 11, bold: true, color: C.white,
          align: 'center', valign: 'middle', fontFace: 'Calibri',
        })
        pSlide.addText(bullet, {
          x: 1.28, y: yPos + 0.1, w: 8.2, h: 0.68,
          fontSize: 12, color: C.offWhite, fontFace: 'Calibri', valign: 'middle',
        })
      })
    }
  }

  // ── Conclusion slide ──────────────────────────────────────────────────────
  const last = slides[slides.length - 1]
  const cs = pptx.addSlide()
  const la = getA(last.category)
  addBg(last, cs, 60)

  cs.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: la }, line: { color: la, width: 0 },
  })
  cs.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 0.25, w: 2.0, h: 0.36,
    fill: { color: la, transparency: 20 },
    line: { color: la, width: 0 }, rectRadius: 0.18,
  })
  cs.addText(last.category, {
    x: 0.6, y: 0.25, w: 2.0, h: 0.36,
    fontSize: 8, bold: true, color: C.white,
    align: 'center', valign: 'middle', fontFace: 'Calibri', charSpacing: 2,
  })
  cs.addText(last.title, {
    x: 0.6, y: 0.75, w: 9.0, h: 1.2,
    fontSize: 34, bold: true, color: C.white, fontFace: 'Calibri',
    shadow: { type: 'outer', color: '000000', blur: 10, offset: 4, angle: 45 },
  })
  cs.addText(last.subtitle, {
    x: 0.6, y: 1.95, w: 9.0, h: 0.45,
    fontSize: 13, color: C.offWhite, fontFace: 'Calibri', italic: true,
  })

  if (contentMode === 'paragraphs' && last.content) {
    cs.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y: 2.55, w: 9.0, h: 3.5,
      fill: { color: '000000', transparency: 40 },
      line: { color: la, width: 1 }, rectRadius: 0.1,
    })
    cs.addText(last.content, {
      x: 0.75, y: 2.7, w: 8.7, h: 3.2,
      fontSize: 14, color: C.offWhite, fontFace: 'Calibri', valign: 'top',
    })
  } else {
    last.bullets.slice(0, 4).forEach((b, i) => {
      const xPos = 0.4 + i * 2.42
      const bc = bColors[i]
      cs.addShape(pptx.ShapeType.roundRect, {
        x: xPos, y: 2.55, w: 2.25, h: 4.0,
        fill: { color: '000000', transparency: 35 },
        line: { color: bc, width: 1.5 }, rectRadius: 0.1,
      })
      cs.addShape(pptx.ShapeType.rect, {
        x: xPos, y: 2.55, w: 2.25, h: 0.07,
        fill: { color: bc }, line: { color: bc, width: 0 },
      })
      cs.addText(b, {
        x: xPos + 0.12, y: 2.7, w: 2.0, h: 3.7,
        fontSize: 11, color: C.white, fontFace: 'Calibri', valign: 'top',
      })
    })
  }

  cs.addText(
    `${topic.toUpperCase()}  •  LexiFeedback AI  •  ${new Date().getFullYear()}`,
    { x: 0, y: 6.75, w: '100%', h: 0.28, fontSize: 8, color: C.muted, align: 'center', fontFace: 'Calibri' }
  )

  return await pptx.write({ outputType: 'base64' }) as string
}

// ── Fallback ──────────────────────────────────────────────────────────────────
function buildFallback(topic: string, slideCount: number): Slide[] {
  return Array.from({ length: slideCount }, (_, i) => ({
    title: i === 0 ? topic : `${topic} — Part ${i + 1}`,
    subtitle: i === 0 ? 'Add GROQ_API_KEY to .env.local for AI content' : '',
    category: ['OVERVIEW','DATA','SCIENCE','SCIENCE','FACTS','HISTORY','FACTS','EXAMPLES','DISCOVERY','FUTURE'][i % 10],
    highlight: i === 0 ? 'Get free key at console.groq.com — no credit card needed' : '',
    imageQuery: `${topic} background`,
    content: i === 0
      ? 'Go to console.groq.com, sign up free, create an API key, add GROQ_API_KEY=your_key to .env.local, then restart npm run dev.'
      : 'Content will appear after adding your Groq API key.',
    bullets: i === 0
      ? ['Go to console.groq.com and sign up free', 'Create an API key (no card needed)', 'Add GROQ_API_KEY=your_key to .env.local', 'Restart npm run dev']
      : ['Content will appear after adding Groq key', 'Groq is completely free', 'No daily quota limits like Gemini', 'Works instantly for demos'],
  }))
}