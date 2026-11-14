import { formatLatency, type EvalResults } from './evalResults'
import { siteData } from './siteData'
import type { SourceDef } from '../tools/registry'
import type { RetrievalMode } from '../composables/useToolRetrieval'

/**
 * The only producer of displayed statistic values (spec 007 FR-007/SC-003,
 * contract `contracts/statistics-band.md` C1–C2).
 *
 * Every value is derived from data that already ships with the site —
 * `siteData.ts`, the committed `evalResults.ts` artifact, `registry.ts` and the
 * build year. Nothing is hand-entered, nothing is read from the visitor's
 * clock, the network or storage, and a statistic whose source cannot be read is
 * dropped instead of being replaced with `0`, `—` or "n/a".
 */

export type StatGroupId = 'career' | 'engineering'

export type StatFormat =
  | { kind: 'integer' }
  | { kind: 'percent'; decimals: 0 | 1 }
  | { kind: 'duration-ms' }
  | { kind: 'text' }

export interface StatSource {
  /** In-page anchor (`#about-skills`, `#blog-chat-with-my-website`). */
  href: string
  /** Link text a visitor can read, e.g. "see education". */
  label: string
}

export interface Statistic {
  id: string
  group: StatGroupId
  label: string
  note: string
  /** `null` never reaches the DOM: it drops the statistic. */
  value: number | string | null
  numeric: boolean
  format: StatFormat
  suffix?: string
  source: StatSource
}

export interface StatisticGroup {
  id: StatGroupId
  title: string
  blurb: string
  stats: Statistic[]
}

export interface BuildContext {
  /** Compile-time constant injected by Vite (`__BUILD_YEAR__`). */
  buildYear: number
  site: typeof siteData
  eval: EvalResults
  sources: SourceDef[]
  maxInjectChars: number
  defaultMode: RetrievalMode
}

interface StatDraft {
  id: string
  group: StatGroupId
  label: string
  note: string
  value: number | string | null
  format: StatFormat
  suffix?: string
  source: StatSource
}

const ARTICLE: StatSource = { href: '#blog-chat-with-my-website', label: 'how this works' }
const EVALUATION: StatSource = { href: '#eval-results', label: 'the evaluation' }
const EDUCATION: StatSource = { href: '#about-education', label: 'see education' }
const SKILLS: StatSource = { href: '#about-skills', label: 'see skills' }
const CONTACT: StatSource = { href: '#contact', label: 'see contact' }

/** A draft becomes a rendered statistic only when a value exists. */
function finish(draft: StatDraft): Statistic | null {
  const { value } = draft
  if (value === null) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null
    return { ...draft, value, numeric: draft.format.kind !== 'text' }
  }
  if (!value.trim()) return null
  return { ...draft, value, numeric: false }
}

/** First four-digit year in a period string ("2012–2016", "2017–2022, part-time"). */
function parseStartYear(period: string): number | null {
  const match = /^(\d{4})/.exec(period.trim())
  return match ? Number(match[1]) : null
}

function careerYears(ctx: BuildContext): Statistic | null {
  const starts = ctx.site.education
    .map((entry) => parseStartYear(entry.period))
    .filter((year): year is number => year !== null)
  if (!starts.length) return null
  const start = Math.min(...starts)
  return finish({
    id: 'career-years',
    group: 'career',
    label: 'Building software',
    note: `since the first degree started in ${start}`,
    value: ctx.buildYear - start,
    format: { kind: 'integer' },
    suffix: 'yrs',
    source: EDUCATION,
  })
}

function degrees(ctx: BuildContext): Statistic | null {
  const count = ctx.site.education.length
  return finish({
    id: 'degrees',
    group: 'career',
    label: 'Degrees',
    note: 'B.Sc. and M.Sc. in computer science',
    value: count,
    format: { kind: 'integer' },
    source: EDUCATION,
  })
}

function tools(ctx: BuildContext): Statistic | null {
  const total = ctx.site.skills.reduce((sum, group) => sum + group.items.length, 0)
  return finish({
    id: 'tools',
    group: 'career',
    label: 'Tools & technologies',
    note: 'named across the skill groups',
    value: total,
    format: { kind: 'integer' },
    source: SKILLS,
  })
}

