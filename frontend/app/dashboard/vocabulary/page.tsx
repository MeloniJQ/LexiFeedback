'use client'

import { useEffect, useState } from 'react'
import {
  type WordEntry,
  getSavedVocabulary,
  removeFromVocabulary,
} from '@/lib/word-of-day'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookMarked, Trash2, Volume2 } from 'lucide-react'

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

export default function VocabularyPage() {
  const [entries, setEntries] = useState<WordEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSavedVocabulary().then((data) => {
      setEntries(data.reverse())
      setLoaded(true)
    })
  }, [])

  const handleRemove = async (id: string) => {
    const previous = entries
    setEntries((prev) => prev.filter((e) => e.id !== id)) // optimistic UI update

    const ok = await removeFromVocabulary(id)
    if (!ok) {
      console.error('Failed to remove entry — restoring it')
      setEntries(previous) // roll back since the server didn't actually delete it
    }
  }

  const handleSpeak = (term: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(term)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#2C5AA0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
          My Vocabulary
        </h1>
        <p className="text-[#6B7280] dark:text-gray-400">
          Words, idioms, and phrases you've saved from Word of the Day
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <BookMarked className="w-10 h-10 text-[#6B7280] dark:text-gray-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-2">
            Nothing saved yet
          </h2>
          <p className="text-[#6B7280] dark:text-gray-400">
            When you see a Word of the Day you want to keep, hit "Save to Vocabulary" and it'll show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">
                    {entry.term}
                  </h3>
                  {typeof window !== 'undefined' && 'speechSynthesis' in window && (
                    <button
                      onClick={() => handleSpeak(entry.term)}
                      aria-label="Listen to pronunciation"
                      className="rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors p-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#6B7280] dark:text-gray-300" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(entry.id)}
                  aria-label="Remove from vocabulary"
                  className="text-[#6B7280] dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <Badge className={`border ${LEVEL_STYLE[entry.level]}`} variant="outline">
                  {entry.level}
                </Badge>
                <Badge variant="secondary">{TYPE_LABEL[entry.type]}</Badge>
                {entry.partOfSpeech && (
                  <Badge variant="secondary">{entry.partOfSpeech}</Badge>
                )}
                {entry.pronunciation && (
                  <span className="text-xs text-[#6B7280] dark:text-gray-400 italic">
                    /{entry.pronunciation}/
                  </span>
                )}
              </div>

              <p className="text-sm text-[#1F2937] dark:text-gray-200 mb-2">
                {entry.meaning}
              </p>
              <p className="text-sm text-[#6B7280] dark:text-gray-400 italic">
                "{entry.example}"
              </p>

              {entry.synonyms && entry.synonyms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {entry.synonyms.map((syn) => (
                    <Badge key={syn} variant="secondary">
                      {syn}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}