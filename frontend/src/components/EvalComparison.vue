<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CaseResult, EvalResults } from '../data/evalResults'

type MetricKey =
  | 'retrievalHitRate'
  | 'injectionCoverRate'
  | 'factRecall'
  | 'faithfulness'
  | 'actionPassRate'
  | 'chainPassRate'

interface EvalMetric {
  key: MetricKey
  label: string
  color: string
}

interface CompareBar {
  key: MetricKey
  label: string
  value: number
  pct: string
  color: string
}

interface CompareRow {
  mode: string
  latencyMs: number
  bars: CompareBar[]
}

interface QuestionGroup {
  fixtureIndex: number
  query: string
  rows: CaseResult[]
}

const props = defineProps<{ results: EvalResults }>()

const pct = (value: number): string => `${Math.round(value * 100)}%`
const barClip = (value: number): string => `inset(0 ${100 - Math.round(value * 100)}% 0 0)`
const formatLatency = (ms: number): string =>
  ms >= 1000 ? `${(ms / 1000).toFixed(0)}s` : `${Math.round(ms)}ms`
const caseReason = (entry: CaseResult): string => {
  if (!entry.retrievalPass) return 'retrieval missed'
  if (entry.appliedTheme) return 'action misfired'
  if (!entry.injectionPass) return 'expected source not injected'
  if (!entry.answerPass) return 'answer drifted'
  return 'chain failed'
}

const EVAL_METRICS: EvalMetric[] = [
  {
    key: 'retrievalHitRate',
    label: `hit@${props.results.config.topK}`,
    color: 'eval-metric--amber',
  },
  { key: 'injectionCoverRate', label: 'injection cover', color: 'eval-metric--orange' },
  { key: 'factRecall', label: 'fact recall', color: 'eval-metric--amber' },
  { key: 'faithfulness', label: 'faithfulness', color: 'eval-metric--orange' },
  { key: 'actionPassRate', label: 'action pass', color: 'eval-metric--amber' },
  { key: 'chainPassRate', label: 'chain pass', color: 'eval-metric--orange' },
]

const activeMetrics = ref<MetricKey[]>(['factRecall', 'faithfulness'])

const toggleMetric = (key: MetricKey): void => {
  if (activeMetrics.value.includes(key)) {
    if (activeMetrics.value.length === 1) return
    activeMetrics.value = activeMetrics.value.filter((k) => k !== key)
  } else {
    activeMetrics.value = [...activeMetrics.value, key]
  }
}

const compareRows = computed<CompareRow[]>(() =>
  props.results.modes.map((mode) => ({
    mode: mode.mode,
    latencyMs: mode.meanTotalLatencyMs,
    bars: EVAL_METRICS.filter((m) => activeMetrics.value.includes(m.key)).map((m) => ({
      key: m.key,
      label: m.label,
      color: m.color,
      value: mode[m.key],
      pct: pct(mode[m.key]),
    })),
  })),
)

const questionGroups = computed<QuestionGroup[]>(() => {
  const groups: QuestionGroup[] = []
  const groupByFixture = new Map<number, QuestionGroup>()
  for (const entry of props.results.cases) {
    let group = groupByFixture.get(entry.fixtureIndex)
    if (!group) {
      group = { fixtureIndex: entry.fixtureIndex, query: entry.query, rows: [] }
      groupByFixture.set(entry.fixtureIndex, group)
      groups.push(group)
    }
    group.rows.push(entry)
  }
  for (const group of groups) {
    group.rows.sort(
      (a, b) =>
        props.results.config.modes.indexOf(a.mode) - props.results.config.modes.indexOf(b.mode),
    )
  }
  return groups
})

const GROUPS_PREVIEW = 3
const expanded = ref(false)
const visibleGroups = computed(() =>
  expanded.value ? questionGroups.value : questionGroups.value.slice(0, GROUPS_PREVIEW),
)

