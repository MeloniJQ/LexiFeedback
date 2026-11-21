'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Shared analytics UI. Used by BOTH /dashboard/feedback and /dashboard/progress
// so the two pages always show identical, fully labelled graphs (every graph
// names its X axis, Y axis and scale).
// ---------------------------------------------------------------------------

export const TYPE_COLORS: Record<string, string> = {
  interview: '#2C5AA0',
  presentation: '#8B5CF6',
  conversation: '#10B981',
  reading: '#F59E0B',
  tv_anchor: '#EF4444',
}

export const MODES = [
  { key: 'interview', label: 'Interview', emoji: '💼' },
  { key: 'presentation', label: 'Presentation', emoji: '🎤' },
  { key: 'conversation', label: 'Conversation', emoji: '💬' },
  { key: 'reading', label: 'Reading', emoji: '📖' },
  { key: 'tv_anchor', label: 'TV News Anchor', emoji: '📺' },
]

const AXIS_COLOR = '#6B7280'
const GRID_COLOR = '#9CA3AF'
const TOOLTIP_STYLE = { backgroundColor: '#1F2937', border: '1px solid #4B5563', borderRadius: '8px' }

function formatShortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// The mode a saved session belongs to. TV News Anchor practice is saved as a
// "reading" session titled "TV News Anchor Practice", so split it out here.
export function sessionMode(s: any): string {
  const t = (s?.session_type || '').toLowerCase()
  if (t === 'reading' && (s?.title || '').toLowerCase().includes('tv news anchor')) return 'tv_anchor'
  return t
}

export function modeLabel(key: string): string {
  return MODES.find((m) => m.key === key)?.label ?? key
}

// "7/10" -> 7 (always normalised to a 0–10 scale). Returns null if unscored.
export function parseScore(score: string | null | undefined): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(score || '')
  if (!m) return null
  const denom = parseFloat(m[2])
  if (!denom) return null
  return Math.round((parseFloat(m[1]) / denom) * 100) / 10
}

// ── Small colourful building blocks ─────────────────────────────────────────

export function ModeBadge({ session }: { session: any }) {
  const key = sessionMode(session)
  const color = TYPE_COLORS[key] || '#6B7280'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {modeLabel(key)}
    </span>
  )
}

export function ScoreBadge({ score }: { score: string | null | undefined }) {
  const v = parseScore(score)
  const bg = v === null ? 'bg-gray-400' : v >= 8 ? 'bg-emerald-500' : v >= 5 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-semibold whitespace-nowrap ${bg}`}>
      {score || '—'}
    </span>
  )
}

export function AnalyticsBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 rounded-2xl p-8 text-white shadow-lg bg-linear-to-r from-[#2C5AA0] via-purple-600 to-teal-500">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-white/85">{subtitle}</p>
    </div>
  )
}

const STAT_COLORS = {
  blue: 'from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/30 dark:to-blue-800/10 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  purple: 'from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/30 dark:to-purple-800/10 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  emerald: 'from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/10 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  orange: 'from-orange-50 to-orange-100 border-orange-200 dark:from-orange-900/30 dark:to-orange-800/10 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  teal: 'from-teal-50 to-teal-100 border-teal-200 dark:from-teal-900/30 dark:to-teal-800/10 dark:border-teal-800 text-teal-700 dark:text-teal-300',
  rose: 'from-rose-50 to-rose-100 border-rose-200 dark:from-rose-900/30 dark:to-rose-800/10 dark:border-rose-800 text-rose-700 dark:text-rose-300',
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  icon?: React.ReactNode
  color: keyof typeof STAT_COLORS
}) {
  return (
    <div className={`bg-linear-to-br ${STAT_COLORS[color]} border rounded-xl p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-sm opacity-80 mt-1">{sub}</p>}
    </div>
  )
}

function GraphCard({
  title,
  subtitle,
  accent,
  emoji,
  children,
}: {
  title: string
  subtitle: string
  accent: string
  emoji?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm h-full"
      style={{ borderTop: `4px solid ${accent}`, backgroundImage: `linear-gradient(180deg, ${accent}14, transparent 140px)` }}
    >
      <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-1">
        {emoji && <span className="mr-2">{emoji}</span>}
        {title}
      </h2>
      <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-4">{subtitle}</p>
      {children}
    </div>
  )
}

function Empty({ height, text }: { height: number; text: string }) {
  return (
    <div
      style={{ height }}
      className="flex items-center justify-center text-center px-6 text-[#6B7280] dark:text-gray-400 text-sm"
    >
      {text}
    </div>
  )
}

