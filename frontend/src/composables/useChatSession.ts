import { computed, ref } from 'vue'
import { CancelledError, humanizeModelError, useChatModel } from './useChatModel'
import { useSiteLayout, type SectionId, type ThemeName } from './useSiteLayout'
import { useTraceRecorder } from './useTraceRecorder'
import { useToolRetrieval, type RetrievalStats, type ToolScore } from './useToolRetrieval'
import {
  SOURCE_DEFS,
  buildContextText,
  buildSystemPrompt,
  decideAction,
  type SourceDef,
} from '../tools/registry'

/**
 * The single Mini-Michi conversation (spec 007 FR-016/FR-019, contract
 * `contracts/chat-session.md` C1). The inline showcase and the launcher are
 * two renders of this module-level state — there is never a second message
 * array, a second model instance or a duplicated answer.
 */

export type ActionPayload =
  | { kind: 'theme'; theme: ThemeName }
  | { kind: 'contact' }
  | { kind: 'section'; section: SectionId }
  | { kind: 'page'; page: 'projects' }
  | { kind: 'page'; page: 'blog'; slug: string }

export type ChatMessage =
  | { id: number; role: 'user'; content: string }
  | { id: number; role: 'assistant'; content: string }
  | {
      id: number
      role: 'retrieval'
      query: string
      selectedNames: string[]
      rows: ToolScore[]
      stats: RetrievalStats
      injectedNames?: string[]
    }
  | { id: number; role: 'action'; payload: ActionPayload }
  | { id: number; role: 'error'; content: string; detail?: string }

export const SECTION_LABEL: Record<SectionId, string> = {
  about: 'About',
  blog: 'Blog',
  projects: 'Projects',
  contact: 'Contact',
}

const EXAMPLES = [
  'What can you do?',
  'Tell me about Michael\u2019s education',
  'What projects has Michael worked on?',
  'How can I contact Michael?',
  'How does this site work?',
  'Show me Michael\u2019s skills',
  'Switch the theme to red',
  'Where does Michael work?',
  'Give me a random fact',
]

const SOURCE_BY_NAME = new Map(SOURCE_DEFS.map((def) => [def.name, def]))

/** Plain-language name for a content source ("skills", "the blog article"). */
function plainSourceLabel(def: SourceDef): string {
  if (def.topic && def.topic !== 'all') return def.topic
  if (def.slug) return 'the blog article'
  if (def.name === 'site_index') return 'the site index'
  if (def.section) return SECTION_LABEL[def.section].toLowerCase()
  return def.title
}

/* ------------------------------------------------------------------ */
/* Singleton state                                                     */
/* ------------------------------------------------------------------ */

const {
  state,
  loadModel: loadChatModel,
  generate,
  dispose,
  cancel: cancelGeneration,
  resetCancel,
} = useChatModel()
const { state: layout, focusSection, setTheme, setVisible, setShowcaseVisible } = useSiteLayout()
const { downloadTrace } = useTraceRecorder()
const {
  mode,
  topK,
  lastQuery,
  lastResult,
  vector,
  decide,
  retrieve,
  loadVector,
  disposeVector,
  loadDecide,
  disposeDecide,
} = useToolRetrieval()

const messages = ref<ChatMessage[]>([])
const modelMessages = ref<{ role: string; content: string }[]>([])
const input = ref('')
const isGenerating = ref(false)
const generatingId = ref<number | null>(null)
/** Technical-details disclosure: closed on load and after Clear (contract C3.1). */
const detailsOpen = ref(false)
/** Launcher panel visibility — one live region must win (no double announcements). */
const launcherOpen = ref(false)
const suggestions = ref<string[]>([])

let nextId = 1

function push(role: ChatMessage['role'], extra: Partial<ChatMessage> = {}): number {
  const id = nextId++
  messages.value.push({ id, role, ...extra } as ChatMessage)
  return id
}

function pickSuggestions(count = 2): void {
  const pool = [...EXAMPLES]
  const picked: string[] = []
  for (let i = 0; i < count && pool.length; i++) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  suggestions.value = picked
}

pickSuggestions()

/** Highest-ranked selected content source — drives the page side-effect. */
function topContentSource(rows: ToolScore[]): SourceDef | undefined {
  for (const row of rows) {
    if (!row.selected) continue
    const def = SOURCE_BY_NAME.get(row.name)
    if (def && def.kind === 'content') return def
  }
  return undefined
}

function actionPayloadFor(def: SourceDef | undefined): ActionPayload | null {
  if (!def) return null
  if (def.name === 'contact') return { kind: 'contact' }
  if (def.section === 'projects') return { kind: 'page', page: 'projects' }
  if (def.slug) return { kind: 'page', page: 'blog', slug: def.slug }
  if (def.section) return { kind: 'section', section: def.section }
  return null
}

