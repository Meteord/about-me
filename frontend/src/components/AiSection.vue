<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useChatModel, CancelledError } from '../composables/useChatModel'
import { useSiteLayout, type SectionId } from '../composables/useSiteLayout'
import {
  useToolRetrieval,
  type RetrievalStats,
  type ToolScore,
} from '../composables/useToolRetrieval'
import { siteData } from '../data/siteData'
import {
  TOOL_SCHEMAS,
  buildSystemPrompt,
  extractToolCallContent,
  extractPythonicCalls,
  executeToolCall,
  pruneSchemas,
  type ToolResult,
} from '../tools/registry'
import ToolSelectorPanel from './ToolSelectorPanel.vue'

type ChatMessage =
  | { id: number; role: 'user'; content: string }
  | { id: number; role: 'assistant'; content: string }
  | { id: number; role: 'tool-call'; calls: string[] }
  | { id: number; role: 'tool-result'; results: ToolResult[] }
  | {
      id: number
      role: 'retrieval'
      query: string
      selectedNames: string[]
      rows: ToolScore[]
      stats: RetrievalStats
      detailsOpen?: boolean
    }
  | { id: number; role: 'error'; content: string }

const {
  state,
  loadModel,
  generate,
  dispose,
  cancel: cancelGeneration,
  resetCancel,
} = useChatModel()
const { focusSection } = useSiteLayout()
const {
  mode: retrievalMode,
  topK: retrievalTopK,
  retrieve,
  disposeVector,
  vector,
  loadVector,
} = useToolRetrieval()

const input = ref('')
const messages = ref<ChatMessage[]>([])
const modelMessages = ref<{ role: string; content: string }[]>([])
const isGenerating = ref(false)
const generatingId = ref<number | null>(null)
const chatEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

let nextId = 1

const MAX_ROUNDS = 3

const EXAMPLES = [
  'What can you do?',
  'Tell me about Michael\u2019s education',
  'What projects has Michael worked on?',
  'How can I contact Michael?',
  'How does this site work?',
  'Move contact to the top',
  'Rotate the sections',
  'Hide the projects section',
  'Switch the theme to red',
  'Expand all sections',
  'Shuffle the page',
  'Reverse the section order',
  'How many tools do you have?',
  'What tools can you use?',
  'Give me a random fact',
  'Cycle the theme',
  'Open the tool selector',
]

const SECTION_LABEL: Record<SectionId, string> = {
  about: 'About',
  projects: 'Projects',
  contact: 'Contact',
  tech: 'How it works',
}

const suggestions = ref<string[]>([])

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

function push(role: ChatMessage['role'], extra: Partial<ChatMessage> = {}): number {
  const id = nextId++
  messages.value.push({ id, role, ...extra } as ChatMessage)
  return id
}

function summarizeResults(results: ToolResult[]): string {
  return results
    .map((result) =>
      result.error ? `${result.call.split('(')[0]} → error` : `${result.call.split('(')[0]} → done`,
    )
    .join(' · ')
}

function toolNote(results: ToolResult[]): string | null {
  for (const result of results) {
    if (result.result && typeof result.result === 'object') {
      const message = (result.result as { message?: string }).message
      if (message) return message
    }
  }
  return null
}

function resultSection(results: ToolResult[]): SectionId | null {
  for (const result of results) {
    const section = (result.result as { section?: SectionId } | undefined)?.section
    if (section) return section
  }
  return null
}

function isContactResult(results: ToolResult[]): boolean {
  return results.some((result) => result.kind === 'contact')
}

const TOOL_DESCRIPTION = new Map(
  TOOL_SCHEMAS.map((tool) => [tool.function.name, tool.function.description]),
)

const toolDescription = (name: string): string => TOOL_DESCRIPTION.get(name) ?? ''

function prunedPercent(stats: RetrievalStats): number {
  return stats.totalChars ? Math.round((stats.prunedChars / stats.totalChars) * 100) : 0
}

