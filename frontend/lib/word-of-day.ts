/**
 * "Word / Phrase / Idiom of the Day" feature.
 *
 * Design:
 * - "Word" entries come from word-dataset.json — a curated, bundled dataset
 *   of 1,200 real English words (400 per level), each with a genuine
 *   definition, example sentence, and synonyms, derived from the open
 *   source Wordset Dictionary (wordset/wordset-dictionary on GitHub, MIT
 *   licensed) and leveled using a common-word-frequency list. Since it's
 *   bundled with the app, word lookups are instant, offline, and never
 *   missing an example — no live API calls needed for this part.
 * - "Idiom"/"phrase" entries stay hand-curated (IDIOM_BANK), since no good
 *   public dataset exists for idiom definitions.
 * - History/proficiency persist in localStorage (per-browser). Saved
 *   vocabulary persists server-side via /api/vocabulary, tied to the
 *   user's account, so it's the same on every browser/device.
 */

import { getUser } from './auth'
import { apiCall, API_URL } from './api'
import WORD_DATASET from './word-dataset.json'

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type EntryType = 'word' | 'idiom' | 'phrase'

export interface WordEntry {
  id: string
  term: string
  type: EntryType
  level: ProficiencyLevel
  partOfSpeech?: string
  pronunciation?: string
  meaning: string
  example: string
  synonyms?: string[]
}

// ---------------------------------------------------------------------------
// Idioms & phrases (curated — no good public dataset for these)
// ---------------------------------------------------------------------------

