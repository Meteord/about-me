<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MODEL_STATUS_LABEL, humanizeModelError, useChatModel } from '../composables/useChatModel'
import { useToolRetrieval, type RetrievalMode } from '../composables/useToolRetrieval'
import { useSiteLayout } from '../composables/useSiteLayout'
import { toolSelectorOpen, sampling } from '../composables/retrievalSettings'
import { SOURCE_DEFS, buildContextText, decideAction } from '../tools/registry'

defineProps<{ onClear?: () => void }>()

const { state: chatState, loadModel } = useChatModel()
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
const { state: layout } = useSiteLayout()

const MODES: RetrievalMode[] = ['lexical', 'vector', 'hybrid', 'decide']
const MODE_LABEL: Record<RetrievalMode, string> = {
  lexical: 'LEX',
  vector: 'VECTOR',
  hybrid: 'HYBRID',
  decide: 'DECIDE',
}
const MODE_MEANING: Record<RetrievalMode, string> = {
  lexical: 'keyword match',
  vector: 'meaning match',
  hybrid: 'keyword + meaning',
  decide: 'classifies which source your question is about',
}

const SAMPLES = [
  'Tell me about MUCGPT',
  'Switch the theme to red',
  'What education does Michael have?',
  'Show me a skills chart',
  'How can I contact Michael?',
]

const TOTAL = SOURCE_DEFS.length
const DESCRIPTION = new Map(SOURCE_DEFS.map((def) => [def.name, def.description]))

const query = ref('')
const busy = ref(false)
const expanded = toolSelectorOpen
const error = ref<string | null>(null)
const injectedNames = ref<string[]>([])

const toolDescription = (name: string): string => DESCRIPTION.get(name) ?? ''

async function runRetrieve(raw?: string): Promise<void> {
  const text = (raw ?? query.value).trim()
  if (!text || busy.value) return
  query.value = text
  busy.value = true
  error.value = null
  injectedNames.value = []
  try {
    const result = await retrieve(text)
    const { names } = await buildContextText(result.selectedNames)
    injectedNames.value = names
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
      void loadVectorSafe()
    }
  }
}

function loadVectorSafe(): void {
  void loadVector().catch(() => {})
}

