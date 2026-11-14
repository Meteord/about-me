<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { humanizeModelError } from '../composables/useChatModel'
import { useChatSession, type ChatMessage } from '../composables/useChatSession'
import { assistant } from '../data/siteData'
import { sourceLinksFor, type SourceLink } from '../tools/sourceLinks'

const {
  state,
  messages,
  input,
  isGenerating,
  generatingId,
  suggestions,
  send,
  cancel,
  clear,
  loadModel,
  pickSuggestions,
} = useChatSession()

const logEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

type RenderItem =
  | { kind: 'message'; message: ChatMessage }
  | { kind: 'sources'; id: number; links: SourceLink[] }

/** Messages with each answer's source links attached right below it. */
const renderItems = computed<RenderItem[]>(() => {
  const items: RenderItem[] = []
  let pending: { id: number; links: SourceLink[] } | null = null

  const flush = (): void => {
    if (pending && pending.links.length > 0) {
      items.push({ kind: 'sources', id: pending.id, links: pending.links })
    }
    pending = null
  }

  for (const message of messages.value) {
    if (message.role === 'retrieval') {
      pending = { id: message.id, links: sourceLinksFor(message.injectedNames ?? []) }
      continue
    }
    if (message.role === 'user') flush()
    items.push({ kind: 'message', message })
    if (message.role === 'assistant' || message.role === 'error') flush()
  }
  flush()
  return items
})

function itemKey(item: RenderItem): string {
  return item.kind === 'sources' ? `sources-${item.id}` : `message-${item.message.id}`
}

/** Streaming keeps the length constant, so scroll on the last message's size. */
const lastLength = computed(() => {
  const last = messages.value[messages.value.length - 1]
  return last && 'content' in last ? last.content.length : 0
})

function scrollToBottom(force = false): void {
  nextTick(() => {
    const el = logEl.value
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96
    if (force || nearBottom) el.scrollTop = el.scrollHeight
  })
}

watch([() => messages.value.length, lastLength], () => scrollToBottom())

const canAsk = computed(() => state.value.status === 'ready' || state.value.status === 'idle')
const isWorking = computed(() => isGenerating.value && generatingId.value === null)
const isBooting = computed(
  () => state.value.status === 'checking' || state.value.status === 'loading',
)
/** A failure already rendered as a transcript entry owns the message. */
const hasErrorEntry = computed(() => messages.value.some((message) => message.role === 'error'))

/** The console plate's live readout — plain words, never an internal enum. */
const consoleState = computed(() => {
  switch (state.value.status) {
    case 'checking':
      return 'checking device'
    case 'loading':
      return `downloading ${state.value.progress}%`
    case 'ready':
      return `ready · ${state.value.device === 'webgpu' ? 'WebGPU' : 'WebAssembly'}`
    case 'error':
      return 'failed'
    default:
      return 'not loaded'
  }
})

const placeholder = computed(() => {
  if (isBooting.value) return 'Downloading…'
  if (state.value.status === 'error') return 'Model not loaded'
  return 'Ask about Michael…'
})

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

async function handleSend(raw?: string): Promise<void> {
  if (!canAsk.value || isGenerating.value) return
  scrollToBottom(true)
  await send(raw)
  nextTick(() => inputEl.value?.focus())
}

function retry(): void {
  void loadModel()
}

function focusInput(): void {
  inputEl.value?.focus()
}

defineExpose({ focusInput })
</script>

