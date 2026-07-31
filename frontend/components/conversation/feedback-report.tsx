'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Award, BookOpen, SpellCheck2, Waves, Mic2, ThumbsUp, TrendingUp,
  Sparkles, GraduationCap, Lightbulb, Clock, ArrowRightCircle,
} from 'lucide-react'
import { TranscriptSection } from './transcript-section'
import { PronunciationWord, type MispronouncedWord } from './pronunciation-word'

// ─── Types matching backend conversation_service.py output ──────────────────

export interface RepeatedWord {
  word: string
  count: number
}

export interface VocabSuggestion {
  weak: string
  stronger: string
}

export interface WordToLearn {
  word: string
  meaning: string
}

export interface GrammarMistake {
  incorrect: string
  correct: string
  reason: string
}

export interface VocabularyFlashcard {
  word: string
  definition: string
  example_sentence: string
  synonym: string
}

export interface ConversationFeedback {
  overall: {
    overall_score: number
    cefr_level: string
    speaking_duration: string
    summary: string
  }
  vocabulary: {
    score: number
    strong_words_used: string[]
    repeated_words: RepeatedWord[]
    suggestions: VocabSuggestion[]
    words_to_learn: WordToLearn[]
  }
  grammar: {
    score: number
    mistakes: GrammarMistake[]
  }
  fluency: {
    score: number
    flow_comment: string
    filler_words_found: string[]
    suggested_transitions: string[]
  }
  pronunciation: {
    score: number
    notes: string
    mispronounced_words: MispronouncedWord[]
  }
  coherence_score: number
  strengths: string[]
  areas_to_improve: string[]
  sample_improved_response: string
  vocabulary_practice: VocabularyFlashcard[]
  quick_tips: string[]
}

interface FeedbackReportProps {
  feedback: ConversationFeedback
  topicTitle: string
  transcript: string
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
      : score >= 6
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800'

  return (
    <Badge variant="outline" className={`font-semibold border ${color}`}>
      {score.toFixed(1)}/10
    </Badge>
  )
}

