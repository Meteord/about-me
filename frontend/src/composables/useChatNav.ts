import { nextTick, ref } from 'vue'
import { mode, topK } from './retrievalSettings'
import { retrieve, type RetrievalStats, type ToolScore } from './useToolRetrieval'
import { navigateToAnchor } from './useHashNavigation'
import { SOURCE_DEFS, type SourceDef } from '../tools/registry'
import { SECTION_LINKS, sourceLink } from '../tools/sourceLinks'

/**
 * The floating launcher is a navigation helper, not a second chat: it ranks the
 * same content sources with the retriever, shows the current query's ranking
 * and stats, and takes the visitor to the best match. It keeps no conversation
 * history and never touches the inline chat's transcript or model state.
 */

export interface NavDestination {
  label: string
  anchor: string
  /** Normalized retrieval score; absent for the site-index shortcut list. */
  score?: number
}

export interface NavResult {
  destinations: NavDestination[]
  stats: RetrievalStats
  activeAnchor: string | null
}

/**
 * `site_index` matches generic words ("what", "show") and often outranks the
 * actual destination. It only wins when no topical source comes close; when a
 * specific source scores within this margin of the top, that source wins.
 */
const INDEX_MARGIN = 0.9

const NO_MATCH_NOTICE = 'No section matches that — try a topic like “education” or “projects”.'

const DESTINATION_LIMIT = 3

const EXAMPLES = [
  'Where does Michael work?',
  'Michael\u2019s education',
  'Show me his skills',
  'What projects has he built?',
  'How can I contact Michael?',
  'How does this site work?',
]

const SOURCE_BY_NAME = new Map(SOURCE_DEFS.map((def) => [def.name, def]))

const open = ref(false)
const input = ref('')
const busy = ref(false)
/** Latest search only — cleared when the panel opens again. */
const result = ref<NavResult | null>(null)
const notice = ref('')
/** Announced by the launcher's live region, even after the panel closes. */
const announcement = ref('')
const suggestions = ref<string[]>([])

function pickSuggestions(count = 3): void {
  const pool = [...EXAMPLES]
  const picked: string[] = []
  for (let i = 0; i < count && pool.length; i++) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  suggestions.value = picked
}

pickSuggestions()

function isNarrowViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 480px)').matches
  )
}

interface ScoredSource {
  def: SourceDef
  score: number
}

/** Content sources with a positive score, in rank order. */
function contentSources(rows: ToolScore[]): ScoredSource[] {
  const sources: ScoredSource[] = []
  for (const row of rows) {
    if (row.score <= 0) continue
    const def = SOURCE_BY_NAME.get(row.name)
    if (def?.kind === 'content') sources.push({ def, score: row.score })
  }
  return sources
}

/** The four top-level bands, shown for an index-style ("what can you do?") query. */
function sectionDestinations(): NavDestination[] {
  return SECTION_LINKS.flatMap((link) =>
    link.anchor ? [{ label: link.label, anchor: link.anchor }] : [],
  )
}

function rankedDestinations(rows: ToolScore[]): NavDestination[] {
  const sources = contentSources(rows)
  if (sources.length === 0) return []

  if (sources[0].def.name === 'site_index') {
    const specific = sources.find((entry) => entry.def.name !== 'site_index')
    if (!specific || specific.score < INDEX_MARGIN) return sectionDestinations()
  }

  const seen = new Set<string>()
  const destinations: NavDestination[] = []
  for (const { def, score } of sources) {
    const link = sourceLink(def)
    if (!link.anchor || seen.has(link.anchor)) continue
    seen.add(link.anchor)
    destinations.push({ label: link.label, anchor: link.anchor, score })
    if (destinations.length === DESTINATION_LIMIT) break
  }
  return destinations
}

/** Navigate now, or after the mobile panel has released its scroll lock. */
function navigateTo(destination: NavDestination, closeOnNarrow: boolean): void {
  const navigate = (): void => {
    if (!navigateToAnchor(destination.anchor)) return
    if (result.value) result.value.activeAnchor = destination.anchor
    announcement.value = `Showing ${destination.label}.`
  }

  if (closeOnNarrow && isNarrowViewport()) {
    open.value = false
    void nextTick(navigate)
    return
  }
  navigate()
}

async function send(raw?: string): Promise<void> {
  const text = (raw ?? input.value).trim()
  if (!text || busy.value) return

  input.value = ''
  busy.value = true
  notice.value = ''
  announcement.value = ''

  try {
    const retrieved = await retrieve(text, {
      topK: topK.value,
      mode: mode.value,
      record: false,
    })
    const destinations = rankedDestinations(retrieved.rows)
    result.value = { destinations, stats: retrieved.stats, activeAnchor: null }

    if (!destinations.length) {
      notice.value = NO_MATCH_NOTICE
      return
    }
    navigateTo(destinations[0], true)
  } catch {
    result.value = null
    notice.value = 'Could not look that up. Try again.'
  } finally {
    busy.value = false
    pickSuggestions()
  }
}

/** Clicking another ranked match navigates there and marks it active. */
function follow(destination: NavDestination): void {
  navigateTo(destination, true)
}

/** Drop transient feedback (ranking, stats, notice) when the panel reopens. */
function clearFeedback(): void {
  result.value = null
  notice.value = ''
  announcement.value = ''
}

const session = {
  open,
  input,
  busy,
  result,
  notice,
  announcement,
  suggestions,
  send,
  follow,
  clearFeedback,
  pickSuggestions,
}

export type ChatNav = typeof session

export function useChatNav(): ChatNav {
  return session
}