<template>
  <div class="chat-console">
    <div class="chat-console__bar">
      <span class="chat-console__id">
        <span
          class="chat-console__led"
          :class="`chat-console__led--${state.status}`"
          aria-hidden="true"
        ></span>
        <span class="chat-console__name">{{ assistant.name }}</span>
      </span>
      <span class="chat-console__spec">{{ assistant.model }} · on-device</span>
      <span class="chat-console__state">{{ consoleState }}</span>
    </div>

    <div
      ref="logEl"
      class="chat-console__log"
      role="log"
      aria-live="polite"
      :aria-label="`${assistant.name} conversation`"
    >
      <template v-for="item in renderItems" :key="itemKey(item)">
        <div v-if="item.kind === 'sources'" class="chat-surface__sources">
          <span class="chat-surface__sources-label">Sources</span>
          <template v-for="link in item.links" :key="link.name">
            <a
              v-if="link.anchor"
              class="pixel-chip pixel-chip--sm chat-surface__source"
              :href="`#${link.anchor}`"
            >
              {{ link.label }}
            </a>
            <span v-else class="pixel-chip pixel-chip--sm chat-surface__source">
              {{ link.label }}
            </span>
          </template>
        </div>
        <div v-else-if="item.message.role === 'user'" class="pixel-msg pixel-msg--user">
          <p>{{ item.message.content }}</p>
        </div>
        <div
          v-else-if="item.message.role === 'assistant'"
          class="pixel-msg pixel-msg--ai"
          :class="{ 'pixel-msg--streaming': generatingId === item.message.id }"
        >
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
              v-html="renderMarkdown(item.message.content)"
            ></div>
          </div>
        </div>
        <div v-else-if="item.message.role === 'action'" class="pixel-msg pixel-msg--action">
          <span
            v-if="item.message.payload.kind === 'theme'"
            class="pixel-chip pixel-chip--sm"
            :class="`pixel-chip--${item.message.payload.theme}`"
          >
            <span
              class="chat-console__swatch"
              :class="`chat-console__swatch--${item.message.payload.theme}`"
              aria-hidden="true"
            ></span>
            Theme switched to {{ item.message.payload.theme }}
          </span>
        </div>
        <div v-else-if="item.message.role === 'error'" class="pixel-msg pixel-msg--error">
          <p>{{ item.message.content }}</p>
          <button class="pixel-link-btn pixel-msg__jump" type="button" @click="retry">Retry</button>
        </div>
      </template>

      <p v-if="isWorking" class="chat-surface__working">Looking through the site…</p>

      <div v-if="messages.length === 0 && isBooting" class="pixel-msg pixel-msg--status">
        <p class="chat-console__boot">Downloading the chat model…</p>
        <div
          class="ai-progress pixel-msg__progress"
          role="progressbar"
          aria-label="Downloading the chat model"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="state.progress"
        >
          <span
            class="ai-progress__bar"
            :style="{ clipPath: 'inset(0 ' + (100 - state.progress) + '% 0 0)' }"
          ></span>
        </div>
        <p class="pixel-msg__dim">{{ state.progress }}% · {{ state.file || 'fetching…' }}</p>
      </div>

      <div v-if="state.status === 'error' && !hasErrorEntry" class="pixel-msg pixel-msg--error">
        <p>{{ humanizeModelError(state.error ?? '') }}</p>
        <button class="pixel-link-btn pixel-msg__jump" type="button" @click="retry">Retry</button>
      </div>

      <div
        v-if="messages.length === 0 && !isBooting && state.status !== 'error'"
        class="chat-console__empty"
      >
        <div class="chat-console__intro-row">
          <img
            src="/mm.webp"
            alt=""
            aria-hidden="true"
            width="28"
            height="28"
            class="pixel-chat__bubble-avatar"
          />
          <p class="chat-console__intro">
            Ask me anything about Michael — his work, education, projects, or how this page is
            built.
          </p>
        </div>
        <div v-if="state.status === 'idle'" class="chat-console__boot-row">
          <button class="pixel-link-btn" type="button" @click="loadModel">Load the model</button>
          <span class="chat-console__boot-note"> Downloads once, then stays in your browser. </span>
        </div>
      </div>

      <div
        v-if="messages.length === 0 && suggestions.length && state.status !== 'error'"
        class="chat-surface__examples"
      >
        <button
          v-for="example in suggestions"
          :key="example"
          class="pixel-chip pixel-chat__example"
          type="button"
          :disabled="isGenerating || !canAsk"
          @click="handleSend(example)"
        >
          {{ example }}
        </button>
        <button
          class="pixel-chat__shuffle"
          type="button"
          :disabled="isGenerating || !canAsk"
          @click="pickSuggestions()"
        >
          Shuffle
        </button>
      </div>
    </div>

    <div class="chat-console__foot">
      <span class="chat-console__note">Answers cite the page sources they used.</span>
      <button
        class="chat-console__clear"
        type="button"
        :disabled="isGenerating || messages.length === 0"
        @click="clear"
      >
        Clear
      </button>
    </div>

    <form class="chat-console__prompt" @submit.prevent="handleSend()">
      <span class="chat-console__prompt-mark" aria-hidden="true">&gt;</span>
      <input
        ref="inputEl"
        v-model="input"
        class="chat-console__field"
        type="text"
        autocomplete="off"
        :disabled="isGenerating || !canAsk"
        :placeholder="placeholder"
        aria-label="Your question"
      />
      <button
        v-if="isGenerating"
        class="pixel-chat__send pixel-chat__send--stop"
        type="button"
        @click="cancel"
      >
        Stop
      </button>
      <button v-else class="pixel-chat__send" type="submit" :disabled="!canAsk || !input.trim()">
        Send
      </button>
    </form>
  </div>
</template>
