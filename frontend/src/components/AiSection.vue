<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import {
  useChatModel,
  MODEL_STATUS_LABEL,
  CancelledError,
  humanizeModelError,
} from '../composables/useChatModel'
import { useSiteLayout, type SectionId, type ThemeName } from '../composables/useSiteLayout'
import { useTraceRecorder } from '../composables/useTraceRecorder'
import { blogHref, projectsHref } from '../composables/useHashRoute'
import {
  useToolRetrieval,
  type RetrievalMode,
  type RetrievalStats,
  type ToolScore,
} from '../composables/useToolRetrieval'
import { siteData } from '../data/siteData'
import {
  SOURCE_DEFS,
  buildContextText,
  buildSystemPrompt,
  decideAction,
  type SourceDef,
} from '../tools/registry'
import ToolSelectorPanel from './ToolSelectorPanel.vue'

type ActionPayload =
  | { kind: 'theme'; theme: ThemeName }
  | { kind: 'contact' }
  | { kind: 'section'; section: SectionId }
  | { kind: 'page'; page: 'projects' }
  | { kind: 'page'; page: 'blog'; slug: string }

type ChatMessage =
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
      detailsOpen?: boolean
    }
  | { id: number; role: 'action'; payload: ActionPayload }
  | { id: number; role: 'error'; content: string }

const {
  state,
  loadModel,
  generate,
  dispose,
  cancel: cancelGeneration,
  resetCancel,
} = useChatModel()
const { state: layout, focusSection, setTheme } = useSiteLayout()
const { downloadTrace } = useTraceRecorder()
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