export const IDIOM_BANK: WordEntry[] = [
  // Beginner
  { id: 'bi1', term: 'Piece of cake', type: 'idiom', level: 'Beginner', meaning: 'Something that is very easy to do.', example: "Don't worry about the test — it will be a piece of cake." },
  { id: 'bi2', term: 'In a nutshell', type: 'phrase', level: 'Beginner', meaning: 'In summary; briefly.', example: 'In a nutshell, the meeting went well.' },
  { id: 'bi3', term: 'Break the ice', type: 'idiom', level: 'Beginner', meaning: 'To make people feel more relaxed in a social situation.', example: 'He told a joke to break the ice at the meeting.' },
  { id: 'bi4', term: 'Once in a while', type: 'phrase', level: 'Beginner', meaning: 'Occasionally; not very often.', example: 'We eat out once in a while.' },
  { id: 'bi5', term: 'Under the weather', type: 'idiom', level: 'Beginner', meaning: 'Feeling slightly ill.', example: "I'm feeling a bit under the weather today." },
  { id: 'bi6', term: 'Sound asleep', type: 'phrase', level: 'Beginner', meaning: 'Sleeping very deeply.', example: 'The baby was sound asleep by eight o\u2019clock.' },
  { id: 'bi7', term: 'Speak up', type: 'phrase', level: 'Beginner', meaning: 'To talk louder, or to say what you think openly.', example: 'Please speak up, I can\u2019t hear you.' },
  { id: 'bi8', term: 'Best of both worlds', type: 'phrase', level: 'Beginner', meaning: 'A situation where you can enjoy two different advantages at the same time.', example: 'Working from a café gives me the best of both worlds — quiet and coffee.' },
  { id: 'bi9', term: 'Give it a shot', type: 'phrase', level: 'Beginner', meaning: 'To try something.', example: "I've never cooked Thai food before, but I'll give it a shot." },
  { id: 'bi10', term: 'Time flies', type: 'phrase', level: 'Beginner', meaning: 'Time passes very quickly.', example: 'Time flies when you\u2019re having fun.' },
  { id: 'bi11', term: 'Make up your mind', type: 'phrase', level: 'Beginner', meaning: 'To decide something.', example: 'You need to make up your mind about which job to take.' },
  { id: 'bi12', term: 'Keep an eye on', type: 'phrase', level: 'Beginner', meaning: 'To watch or take care of something or someone.', example: 'Can you keep an eye on my bag for a minute?' },
  { id: 'bi13', term: 'Sick and tired', type: 'phrase', level: 'Beginner', meaning: 'Very annoyed about something that has happened for too long.', example: "I'm sick and tired of waiting in traffic every morning." },
  { id: 'bi14', term: 'Out of the blue', type: 'idiom', level: 'Beginner', meaning: 'Happening suddenly and unexpectedly.', example: 'She called me out of the blue after years of silence.' },
  { id: 'bi15', term: 'A piece of my mind', type: 'phrase', level: 'Beginner', meaning: 'A blunt, honest opinion given especially when angry.', example: 'I gave him a piece of my mind after he was late again.' },

  // Intermediate
  { id: 'ii1', term: 'Hit the nail on the head', type: 'idiom', level: 'Intermediate', meaning: 'To describe exactly what is causing a situation.', example: 'You hit the nail on the head with that comment.' },
  { id: 'ii2', term: 'Bite the bullet', type: 'phrase', level: 'Intermediate', meaning: 'To accept something difficult or unpleasant.', example: 'We had to bite the bullet and cancel the trip.' },
  { id: 'ii3', term: 'Cut corners', type: 'idiom', level: 'Intermediate', meaning: 'To do something in the easiest or cheapest way, often at the expense of quality.', example: 'The builder cut corners and the roof leaked.' },
  { id: 'ii4', term: 'Get the ball rolling', type: 'phrase', level: 'Intermediate', meaning: 'To start something, especially a group activity.', example: "Let's get the ball rolling on this project." },
  { id: 'ii5', term: 'Spill the beans', type: 'idiom', level: 'Intermediate', meaning: 'To reveal secret information.', example: 'Someone spilled the beans about the surprise party.' },
  { id: 'ii6', term: 'On the same page', type: 'phrase', level: 'Intermediate', meaning: 'In agreement; having the same understanding.', example: "Let's make sure we're on the same page before we start." },
  { id: 'ii7', term: 'Beat around the bush', type: 'idiom', level: 'Intermediate', meaning: 'To avoid talking about something directly.', example: 'Stop beating around the bush and tell me the truth.' },
  { id: 'ii8', term: 'Call it a day', type: 'phrase', level: 'Intermediate', meaning: 'To decide to stop doing something for the day.', example: "Let's call it a day and finish the rest tomorrow." },
  { id: 'ii9', term: 'Cost an arm and a leg', type: 'idiom', level: 'Intermediate', meaning: 'To be very expensive.', example: 'That designer bag cost an arm and a leg.' },
  { id: 'ii10', term: 'Once in a blue moon', type: 'phrase', level: 'Intermediate', meaning: 'Very rarely.', example: 'We only go to the theater once in a blue moon.' },
  { id: 'ii11', term: 'Jump on the bandwagon', type: 'idiom', level: 'Intermediate', meaning: 'To join something popular that others are already doing.', example: 'Once the trend took off, more companies jumped on the bandwagon.' },
  { id: 'ii12', term: 'Keep your fingers crossed', type: 'phrase', level: 'Intermediate', meaning: 'To hope that something will happen the way you want.', example: "I've applied for the job — keep your fingers crossed for me." },
  { id: 'ii13', term: 'Throw in the towel', type: 'idiom', level: 'Intermediate', meaning: 'To give up on something.', example: 'After three failed attempts, he threw in the towel.' },
  { id: 'ii14', term: 'Under the radar', type: 'phrase', level: 'Intermediate', meaning: 'Without attracting attention.', example: 'The small startup grew quickly while staying under the radar.' },
  { id: 'ii15', term: 'Go the extra mile', type: 'phrase', level: 'Intermediate', meaning: 'To make more effort than expected.', example: 'She always goes the extra mile to help her students.' },

  // Advanced
  { id: 'ai1', term: 'A blessing in disguise', type: 'idiom', level: 'Advanced', meaning: 'Something that seems bad at first but turns out to have a good result.', example: 'Losing that job turned out to be a blessing in disguise.' },
  { id: 'ai2', term: 'Read between the lines', type: 'phrase', level: 'Advanced', meaning: 'To understand a hidden or implied meaning.', example: 'You need to read between the lines of his email to understand his real concern.' },
  { id: 'ai3', term: 'Burn the midnight oil', type: 'idiom', level: 'Advanced', meaning: 'To work late into the night.', example: 'She burned the midnight oil to finish the report on time.' },
  { id: 'ai4', term: 'At a crossroads', type: 'phrase', level: 'Advanced', meaning: 'Facing an important decision.', example: 'The company is at a crossroads in deciding its future strategy.' },
  { id: 'ai5', term: 'Bite off more than you can chew', type: 'idiom', level: 'Advanced', meaning: 'To take on more responsibility than you can manage.', example: 'He bit off more than he could chew by taking on three jobs at once.' },
  { id: 'ai6', term: 'Move the goalposts', type: 'phrase', level: 'Advanced', meaning: 'To unfairly change the rules or criteria for something partway through.', example: "It's hard to win when they keep moving the goalposts." },
  { id: 'ai7', term: 'Cast doubt on', type: 'phrase', level: 'Advanced', meaning: 'To make something seem less certain or trustworthy.', example: 'New evidence cast doubt on the original findings.' },
  { id: 'ai8', term: 'A double-edged sword', type: 'idiom', level: 'Advanced', meaning: 'Something with both positive and negative consequences.', example: 'Social media is a double-edged sword for small businesses.' },
  { id: 'ai9', term: 'Par for the course', type: 'phrase', level: 'Advanced', meaning: 'Typical or expected in a given situation, often something unwelcome.', example: 'Delays at this airport are par for the course.' },
  { id: 'ai10', term: 'Play devil\u2019s advocate', type: 'phrase', level: 'Advanced', meaning: 'To argue the opposite side of a debate, not because you believe it but to test the argument.', example: 'Let me play devil\u2019s advocate for a moment and question that assumption.' },
  { id: 'ai11', term: 'Rule of thumb', type: 'phrase', level: 'Advanced', meaning: 'A broadly accurate general principle, not based on precise measurement.', example: 'As a rule of thumb, save at least ten percent of your income.' },
  { id: 'ai12', term: 'Sit on the fence', type: 'idiom', level: 'Advanced', meaning: 'To avoid taking a side in a disagreement or decision.', example: 'The senator has been sitting on the fence about the new policy.' },
  { id: 'ai13', term: 'Straw that broke the camel\u2019s back', type: 'idiom', level: 'Advanced', meaning: 'The final small problem in a series that causes a bigger reaction.', example: 'The missed deadline was the straw that broke the camel\u2019s back.' },
  { id: 'ai14', term: 'Take something with a grain of salt', type: 'phrase', level: 'Advanced', meaning: 'To not fully believe something; to view it with skepticism.', example: 'You should take online reviews with a grain of salt.' },
  { id: 'ai15', term: 'Water under the bridge', type: 'idiom', level: 'Advanced', meaning: 'A past problem that is no longer important and has been forgiven or forgotten.', example: 'We used to argue about it, but that\u2019s water under the bridge now.' },
]