function SectionCard({
  icon: Icon,
  title,
  score,
  children,
}: {
  icon: React.ElementType
  title: string
  score?: number
  children: React.ReactNode
}) {
  return (
    <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white">{title}</h3>
          </div>
          {score !== undefined && <ScoreBadge score={score} />}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export function FeedbackReport({ feedback, topicTitle, transcript }: FeedbackReportProps) {
  const { overall, vocabulary, grammar, fluency, pronunciation, coherence_score } = feedback

  const scoreboard = [
    { label: 'Vocabulary', value: vocabulary.score },
    { label: 'Grammar', value: grammar.score },
    { label: 'Fluency', value: fluency.score },
    { label: 'Pronunciation', value: pronunciation.score },
    { label: 'Coherence', value: coherence_score },
    { label: 'Overall', value: overall.overall_score },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. Transcript — the raw, unedited record of exactly what was said */}
      <TranscriptSection transcript={transcript} mispronouncedWords={pronunciation.mispronounced_words} />

      {/* 2. Overall Performance */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white">Overall Performance</h2>
          </div>
          <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-6">{topicTitle}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#1F2937] dark:text-white">
                {overall.overall_score.toFixed(1)}
                <span className="text-base text-[#9CA3AF] dark:text-gray-500 font-normal"> /10</span>
              </p>
              <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">Overall Score</p>
            </div>
            <div className="text-center border-x border-gray-100 dark:border-gray-800">
              <p className="text-3xl font-bold text-[#1F2937] dark:text-white">{overall.cefr_level}</p>
              <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">CEFR Level</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#1F2937] dark:text-white flex items-center justify-center gap-1.5">
                <Clock className="w-5 h-5" />
                {overall.speaking_duration}
              </p>
              <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">Speaking Duration</p>
            </div>
          </div>

          <p className="text-sm text-[#374151] dark:text-gray-300 leading-relaxed">{overall.summary}</p>

          {/* Score breakdown grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            {scoreboard.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-sm font-semibold text-[#1F2937] dark:text-white">{s.value.toFixed(1)}</p>
                <p className="text-[10px] text-[#6B7280] dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Vocabulary Analysis — highest priority, largest section */}
      <SectionCard icon={BookOpen} title="Vocabulary Analysis" score={vocabulary.score}>
        <div className="space-y-5">
          {vocabulary.strong_words_used.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">
                Strong vocabulary used
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vocabulary.strong_words_used.map((w) => (
                  <Badge key={w} variant="secondary" className="font-normal">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {vocabulary.repeated_words.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">
                Repeated words
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vocabulary.repeated_words.map((r) => (
                  <Badge
                    key={r.word}
                    variant="outline"
                    className="font-normal text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                  >
                    {r.word} ({r.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {vocabulary.suggestions.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">
                Suggestions
              </p>
              <div className="space-y-2">
                {vocabulary.suggestions.map((s) => (
                  <div key={s.weak} className="flex items-center gap-2 text-sm">
                    <span className="text-[#6B7280] dark:text-gray-400 line-through">{s.weak}</span>
                    <ArrowRightCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-[#1F2937] dark:text-white font-medium">{s.stronger}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vocabulary.words_to_learn.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Interesting vocabulary to learn
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {vocabulary.words_to_learn.map((w) => (
                  <div
                    key={w.word}
                    className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100 dark:border-blue-900/30"
                  >
                    <p className="font-semibold text-sm text-[#1F2937] dark:text-white">{w.word}</p>
                    <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">{w.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* 4. Grammar Analysis */}
      <SectionCard icon={SpellCheck2} title="Grammar Analysis" score={grammar.score}>
        {grammar.mistakes.length === 0 ? (
          <p className="text-sm text-[#6B7280] dark:text-gray-400">No major grammar issues detected — nice work.</p>
        ) : (
          <div className="space-y-4">
            {grammar.mistakes.map((m, i) => (
              <div key={i} className="border-l-2 border-red-300 dark:border-red-800 pl-4 space-y-1">
                <p className="text-sm text-red-600 dark:text-red-400">❌ {m.incorrect}</p>
                <p className="text-sm text-green-700 dark:text-green-400">✅ {m.correct}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">{m.reason}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 5. Fluency Analysis */}
      <SectionCard icon={Waves} title="Fluency Analysis" score={fluency.score}>
        <div className="space-y-3">
          {fluency.flow_comment && (
            <p className="text-sm text-[#374151] dark:text-gray-300">{fluency.flow_comment}</p>
          )}
          {fluency.filler_words_found.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">
                Filler words detected
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fluency.filler_words_found.map((f) => (
                  <Badge key={f} variant="outline" className="font-normal">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {fluency.suggested_transitions.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">
                Try connecting ideas with
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fluency.suggested_transitions.map((t) => (
                  <Badge key={t} variant="secondary" className="font-normal">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* 6. Pronunciation */}
      <SectionCard icon={Mic2} title="Pronunciation" score={pronunciation.score}>
        <div className="space-y-3">
          {pronunciation.notes && (
            <p className="text-sm text-[#374151] dark:text-gray-300">{pronunciation.notes}</p>
          )}
          {pronunciation.mispronounced_words.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280] dark:text-gray-400 mb-2">
                Words that may need clearer pronunciation — click one to hear it correctly
              </p>
              <div className="flex flex-wrap gap-y-2">
                {pronunciation.mispronounced_words.map((w) => (
                  <PronunciationWord key={w.word} data={w} />
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* 7 & 8. Strengths + Areas to Improve, side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SectionCard icon={ThumbsUp} title="Strengths">
          <ul className="space-y-2">
            {feedback.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-[#374151] dark:text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard icon={TrendingUp} title="Areas to Improve">
          <ul className="space-y-2">
            {feedback.areas_to_improve.map((a) => (
              <li key={a} className="flex items-start gap-2 text-sm text-[#374151] dark:text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* 9. Sample Improved Response */}
      {feedback.sample_improved_response && (
        <SectionCard icon={Sparkles} title="Sample Improved Response">
          <p className="text-sm text-[#374151] dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {feedback.sample_improved_response}
          </p>
        </SectionCard>
      )}

      {/* 10. Vocabulary Practice — flashcards */}
      {feedback.vocabulary_practice.length > 0 && (
        <SectionCard icon={GraduationCap} title="Vocabulary Practice">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {feedback.vocabulary_practice.map((card) => (
              <div
                key={card.word}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
              >
                <p className="font-semibold text-[#1F2937] dark:text-white">{card.word}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">{card.definition}</p>
                {card.example_sentence && (
                  <p className="text-xs text-[#374151] dark:text-gray-300 italic mt-2">
                    &ldquo;{card.example_sentence}&rdquo;
                  </p>
                )}
                {card.synonym && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Synonym: {card.synonym}</p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 11. Quick Tips */}
      {feedback.quick_tips.length > 0 && (
        <SectionCard icon={Lightbulb} title="Quick Tips">
          <ul className="space-y-2">
            {feedback.quick_tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-[#374151] dark:text-gray-300">
                <span className="text-green-500 shrink-0">✔</span>
                {tip}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}