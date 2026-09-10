<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useChatModel } from '../composables/useChatModel'
import {
  TOOL_SCHEMAS,
  SYSTEM_PROMPT,
  extractToolCallContent,
  extractPythonicCalls,
  executeToolCall,
  type ToolResult,
} from '../tools/registry'
import SnakeGame from './SnakeGame.vue'

type ChatMessage =
  | { id: number; role: 'user'; content: string }
  | { id: number; role: 'assistant'; content: string }
  | { id: number; role: 'tool-call'; calls: string[] }
  | { id: number; role: 'tool-result'; results: ToolResult[] }
  | { id: number; role: 'error'; content: string }

const { state, loadModel, generate, dispose } = useChatModel()

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
  'What skills does Michael have?',
  'Start a game of snake',
  'Move the contact section to the top',
  'Switch the theme to red',
]

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

function gameFromResults(results: ToolResult[]): 'snake' | null {
  for (const result of results) {
    if (result.result && typeof result.result === 'object' && 'game' in result.result) {
      const game = (result.result as { game?: string }).game
      if (game === 'snake') return 'snake'
    }
  }
  return null
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

function scrollToBottom(): void {
  nextTick(() => {
    if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
  })
}

watch(
  () => [messages.value.length, isGenerating.value],
  () => scrollToBottom(),
)

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

  input.value = ''
  push('user', { content: text })
  modelMessages.value.push({ role: 'user', content: text })
  isGenerating.value = true

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const placeholderId = push('assistant', { content: '' })
      generatingId.value = placeholderId

      let streamed = ''
      const response = await generate(
        [{ role: 'system', content: SYSTEM_PROMPT }, ...modelMessages.value],
        TOOL_SCHEMAS,
        (token: string) => {
          streamed += token
          const current = messages.value.find((message) => message.id === placeholderId)
          if (current && current.role === 'assistant') current.content = streamed
          scrollToBottom()
        },
      )
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
    nextTick(() => inputEl.value?.focus())
  }
}

function clearChat(): void {
  messages.value = []
  modelMessages.value = []
  dispose()
}
</script>

<template>
  <div class="ai-panel">
    <div class="ai-panel__bar">
      <span class="ai-panel__title">Micro-Mike</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
    <div class="ai-panel__body">
      <div class="ai-status" aria-live="polite">
        <span class="ai-status__badge" :class="`ai-status__badge--${state.status}`">
          {{ state.status }}
        </span>
        <span v-if="state.device" class="ai-status__device">
          {{ state.device === 'webgpu' ? 'WEBGPU' : 'WASM' }} · {{ state.dtype }}
        </span>
        <span v-if="state.status === 'loading'" class="ai-status__file">{{ state.file }}</span>
        <button
          v-if="state.status === 'idle' || state.status === 'error'"
          class="pixel-link-btn ai-status__load"
          type="button"
          @click="loadModel"
        >
          {{ state.status === 'error' ? 'Retry model' : 'Load model' }}
        </button>
        <button class="pixel-link-btn ai-status__clear" type="button" @click="clearChat">
          Clear
        </button>
      </div>

      <div
        v-if="state.status === 'loading'"
        class="ai-progress"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="state.progress"
      >
        <span class="ai-progress__bar" :style="{ width: state.progress + '%' }"></span>
      </div>
      <p v-if="state.status === 'error'" class="ai-error">{{ state.error }}</p>

      <div ref="chatEl" class="pixel-chat">
        <template v-for="message in messages" :key="message.id">
          <div v-if="message.role === 'user'" class="pixel-msg pixel-msg--user">
            <p>{{ message.content }}</p>
          </div>
          <div v-else-if="message.role === 'assistant'" class="pixel-msg pixel-msg--ai">
            <p class="pixel-msg__text">{{ message.content }}</p>
            <span
              v-if="generatingId === message.id"
              class="pixel-msg__cursor"
              aria-hidden="true"
            ></span>
          </div>
          <div v-else-if="message.role === 'tool-call'" class="pixel-msg pixel-msg--tool">
            calling {{ message.calls.join(', ') }}
          </div>
          <div v-else-if="message.role === 'tool-result'" class="pixel-msg pixel-msg--tool-result">
            <SnakeGame v-if="gameFromResults(message.results) === 'snake'" />
            <template v-else>
              <p v-if="toolNote(message.results)" class="pixel-msg__text">
                {{ toolNote(message.results) }}
              </p>
              <p class="pixel-msg__dim">{{ summarizeResults(message.results) }}</p>
            </template>
          </div>
          <div v-else-if="message.role === 'error'" class="pixel-msg pixel-msg--error">
            {{ message.content }}
          </div>
        </template>

        <div v-if="messages.length === 0" class="pixel-chat__empty">
          <p class="pixel-chat__hint">
            Hi! I'm Micro-Mike, an on-device SLM running here in your browser over
            {{
              state.device === 'webgpu'
                ? 'WebGPU'
                : state.device === 'wasm'
                  ? 'WebAssembly'
                  : 'WebGPU or WebAssembly'
            }}. I can look up Michael's info, start games and restructure this page.
          </p>
          <div class="pixel-tags pixel-chat__examples">
            <button
              v-for="example in EXAMPLES"
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
      </div>

      <form class="pixel-chat__input" @submit.prevent="handleSend()">
        <input
          ref="inputEl"
          v-model="input"
          class="pixel-chat__field"
          type="text"
          autocomplete="off"
          :disabled="isGenerating || state.status !== 'ready'"
          :placeholder="state.status === 'ready' ? 'Talk to Micro-Mike…' : 'Load the model first…'"
          aria-label="Chat message"
        />
        <button
          class="pixel-link-btn pixel-chat__send"
          type="submit"
          :disabled="isGenerating || state.status !== 'ready' || !input.trim()"
        >
          Send
        </button>
      </form>
    </div>
  </div>
</template>
