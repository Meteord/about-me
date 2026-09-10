<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatModel } from '../composables/useChatModel'
import { useToolRetrieval, type RetrievalMode } from '../composables/useToolRetrieval'
import { toolSelectorOpen, sampling } from '../composables/retrievalSettings'
import { TOOL_SCHEMAS } from '../tools/registry'

defineProps<{ onClear?: () => void }>()

const { state: chatState, loadModel } = useChatModel()
const { mode, topK, lastQuery, lastResult, vector, retrieve, loadVector } = useToolRetrieval()

const MODES: RetrievalMode[] = ['lexical', 'vector', 'hybrid']
const MODE_LABEL: Record<RetrievalMode, string> = {
  lexical: 'LEX',
  vector: 'VECTOR',
  hybrid: 'HYBRID',
}

const SAMPLES = [
  'Move contact to the top',
  'Tell me about MUCGPT',
  'Switch the theme to red',
  'Toggle the scanlines',
  'What education does Michael have?',
]

const TOTAL = TOOL_SCHEMAS.length
const DESCRIPTION = new Map(
  TOOL_SCHEMAS.map((tool) => [tool.function.name, tool.function.description]),
)

const query = ref('')
const busy = ref(false)
const expanded = toolSelectorOpen
const error = ref<string | null>(null)

const toolDescription = (name: string): string => DESCRIPTION.get(name) ?? ''