const xLabel = (value: string) => ({
  value,
  position: 'insideBottom' as const,
  offset: -12,
  fill: AXIS_COLOR,
  fontSize: 12,
})

const yLabel = (value: string) => ({
  value,
  angle: -90,
  position: 'insideLeft' as const,
  style: { textAnchor: 'middle' as const },
  fill: AXIS_COLOR,
  fontSize: 12,
})

// ── Graphs ──────────────────────────────────────────────────────────────────

// One graph per practice mode: score of every session, oldest -> newest.
function ModeScoreChart({ mode, sessions }: { mode: (typeof MODES)[number]; sessions: any[] }) {
  const color = TYPE_COLORS[mode.key]
  const all = sessions
    .filter((s) => sessionMode(s) === mode.key)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const points = all
    .map((s) => ({ score: parseScore(s.score), date: s.created_at, title: s.title }))
    .filter((p) => p.score !== null)
    .map((p, i) => ({
      n: i + 1,
      score: p.score as number,
      dateLabel: isNaN(new Date(p.date).getTime())
        ? ''
        : new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      title: p.title || '',
    }))

  const avg = points.length ? (points.reduce((t, p) => t + p.score, 0) / points.length).toFixed(1) : '—'
  const best = points.length ? Math.max(...points.map((p) => p.score)).toFixed(1) : '—'
  const latest = points.length ? points[points.length - 1].score.toFixed(1) : '—'
  const gradId = `modeGrad-${mode.key}`

  return (
    <GraphCard
      title={`${mode.label} Scores`}
      emoji={mode.emoji}
      accent={color}
      subtitle="Score of every session · Scale: 0–10 (10 = best)"
    >
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        {[
          ['Sessions', String(all.length)],
          ['Average', avg === '—' ? avg : `${avg}/10`],
          ['Best', best === '—' ? best : `${best}/10`],
          ['Latest', latest === '—' ? latest : `${latest}/10`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg py-2" style={{ backgroundColor: `${color}1A` }}>
            <p className="text-[11px] uppercase tracking-wide text-[#6B7280] dark:text-gray-400">{k}</p>
            <p className="text-sm font-bold" style={{ color }}>
              {v}
            </p>
          </div>
        ))}
      </div>

      {points.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={points} margin={{ top: 10, right: 20, left: 4, bottom: 28 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.45} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} strokeOpacity={0.3} />
            <XAxis
              dataKey="n"
              stroke={AXIS_COLOR}
              allowDecimals={false}
              interval="preserveStartEnd"
              label={xLabel('Session number (1 = oldest)')}
            />
            <YAxis
              stroke={AXIS_COLOR}
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              width={52}
              label={yLabel('Score (out of 10)')}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: '#F9FAFB' }}
              labelFormatter={(_: any, payload: any) => {
                const p = payload?.[0]?.payload
                return p ? `Session ${p.n}${p.dateLabel ? ` · ${p.dateLabel}` : ''}` : ''
              }}
              formatter={(value: any) => [`${value}/10`, 'Score']}
            />
            <Area
              type="monotone"
              dataKey="score"
              name="Score"
              stroke={color}
              fill={`url(#${gradId})`}
              strokeWidth={2}
              dot={{ r: 4, fill: color }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <Empty
          height={260}
          text={`No scored ${mode.label} sessions yet. Complete one to see your score graph here.`}
        />
      )}
    </GraphCard>
  )
}

