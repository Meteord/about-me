import { ref } from 'vue'
import { CancelledError, humanizeModelError, useChatModel } from './useChatModel'
import { useSiteLayout, type ThemeName } from './useSiteLayout'
import { useTraceRecorder } from './useTraceRecorder'
import { useToolRetrieval, type RetrievalStats, type ToolScore } from './useToolRetrieval'
import { buildContextText, buildSystemPrompt, decideAction } from '../tools/registry'

/**
 * The inline Mini-Michi conversation: retrieval, context injection, a streamed
 * answer and source links under that answer. It never moves the page — the
 * floating launcher (`useChatNav`) is the navigation helper.
 */

export type ActionPayload = { kind: 'theme'; theme: ThemeName }

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
const { state: layout, setTheme } = useSiteLayout()
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

/** Fetch the matched content, inject it and record what was used. */
async function injectSources(names: string[], retrievalId: number): Promise<string> {
  const { names: injectedNames, text } = await buildContextText(names)
  const message = messages.value.find((entry) => entry.id === retrievalId)
  if (message && message.role === 'retrieval') message.injectedNames = injectedNames
  return text
}

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

    // Injection happens before any model work, so the answer's source links
    // still appear when the download fails. Nothing on the page moves.
    const contextText = await injectSources(retrieval.selectedNames, retrievalId)

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

const session = {
  state,
  messages,
  modelMessages,
  input,
  isGenerating,
  generatingId,
  detailsOpen,
  suggestions,
  mode,
  topK,
  lastQuery,
  lastResult,
  vector,
  decide,
  send,
  cancel,
  clear,
  loadModel,
  saveTrace,
  retrieve,
  loadVector,
  disposeVector,
  loadDecide,
  disposeDecide,
  pickSuggestions,
  layout,
}

export type ChatSession = typeof session

export function useChatSession(): ChatSession {
  return session
}
