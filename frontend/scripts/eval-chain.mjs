/**
 * Retrieval, context-injection, and direct theme-action evaluation (npm run eval:chain).
 *
 * Runs the retrieval and action/context-injection steps exactly as AiSection.handleSend
 * does in the browser — retrieve() (real retriever) → decideAction() (heuristic theme
 * actions) or buildContextText() (char-budgeted context injection) — over every
 * fixture × mode without loading or running the chat language model, reports stage
 * metrics and average latency per mode and split, writes the committed artifact
 * frontend/src/data/evalResults.ts, and exits non-zero on held-out test-split failures.
 * Optionally scores STS-format runtime traces via --traces=.
 *
 * Usage: npm run eval:chain [-- --modes=bm25,vector,hybrid,decide --topk=5
 *          --traces=<file|dir|url>]
 */

import { existsSync, renameSync, writeFileSync } from 'fs'
import { isAbsolute, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { FIXTURES } from './eval-fixtures.mjs'
import {
  installWindowShim,
  loadRegistry,
  loadUseToolRetrieval,
  srcDir,
  validateSplitIntegrity,
} from './eval-lib.mjs'
import { loadTraceSource, scoreTrace } from './trace-lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const VALID_MODES = ['bm25', 'vector', 'hybrid', 'decide']

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2)