function jumpTo(results: ToolResult[]): void {
  const section = resultSection(results)
  if (section) focusSection(section)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(text: string): string {
  let html = escapeHtml(text)

  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a class="pixel-link" href="$2" target="_blank" rel="noopener">$1</a>',
  )
  html = html.replace(
    /(?<!["'=])(https?:\/\/[^\s<)]+)/g,
    '<a class="pixel-link" href="$1" target="_blank" rel="noopener">$1</a>',
  )

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')

  const lines = html.split('\n')
  const out: string[] = []
  let list: string[] | null = null
  let listTag: 'ul' | 'ol' = 'ul'

  const flushList = (): void => {
    if (list) {
      out.push(`<${listTag}>${list.map((item) => `<li>${item}</li>`).join('')}</${listTag}>`)
      list = null
    }
  }

  for (const line of lines) {
    const ulMatch = line.match(/^[-*]\s+(.+)$/)
    const olMatch = line.match(/^\d+\.\s+(.+)$/)
    if (ulMatch) {
      if (list && listTag !== 'ul') flushList()
      list = list ?? []
      listTag = 'ul'
      list.push(ulMatch[1])
      continue
    }
    if (olMatch) {
      if (list && listTag !== 'ol') flushList()
      list = list ?? []
      listTag = 'ol'
      list.push(olMatch[1])
      continue
    }
    flushList()
    const trimmed = line.trim()
    if (trimmed) out.push(`<p>${line}</p>`)
  }
  flushList()

  return out.join('\n')
}

function scrollToBottom(force = false): void {
  nextTick(() => {
    const el = chatEl.value
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96
    if (force || nearBottom) el.scrollTop = el.scrollHeight
  })
}

watch(
  () => [messages.value.length, isGenerating.value],
  () => scrollToBottom(),
)

onMounted(() => {
  if (state.value.status === 'idle') {
    void loadModel().catch(() => {})
  }
})

async function handleSend(raw?: string): Promise<void> {
  const text = (raw ?? input.value).trim()
  if (!text || isGenerating.value) return

  if (state.value.status !== 'ready') {
    try {
      await loadModel()
    } catch {
      return
    }
  }

  if (
    (retrievalMode.value === 'hybrid' || retrievalMode.value === 'vector') &&
    vector.value.status !== 'ready' &&
    vector.value.status !== 'loading'
  ) {
    void loadVector().catch(() => {})
  }

  input.value = ''
  push('user', { content: text })
  modelMessages.value.push({ role: 'user', content: text })
  isGenerating.value = true
  resetCancel()
  scrollToBottom(true)

  try {
    const retrieval = await retrieve(text, {
      topK: retrievalTopK.value,
      mode: retrievalMode.value,
    })
    const selectedNames =
      retrieval.selectedNames.length > 0
        ? retrieval.selectedNames
        : TOOL_SCHEMAS.map((tool) => tool.function.name)
    const toolSchemas = pruneSchemas(selectedNames)
    push('retrieval', {
      query: text,
      selectedNames,
      rows: retrieval.rows,
      stats: retrieval.stats,
      detailsOpen: false,
    })

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const placeholderId = push('assistant', { content: '' })
      generatingId.value = placeholderId

      let streamed = ''
      let response: string
      try {
        response = await generate(
          [{ role: 'system', content: buildSystemPrompt(selectedNames) }, ...modelMessages.value],
          toolSchemas,
          (token: string) => {
            streamed += token
            const current = messages.value.find((message) => message.id === placeholderId)
            if (current && current.role === 'assistant') current.content = streamed
            scrollToBottom()
          },
        )
      } catch (error) {
        if (!(error instanceof CancelledError)) throw error
        const index = messages.value.findIndex((message) => message.id === placeholderId)
        if (index !== -1) {
          if (streamed) {
            const current = messages.value[index]
            if (current.role === 'assistant') current.content = streamed
          } else {
            messages.value.splice(index, 1)
          }
        }
        if (streamed) modelMessages.value.push({ role: 'assistant', content: streamed })
        break
      }
      modelMessages.value.push({ role: 'assistant', content: response })

      const toolCallContent = extractToolCallContent(response)
      if (!toolCallContent) {
        const current = messages.value.find((message) => message.id === placeholderId)
        if (current && current.role === 'assistant') current.content = streamed
        generatingId.value = null
        break
      }

      const calls = extractPythonicCalls(toolCallContent)
      const results: ToolResult[] = []
      for (const call of calls) {
        results.push(await executeToolCall(call))
      }
      modelMessages.value.push({
        role: 'tool',
        content: JSON.stringify(results.map((result) => result.result ?? result.error ?? null)),
      })

      const index = messages.value.findIndex((message) => message.id === placeholderId)
      if (index !== -1) {
        messages.value.splice(index, 1, { id: placeholderId, role: 'tool-call', calls })
      }
      push('tool-result', { results })
      generatingId.value = null
      scrollToBottom()
    }
  } catch (error) {
    push('error', {
      content: error instanceof Error ? error.message : String(error),
    })
  } finally {
    isGenerating.value = false
    generatingId.value = null
    pickSuggestions()
    nextTick(() => inputEl.value?.focus())
  }
}

function clearChat(): void {
  messages.value = []
  modelMessages.value = []
  dispose()
  disposeVector()
  pickSuggestions()
}

function startNewChat(): void {
  messages.value = []
  modelMessages.value = []
  generatingId.value = null
  resetCancel()
  pickSuggestions()
  nextTick(() => inputEl.value?.focus())
}

async function retryModel(): Promise<void> {
  try {
    await loadModel()
  } catch {
    // failure is surfaced through the status badge / error bubble
  }
}
</script>

<template>
  <div class="ai-panel">
    <div class="ai-panel__bar">
      <span class="ai-panel__title">Mini-Michi</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
    <div class="ai-panel__body">
      <ToolSelectorPanel :on-clear="clearChat" />

      <div class="pixel-chat__hero">
        <img src="/mm.png" alt="Mini-Michi" class="pixel-avatar pixel-chat__hero-avatar" />
        <div class="pixel-chat__hero-copy">
          <h2 class="pixel-chat__hero-title">Chat with Mini-Michi</h2>
          <p class="pixel-chat__hero-sub">…about Michael</p>
        </div>
        <button
          class="pixel-link-btn pixel-chat__new"
          type="button"
          :disabled="isGenerating || messages.length === 0"
          @click="startNewChat"
        >
          New chat
        </button>
      </div>

      <div ref="chatEl" class="pixel-chat">
        <template v-for="message in messages" :key="message.id">
          <div v-if="message.role === 'user'" class="pixel-msg pixel-msg--user">
            <p>{{ message.content }}</p>
          </div>
          <div v-else-if="message.role === 'assistant'" class="pixel-msg pixel-msg--ai">
            <img src="/mm.png" alt="" aria-hidden="true" class="pixel-chat__bubble-avatar" />
            <div class="pixel-msg__body">
              <div
                class="pixel-msg__text pixel-msg__markdown"
                v-html="renderMarkdown(message.content)"
              ></div>
              <span
                v-if="generatingId === message.id"
                class="pixel-msg__cursor"
                aria-hidden="true"
              ></span>
            </div>
          </div>
          <div v-else-if="message.role === 'tool-call'" class="pixel-msg pixel-msg--tool">
            calling {{ message.calls.join(', ') }}
          </div>
          <div v-else-if="message.role === 'tool-result'" class="pixel-msg pixel-msg--tool-result">
            <div v-if="isContactResult(message.results)" class="pixel-chat-contact">
              <div class="pixel-contact pixel-chat-contact__links">
                <a
                  :href="siteData.contact.linkedin"
                  target="_blank"
                  rel="noopener"
                  class="pixel-contact__link pixel-contact__link--linkedin"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.026-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.379-1.563 2.838-1.563 3.036 0 3.6 2.001 3.6 4.601v5.595z"
                    />
                  </svg>
                  LinkedIn
                </a>
                <a
                  :href="siteData.contact.github"
                  target="_blank"
                  rel="noopener"
                  class="pixel-contact__link pixel-contact__link--github"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.527.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.649.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.371.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.218.694.825.576 4.765-1.585 8.199-6.082 8.199-11.385 0-6.627-5.373-12-12-12z"
                    />
                  </svg>
                  GitHub
                </a>
              </div>
              <button
                class="pixel-link-btn pixel-chat-contact__jump"
                type="button"
                @click="jumpTo(message.results)"
              >
                View Contact section
              </button>
            </div>
            <template v-else>
              <p v-if="toolNote(message.results)" class="pixel-msg__text">
                {{ toolNote(message.results) }}
              </p>
              <p class="pixel-msg__dim">{{ summarizeResults(message.results) }}</p>
              <button
                v-if="resultSection(message.results)"
                class="pixel-link-btn pixel-msg__jump"
                type="button"
                @click="jumpTo(message.results)"
              >
                View {{ SECTION_LABEL[resultSection(message.results) as SectionId] }} section
              </button>
            </template>
          </div>
          <div v-else-if="message.role === 'retrieval'" class="pixel-msg pixel-msg--retrieval">
            <button
              type="button"
              class="pixel-msg--retrieval__summary"
              :aria-expanded="message.detailsOpen"
              :aria-controls="'retrieval-details-' + message.id"
              @click="message.detailsOpen = !message.detailsOpen"
            >
              <span class="pixel-msg--retrieval__label">retrieved</span>
              <span class="pixel-msg--retrieval__count">
                {{ message.selectedNames.length }}/{{ message.stats.total }}
              </span>
              <span class="pixel-msg--retrieval__names">
                {{ message.selectedNames.join(', ') }}
              </span>
              <span class="pixel-msg--retrieval__meta">
                {{
                  message.stats.mode === message.stats.effective
                    ? message.stats.mode
                    : message.stats.effective + ' (fallback)'
                }}
                · {{ message.stats.latencyMs }}ms
              </span>
              <span class="pixel-msg--retrieval__toggle" aria-hidden="true">
                {{ message.detailsOpen ? '−' : '+' }}
              </span>
            </button>

            <transition name="fade">
              <div
                v-if="message.detailsOpen"
                :id="'retrieval-details-' + message.id"
                class="pixel-msg--retrieval__details"
              >
                <ol class="tool-selector__list">
                  <li
                    v-for="row in message.rows"
                    :key="row.name"
                    class="tool-result"
                    :class="{ 'tool-result--selected': row.selected }"
                  >
                    <span class="tool-result__rank">{{ row.rank + 1 }}</span>
                    <span class="tool-result__name">{{ row.name }}</span>
                    <span class="tool-result__desc">{{ toolDescription(row.name) }}</span>
                    <span class="tool-result__bar" aria-hidden="true">
                      <i :style="{ width: Math.round(row.score * 100) + '%' }"></i>
                    </span>
                    <span class="tool-result__score">{{ row.score.toFixed(2) }}</span>
                    <span v-if="row.selected" class="tool-result__tag">IN CONTEXT</span>
                  </li>
                </ol>
                <p class="tool-selector__stats">
                  {{ message.stats.total }} tools · top {{ message.stats.selected }} selected · ~{{
                    prunedPercent(message.stats)
                  }}% of schemas pruned
                </p>
              </div>
            </transition>
          </div>
          <div v-else-if="message.role === 'error'" class="pixel-msg pixel-msg--error">
            {{ message.content }}
          </div>
        </template>

        <div
          v-if="
            messages.length === 0 && (state.status === 'checking' || state.status === 'loading')
          "
          class="pixel-msg pixel-msg--status"
        >
          <p class="pixel-msg__text">Warming up Mini-Michi…</p>
          <div
            class="ai-progress pixel-msg__progress"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="state.progress"
          >
            <span class="ai-progress__bar" :style="{ width: state.progress + '%' }"></span>
          </div>
          <p class="pixel-msg__dim">
            {{ state.progress }}% · {{ state.file || 'fetching model…' }}
          </p>
        </div>
        <div
          v-else-if="messages.length === 0 && state.status === 'error'"
          class="pixel-msg pixel-msg--error"
        >
          <p>Model failed to load: {{ state.error }}</p>
          <button class="pixel-link-btn pixel-msg__jump" type="button" @click="retryModel">
            Retry model
          </button>
        </div>

        <div v-if="messages.length === 0" class="pixel-chat__empty">
          <p class="pixel-chat__hint">
            Hi! I'm Mini-Michi, an on-device SLM running here in your browser over
            {{
              state.device === 'webgpu'
                ? 'WebGPU'
                : state.device === 'wasm'
                  ? 'WebAssembly'
                  : 'WebGPU or WebAssembly'
            }}. I can look up Michael's info from the site, jump straight to the relevant section,
            and rearrange this page — move, rotate, hide or restyle sections.
          </p>
          <div class="pixel-tags pixel-chat__examples">
            <button
              v-for="example in suggestions"
              :key="example"
              class="pixel-chip pixel-chat__example"
              type="button"
              :disabled="isGenerating || state.status !== 'ready'"
              @click="handleSend(example)"
            >
              {{ example }}
            </button>
            <button
              class="pixel-link-btn pixel-chat__shuffle"
              type="button"
              :disabled="isGenerating || state.status !== 'ready'"
              @click="pickSuggestions()"
            >
              Shuffle
            </button>
          </div>
        </div>

        <div v-if="messages.length > 0" class="pixel-chat__replies" aria-label="Try asking">
          <button
            v-for="example in suggestions"
            :key="example"
            class="pixel-chip pixel-chat__example"
            type="button"
            :disabled="isGenerating || state.status !== 'ready'"
            @click="handleSend(example)"
          >
            {{ example }}
          </button>
        </div>
      </div>

      <form class="pixel-chat__input" @submit.prevent="handleSend()">
        <input
          ref="inputEl"
          v-model="input"
          class="pixel-chat__field"
          type="text"
          autocomplete="off"
          :disabled="isGenerating || state.status !== 'ready'"
          :placeholder="state.status === 'ready' ? 'Talk to Mini-Michi…' : 'Load the model first…'"
          aria-label="Chat message"
        />
        <button
          v-if="isGenerating"
          class="pixel-chat__send pixel-chat__send--stop"
          type="button"
          @click="cancelGeneration"
        >
          Stop
        </button>
        <button
          v-else
          class="pixel-chat__send"
          type="submit"
          :disabled="state.status !== 'ready' || !input.trim()"
        >
          Send
        </button>
      </form>
    </div>
  </div>
</template>