function base(ctx: BuildContext): Statistic | null {
  const { location, employer } = ctx.site
  if (!location?.trim() || !employer?.trim()) return null
  return finish({
    id: 'base',
    group: 'career',
    label: 'Based in',
    note: 'where the work happens',
    value: `${location} · ${employer}`,
    format: { kind: 'text' },
    source: CONTACT,
  })
}

function modelParams(ctx: BuildContext): Statistic | null {
  const chatModel = ctx.site.tech.find((entry) => entry.icon === 'chip')
  if (!chatModel) return null
  for (const tag of chatModel.tags) {
    const match = /(\d+)M/.exec(tag)
    if (!match) continue
    return finish({
      id: 'model-params',
      group: 'engineering',
      label: 'Model parameters',
      note: 'running in your browser',
      value: Number(match[1]),
      format: { kind: 'integer' },
      suffix: 'M',
      source: ARTICLE,
    })
  }
  return null
}

function contentSources(ctx: BuildContext): Statistic | null {
  const count = ctx.sources.filter((source) => source.kind === 'content').length
  return finish({
    id: 'sources',
    group: 'engineering',
    label: 'Content sources',
    note: 'the retriever chooses between',
    value: count,
    format: { kind: 'integer' },
    source: ARTICLE,
  })
}

function hitRate(ctx: BuildContext): Statistic | null {
  const rates = ctx.eval.modes
    .map((mode) => mode.splits.test.retrievalHitRate)
    .filter((rate) => Number.isFinite(rate))
  if (!rates.length) return null
  return finish({
    id: 'hit-rate',
    group: 'engineering',
    label: 'Retrieval hit rate',
    note: 'top-k recall on held-out questions',
    value: Math.max(...rates),
    format: { kind: 'percent', decimals: 0 },
    suffix: '%',
    source: EVALUATION,
  })
}

function latency(ctx: BuildContext): Statistic | null {
  const mode = ctx.eval.modes.find((entry) => entry.mode === ctx.defaultMode)
  const ms = mode?.splits.test.meanLatencyMs
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return null
  const formatted = formatLatency(ms)
  if (formatted.startsWith('<')) {
    // Sub-millisecond results have no digits to count; render the text as-is.
    return finish({
      id: 'latency',
      group: 'engineering',
      label: 'Retrieval time',
      note: 'average in the default mode',
      value: formatted,
      format: { kind: 'text' },
      source: EVALUATION,
    })
  }
  return finish({
    id: 'latency',
    group: 'engineering',
    label: 'Retrieval time',
    note: `average in ${ctx.defaultMode} mode`,
    value: ms,
    format: { kind: 'duration-ms' },
    suffix: 'ms',
    source: EVALUATION,
  })
}

const GROUP_META: Record<StatGroupId, { title: string; blurb: string }> = {
  career: {
    title: 'The person',
    blurb: 'Counted from the about content on this page.',
  },
  engineering: {
    title: 'This site',
    blurb: 'Measured on this deployment — the retriever and model that run in your browser.',
  },
}

/** Digits shown for a number; the unit (`%`, `ms`, `M`, `yrs`) stays static. */
export function formatStatValue(value: number | string, format: StatFormat): string {
  if (typeof value === 'string') return value
  switch (format.kind) {
    case 'integer':
      return String(Math.round(value))
    case 'percent':
      return (value * 100).toFixed(format.decimals)
    case 'duration-ms':
      return value < 0.5 ? '< 1' : String(Math.round(value))
    case 'text':
      return String(value)
  }
}

/** Final value as one readable string, including the static unit. */
export function formatStatText(stat: Statistic): string {
  return `${formatStatValue(stat.value ?? '', stat.format)}${stat.suffix ?? ''}`
}

/**
 * Pure, deterministic, I/O-free: the same input always produces the same band.
 */
export function buildStatGroups(ctx: BuildContext): StatisticGroup[] {
  const candidates: Statistic[] = [
    careerYears(ctx),
    degrees(ctx),
    tools(ctx),
    base(ctx),
    modelParams(ctx),
    contentSources(ctx),
    hitRate(ctx),
    latency(ctx),
  ].filter((stat): stat is Statistic => stat !== null)

  const order: StatGroupId[] = ['career', 'engineering']
  return order
    .map((id) => ({
      id,
      ...GROUP_META[id],
      stats: candidates.filter((stat) => stat.group === id),
    }))
    .filter((group) => group.stats.length > 0)
}