const argValue = (name, fallback) => {
  const hit = args.find((value) => value.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : fallback
}
const argList = (name, fallback) => {
  const hit = args.find((value) => value.startsWith(`--${name}=`))
  return hit
    ? hit
        .split('=')
        .slice(1)
        .join('=')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : fallback
}
const argAll = (name) =>
  args
    .filter((value) => value.startsWith(`--${name}=`))
    .map((value) => value.split('=').slice(1).join('='))

const requestedModes = argList('modes', VALID_MODES)
const invalidModes = requestedModes.filter((mode) => !VALID_MODES.includes(mode))
if (invalidModes.length > 0) {
  console.error(
    `no valid retrieval modes requested (${requestedModes.join(',')}) — valid modes: ${VALID_MODES.join(', ')}`,
  )
  process.exit(1)
}
const modes = requestedModes
const topK = Number(argValue('topk', '5')) || 5
const traceSpecs = argAll('traces')

if (modes.length === 0) {
  console.error(`no valid retrieval modes requested (${argValue('modes', '')})`)
  process.exit(1)
}

const defaultTracesDir = join(here, '..', 'traces')

function resolveTraceSpec(spec) {
  if (/^https?:\/\//.test(spec)) return spec
  if (isAbsolute(spec)) return spec
  const candidates = [
    join(process.cwd(), spec),
    join(here, '..', spec),
    join(here, '..', '..', spec),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return candidates[0]
}

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

installWindowShim()
const registry = loadRegistry()

/* Fail-fast split-integrity + corpus-hygiene gate (before any retrieval or
   model download; data-model §1 V1–V7 + FR-006/SC-004). */
const integrityErrors = validateSplitIntegrity({
  fixtures: FIXTURES,
  docs: registry.getSourceDocs(),
})
if (integrityErrors.length > 0) {
  console.error('split integrity check failed:')
  for (const error of integrityErrors) console.error(`  - ${error}`)
  process.exit(1)
}

const retriever = loadUseToolRetrieval()

if (modes.some((mode) => mode === 'vector' || mode === 'hybrid')) {
  process.stderr.write('initializing prompt-router (downloads on first run)…\n')
  try {
    await retriever.loadVector()
  } catch (error) {
    process.stderr.write(
      `router unavailable (${error instanceof Error ? error.message : error}) — vector/hybrid fall back to bm25\n`,
    )
  }
  console.log(
    `router: ${retriever.vector.value.status} · ${retriever.vector.value.device} · ${retriever.vector.value.dtype}`,
  )
}

if (modes.some((mode) => mode === 'decide')) {
  process.stderr.write('initializing GLiNER2.5-Decide (downloads on first run)…\n')
  try {
    await retriever.loadDecide()
  } catch (error) {
    process.stderr.write(
      `decide unavailable (${error instanceof Error ? error.message : error}) — decide falls back to bm25\n`,
    )
  }
  console.log(
    `decide: ${retriever.decide.value.status} · ${retriever.decide.value.device} · ${retriever.decide.value.dtype}`,
  )
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

function hitAtK(selectedNames, expected, k) {
  if (expected.length === 0) return 1
  return selectedNames.slice(0, k).some((name) => expected.includes(name)) ? 1 : 0
}

function mrr(rows, expected) {
  const ranks = rows
    .filter((row) => row.selected && expected.includes(row.name))
    .map((row) => row.rank + 1)
  return ranks.length > 0 ? 1 / Math.min(...ranks) : 0
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function formatLatency(ms) {
  if (ms < 0.5) return '< 1ms'
  if (ms < 10) return `${ms.toFixed(1)}ms`
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/* ------------------------------------------------------------------ */
/* Retrieval + action/injection runner                                 */
/* ------------------------------------------------------------------ */

async function runCase(fixture, fixtureIndex, mode, caseTopK) {
  const startedAt = performance.now()
  let retrieval = null
  let caseError = null

  try {
    retrieval = await retriever.retrieve(fixture.query, { mode, topK: caseTopK })
  } catch (error) {
    caseError = error instanceof Error ? error.message : String(error)
  }

  const selectedNames = retrieval ? retrieval.selectedNames : []
  const rows = retrieval?.rows ?? []

  const currentTheme = 'amber'
  let appliedTheme = null
  let injectedNames = []

  if (!caseError) {
    try {
      const theme = registry.decideAction(fixture.query, rows, currentTheme)
      if (theme) {
        appliedTheme = theme
      } else {
        const built = await registry.buildContextText(selectedNames)
        injectedNames = built.names
      }
    } catch (error) {
      caseError = error instanceof Error ? error.message : String(error)
    }
  }

  const latencyMs = Number((performance.now() - startedAt).toFixed(2))
  const expectedTheme = fixture.expectedArgs?.set_theme?.theme
  const retrievalPass = hitAtK(selectedNames, fixture.expected, caseTopK) === 1
  const injectionPass =
    Boolean(fixture.expectAction) ||
    fixture.expected.length === 0 ||
    fixture.expected.some((name) => injectedNames.includes(name))
  const actionPass = fixture.expectAction
    ? appliedTheme !== null && (expectedTheme === undefined || appliedTheme === expectedTheme)
    : appliedTheme === null
  const pass = retrievalPass && injectionPass && actionPass && caseError === null

  const mrrScore = mrr(rows, fixture.expected)

  return {
    fixtureIndex,
    query: fixture.query,
    split: fixture.split,
    mode,
    effectiveMode: retrieval?.stats.effective ?? 'bm25',
    injectedNames,
    appliedTheme,
    latencyMs,
    retrievalPass,
    injectionPass,
    actionPass,
    pass,
    error: caseError,
    mrrScore,
  }
}

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */

function fixtureOf(index) {
  return FIXTURES[index]
}

function aggregateMode(modeName, cases, splitName = null) {
  const group = cases.filter(
    (entry) => entry.mode === modeName && (splitName === null || entry.split === splitName),
  )
  const contentCases = group.filter((entry) => {
    const fixture = fixtureOf(entry.fixtureIndex)
    return !fixture.expectAction && fixture.expected.length > 0
  })
  const actionCases = group.filter((entry) => fixtureOf(entry.fixtureIndex).expectAction)
  return {
    mode: modeName,
    n: group.length,
    retrievalHitRate: mean(group.map((entry) => (entry.retrievalPass ? 1 : 0))),
    retrievalMRR: mean(group.map((entry) => entry.mrrScore)),
    injectionCoverRate: mean(
      (contentCases.length > 0 ? contentCases : group).map((entry) =>
        entry.injectionPass ? 1 : 0,
      ),
    ),
    actionPassRate: mean(actionCases.map((entry) => (entry.actionPass ? 1 : 0))),
    passRate: mean(group.map((entry) => (entry.pass ? 1 : 0))),
    meanLatencyMs: Number(mean(group.map((entry) => entry.latencyMs)).toFixed(2)),
  }
}

function aggregateTraces(traceCases, sources, modeName, caseTopK) {
  return {
    count: traceCases.length,
    sources,
    mode: modeName,
    topK: caseTopK,
    retrievalCoverRate: mean(traceCases.map((entry) => (entry.retrievalCovered ? 1 : 0))),
    actionValidRate: mean(traceCases.map((entry) => (entry.actionValid ? 1 : 0))),
    passRate: mean(traceCases.map((entry) => (entry.pass ? 1 : 0))),
  }
}

/* ------------------------------------------------------------------ */
/* Artifact writer (frontend/src/data/evalResults.ts)                  */
/* ------------------------------------------------------------------ */

const INTERFACE_TEXT = `export interface CaseResult {
  fixtureIndex: number
  query: string
  split: 'train' | 'test'
  mode: string
  effectiveMode: string
  injectedNames: string[]
  appliedTheme: string | null
  latencyMs: number
  retrievalPass: boolean
  injectionPass: boolean
  actionPass: boolean
  pass: boolean
  error: string | null
}

export interface ModeAggregate {
  mode: string
  n: number
  retrievalHitRate: number
  retrievalMRR: number
  injectionCoverRate: number
  actionPassRate: number
  passRate: number
  meanLatencyMs: number
}

export interface ModeResult extends ModeAggregate {
  splits: {
    test: ModeAggregate
    train: ModeAggregate
  }
}

export interface TraceAggregate {
  count: number
  sources: string[]
  mode: string
  topK: number
  retrievalCoverRate: number
  actionValidRate: number
  passRate: number
}

export interface EvalResults {
  generatedAt: string
  config: {
    modes: string[]
    topK: number
    maxInjectChars: number
    device: 'cpu'
    gateSplit: 'test'
  }
  fixtures: { total: number; train: number; test: number }
  modes: ModeResult[]
  cases: CaseResult[]
  traces: TraceAggregate | null
}

export function formatLatency(ms: number): string {
  if (ms < 0.5) return '< 1ms'
  if (ms < 10) return \`\${ms.toFixed(1)}ms\`
  if (ms < 1000) return \`\${Math.round(ms)}ms\`
  return \`\${(ms / 1000).toFixed(2)}s\`
}`

function quote(value) {
  if (typeof value !== 'string') return String(value)
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`
}

function quoteKey(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quote(key)
}

function serialize(value, indent = 0) {
  const pad = '  '.repeat(indent)
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const childPad = '  '.repeat(indent + 1)
    const inner = value.map((entry) => serialize(entry, indent + 1)).join(`,\n${childPad}`)
    return `[\n${childPad}${inner},\n${pad}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return '{}'
    const childPad = '  '.repeat(indent + 1)
    const inner = entries
      .map(([key, entry]) => `${quoteKey(key)}: ${serialize(entry, indent + 1)}`)
      .join(`,\n${childPad}`)
    return `{\n${childPad}${inner},\n${pad}}`
  }
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'boolean') return String(value)
  return String(value)
}

async function writeArtifact(artifact) {
  const target = join(srcDir, 'data', 'evalResults.ts')
  const temp = `${target}.tmp`
  const body = `${INTERFACE_TEXT}

export const evalResults: EvalResults = ${serialize(artifact)}
`
  let output = body
  try {
    const prettier = await import('prettier')
    output = await prettier.format(body, {
      parser: 'typescript',
      singleQuote: true,
      semi: false,
      printWidth: 100,
    })
  } catch {
    // prettier unavailable — write the raw prettier-compliant shape
  }
  writeFileSync(temp, output)
  renameSync(temp, target)
}

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

const cases = []
for (const mode of modes) {
  console.log(`\n=== mode: ${mode} (top ${topK}) ===`)
  for (let index = 0; index < FIXTURES.length; index++) {
    const result = await runCase(FIXTURES[index], index, mode, topK)
    cases.push(result)

    const marker = result.pass ? 'PASS' : 'FAIL'
    const signal = result.appliedTheme
      ? `action → ${result.appliedTheme}`
      : `injected ${result.injectedNames.length ? result.injectedNames.join(', ') : '(none)'}`
    const line = `[${marker}] [${result.split}] ${result.query} → ${signal} · ${formatLatency(result.latencyMs)}`
    console.log(result.error ? `${line} · error: ${result.error}` : line)
  }

  const aggregate = aggregateMode(mode, cases)
  console.log(
    `${mode}: hit@${topK} = ${(aggregate.retrievalHitRate * 100).toFixed(0)}% · MRR = ${aggregate.retrievalMRR.toFixed(3)} · injectionCover = ${(aggregate.injectionCoverRate * 100).toFixed(0)}% · actionPass = ${(aggregate.actionPassRate * 100).toFixed(0)}% · pass = ${(aggregate.passRate * 100).toFixed(0)}% · avg time = ${formatLatency(aggregate.meanLatencyMs)}`,
  )

  for (const [name, label] of [
    ['test', 'test'],
    ['train', 'train (tuning reference — not the gate)'],
  ]) {
    const splitAggregate = aggregateMode(mode, cases, name)
    if (splitAggregate.n === 0) continue
    console.log(
      `${label}: hit@${topK} = ${(splitAggregate.retrievalHitRate * 100).toFixed(0)}% · MRR = ${splitAggregate.retrievalMRR.toFixed(3)} · injectionCover = ${(splitAggregate.injectionCoverRate * 100).toFixed(0)}% · actionPass = ${(splitAggregate.actionPassRate * 100).toFixed(0)}% · pass = ${(splitAggregate.passRate * 100).toFixed(0)}% · avg time = ${formatLatency(splitAggregate.meanLatencyMs)}`,
    )
  }
}

/* ---- Runtime traces ---- */

const traceMode = modes[0]
const specs = traceSpecs.length > 0 ? traceSpecs : [defaultTracesDir]
const loadedTraces = []
const traceErrors = []
for (const spec of specs) {
  const resolved = resolveTraceSpec(spec)
  const { traces, errors } = await loadTraceSource(resolved)
  loadedTraces.push(...traces)
  traceErrors.push(...errors)
}
for (const error of traceErrors) console.error(`trace: ${error}`)

let traceAggregate = null
let traceCases = []
if (loadedTraces.length > 0) {
  console.log(`\n=== runtime traces (${traceMode}, top ${topK}) ===`)
  for (const trace of loadedTraces) {
    const result = await scoreTrace(trace, {
      retriever,
      registry,
      mode: traceMode,
      topK,
    })
    traceCases.push(result)
    const marker = result.pass ? 'PASS' : 'FAIL'
    console.log(
      `[${marker}] ${result.name || result.id} → covered:${result.retrievalCovered ? 'y' : 'n'} · action:${result.actionValid ? 'y' : 'n'}`,
    )
  }
  traceAggregate = aggregateTraces(
    traceCases,
    [...new Set(loadedTraces.map((trace) => trace.source))],
    traceMode,
    topK,
  )
  console.log(
    `traces: ${traceAggregate.count} · retrievalCover = ${(traceAggregate.retrievalCoverRate * 100).toFixed(0)}% · actionValid = ${(traceAggregate.actionValidRate * 100).toFixed(0)}% · pass = ${(traceAggregate.passRate * 100).toFixed(0)}%`,
  )
}

const modeAggregates = modes.map((modeName) => ({
  ...aggregateMode(modeName, cases),
  splits: {
    test: aggregateMode(modeName, cases, 'test'),
    train: aggregateMode(modeName, cases, 'train'),
  },
}))
const splitCount = (split) => FIXTURES.filter((fixture) => fixture.split === split).length
await writeArtifact({
  generatedAt: new Date().toISOString(),
  config: {
    modes,
    topK,
    maxInjectChars: registry.MAX_INJECT_CHARS ?? 1800,
    device: 'cpu',
    gateSplit: 'test',
  },
  fixtures: {
    total: FIXTURES.length,
    train: splitCount('train'),
    test: splitCount('test'),
  },
  modes: modeAggregates,
  cases: cases.map(({ mrrScore: _mrrScore, ...entry }) => entry),
  traces: traceAggregate,
})

const totalFailures = cases.filter((entry) => !entry.pass).length
const testCases = cases.filter((entry) => entry.split === 'test')
const trainCases = cases.filter((entry) => entry.split === 'train')
const testFailures = testCases.filter((entry) => !entry.pass).length
const trainFailures = trainCases.filter((entry) => !entry.pass).length
const traceFailures = traceCases.filter((entry) => !entry.pass).length

console.log(`\nwritten ${join(srcDir, 'data', 'evalResults.ts')}`)
if (trainFailures > 0) {
  console.log(
    `train failures (tuning reference — not the gate): ${trainFailures}/${trainCases.length}`,
  )
}
if (testFailures > 0 || traceFailures > 0) {
  console.error(
    `${testFailures}/${testCases.length} test cases failed (the gate) · ` +
      `${traceFailures}/${traceCases.length} traces failed (${totalFailures}/${cases.length} cases failed overall)`,
  )
  process.exitCode = 1
} else {
  console.log('all test-split cases passed (the gate)')
}
