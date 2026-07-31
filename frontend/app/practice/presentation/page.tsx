'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Mic, Square, Send, Upload, FileText,
  Wand2, ChevronLeft, ChevronRight, Loader2, Download, Plus, X
} from 'lucide-react'

import { getUser } from '@/lib/auth'

interface Slide {
  title: string
  bullets: string[]
  content?: string
  imageBase64?: string
  imageMime?: string
  image?: string
}

function downloadPptx(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function RealSlideViewer({
  slides, current, onSelect,
}: {
  slides: any[]; current: number; onSelect: (i: number) => void
}) {
  return (
    <div className="space-y-4">
      <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-black flex items-center justify-center">
        <img
          src={slides[current].image}
          alt={`Slide ${current + 1}`}
          className="w-full h-auto object-contain"
          style={{ maxHeight: '75vh' }}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((slide, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
              i === current
                ? 'border-blue-500 ring-2 ring-blue-400'
                : 'border-gray-600 hover:border-blue-400'
            }`}
            style={{ width: '130px' }}
          >
            <img
              src={slide.image}
              alt={`Slide ${i + 1}`}
              className="w-full object-cover"
              style={{ height: '73px' }}
            />
            <div className="bg-gray-900 text-center py-1">
              <span className="text-gray-300 text-[9px]">Slide {i + 1}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function SlideCard({ slide, index, total, contentMode }: {
  slide: any; index: number; total: number; contentMode: string
}) {
  const title: string = slide?.title ?? 'Untitled'
  const bullets: string[] = Array.isArray(slide?.bullets) ? slide.bullets : []
  const content: string = slide?.content ?? ''
  const imageBase64: string | undefined = slide?.imageBase64
  const imageMime: string = slide?.imageMime ?? 'image/jpeg'

  return (
    <div
      className="w-full rounded-xl shadow-xl overflow-hidden relative select-none"
      style={{ aspectRatio: '16/9' }}
    >
      {imageBase64 ? (
        <img
          src={`data:${imageMime};base64,${imageBase64}`}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-blue-900" />
      )}
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col h-full p-10 text-white">
        <div className="text-xs font-medium text-blue-300 mb-2">Slide {index + 1} / {total}</div>
        <div className="w-10 h-1 bg-blue-400 rounded mb-4" />
        <h2 className="text-3xl font-bold mb-6 leading-snug drop-shadow-lg">{title}</h2>
        {contentMode === 'paragraphs' && content ? (
          <p className="text-white/90 text-sm leading-relaxed drop-shadow">{content}</p>
        ) : bullets.length > 0 ? (
          <ul className="space-y-3 flex-1 overflow-hidden">
            {bullets.slice(0, 5).map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-base text-white/90">
                <span className="mt-2 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="drop-shadow">{b}</span>
              </li>
            ))}
            {bullets.length > 5 && (
              <li className="text-xs text-blue-300 italic">+ {bullets.length - 5} more…</li>
            )}
          </ul>
        ) : (
          <p className="text-white/60 italic text-sm mt-4">(No content)</p>
        )}
      </div>
    </div>
  )
}

function ThumbnailStrip({ slides, current, onSelect }: {
  slides: any[]; current: number; onSelect: (i: number) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
      {slides.map((slide, i) => {
        const imageBase64 = slide?.imageBase64
        const imageMime = slide?.imageMime ?? 'image/jpeg'
        const title = slide?.title ?? ''
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex-shrink-0 w-28 rounded-lg overflow-hidden border-2 transition-all relative ${
              i === current
                ? 'border-blue-500 ring-2 ring-blue-300'
                : 'border-gray-600 hover:border-blue-400'
            }`}
          >
            {imageBase64 ? (
              <img
                src={`data:${imageMime};base64,${imageBase64}`}
                alt={title}
                className="w-full object-cover"
                style={{ height: '64px' }}
              />
            ) : (
              <div className="bg-gradient-to-br from-blue-700 to-blue-900 h-16" />
            )}
            <div className="absolute inset-0 bg-black/25 flex flex-col justify-end p-1">
              <span className="text-white text-[8px] font-bold truncate leading-tight">{title}</span>
              <span className="text-blue-300 text-[7px]">Slide {i + 1}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default function PresentationPracticePage() {
  const [mode, setMode] = useState<'upload' | 'generate'>('upload')

  const [pptFile, setPptFile] = useState<File | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)
  const [uploadedSlides, setUploadedSlides] = useState<any[]>([])

  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [slideCount, setSlideCount] = useState(8)
  const [contentMode, setContentMode] = useState<'bullets' | 'paragraphs'>('bullets')
  const [slideHeadings, setSlideHeadings] = useState<string[]>([''])
  const [showHeadings, setShowHeadings] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [pptxBase64, setPptxBase64] = useState<string | null>(null)
  const [pptxFilename, setPptxFilename] = useState('')
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generatedSlides, setGeneratedSlides] = useState<any[]>([])

  const [currentSlide, setCurrentSlide] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetAll = () => {
    setUploadedSlides([])
    setGeneratedSlides([])
    setCurrentSlide(0)
    setTranscript('')
    setFeedback(null)
    setPptxBase64(null)
    setGenerateError(null)
    setConvertError(null)
  }

  const totalSlides = mode === 'upload' ? uploadedSlides.length : generatedSlides.length

  const addHeading = () => setSlideHeadings(h => [...h, ''])
  const removeHeading = (i: number) => setSlideHeadings(h => h.filter((_, idx) => idx !== i))
  const updateHeading = (i: number, val: string) =>
    setSlideHeadings(h => h.map((v, idx) => idx === i ? val : v))

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPptFile(file)
    resetAll()
    setConvertError(null)

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pptx' && ext !== 'ppt') {
      setConvertError('Please upload a .pptx or .ppt file.')
      return
    }

    setIsConverting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presentation/upload-preview`,
        { method: 'POST', body: formData }
      )

      const data = await res.json()

      if (!res.ok) {
        setConvertError(data.error ?? 'Conversion failed.')
        return
      }

      setUploadedSlides(data.slides)
    } catch (err: any) {
      setConvertError('Could not connect to backend. Make sure Python backend is running.')
      console.error(err)
    } finally {
      setIsConverting(false)
    }
  }

  const handleGeneratePPT = async () => {
    if (!topic.trim()) return
    setIsGenerating(true)
    resetAll()

    try {
      const headings = slideHeadings.filter(h => h.trim())
      const res = await fetch('/api/practice/presentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          prompt: `Create a ${slideCount}-slide presentation about "${topic}". ${description}`,
          slideCount,
          contentMode,
          description: description.trim(),
          slideHeadings: headings,
          englishLevel: getUser()?.english_level ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setGenerateError(data.error ?? 'Generation failed.'); return }

      const normalized = (data.slides as any[]).map((s: any) =>
        typeof s === 'string'
          ? { title: s, bullets: [], content: '', imageBase64: undefined, imageMime: undefined }
          : {
              title:       s.title       ?? 'Untitled',
              bullets:     Array.isArray(s.bullets) ? s.bullets : [],
              content:     s.content     ?? '',
              imageBase64: s.imageBase64 ?? undefined,
              imageMime:   s.imageMime   ?? 'image/jpeg',
            }
      )
      setGeneratedSlides(normalized)

      if (data.pptxBase64) {
        setPptxBase64(data.pptxBase64)
        setPptxFilename(data.filename ?? `${topic}_presentation.pptx`)
      }
    } catch (err: any) {
      setGenerateError(err.message ?? 'Something went wrong.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!transcript.trim()) return
    setIsSubmitting(true)
    try {
      const currentSlideData = mode === 'upload'
        ? { title: `Slide ${currentSlide + 1}`, bullets: [] }
        : generatedSlides[currentSlide]

      const res = await fetch('/api/practice/presentation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          slideNumber: currentSlide + 1,
          currentSlide: currentSlideData,
        }),
      })
      if (res.ok) { const d = await res.json(); setFeedback(d.feedback) }
    } catch (err) { console.error(err) }
    finally { setIsSubmitting(false) }
  }

  const goNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(c => c + 1); setTranscript(''); setFeedback(null)
    }
  }
  const goPrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(c => c - 1); setTranscript(''); setFeedback(null)
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                Presentation Practice
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Upload your real PPT or generate one with AI
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Choose Mode</h2>
              <div className="flex gap-3">
                <Button
                  variant={mode === 'upload' ? 'default' : 'outline'}
                  onClick={() => { setMode('upload'); resetAll() }}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload My PPT
                </Button>
                <Button
                  variant={mode === 'generate' ? 'default' : 'outline'}
                  onClick={() => { setMode('generate'); resetAll() }}
                >
                  <Wand2 className="w-4 h-4 mr-2" /> Generate with AI
                </Button>
              </div>
            </div>

            {/* Upload Mode */}
            {mode === 'upload' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Upload Your Presentation
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Your actual slides will be shown exactly as they look in PowerPoint
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="file" accept=".pptx,.ppt"
                    onChange={handleFileUpload}
                    className="hidden" id="ppt-upload"
                  />
                  <label
                    htmlFor="ppt-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    {pptFile ? pptFile.name : 'Choose .pptx file'}
                  </label>
                  {pptFile && (
                    <Button
                      variant="outline"
                      className="text-red-500 border-red-300"
                      onClick={() => { setPptFile(null); resetAll() }}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                {isConverting && (
                  <div className="mt-4 flex items-center gap-2 text-blue-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Converting slides to images… this may take 10–30 seconds</span>
                  </div>
                )}

                {convertError && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{convertError}</p>
                    {convertError.includes('LibreOffice') && (
                      <p className="text-xs text-red-500 mt-1">
                        Download free from:{' '}
                        <a
                          href="https://www.libreoffice.org/download/download/"
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          libreoffice.org
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {!isConverting && uploadedSlides.length > 0 && (
                  <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                    ✓ {uploadedSlides.length} slides loaded — showing your real PPT below
                  </p>
                )}
              </div>
            )}

            {/* Generate Mode */}
            {mode === 'generate' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generate Presentation with AI
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Topic <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Climate Change, Machine Learning, Solar System"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description / What to cover
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Target audience, key points, tone…"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Slides:{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{slideCount}</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min={3} max={20} value={slideCount}
                      onChange={(e) => setSlideCount(parseInt(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <input
                      type="number" min={3} max={20} value={slideCount}
                      onChange={(e) =>
                        setSlideCount(Math.min(20, Math.max(3, parseInt(e.target.value) || 3)))
                      }
                      className="w-16 text-center border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>3 min</span><span>20 max</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Style
                  </label>
                  <div className="flex gap-3">
                    {(['bullets', 'paragraphs'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setContentMode(m)}
                        className={`flex-1 p-3 rounded-lg border-2 text-left transition-all ${
                          contentMode === m
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                        }`}
                      >
                        <div className="font-semibold text-sm">
                          {m === 'bullets' ? '• Bullet Points' : '¶ Paragraphs'}
                        </div>
                        <div className="text-xs mt-0.5 opacity-70">
                          {m === 'bullets' ? '4 key facts per slide' : '3–4 sentence detail per slide'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setShowHeadings(!showHeadings)}
                    className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <span className="text-xs">{showHeadings ? '▼' : '▶'}</span>
                    Custom Slide Headings{' '}
                    <span className="text-xs opacity-60">(optional)</span>
                  </button>
                  {showHeadings && (
                    <div className="mt-3 space-y-2 pl-1">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                        Enter headings for each slide. Leave blank to let AI decide.
                      </p>
                      {slideHeadings.map((heading, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
                          <Input
                            value={heading}
                            onChange={(e) => updateHeading(i, e.target.value)}
                            placeholder={`Slide ${i + 1} heading...`}
                            className="flex-1 h-8 text-sm"
                          />
                          {slideHeadings.length > 1 && (
                            <button onClick={() => removeHeading(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {slideHeadings.length < slideCount && (
                        <button
                          onClick={addHeading}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1 ml-7"
                        >
                          <Plus className="w-3 h-3" /> Add heading
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-gray-100 dark:border-gray-700">
                  <Button
                    onClick={handleGeneratePPT}
                    disabled={!topic.trim() || isGenerating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isGenerating
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                      : <><Wand2 className="w-4 h-4 mr-2" />Generate PPT</>
                    }
                  </Button>
                  {pptxBase64 && (
                    <Button
                      onClick={() => downloadPptx(pptxBase64, pptxFilename)}
                      variant="outline"
                      className="text-green-600 border-green-500 hover:bg-green-50"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download .pptx
                    </Button>
                  )}
                </div>

                {generateError && <p className="text-sm text-red-500">{generateError}</p>}
                {isGenerating && (
                  <p className="text-xs text-gray-400">
                    Generating slides with real facts and topic-specific images…
                  </p>
                )}
                {pptxBase64 && !isGenerating && (
                  <p className="text-sm text-green-600">✓ Real .pptx ready — click Download to save</p>
                )}
              </div>
            )}

            {/* Slide Viewer */}
            {(uploadedSlides.length > 0 || generatedSlides.length > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {mode === 'upload' ? 'Your Presentation' : 'Slide Preview'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goPrev} disabled={currentSlide === 0}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-500 min-w-[70px] text-center">
                      {currentSlide + 1} / {totalSlides}
                    </span>
                    <Button variant="outline" size="sm" onClick={goNext} disabled={currentSlide === totalSlides - 1}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {mode === 'upload' && uploadedSlides.length > 0 && (
                  <RealSlideViewer
                    slides={uploadedSlides}
                    current={currentSlide}
                    onSelect={(i) => { setCurrentSlide(i); setTranscript(''); setFeedback(null) }}
                  />
                )}

                {mode === 'generate' && generatedSlides.length > 0 && (
                  <>
                    <SlideCard
                      slide={generatedSlides[currentSlide]}
                      index={currentSlide}
                      total={generatedSlides.length}
                      contentMode={contentMode}
                    />
                    <ThumbnailStrip
                      slides={generatedSlides}
                      current={currentSlide}
                      onSelect={(i) => { setCurrentSlide(i); setTranscript(''); setFeedback(null) }}
                    />
                  </>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  {!isRecording ? (
                    <Button
                      onClick={() => { setIsRecording(true); setTranscript(''); setFeedback(null) }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Mic className="w-4 h-4 mr-2" /> Start Recording
                    </Button>
                  ) : (
                    <Button onClick={() => setIsRecording(false)} variant="destructive">
                      <Square className="w-4 h-4 mr-2" /> Stop Recording
                    </Button>
                  )}
                  <Button onClick={handleSubmit} disabled={!transcript.trim() || isSubmitting}>
                    {isSubmitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing…</>
                      : <><Send className="w-4 h-4 mr-2" />Get Feedback</>
                    }
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your speech (type or record):
                  </label>
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder={isRecording ? 'Recording… speak now' : 'Type what you said, or use the mic above'}
                    rows={4}
                    className={isRecording ? 'border-red-400' : ''}
                  />
                </div>

                {feedback && (
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">AI Feedback</h3>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{feedback}</p>
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