const MODE_GLOSS: Record<RetrievalMode, string> = {
  lexical: 'keyword match',
  vector: 'meaning match',
  hybrid: 'keyword + meaning',
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

const SECTION_LABEL: Record<SectionId, string> = {
  about: 'About',
  blog: 'Blog',
  projects: 'Projects',
  contact: 'Contact',
}

const SOURCE_BY_NAME = new Map(SOURCE_DEFS.map((def) => [def.name, def]))
const sourceDef = (name: string): SourceDef | undefined => SOURCE_BY_NAME.get(name)

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

function prunedPercent(stats: RetrievalStats): number {
  return stats.totalChars ? Math.round((stats.prunedChars / stats.totalChars) * 100) : 0
}

/** Highest-ranked selected content source — drives the page side-effect. */
function topContentSource(rows: ToolScore[]): SourceDef | undefined {
  for (const row of rows) {
    if (!row.selected) continue
    const def = SOURCE_BY_NAME.get(row.name)
    if (def && def.kind === 'content') return def
  }
  return undefined
}

/** Whether a theme action followed this retrieval step within the same turn (so ACTED is honest). */
function themeActed(retrievalMsg: ChatMessage): boolean {
  const index = messages.value.indexOf(retrievalMsg)
  if (index === -1) return false
  for (let i = index + 1; i < messages.value.length; i++) {
    const message = messages.value[i]
    if (message.role === 'user') break
    if (message.role === 'action' && message.payload.kind === 'theme') return true
  }
  return false
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

async function handleSend(raw?: string): Promise<void> {
  const text = (raw ?? input.value).trim()
  if (!text || isGenerating.value) return

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
    const rows = retrieval.rows
    const selectedNames = retrieval.selectedNames
    const retrievalId = push('retrieval', {
      query: text,
      selectedNames,
      rows,
      stats: retrieval.stats,
      detailsOpen: false,
    })

    const theme = decideAction(text, rows, layout.theme)
    if (theme) {
      setTheme(theme)
      push('action', { payload: { kind: 'theme', theme } })
      return
    }

    if (state.value.status !== 'ready') {
      try {
        await loadModel()
      } catch {
        push('error', {
          content: humanizeModelError(state.value.error ?? ''),
        })
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

    const { names: injectedNames, text: contextText } = await buildContextText(selectedNames)
    const retrievalMsg = messages.value.find((message) => message.id === retrievalId)
    if (retrievalMsg && retrievalMsg.role === 'retrieval') {
      retrievalMsg.injectedNames = injectedNames
    }
    const topSource = topContentSource(rows)
    const payload = actionPayloadFor(topSource)
    if (payload) {
      applyPageEffect(topSource)
      push('action', { payload })
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
          scrollToBottom()
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

function saveTrace(): void {
  downloadTrace(messages.value)
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
  <div class="ai-panel" :class="{ 'ai-panel--idle': messages.length === 0 }">
    <div class="ai-panel__bar">
      <span class="ai-panel__title">Mini-Michi</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
    <div class="lv3-chat">
      <div class="lv3-chat__banner">
        <span
          class="lv3-chat__banner-dot"
          :class="{ 'lv3-chat__banner-dot--err': state.status === 'error' }"
          aria-hidden="true"
        ></span>
        <p class="lv3-chat__banner-status">chat model · {{ MODEL_STATUS_LABEL[state.status] }}</p>
        <span class="lv3-chat__banner-mode">{{ retrievalMode }}</span>
        <button
          class="pixel-link-btn pixel-chat__save"
          type="button"
          :disabled="isGenerating || messages.length === 0"
          @click="saveTrace"
        >
          Save trace
        </button>
        <button
          class="pixel-link-btn pixel-chat__new"
          type="button"
          :disabled="isGenerating || messages.length === 0"
          @click="startNewChat"
        >
          New chat
        </button>
      </div>
      <ToolSelectorPanel :on-clear="clearChat" />
      <div ref="chatEl" class="pixel-chat lv3-chat__log">
        <template v-for="message in messages" :key="message.id">
          <div v-if="message.role === 'user'" class="pixel-msg pixel-msg--user">
            <p>{{ message.content }}</p>
          </div>
          <div v-else-if="message.role === 'assistant'" class="pixel-msg pixel-msg--ai">
            <img
              src="/mm.webp"
              alt=""
              aria-hidden="true"
              width="28"
              height="28"
              class="pixel-chat__bubble-avatar"
            />
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
          <div v-else-if="message.role === 'action'" class="pixel-msg pixel-msg--action">
            <template v-if="message.payload.kind === 'theme'">
              <span class="pixel-chip" :class="`pixel-chip--${message.payload.theme}`">
                theme → {{ message.payload.theme }}
              </span>
            </template>
            <template v-else-if="message.payload.kind === 'contact'">
              <div class="pixel-chat-contact">
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
              </div>
            </template>
            <template v-else-if="message.payload.kind === 'section'">
              <button
                class="pixel-link-btn pixel-msg__jump"
                type="button"
                @click="focusSection(message.payload.section)"
              >
                View {{ SECTION_LABEL[message.payload.section] }} section
              </button>
            </template>
            <template v-else>
              <a
                :href="
                  message.payload.page === 'projects'
                    ? projectsHref()
                    : blogHref(message.payload.slug)
                "
                class="pixel-link-btn pixel-msg__jump"
              >
                {{ message.payload.page === 'projects' ? 'View projects page' : 'View blog post' }}
              </a>
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
                {{ message.selectedNames.join(', ') || '(none)' }}
              </span>
              <span class="pixel-msg--retrieval__meta">
                {{
                  message.stats.mode === message.stats.effective
                    ? message.stats.mode
                    : message.stats.effective + ' (fallback)'
                }}
                <span class="pixel-msg--retrieval__gloss">
                  · {{ MODE_GLOSS[message.stats.effective] }}
                </span>
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
                    <span class="tool-result__desc">
                      {{ sourceDef(row.name)?.description ?? '' }}
                    </span>
                    <span class="tool-result__bar" aria-hidden="true">
                      <i
                        :style="{
                          clipPath: 'inset(0 ' + (100 - Math.round(row.score * 100)) + '% 0 0)',
                        }"
                      ></i>
                    </span>
                    <span class="tool-result__score">{{ row.score.toFixed(2) }}</span>
                    <span
                      v-if="row.name === 'set_theme' && themeActed(message)"
                      class="tool-result__tag tool-result__tag--acted"
                      >ACTED</span
                    >
                    <span
                      v-else-if="row.selected && message.injectedNames?.includes(row.name)"
                      class="tool-result__tag"
                      >IN CONTEXT</span
                    >
                  </li>
                </ol>
                <p class="tool-selector__stats">
                  {{ message.stats.total }} candidates · top {{ message.stats.selected }} selected ·
                  ~{{ prunedPercent(message.stats) }}% pruned
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
            <span
              class="ai-progress__bar"
              :style="{ clipPath: 'inset(0 ' + (100 - state.progress) + '% 0 0)' }"
            ></span>
          </div>
          <p class="pixel-msg__dim">
            {{ state.progress }}% · {{ state.file || 'fetching model…' }}
          </p>
        </div>
        <div
          v-else-if="messages.length === 0 && state.status === 'error'"
          class="pixel-msg pixel-msg--error"
        >
          <p>Model failed to load: {{ humanizeModelError(state.error ?? '') }}</p>
          <button class="pixel-link-btn pixel-msg__jump" type="button" @click="retryModel">
            Retry model
          </button>
        </div>

        <div v-if="messages.length === 0" class="lv3-chat__start">
          <div class="lv3-chat__start-card">
            <p class="lv3-chat__start-kicker">boot</p>
            <p class="pixel-chat__hint">
              Hi! I'm Mini-Michi, an on-device SLM running here in your browser over
              {{
                state.device === 'webgpu'
                  ? 'WebGPU'
                  : state.device === 'wasm'
                    ? 'WebAssembly'
                    : 'WebGPU or WebAssembly'
              }}. Ask me anything about Michael — I'll look it up and bring the right section into
              view.
            </p>
            <button
              v-if="state.status === 'idle'"
              class="pixel-link-btn pixel-chat__load"
              type="button"
              @click="loadModel"
            >
              Load Mini-Michi
            </button>
          </div>
          <div class="lv3-chat__start-card">
            <p class="lv3-chat__start-kicker">try these</p>
            <div class="pixel-tags pixel-chat__examples lv3-chat__start-examples">
              <button
                v-for="example in suggestions"
                :key="example"
                class="pixel-chip pixel-chat__example"
                type="button"
                :disabled="isGenerating || (state.status !== 'ready' && state.status !== 'idle')"
                @click="handleSend(example)"
              >
                {{ example }}
              </button>
              <button
                class="pixel-link-btn pixel-chat__shuffle"
                type="button"
                :disabled="isGenerating || (state.status !== 'ready' && state.status !== 'idle')"
                @click="pickSuggestions()"
              >
                Shuffle
              </button>
            </div>
          </div>
        </div>

        <div v-if="messages.length > 0" class="pixel-chat__replies" aria-label="Try asking">
          <button
            v-for="example in suggestions"
            :key="example"
            class="pixel-chip pixel-chat__example"
            type="button"
            :disabled="isGenerating || (state.status !== 'ready' && state.status !== 'idle')"
            @click="handleSend(example)"
          >
            {{ example }}
          </button>
        </div>
      </div>
      <form class="pixel-chat__input lv3-chat__input" @submit.prevent="handleSend()">
        <input
          ref="inputEl"
          v-model="input"
          class="pixel-chat__field"
          type="text"
          autocomplete="off"
          :disabled="isGenerating || (state.status !== 'ready' && state.status !== 'idle')"
          :placeholder="
            state.status === 'ready'
              ? 'Talk to Mini-Michi…'
              : state.status === 'idle'
                ? 'Type a question to load Mini-Michi…'
                : 'Loading Mini-Michi…'
          "
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
          :disabled="(state.status !== 'ready' && state.status !== 'idle') || !input.trim()"
        >
          Send
        </button>
      </form>
    </div>
  </div>
</template>
