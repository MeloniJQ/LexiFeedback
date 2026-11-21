'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Volume2,
  BookmarkPlus,
  BookmarkCheck,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import {
  type WordEntry,
  getProficiency,
  pickWord,
  recordShown,
  shouldShowToday,
  markShownToday,
  saveToVocabulary,
  getSavedIds,
} from '@/lib/word-of-day'

const TYPE_LABEL: Record<WordEntry['type'], string> = {
  word: 'Word',
  idiom: 'Idiom',
  phrase: 'Phrase',
}

const LEVEL_STYLE: Record<WordEntry['level'], string> = {
  Beginner: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  Intermediate: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  Advanced: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
}

export function WordOfDayModal() {
  const [open, setOpen] = useState(false)
  const [entry, setEntry] = useState<WordEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shownIds, setShownIds] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!shouldShowToday()) return

    let cancelled = false
    setOpen(true)
    setLoading(true)

    ;(async () => {
      const level = getProficiency()
      const word = await pickWord(level)
      if (cancelled) return
      setEntry(word)
      setShownIds([word.id])
      recordShown(word.id)
      markShownToday()
      setSaved((await getSavedIds()).includes(word.id))
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (!open) return null

  const handleSpeak = () => {
    if (!entry) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(entry.term)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const handleSave = async () => {
    if (!entry) return
    const ok = await saveToVocabulary(entry)
    if (ok) setSaved(true)
  }

  const handleNext = async () => {
    setLoading(true)
    const level = getProficiency()
    const next = await pickWord(level, shownIds)
    setEntry(next)
    setShownIds((prev) => [...prev, next.id])
    recordShown(next.id)
    setSaved((await getSavedIds()).includes(next.id))
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 border-none shadow-2xl">
        {/* Header banner */}
        <div className="bg-gradient-to-br from-[#2C5AA0] to-[#1E3A5F] px-6 pt-6 pb-8 text-white relative min-h-[130px]">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/15 rounded-full p-1.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-white/90 tracking-wide">
              {entry ? `${TYPE_LABEL[entry.type]} of the Day` : 'Loading today\u2019s word\u2026'}
            </span>
          </div>

          {!entry && (
            <DialogHeader>
              <DialogTitle className="sr-only">Loading today's word</DialogTitle>
              <DialogDescription className="sr-only">
                Fetching today's personalized word, idiom, or phrase for you.
              </DialogDescription>
            </DialogHeader>
          )}

          {entry && (
            <>
              <DialogHeader className="text-left space-y-2">
                <DialogTitle className="text-white">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-3xl font-bold leading-tight">{entry.term}</span>
                    {typeof window !== 'undefined' && 'speechSynthesis' in window && (
                      <button
                        onClick={handleSpeak}
                        aria-label="Listen to pronunciation"
                        className="rounded-full bg-white/15 hover:bg-white/25 transition-colors p-1.5"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Today's {TYPE_LABEL[entry.type].toLowerCase()} to learn, with its meaning, an example sentence, and options to save it or see the next one.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {entry.partOfSpeech && (
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                    {entry.partOfSpeech}
                  </Badge>
                )}
                {entry.pronunciation && (
                  <span className="text-sm text-white/80 italic">/{entry.pronunciation}/</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 bg-white dark:bg-[#1F2937] min-h-[220px]">
          {loading || !entry ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-[#6B7280] dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Finding a new word for you\u2026</p>
            </div>
          ) : (
            <>
              <Badge className={`border ${LEVEL_STYLE[entry.level]}`} variant="outline">
                {entry.level}
              </Badge>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-1">
                  Meaning
                </p>
                <p className="text-[#1F2937] dark:text-white leading-relaxed">{entry.meaning}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-1">
                  Example
                </p>
                <p className="text-[#1F2937] dark:text-gray-200 italic leading-relaxed">
                  "{entry.example}"
                </p>
              </div>

              {entry.synonyms && entry.synonyms.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-1.5">
                    Synonyms
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.synonyms.map((syn) => (
                      <Badge key={syn} variant="secondary">
                        {syn}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 bg-white dark:bg-[#1F2937] sm:justify-between gap-2">
          <div className="flex gap-2 order-2 sm:order-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handleNext} disabled={loading} className="gap-1.5">
              Next Word
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="order-1 sm:order-2">
            <Button
              onClick={handleSave}
              disabled={saved || loading || !entry}
              className="bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white gap-1.5"
            >
              {saved ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <BookmarkPlus className="w-4 h-4" />
              )}
              {saved ? 'Saved to Vocabulary' : 'Save to Vocabulary'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}