// ---------------------------------------------------------------------------
// Bundled word dataset (1,200 words: 400 per level, real definitions +
// examples + synonyms, sourced from the open Wordset Dictionary)
// ---------------------------------------------------------------------------

interface DatasetItem {
  term: string
  partOfSpeech: string | null
  meaning: string
  example: string
  synonyms: string[]
}

const TYPED_DATASET = WORD_DATASET as unknown as Record<ProficiencyLevel, DatasetItem[]>

function toWordEntry(item: DatasetItem, level: ProficiencyLevel): WordEntry {
  return {
    id: `w:${item.term.toLowerCase()}`,
    term: item.term,
    type: 'word',
    level,
    partOfSpeech: item.partOfSpeech || undefined,
    meaning: item.meaning,
    example: item.example,
    synonyms: item.synonyms,
  }
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'lexi_wod'

function userNamespace(): string {
  if (typeof window === 'undefined') return 'guest'
  const user = getUser()
  return user?.id ? `u${user.id}` : user?.email ? user.email : 'guest'
}

function storageKey(name: string): string {
  return `${KEY_PREFIX}:${name}:${userNamespace()}`
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage may be unavailable (private mode, quota, etc.) — fail silently
  }
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Proficiency level
// ---------------------------------------------------------------------------

export function getProficiency(): ProficiencyLevel {
  return readJSON<ProficiencyLevel>(storageKey('proficiency'), 'Intermediate')
}

export function setProficiency(level: ProficiencyLevel) {
  writeJSON(storageKey('proficiency'), level)
}

// ---------------------------------------------------------------------------
// History (per-browser — doesn't need to sync)
// ---------------------------------------------------------------------------

const MAX_HISTORY = 300

export function getHistory(): string[] {
  return readJSON<string[]>(storageKey('history'), [])
}

function addToHistory(id: string) {
  const history = getHistory().filter((h) => h !== id)
  history.push(id)
  writeJSON(storageKey('history'), history.slice(-MAX_HISTORY))
}

// ---------------------------------------------------------------------------
// Saved vocabulary — stored server-side (tied to the user's account via
// /api/vocabulary), so it's the same list no matter which browser or
// device they're logged in from.
// ---------------------------------------------------------------------------

export async function getSavedVocabulary(): Promise<WordEntry[]> {
  try {
    const data = await apiCall(`${API_URL}/vocabulary`, { method: 'GET' })
    return data.entries || []
  } catch {
    return [] // not logged in, offline, or server unreachable
  }
}

export async function getSavedIds(): Promise<string[]> {
  const entries = await getSavedVocabulary()
  return entries.map((e) => e.id)
}

export async function saveToVocabulary(entry: WordEntry): Promise<boolean> {
  try {
    await apiCall(`${API_URL}/vocabulary`, {
      method: 'POST',
      body: JSON.stringify(entry),
    })
    return true
  } catch {
    return false
  }
}

export async function removeFromVocabulary(id: string): Promise<boolean> {
  try {
    await apiCall(`${API_URL}/vocabulary/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Daily gating
// ---------------------------------------------------------------------------

export function shouldShowToday(): boolean {
  const last = readJSON<string | null>(storageKey('last_shown'), null)
  return last !== todayString()
}

export function markShownToday() {
  writeJSON(storageKey('last_shown'), todayString())
}

// ---------------------------------------------------------------------------
// Picking a word
// ---------------------------------------------------------------------------

const IDIOM_CHANCE = 0.3 // ~30% of the time, serve a curated idiom/phrase instead of a word

function pickUnseen<T extends { id: string }>(pool: T[], history: string[], exclude: Set<string>): T[] {
  return pool.filter((w) => !history.includes(w.id) && !exclude.has(w.id))
}

/**
 * Picks the next entry for a given proficiency level, from the bundled
 * dataset (words) or IDIOM_BANK (idioms/phrases). Prioritizes anything this
 * user hasn't seen before; once every entry at a level has been seen, falls
 * back to the least-recently-shown one so repeats are spaced out.
 *
 * Kept async for compatibility with callers — the lookup itself is
 * synchronous now since everything is bundled, no network required.
 */
export async function pickWord(level: ProficiencyLevel, excludeIds: string[] = []): Promise<WordEntry> {
  const history = getHistory()
  const exclude = new Set(excludeIds)
  const wantIdiom = Math.random() < IDIOM_CHANCE

  const idiomPool = IDIOM_BANK.filter((w) => w.level === level)
  const wordPool = (TYPED_DATASET[level] || []).map((item) => toWordEntry(item, level))

  if (wantIdiom) {
    const unseenIdioms = pickUnseen(idiomPool, history, exclude)
    const idiomChoices = unseenIdioms.length ? unseenIdioms : idiomPool.filter((w) => !exclude.has(w.id))
    if (idiomChoices.length > 0) {
      return idiomChoices[Math.floor(Math.random() * idiomChoices.length)]
    }
  }

  const unseenWords = pickUnseen(wordPool, history, exclude)
  const wordChoices = unseenWords.length ? unseenWords : wordPool.filter((w) => !exclude.has(w.id))
  if (wordChoices.length > 0) {
    return wordChoices[Math.floor(Math.random() * wordChoices.length)]
  }

  // Extremely unlikely fallback: everything at this level has been excluded
  const idiomChoices = pickUnseen(idiomPool, history, exclude)
  if (idiomChoices.length > 0) {
    return idiomChoices[Math.floor(Math.random() * idiomChoices.length)]
  }
  return wordPool[0] ?? idiomPool[0]
}

export function recordShown(id: string) {
  addToHistory(id)
}