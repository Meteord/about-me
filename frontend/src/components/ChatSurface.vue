<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { MODEL_STATUS_LABEL, humanizeModelError } from '../composables/useChatModel'
import { SECTION_LABEL, useChatSession } from '../composables/useChatSession'
import { siteData } from '../data/siteData'

const props = defineProps<{ variant: 'inline' | 'launcher' }>()

const {
  state,
  launcherOpen,
  messages,
  input,
  isGenerating,
  generatingId,
  suggestions,
  sourcesUsed,
  send,
  cancel,
  clear,
  loadModel,
  pickSuggestions,
  focusAssistantTarget,
} = useChatSession()

const logEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

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
/** Only the surface the visitor is looking at may announce new messages. */
const live = computed(() =>
  props.variant === 'launcher' ? launcherOpen.value : !launcherOpen.value,
)
const isWorking = computed(() => isGenerating.value && generatingId.value === null)

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
  <div class="chat-surface" :class="`chat-surface--${variant}`">
    <p v-if="sourcesUsed.labels.length" class="chat-surface__used">
      <span class="chat-surface__used-label">Used</span>
      {{ sourcesUsed.labels.join(', ') }}
    </p>

    <div
      ref="logEl"
      class="pixel-chat chat-surface__log"
      role="log"
      :aria-live="live ? 'polite' : 'off'"
      aria-label="Mini-Michi conversation"
    >
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
            <div class="pixel-contact pixel-chat-contact__links">
              <a
                :href="siteData.contact.linkedin"
                target="_blank"
                rel="noopener"
                class="pixel-contact__link pixel-contact__link--linkedin"
              >
                LinkedIn
              </a>
              <a
                :href="siteData.contact.github"
                target="_blank"
                rel="noopener"
                class="pixel-contact__link pixel-contact__link--github"
              >
                GitHub
              </a>
            </div>
          </template>
          <template v-else-if="message.payload.kind === 'section'">
            <button
              class="pixel-link-btn pixel-msg__jump"
              type="button"
              @click="focusAssistantTarget(message.payload.section, message.payload.target)"
            >
              {{
                message.payload.target
                  ? 'View the article'
                  : `View ${SECTION_LABEL[message.payload.section]} section`
              }}
            </button>
          </template>
        </div>
        <div v-else-if="message.role === 'error'" class="pixel-msg pixel-msg--error">
          {{ message.content }}
        </div>
      </template>

      <p v-if="isWorking" class="chat-surface__working">Looking through the site…</p>

      <div
        v-if="messages.length === 0 && (state.status === 'checking' || state.status === 'loading')"
        class="pixel-msg pixel-msg--status"
      >
        <p class="pixel-msg__text">Warming up Mini-Michi…</p>
        <div
          class="ai-progress pixel-msg__progress"
          role="progressbar"
          aria-label="Downloading Mini-Michi"
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

      <div v-else-if="state.status === 'error'" class="pixel-msg pixel-msg--error">
        <p>{{ humanizeModelError(state.error ?? '') }}</p>
        <button class="pixel-link-btn pixel-msg__jump" type="button" @click="retry">Retry</button>
      </div>

      <div v-if="messages.length === 0" class="chat-surface__start">
        <p v-if="state.status === 'idle'" class="chat-surface__hint">
          Ask about Michael’s work, education, projects or how this page works. The model downloads
          once, then stays in your browser.
        </p>
        <p v-else-if="state.status === 'ready'" class="chat-surface__hint">
          Ready. Ask about Michael’s work, education, projects or how this page works.
        </p>
        <button
          v-if="state.status === 'idle'"
          class="pixel-link-btn chat-surface__load"
          type="button"
          @click="loadModel"
        >
          Load Mini-Michi
        </button>
      </div>

      <div
        v-if="suggestions.length"
        class="pixel-tags chat-surface__examples"
        aria-label="Try asking"
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
          class="pixel-link-btn pixel-chat__shuffle"
          type="button"
          :disabled="isGenerating || !canAsk"
          @click="pickSuggestions()"
        >
          Shuffle
        </button>
      </div>
    </div>

    <form class="pixel-chat__input chat-surface__input" @submit.prevent="handleSend()">
      <input
        ref="inputEl"
        v-model="input"
        class="pixel-chat__field chat-surface__field"
        type="text"
        autocomplete="off"
        :disabled="isGenerating || !canAsk"
        :placeholder="
          state.status === 'ready'
            ? 'Ask Mini-Michi…'
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
        @click="cancel"
      >
        Stop
      </button>
      <button v-else class="pixel-chat__send" type="submit" :disabled="!canAsk || !input.trim()">
        Send
      </button>
    </form>

    <div class="chat-surface__footer">
      <span class="chat-surface__status" aria-live="polite">
        chat model · {{ MODEL_STATUS_LABEL[state.status] }}
      </span>
      <button
        class="pixel-link-btn chat-surface__clear"
        type="button"
        :disabled="isGenerating || messages.length === 0"
        @click="clear"
      >
        Clear
      </button>
    </div>
  </div>
</template>