function loadDecideSafe(): void {
  void loadDecide().catch(() => {})
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

watch(
  () => decide.value.status,
  (status) => {
    if (status === 'ready' && lastQuery.value && mode.value === 'decide') {
      void runRetrieve(lastQuery.value)
    }
  },
)

const prunedPercent = computed(() => {
  if (!lastResult.value || !lastResult.value.stats.totalChars) return 0
  const { totalChars, prunedChars } = lastResult.value.stats
  return Math.round((prunedChars / totalChars) * 100)
})

/** Whether the set_theme action would actually fire for the current query. */
const themeActed = computed(() => {
  if (!lastResult.value || !lastQuery.value) return false
  return decideAction(lastQuery.value, lastResult.value.rows, layout.theme) !== null
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
        <span class="tool-selector__tagline">chat model + content retriever</span>
      </span>
      <span
        class="ai-status__badge tool-selector__bar-status"
        :class="`ai-status__badge--${chatState.status}`"
      >
        {{ MODEL_STATUS_LABEL[chatState.status] }}
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
              {{ MODEL_STATUS_LABEL[chatState.status] }}
            </span>
            <span v-if="chatState.device" class="ai-status__device">
              {{ chatState.device === 'webgpu' ? 'WEBGPU' : 'WASM' }}
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
            <span
              class="ai-progress__bar"
              :style="{ clipPath: 'inset(0 ' + (100 - chatState.progress) + '% 0 0)' }"
            ></span>
          </div>
          <p v-if="chatState.status === 'error'" class="ai-error">
            {{ humanizeModelError(chatState.error ?? '') }}
          </p>
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
          <p class="model-settings__heading">Content retriever</p>
          <p class="tool-selector__intro">
            Before every reply, Mini-Michi matches your question against every content source and
            action and injects only the few most relevant sources into the chat context — the model
            never sees all {{ TOTAL }} at once, and actions are applied directly by the retriever.
          </p>
          <details class="tool-selector__details">
            <summary>Under the hood — four retrieval strategies</summary>
            <p class="tool-selector__intro">
              Keyword match (BM25 over the enriched source index), meaning match (an on-device
              zero-shot prompt-router, LFM2.5-Encoder-350M), both fused via reciprocal rank fusion,
              or DECIDE — a GLiNER2.5-Decide classifier that picks which content source a query is
              about.
            </p>
          </details>

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
                  :aria-pressed="mode === m"
                  :aria-label="MODE_LABEL[m] + ' — ' + MODE_MEANING[m]"
                  :title="MODE_MEANING[m]"
                  @click="setMode(m)"
                >
                  {{ MODE_LABEL[m] }}
                </button>
              </div>

              <div class="tool-selector__topk">
                <button
                  type="button"
                  class="tool-selector__step"
                  aria-label="Retrieve fewer candidates"
                  :disabled="busy"
                  @click="bumpTopK(-1)"
                >
                  −
                </button>
                <span class="tool-selector__topk-value">top {{ topK }}</span>
                <button
                  type="button"
                  class="tool-selector__step"
                  aria-label="Retrieve more candidates"
                  :disabled="busy"
                  @click="bumpTopK(1)"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="(mode === 'vector' || mode === 'hybrid') && vector.status === 'loading'"
            class="tool-selector__load"
          >
            <span class="tool-selector__load-label">Vector retriever</span>
            <div
              class="ai-progress tool-selector__progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="vector.progress"
            >
              <span
                class="ai-progress__bar"
                :style="{ clipPath: 'inset(0 ' + (100 - vector.progress) + '% 0 0)' }"
              ></span>
            </div>
            <span class="tool-selector__load-meta">
              <span v-if="vector.file" class="ai-status__file">{{ vector.file }}</span>
              <button type="button" class="tool-selector__cancel" @click="disposeVector">
                Cancel
              </button>
            </span>
          </div>

          <p v-if="vector.status === 'error'" class="tool-selector__error">
            Vector retriever failed to load — falling back to lexical scores.
            <span v-if="vector.error" class="tool-selector__error-msg">{{ vector.error }}</span>
            <button type="button" class="tool-selector__retry" @click="loadVectorSafe">
              Retry
            </button>
          </p>

          <div v-if="mode === 'decide' && decide.status === 'idle'" class="tool-selector__gate">
            <p class="tool-selector__gate-text">
              DECIDE needs an extra on-device classifier — about 345&nbsp;MB, downloaded once and
              cached.
            </p>
            <button
              type="button"
              class="pixel-link-btn tool-selector__gate-btn"
              @click="loadDecideSafe"
            >
              Load DECIDE
            </button>
          </div>

          <div v-if="mode === 'decide' && decide.status === 'loading'" class="tool-selector__load">
            <span class="tool-selector__load-label">Decide retriever</span>
            <div
              class="ai-progress tool-selector__progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="decide.progress"
            >
              <span
                class="ai-progress__bar"
                :style="{ clipPath: 'inset(0 ' + (100 - decide.progress) + '% 0 0)' }"
              ></span>
            </div>
            <span class="tool-selector__load-meta">
              <span v-if="decide.file" class="ai-status__file">{{ decide.file }}</span>
              <button type="button" class="tool-selector__cancel" @click="disposeDecide">
                Cancel
              </button>
            </span>
          </div>

          <p v-if="mode === 'decide' && decide.status === 'error'" class="tool-selector__error">
            Decide retriever failed to load — falling back to lexical scores.
            <span v-if="decide.error" class="tool-selector__error-msg">{{ decide.error }}</span>
            <button type="button" class="tool-selector__retry" @click="loadDecideSafe">
              Retry
            </button>
          </p>

          <div v-if="lastResult" class="tool-selector__results" aria-live="polite">
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
                  <i
                    :style="{
                      clipPath: 'inset(0 ' + (100 - Math.round(row.score * 100)) + '% 0 0)',
                    }"
                  ></i>
                </span>
                <span class="tool-result__score">{{ row.score.toFixed(2) }}</span>
                <span
                  v-if="row.name === 'set_theme' && themeActed"
                  class="tool-result__tag tool-result__tag--acted"
                  >ACTED</span
                >
                <span
                  v-else-if="row.selected && injectedNames.includes(row.name)"
                  class="tool-result__tag"
                  >IN CONTEXT</span
                >
              </li>
            </ol>

            <p class="tool-selector__stats">
              {{ lastResult.stats.total }} candidates · top {{ lastResult.stats.selected }} selected
              ·
              {{
                lastResult.stats.effective === lastResult.stats.mode
                  ? lastResult.stats.mode
                  : lastResult.stats.effective + ' (fallback)'
              }}
              · ~{{ prunedPercent }}% pruned · {{ lastResult.stats.latencyMs }}ms
            </p>
            <p class="tool-selector__stats tool-selector__stats--gloss">
              → only those sources are injected into the chat context.
            </p>
          </div>

          <div v-else class="tool-selector__empty">
            <p class="pixel-chat__hint">
              Type a request to see which content sources and actions get pre-selected for the chat
              model.
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