function applyPageEffect(def: SourceDef | undefined): void {
  if (!def) return
  if (def.section === 'projects') {
    window.location.hash = '#/projects'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (def.slug) {
    window.location.hash = `#/blog/${def.slug}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (def.section) {
    focusSection(def.section, { target: def.spotlight })
  }
}

/** Fetch the matched content, inject it and record what was used. */
async function injectSources(names: string[], retrievalId: number): Promise<string> {
  const { names: injectedNames, text } = await buildContextText(names)
  const message = messages.value.find((entry) => entry.id === retrievalId)
  if (message && message.role === 'retrieval') message.injectedNames = injectedNames
  return text
}

/** Scroll/spotlight (or navigate to) the highest-ranked matched content source. */
function applyTopSource(rows: ToolScore[]): void {
  const topSource = topContentSource(rows)
  const payload = actionPayloadFor(topSource)
  if (!payload) return
  applyPageEffect(topSource)
  push('action', { payload })
}

/** Injected sources, mapped to names a visitor can read (never `about_skills`). */
const sourcesUsed = computed<{ names: string[]; labels: string[] }>(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const message = messages.value[i]
    if (message.role !== 'retrieval' || !message.injectedNames?.length) continue
    const labels = message.injectedNames.map((name) => {
      const def = SOURCE_BY_NAME.get(name)
      return def ? plainSourceLabel(def) : name
    })
    return { names: [...message.injectedNames], labels }
  }
  return { names: [], labels: [] }
})

async function send(raw?: string): Promise<void> {
  const text = (raw ?? input.value).trim()
  if (!text || isGenerating.value) return

  input.value = ''
  push('user', { content: text })
  modelMessages.value.push({ role: 'user', content: text })
  isGenerating.value = true
  resetCancel()

  try {
    const retrieval = await retrieve(text, { topK: topK.value, mode: mode.value })
    const retrievalId = push('retrieval', {
      query: text,
      selectedNames: retrieval.selectedNames,
      rows: retrieval.rows,
      stats: retrieval.stats,
    })

    // Theme requests are applied by the retriever — the model is never called.
    const theme = decideAction(text, retrieval.rows, layout.theme)
    if (theme) {
      setTheme(theme)
      push('action', { payload: { kind: 'theme', theme } })
      return
    }

    // Content injection and the page effect happen before any model work, so a
    // failed download still shows the matched sources ("Used: …") and the page
    // still moves to the right band (SC-011).
    const contextText = await injectSources(retrieval.selectedNames, retrievalId)
    applyTopSource(retrieval.rows)

    if (state.value.status !== 'ready') {
      try {
        await loadChatModel()
      } catch {
        // The plain sentence + Retry come from the model status; the technical
        // cause is shown inside the details disclosure.
        return
      }
    }

    if (
      (mode.value === 'hybrid' || mode.value === 'vector') &&
      vector.value.status !== 'ready' &&
      vector.value.status !== 'loading'
    ) {
      void loadVector().catch(() => {})
    }

    const placeholderId = push('assistant', { content: '' })
    generatingId.value = placeholderId

    let streamed = ''
    let response: string
    try {
      response = await generate(
        [{ role: 'system', content: buildSystemPrompt(contextText) }, ...modelMessages.value],
        (token: string) => {
          streamed += token
          const current = messages.value.find((message) => message.id === placeholderId)
          if (current && current.role === 'assistant') current.content = streamed
        },
      )
    } catch (error) {
      if (!(error instanceof CancelledError)) throw error
      const index = messages.value.findIndex((message) => message.id === placeholderId)
      if (index !== -1) {
        const current = messages.value[index]
        if (streamed && current.role === 'assistant') current.content = streamed
        else messages.value.splice(index, 1)
      }
      if (streamed) modelMessages.value.push({ role: 'assistant', content: streamed })
      return
    }
    modelMessages.value.push({ role: 'assistant', content: response })
    const current = messages.value.find((message) => message.id === placeholderId)
    if (current && current.role === 'assistant') current.content = streamed
    generatingId.value = null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    push('error', { content: humanizeModelError(message), detail: message })
  } finally {
    isGenerating.value = false
    generatingId.value = null
    pickSuggestions()
  }
}

function cancel(): void {
  cancelGeneration()
}

/** Releases the chat, vector and decide models (memory) and resets the view. */
function clear(): void {
  messages.value = []
  modelMessages.value = []
  generatingId.value = null
  detailsOpen.value = false
  resetCancel()
  dispose()
  disposeVector()
  disposeDecide()
  pickSuggestions()
}

/** Text history only — the loaded model stays warm. */
function startNewChat(): void {
  messages.value = []
  modelMessages.value = []
  generatingId.value = null
  resetCancel()
  pickSuggestions()
}

async function loadModel(): Promise<void> {
  try {
    await loadChatModel()
  } catch {
    // surfaced through the model status and the plain error line
  }
}

function saveTrace(): void {
  downloadTrace(messages.value)
}

function setLauncherOpen(open: boolean): void {
  launcherOpen.value = open
}

/** Applied by an assistant action payload (contact/section/page render as links). */
function focusAssistantTarget(section: SectionId): void {
  focusSection(section)
}

/** Assistant-driven hide/show of a section, and of the showcase band. */
function applyVisibility(id: SectionId | 'showcase', visible: boolean): void {
  if (id === 'showcase') setShowcaseVisible(visible)
  else setVisible(id, visible)
}

const session = {
  state,
  messages,
  modelMessages,
  input,
  isGenerating,
  generatingId,
  detailsOpen,
  launcherOpen,
  suggestions,
  sourcesUsed,
  mode,
  topK,
  lastQuery,
  lastResult,
  vector,
  decide,
  send,
  cancel,
  clear,
  startNewChat,
  loadModel,
  saveTrace,
  setLauncherOpen,
  retrieve,
  loadVector,
  disposeVector,
  loadDecide,
  disposeDecide,
  pickSuggestions,
  focusAssistantTarget,
  applyVisibility,
  layout,
}

export type ChatSession = typeof session

export function useChatSession(): ChatSession {
  return session
}
