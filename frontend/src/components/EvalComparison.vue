<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  formatLatency,
  type CaseResult,
  type EvalResults,
  type ModeAggregate,
} from '../data/evalResults'

type MetricKey = 'retrievalHitRate' | 'injectionCoverRate' | 'actionPassRate'

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

interface SplitBars {
  n: number
  meanLatencyMs: number
  bars: CompareBar[]
}

interface CompareRow {
  mode: string
  latencyMs: number
  /** Held-out split — the pass/fail gate; rendered as the headline. */
  test: SplitBars
  /** Tuning reference — not the gate; rendered below to expose the gap. */
  train: SplitBars
}

interface QuestionGroup {
  fixtureIndex: number
  query: string
  rows: CaseResult[]
}

const props = defineProps<{ results: EvalResults }>()

const pct = (value: number): string => `${Math.round(value * 100)}%`
const barClip = (value: number): string => `inset(0 ${100 - Math.round(value * 100)}% 0 0)`
const caseReason = (entry: CaseResult): string => {
  if (entry.error) return 'runtime error'
  if (!entry.retrievalPass) return 'retrieval missed'
  if (!entry.actionPass) {
    return entry.appliedTheme ? 'action misfired' : 'expected action missed'
  }
  return 'expected source not injected'
}

const EVAL_METRICS: EvalMetric[] = [
  {
    key: 'retrievalHitRate',
    label: `hit@${props.results.config.topK}`,
    color: 'eval-metric--amber',
  },
  { key: 'injectionCoverRate', label: 'injection cover', color: 'eval-metric--orange' },
  { key: 'actionPassRate', label: 'action pass', color: 'eval-metric--pink' },
]

const activeMetrics = ref<MetricKey[]>(['retrievalHitRate', 'injectionCoverRate'])

const toggleMetric = (key: MetricKey): void => {
  if (activeMetrics.value.includes(key)) {
    if (activeMetrics.value.length === 1) return
    activeMetrics.value = activeMetrics.value.filter((k) => k !== key)
  } else {
    activeMetrics.value = [...activeMetrics.value, key]
  }
}

const splitBars = (aggregate: ModeAggregate | undefined): SplitBars => ({
  n: aggregate?.n ?? 0,
  meanLatencyMs: aggregate?.meanLatencyMs ?? 0,
  bars: EVAL_METRICS.filter((m) => activeMetrics.value.includes(m.key)).map((m) => ({
    key: m.key,
    label: m.label,
    color: m.color,
    value: aggregate?.[m.key] ?? 0,
    pct: pct(aggregate?.[m.key] ?? 0),
  })),
})

const compareRows = computed<CompareRow[]>(() =>
  props.results.modes.map((mode) => ({
    mode: mode.mode,
    latencyMs: mode.meanLatencyMs,
    test: splitBars(mode.splits?.test),
    train: splitBars(mode.splits?.train),
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
  const passed = cases.filter((entry) => entry.pass).length
  const failed = total - passed
  const testFailed = cases.filter((entry) => entry.split === 'test' && !entry.pass).length
  const trainFailed = failed - testFailed
  const tally = new Map<string, number>()
  for (const entry of cases) {
    if (entry.pass) continue
    const reason = caseReason(entry)
    tally.set(reason, (tally.get(reason) ?? 0) + 1)
  }
  const reasonsText = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${reason} ${count}`)
    .join(' · ')
  const splitNote = failed > 0 ? ` (${testFailed} test · ${trainFailed} train)` : ''
  return reasonsText
    ? `${total} runs — ${passed} pass · ${failed} fail${splitNote}. Failures: ${reasonsText}.`
    : `${total} runs — ${passed} pass · ${failed} fail.`
})
</script>

<template>
  <div v-if="results.fixtures.total > 0 && results.modes.length > 0" class="eval-compare">
    <h4 class="eval-cases__title">Comparison</h4>
    <p class="eval-compare__note">
      Pass/fail gate: the {{ results.config.gateSplit }} split ({{ results.fixtures.test }} of
      {{ results.fixtures.total }} fixtures) — train rows are the tuning reference, not the gate.
    </p>
    <div class="eval-compare__chips" role="group" aria-label="Chart metrics">
      <button
        v-for="metric in EVAL_METRICS"
        :key="metric.key"
        type="button"
        class="pixel-chip eval-compare__chip"
        :class="[
          metric.color,
          { 'eval-compare__chip--active': activeMetrics.includes(metric.key) },
        ]"
        :aria-pressed="activeMetrics.includes(metric.key)"
        @click="toggleMetric(metric.key)"
      >
        <span class="eval-compare__swatch" aria-hidden="true"></span>
        {{ metric.label }}
      </button>
    </div>
    <p class="eval-compare__note">
      These chips switch the percentage metrics on the chart — average time taken per query is shown
      alongside each mode and split.
    </p>

    <div class="eval-chart">
      <div v-for="row in compareRows" :key="row.mode" class="eval-chart__row">
        <h4 class="eval-chart__mode">
          {{ row.mode }}
          <span class="eval-chart__mode-latency">avg time {{ formatLatency(row.latencyMs) }}</span>
        </h4>
        <div class="eval-chart__splits">
          <p class="eval-chart__split-label">
            <span>test — the pass/fail gate ({{ row.test.n }} runs)</span>
            <span class="eval-chart__split-latency">{{
              formatLatency(row.test.meanLatencyMs)
            }}</span>
          </p>
          <div class="eval-chart__bars">
            <div
              v-for="bar in row.test.bars"
              :key="bar.key"
              class="eval-chart__bar"
              :class="bar.color"
            >
              <span class="eval-chart__metric-label">{{ bar.label }}</span>
              <span class="tool-result__bar eval-chart__track" aria-hidden="true">
                <i :style="{ clipPath: barClip(bar.value) }"></i>
              </span>
              <span class="eval-chart__value">{{ bar.pct }}</span>
            </div>
          </div>
          <p class="eval-chart__split-label eval-chart__split-label--train">
            <span>train — tuning reference, not the gate ({{ row.train.n }} runs)</span>
            <span class="eval-chart__split-latency">{{
              formatLatency(row.train.meanLatencyMs)
            }}</span>
          </p>
          <div class="eval-chart__bars eval-chart__bars--train">
            <div
              v-for="bar in row.train.bars"
              :key="bar.key"
              class="eval-chart__bar"
              :class="bar.color"
            >
              <span class="eval-chart__metric-label">{{ bar.label }}</span>
              <span class="tool-result__bar eval-chart__track" aria-hidden="true">
                <i :style="{ clipPath: barClip(bar.value) }"></i>
              </span>
              <span class="eval-chart__value">{{ bar.pct }}</span>
            </div>
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
            <span class="eval-case__split" :class="`eval-case__split--${entry.split}`">{{
              entry.split
            }}</span>
            <span class="eval-case__latency">{{ formatLatency(entry.latencyMs) }}</span>
            <span
              class="eval-case__marker"
              :class="entry.pass ? 'eval-case__marker--pass' : 'eval-case__marker--fail'"
              >{{ entry.pass ? 'PASS' : 'FAIL' }}</span
            >
          </div>
          <p class="eval-case__meta">
            <template v-if="entry.effectiveMode !== entry.mode"
              >→ {{ entry.effectiveMode }} ·
            </template>
            <template v-if="entry.appliedTheme">action: {{ entry.appliedTheme }}</template>
            <template v-else>
              injected:
              {{ entry.injectedNames.length ? entry.injectedNames.join(', ') : 'none' }}
            </template>
          </p>
          <p v-if="!entry.pass" class="eval-case__reason">{{ caseReason(entry) }}</p>
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