export function SkillsProgressChart({ stats }: { stats: any }) {
  const colorFor = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('tv')) return TYPE_COLORS.tv_anchor
    if (l.includes('interview')) return TYPE_COLORS.interview
    if (l.includes('presentation')) return TYPE_COLORS.presentation
    if (l.includes('conversation')) return TYPE_COLORS.conversation
    return TYPE_COLORS.reading
  }

  const data =
    stats.skills_progress && stats.skills_progress.length > 0
      ? stats.skills_progress.map((s: any) => ({
          category: s.skill
            .replace(' Practice', '')
            .replace(' Skills', '')
            .replace(' Fluency', '')
            .replace(' Comprehension', ''),
          score: s.progress,
        }))
      : MODES.map((m) => ({ category: m.label, score: 0 }))

  return (
    <GraphCard
      title="Skills Progress"
      emoji="🎯"
      accent="#2C5AA0"
      subtitle="Average score per practice mode · Scale: 0–100% (100 = best)"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 4, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} strokeOpacity={0.3} />
          <XAxis dataKey="category" stroke={AXIS_COLOR} interval={0} tick={{ fontSize: 11 }} label={xLabel('Practice mode')} />
          <YAxis
            stroke={AXIS_COLOR}
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            width={56}
            label={yLabel('Average score (%)')}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#F9FAFB' }} formatter={(v: any) => [`${v}%`, 'Average score']} />
          <Bar dataKey="score" name="Average score (%)" radius={[8, 8, 0, 0]}>
            {data.map((d: any) => (
              <Cell key={d.category} fill={colorFor(d.category)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </GraphCard>
  )
}

export function ActivityTimelineChart({ stats }: { stats: any }) {
  const data = (stats.activity_timeline || []).map((d: any) => ({ ...d, label: formatShortDate(d.date) }))
  const hasData = data.some((d: any) => d.total > 0)

  return (
    <GraphCard
      title="Activity Timeline"
      emoji="📅"
      accent="#8B5CF6"
      subtitle="Practice sessions completed per day, all modes · Scale: whole sessions, last 30 days"
    >
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 4, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} strokeOpacity={0.3} />
            <XAxis dataKey="label" stroke={AXIS_COLOR} interval={4} label={xLabel('Date (last 30 days)')} />
            <YAxis
              stroke={AXIS_COLOR}
              allowDecimals={false}
              width={52}
              label={yLabel('Sessions per day (count)')}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#F9FAFB' }} />
            <Legend verticalAlign="top" height={28} />
            <Bar dataKey="interview" name="Interview" stackId="a" fill={TYPE_COLORS.interview} />
            <Bar dataKey="presentation" name="Presentation" stackId="a" fill={TYPE_COLORS.presentation} />
            <Bar dataKey="conversation" name="Conversation" stackId="a" fill={TYPE_COLORS.conversation} />
            <Bar dataKey="reading" name="Reading" stackId="a" fill={TYPE_COLORS.reading} />
            <Bar dataKey="tv_anchor" name="TV News Anchor" stackId="a" fill={TYPE_COLORS.tv_anchor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Empty height={300} text="No practice sessions in the last 30 days yet." />
      )}
    </GraphCard>
  )
}

export function VocabularyGrowthChart({ stats }: { stats: any }) {
  const data = (stats.vocabulary?.timeline || []).map((d: any) => ({ ...d, label: formatShortDate(d.date) }))
  const total = stats.vocabulary?.total_learned ?? 0

  return (
    <GraphCard
      title="Vocabulary Growth"
      emoji="📚"
      accent="#0D9488"
      subtitle="Words & idioms saved from Word of the Day · Scale: running total, last 30 days"
    >
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        {[
          ['Learned', String(total)],
          ['This week', String(stats.vocabulary?.learned_this_week ?? 0)],
          ['Daily avg', ((stats.vocabulary?.learned_this_week ?? 0) / 7).toFixed(1)],
          ['Streak', `${stats.streak ?? 0}d`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg py-2" style={{ backgroundColor: '#0D948820' }}>
            <p className="text-[11px] uppercase tracking-wide text-[#6B7280] dark:text-gray-400">{k}</p>
            <p className="text-sm font-bold" style={{ color: '#0D9488' }}>
              {v}
            </p>
          </div>
        ))}
      </div>

      {total > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 4, bottom: 28 }}>
            <defs>
              <linearGradient id="vocabGradientShared" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} strokeOpacity={0.3} />
            <XAxis dataKey="label" stroke={AXIS_COLOR} interval={4} label={xLabel('Date (last 30 days)')} />
            <YAxis
              stroke={AXIS_COLOR}
              allowDecimals={false}
              width={52}
              label={yLabel('Total words learned (count)')}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#F9FAFB' }} />
            <Area
              type="monotone"
              dataKey="cumulative"
              name="Total words learned"
              stroke="#0D9488"
              fill="url(#vocabGradientShared)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <Empty height={260} text="No words saved yet — save words from your daily Word of the Day to see progress here." />
      )}
    </GraphCard>
  )
}

export function PracticeGraphs({
  stats,
  sessions,
  showSkills = true,
}: {
  stats: any
  sessions: any[]
  showSkills?: boolean
}) {
  return (
    <div className="space-y-8 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {showSkills && <SkillsProgressChart stats={stats} />}
        <ActivityTimelineChart stats={stats} />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-4">Score by Practice Mode</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {MODES.filter((m) => m.key !== 'tv_anchor').map((m) => (
            <ModeScoreChart key={m.key} mode={m} sessions={sessions} />
          ))}
        </div>
      </div>

      {/* TV News Anchor + Word of the Day, side by side like the graphs above */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ModeScoreChart mode={MODES.find((m) => m.key === 'tv_anchor')!} sessions={sessions} />
        <VocabularyGrowthChart stats={stats} />
      </div>
    </div>
  )
}