const failureSummary = computed(() => {
  const cases = props.results.cases
  if (!cases.length) return ''
  const total = cases.length
  const passed = cases.filter((entry) => entry.chainPass).length
  const failed = total - passed
  const tally = new Map<string, number>()
  for (const entry of cases) {
    if (entry.chainPass) continue
    const reason = caseReason(entry)
    tally.set(reason, (tally.get(reason) ?? 0) + 1)
  }
  const reasonsText = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${reason} ${count}`)
    .join(' · ')
  return reasonsText
    ? `${total} runs — ${passed} pass · ${failed} fail. Failures: ${reasonsText}.`
    : `${total} runs — ${passed} pass · ${failed} fail.`
})
</script>

<template>
  <div v-if="results.fixtures > 0 && results.modes.length > 0" class="eval-compare">
    <h4 class="eval-cases__title">Comparison</h4>
    <div class="eval-compare__chips" role="group" aria-label="Chart metrics">
      <button
        v-for="metric in EVAL_METRICS"
        :key="metric.key"
        type="button"
        class="pixel-chip eval-compare__chip"
        :class="{ 'eval-compare__chip--active': activeMetrics.includes(metric.key) }"
        :aria-pressed="activeMetrics.includes(metric.key)"
        @click="toggleMetric(metric.key)"
      >
        {{ metric.label }}
      </button>
    </div>
    <p class="eval-compare__note">
      These chips switch the chart metrics only — the per-fixture rows below always show fact recall
      + faithfulness.
    </p>

    <div class="eval-chart">
      <div v-for="row in compareRows" :key="row.mode" class="eval-chart__row">
        <h4 class="eval-chart__mode">
          {{ row.mode }}
          <span class="eval-chart__mode-latency">latency {{ formatLatency(row.latencyMs) }}</span>
        </h4>
        <div class="eval-chart__bars">
          <div v-for="bar in row.bars" :key="bar.key" class="eval-chart__bar" :class="bar.color">
            <span class="eval-chart__metric-label">{{ bar.label }}</span>
            <span class="tool-result__bar eval-bar__track" aria-hidden="true">
              <i :style="{ clipPath: barClip(bar.value) }"></i>
            </span>
            <span class="eval-chart__value">{{ bar.pct }}</span>
          </div>
        </div>
      </div>
    </div>

    <h4 class="eval-cases__title">Per fixture</h4>
    <p v-if="failureSummary" class="eval-compare__note">{{ failureSummary }}</p>
    <ol id="eval-cases-list" class="eval-compare__list">
      <li v-for="group in visibleGroups" :key="group.fixtureIndex" class="eval-compare__group">
        <span class="eval-case__query">{{ group.query }}</span>
        <div
          v-for="entry in group.rows"
          :key="`${entry.mode}-${entry.fixtureIndex}`"
          class="eval-compare__row"
        >
          <div class="eval-case__head">
            <span class="eval-compare__mode">{{ entry.mode }}</span>
            <span
              class="eval-case__marker"
              :class="entry.chainPass ? 'eval-case__marker--pass' : 'eval-case__marker--fail'"
              >{{ entry.chainPass ? 'PASS' : 'FAIL' }}</span
            >
          </div>
          <p class="eval-case__meta">
            <template v-if="entry.effectiveMode !== entry.mode">
              → {{ entry.effectiveMode }}
            </template>
            <template v-if="entry.appliedTheme"> · action: {{ entry.appliedTheme }}</template>
            <template v-else>
              · injected:
              {{ entry.injectedNames.length ? entry.injectedNames.join(', ') : 'none' }}
            </template>
          </p>
          <p v-if="!entry.chainPass" class="eval-case__reason">{{ caseReason(entry) }}</p>
          <div class="eval-case__bars">
            <div class="eval-bar eval-metric--amber">
              <span class="eval-bar__label">fact recall</span>
              <span class="tool-result__bar eval-bar__track" aria-hidden="true">
                <i :style="{ clipPath: barClip(entry.score.factRecall) }"></i>
              </span>
              <span class="eval-bar__value">{{ pct(entry.score.factRecall) }}</span>
            </div>
            <div class="eval-bar eval-metric--orange">
              <span class="eval-bar__label">faithfulness</span>
              <span class="tool-result__bar eval-bar__track" aria-hidden="true">
                <i :style="{ clipPath: barClip(entry.score.faithfulness) }"></i>
              </span>
              <span class="eval-bar__value">{{ pct(entry.score.faithfulness) }}</span>
            </div>
          </div>
        </div>
      </li>
    </ol>
    <button
      v-if="questionGroups.length > GROUPS_PREVIEW"
      type="button"
      class="pixel-link-btn eval-compare__more"
      :aria-expanded="expanded"
      aria-controls="eval-cases-list"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Show fewer' : `Show all ${questionGroups.length} questions` }}
    </button>
  </div>
</template>