async function runRetrieve(raw?: string): Promise<void> {
  const text = (raw ?? query.value).trim()
  if (!text || busy.value) return
  query.value = text
  busy.value = true
  error.value = null
  try {
    await retrieve(text)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

function onSample(sample: string): void {
  void runRetrieve(sample)
}

function setMode(next: RetrievalMode): void {
  mode.value = next
  if (next === 'vector' || next === 'hybrid') {
    if (vector.value.status !== 'ready' && vector.value.status !== 'loading') {
      void loadVector()
    }
  }
}

function bumpTopK(delta: number): void {
  topK.value = Math.min(TOTAL, Math.max(1, topK.value + delta))
}

watch([mode, topK], () => {
  if (lastQuery.value) void runRetrieve(lastQuery.value)
})

watch(lastQuery, (queryText) => {
  query.value = queryText
})

watch(
  () => vector.value.status,
  (status) => {
    if (
      status === 'ready' &&
      lastQuery.value &&
      (mode.value === 'vector' || mode.value === 'hybrid')
    ) {
      void runRetrieve(lastQuery.value)
    }
  },
)

const prunedPercent = computed(() => {
  if (!lastResult.value || !lastResult.value.stats.totalChars) return 0
  const { totalChars, prunedChars } = lastResult.value.stats
  return Math.round((prunedChars / totalChars) * 100)
})
</script>

<template>
  <div class="tool-selector">
    <button
      type="button"
      class="tool-selector__bar"
      :aria-expanded="expanded"
      aria-controls="tool-selector-content"
      @click="expanded = !expanded"
    >
      <span class="tool-selector__heading">
        <span class="tool-selector__title">Model settings</span>
        <span class="tool-selector__tagline">chat model + tool retriever</span>
      </span>
      <span
        class="ai-status__badge tool-selector__bar-status"
        :class="`ai-status__badge--${chatState.status}`"
      >
        {{ chatState.status }}
      </span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="pixel-window__toggle">{{ expanded ? '−' : '+' }}</span>
    </button>

    <transition name="fade">
      <div v-if="expanded" id="tool-selector-content" class="tool-selector__content">
        <div class="model-settings__section">
          <p class="model-settings__heading">Chat model</p>
          <div class="ai-status" aria-live="polite">
            <span class="ai-status__badge" :class="`ai-status__badge--${chatState.status}`">
              {{ chatState.status }}
            </span>
            <span v-if="chatState.device" class="ai-status__device">
              {{ chatState.device === 'webgpu' ? 'WEBGPU' : 'WASM' }} · {{ chatState.dtype }}
            </span>
            <span v-if="chatState.status === 'loading'" class="ai-status__file">
              {{ chatState.file }}
            </span>
            <button
              v-if="chatState.status === 'idle' || chatState.status === 'error'"
              class="pixel-link-btn ai-status__load"
              type="button"
              @click="loadModel"
            >
              {{ chatState.status === 'error' ? 'Retry model' : 'Load model' }}
            </button>
            <button
              v-if="onClear"
              class="pixel-link-btn ai-status__clear"
              type="button"
              @click="onClear"
            >
              Clear
            </button>
          </div>
          <div
            v-if="chatState.status === 'loading'"
            class="ai-progress"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="chatState.progress"
          >
            <span class="ai-progress__bar" :style="{ width: chatState.progress + '%' }"></span>
          </div>
          <p v-if="chatState.status === 'error'" class="ai-error">{{ chatState.error }}</p>
          <p class="tool-selector__intro">
            Greedy decoding with a repetition penalty keeps answers steady; enable sampling for more
            varied replies.
          </p>
          <div class="tool-selector__row">
            <button
              type="button"
              class="pixel-chip tool-selector__chip"
              :class="{ 'tool-selector__chip--active': sampling }"
              :aria-pressed="sampling"
              @click="sampling = !sampling"
            >
              {{ sampling ? 'SAMPLING' : 'GREEDY' }}
            </button>
          </div>
        </div>

        <div class="model-settings__section">
          <p class="model-settings__heading">Tool retriever</p>
          <p class="tool-selector__intro">
            Scores your request against every tool with an on-device zero-shot prompt-router
            checkpoint (LFM2.5-Encoder-350M), fused with BM25 over the enriched tool index via
            reciprocal rank fusion — so Mini-Michi only sees the schemas it actually needs.
          </p>

          <div class="tool-selector__controls">
            <form class="tool-selector__form" @submit.prevent="runRetrieve()">
              <input
                v-model="query"
                class="pixel-chat__field tool-selector__field"
                type="text"
                autocomplete="off"
                :disabled="busy"
                placeholder="e.g. Move contact to the top…"
                aria-label="Retrieval query"
              />
              <button
                class="pixel-link-btn tool-selector__go"
                type="submit"
                :disabled="busy || !query.trim()"
              >
                {{ busy ? '…' : 'Retrieve' }}
              </button>
            </form>

            <div class="tool-selector__row">
              <div class="tool-selector__chips" role="group" aria-label="Retriever mode">
                <button
                  v-for="m in MODES"
                  :key="m"
                  type="button"
                  class="pixel-chip tool-selector__chip"
                  :class="{ 'tool-selector__chip--active': mode === m }"
                  @click="setMode(m)"
                >
                  {{ MODE_LABEL[m] }}
                </button>
              </div>

              <div class="tool-selector__topk">
                <button
                  type="button"
                  class="tool-selector__step"
                  aria-label="Retrieve fewer tools"
                  :disabled="busy"
                  @click="bumpTopK(-1)"
                >
                  −
                </button>
                <span class="tool-selector__topk-value">top {{ topK }}</span>
                <button
                  type="button"
                  class="tool-selector__step"
                  aria-label="Retrieve more tools"
                  :disabled="busy"
                  @click="bumpTopK(1)"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div v-if="vector.status === 'loading'" class="tool-selector__load">
            <div
              class="ai-progress tool-selector__progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="vector.progress"
            >
              <span class="ai-progress__bar" :style="{ width: vector.progress + '%' }"></span>
            </div>
            <span v-if="vector.file" class="ai-status__file">{{ vector.file }}</span>
          </div>

          <p v-if="vector.status === 'error'" class="tool-selector__error">
            Vector retriever failed to load — falling back to lexical scores.
            <button type="button" class="tool-selector__retry" @click="loadVector">Retry</button>
          </p>

          <div v-if="lastResult" class="tool-selector__results">
            <ol class="tool-selector__list">
              <li
                v-for="row in lastResult.rows"
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
              {{ lastResult.stats.total }} tools · top {{ lastResult.stats.selected }} selected ·
              {{
                lastResult.stats.effective === lastResult.stats.mode
                  ? lastResult.stats.mode
                  : lastResult.stats.effective + ' (fallback)'
              }}
              · ~{{ prunedPercent }}% of schemas pruned · {{ lastResult.stats.latencyMs }}ms
            </p>
          </div>

          <div v-else class="tool-selector__empty">
            <p class="pixel-chat__hint">
              Type a request to see which tools get pre-selected for the chat model.
            </p>
            <div class="pixel-tags tool-selector__samples">
              <button
                v-for="sample in SAMPLES"
                :key="sample"
                type="button"
                class="pixel-chip pixel-chat__example"
                :disabled="busy"
                @click="onSample(sample)"
              >
                {{ sample }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
