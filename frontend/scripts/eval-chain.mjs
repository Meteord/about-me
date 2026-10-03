/**
 * End-to-end agent chain evaluation (npm run eval:chain).
 *
 * Runs the ENTIRE chain exactly as AiSection.handleSend does in the browser —
 * retrieve() (real retriever) → decideAction() (heuristic theme actions, no LLM
 * call syntax) or buildContextText() (inject the retrieved content) →
 * buildSystemPrompt() → real LFM2.5-350M generation (CPU) → final answer — over
 * every fixture × mode, scores it with the selected Judge (deterministic by
 * default), reports stage metrics, writes the committed artifact
 * frontend/src/data/evalResults.ts, and exits non-zero on failures. Optionally
 * scores STS-format runtime traces via --traces=.
 *
 * Usage: npm run eval:chain [-- --modes=lexical,vector,hybrid,decide --topk=5
 *          --dtype=q8|q4 --sampling --judge=deterministic|stub
 *          --traces=<file|dir|url>]
 */

import { existsSync, renameSync, writeFileSync } from 'fs'
import { isAbsolute, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { FIXTURES } from './eval-fixtures.mjs'
import {
  createJudge,
  installWindowShim,
  loadAllSourceTexts,
  loadRegistry,
  loadUseChatModel,
  loadUseToolRetrieval,
  srcDir,
} from './eval-lib.mjs'
import { loadTraceSource, scoreTrace } from './trace-lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const CHAT_MODEL = 'LiquidAI/LFM2.5-350M-ONNX'
const VALID_MODES = ['lexical', 'vector', 'hybrid', 'decide']

const noop = () => {}

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

const modes = argList('modes', VALID_MODES).filter((mode) => VALID_MODES.includes(mode))
const topK = Number(argValue('topk', '5')) || 5
const dtype = argValue('dtype', 'q8') === 'q4' ? 'q4' : 'q8'
const samplingEnabled = args.includes('--sampling')
const judgeName = argValue('judge', 'deterministic')
const traceSpecs = argAll('traces')

let judge
try {
  judge = createJudge(judgeName)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

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

/** Strip trailing generation special tokens so the scored answer matches what
    the browser displays (streamed with skip_special_tokens). */
function cleanAnswer(response) {
  return String(response)
    .replace(/<\|\s*im_end\s*\|>[\s\S]*$/g, '')
    .trim()
}

function themeConfirmation(theme) {
  return `Done — I switched the accent color to ${theme}.`
}

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

installWindowShim()
const registry = loadRegistry()
const retriever = loadUseToolRetrieval()
const chat = loadUseChatModel(dtype, { sampling: samplingEnabled })
const sourceTexts = await loadAllSourceTexts(registry)

console.log(`chat model: ${CHAT_MODEL} · cpu · ${dtype}${samplingEnabled ? ' · sampling' : ''}`)

if (modes.some((mode) => mode === 'vector' || mode === 'hybrid')) {
  process.stderr.write('initializing prompt-router (downloads on first run)…\n')
  try {
    await retriever.loadVector()
  } catch (error) {
    process.stderr.write(
      `router unavailable (${error instanceof Error ? error.message : error}) — vector/hybrid fall back to lexical\n`,
    )
  }
  console.log(`router: ${retriever.vector.value.status} · ${retriever.vector.value.device} · ${retriever.vector.value.dtype}`)
}

if (modes.some((mode) => mode === 'decide')) {
  process.stderr.write('initializing GLiNER2.5-Decide (downloads on first run)…\n')
  try {
    await retriever.loadDecide()
  } catch (error) {
    process.stderr.write(
      `decide unavailable (${error instanceof Error ? error.message : error}) — decide falls back to lexical\n`,
    )
  }
  console.log(`decide: ${retriever.decide.value.status} · ${retriever.decide.value.device} · ${retriever.decide.value.dtype}`)
}

let chatOk = false
try {
  await chat.loadModel()
  chatOk = true
} catch (error) {
  process.stderr.write(
    `chat model failed to load (${error instanceof Error ? error.message : error}) — cases will report model errors\n`,
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

function countTokens(response) {
  const instance = chat._getInstance?.()
  if (instance?.tokenizer && response) {
    try {
      const encoded = instance.tokenizer(response)
      const count = encoded?.input_ids?.dims?.at(-1)
      if (typeof count === 'number' && count > 0) return count
    } catch {
      // fall through to a length heuristic
    }
  }
  return Math.max(1, Math.round((response || '').length / 4))
}

/* ------------------------------------------------------------------ */
/* Chain runner (mirrors AiSection.handleSend)                         */
/* ------------------------------------------------------------------ */

async function runCase(fixture, fixtureIndex, mode, caseTopK) {
  const startedAt = performance.now()
  let retrieval = null
  let chainError = null

  try {
    retrieval = await retriever.retrieve(fixture.query, { mode, topK: caseTopK })
  } catch (error) {
    chainError = error instanceof Error ? error.message : String(error)
  }

  const selectedNames = retrieval ? retrieval.selectedNames : []
  const rows = retrieval?.rows ?? []
  const retrievalMs = retrieval?.stats.latencyMs ?? 0

  let currentTheme = 'amber'
  let appliedTheme = null
  let injectedNames = []
  let injectedText = ''
  let finalAnswer = ''
  let tokensGenerated = 0
  let generationMs = 0

  if (!chainError) {
    try {
      const theme = registry.decideAction(fixture.query, rows, currentTheme)
      if (theme) {
        appliedTheme = theme
        currentTheme = theme
        finalAnswer = cleanAnswer(themeConfirmation(theme))
      } else {
        const built = await registry.buildContextText(selectedNames)
        injectedNames = built.names
        injectedText = built.text
        if (!chatOk) throw new Error('chat model failed to load')
        const roundStarted = performance.now()
        const response = await chat.generate(
          [
            { role: 'system', content: registry.buildSystemPrompt(injectedText) },
            { role: 'user', content: fixture.query },
          ],
          noop,
        )
        generationMs = Math.round(performance.now() - roundStarted)
        tokensGenerated += countTokens(response)
        finalAnswer = cleanAnswer(response)
      }
    } catch (error) {
      chainError = error instanceof Error ? error.message : String(error)
    }
  }

  const totalMs = Math.round(performance.now() - startedAt)
  const timings = { retrievalMs, generationMs, totalMs, tokensGenerated }
  const score = judge.assess(fixture, {
    finalAnswer,
    injectedNames,
    injectedText,
    appliedTheme,
    sourceTexts,
  })

  const retrievalPass = hitAtK(selectedNames, fixture.expected, caseTopK) === 1
  const injectionPass =
    fixture.expected.length > 0 && fixture.expected.some((name) => injectedNames.includes(name))
  const actionPass = fixture.expectAction ? score.appliedActionMatched : true
  const answerPass = score.pass
  const chainPass = answerPass && (fixture.expectAction ? actionPass : injectionPass)

  return {
    fixtureIndex,
    query: fixture.query,
    mode,
    effectiveMode: retrieval?.stats.effective ?? 'lexical',
    selectedNames,
    rows,
    injectedNames,
    appliedTheme,
    finalAnswer,
    timings,
    score,
    retrievalPass,
    injectionPass,
    actionPass,
    answerPass,
    chainPass,
    error: chainError,
  }
}

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */

function fixtureOf(index) {
  return FIXTURES[index]
}

function aggregateMode(modeName, cases) {
  const group = cases.filter((entry) => entry.mode === modeName)
  return {
    mode: modeName,
    n: group.length,
    retrievalHitRate: mean(group.map((entry) => (entry.retrievalPass ? 1 : 0))),
    retrievalMRR: mean(group.map((entry) => mrr(entry.rows, fixtureOf(entry.fixtureIndex).expected))),
    injectionCoverRate: mean(group.map((entry) => (entry.injectionPass ? 1 : 0))),
    actionPassRate: mean(
      group
        .filter((entry) => fixtureOf(entry.fixtureIndex).expectAction)
        .map((entry) => (entry.actionPass ? 1 : 0)),
    ),
    factRecall: mean(group.map((entry) => entry.score.factRecall)),
    faithfulness: mean(group.map((entry) => entry.score.faithfulness)),
    hallucinationRate: mean(group.map((entry) => (entry.score.bannedViolation ? 1 : 0))),
    meanTotalLatencyMs: mean(group.map((entry) => entry.timings.totalMs)),
    answerPassRate: mean(group.map((entry) => (entry.answerPass ? 1 : 0))),
    chainPassRate: mean(group.map((entry) => (entry.chainPass ? 1 : 0))),
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
    groundedRate: mean(traceCases.map((entry) => (entry.groundedness >= 0.8 ? 1 : 0))),
    bannedViolationRate: mean(traceCases.map((entry) => (entry.bannedViolation ? 1 : 0))),
    passRate: mean(traceCases.map((entry) => (entry.pass ? 1 : 0))),
  }
}

/* ------------------------------------------------------------------ */
/* Artifact writer (frontend/src/data/evalResults.ts)                  */
/* ------------------------------------------------------------------ */

const INTERFACE_TEXT = `export interface StageTiming {
  retrievalMs: number
  generationMs: number
  totalMs: number
  tokensGenerated: number
}

export interface AnswerScore {
  factRecall: number
  factsMissedDueToRetrievalMiss: string[]
  bannedViolation: boolean
  faithfulness: number
  unsupportedSentences: string[]
  pass: boolean
  appliedActionMatched: boolean
}

export interface ToolScoreRow {
  name: string
  score: number
  rank: number
  selected: boolean
}

export interface CaseResult {
  fixtureIndex: number
  query: string
  mode: string
  effectiveMode: string
  selectedNames: string[]
  injectedNames: string[]
  rows: ToolScoreRow[]
  appliedTheme: string | null
  finalAnswer: string
  timings: StageTiming
  score: AnswerScore
  retrievalPass: boolean
  injectionPass: boolean
  actionPass: boolean
  answerPass: boolean
  chainPass: boolean
  error: string | null
}

export interface ModeAggregate {
  mode: string
  n: number
  retrievalHitRate: number
  retrievalMRR: number
  injectionCoverRate: number
  actionPassRate: number
  factRecall: number
  faithfulness: number
  hallucinationRate: number
  meanTotalLatencyMs: number
  answerPassRate: number
  chainPassRate: number
}

export interface TraceAggregate {
  count: number
  sources: string[]
  mode: string
  topK: number
  retrievalCoverRate: number
  actionValidRate: number
  groundedRate: number
  bannedViolationRate: number
  passRate: number
}

export interface EvalResults {
  generatedAt: string
  config: {
    modes: string[]
    topK: number
    maxInjectChars: number
    sampling: boolean
    device: 'cpu'
    dtype: 'q8' | 'q4'
    chatModel: string
  }
  fixtures: number
  modes: ModeAggregate[]
  cases: CaseResult[]
  traces: TraceAggregate | null
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
    output = await prettier.format(body, { parser: 'typescript', singleQuote: true, semi: false, printWidth: 100 })
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

    const marker = result.chainPass ? 'PASS' : 'FAIL'
    const signal = result.appliedTheme
      ? `action → ${result.appliedTheme}`
      : `injected ${result.injectedNames.length ? result.injectedNames.join(', ') : '(none)'}`
    const line =
      `[${marker}] ${result.query} → ${signal} · ` +
      `factRecall ${result.score.factRecall.toFixed(2)} · faithfulness ${result.score.faithfulness.toFixed(2)} · ` +
      `${result.timings.totalMs}ms`
    console.log(result.error ? `${line} · error: ${result.error}` : line)
  }

  const aggregate = aggregateMode(mode, cases)
  console.log(
    `${mode}: hit@${topK} = ${(aggregate.retrievalHitRate * 100).toFixed(0)}% · MRR = ${aggregate.retrievalMRR.toFixed(3)}`,
  )
  console.log(
    `  injectionCover = ${(aggregate.injectionCoverRate * 100).toFixed(0)}% · actionPass = ${(aggregate.actionPassRate * 100).toFixed(0)}%`,
  )
  console.log(
    `  factRecall = ${aggregate.factRecall.toFixed(2)} · faithfulness = ${aggregate.faithfulness.toFixed(2)} · hallucination = ${(aggregate.hallucinationRate * 100).toFixed(0)}%`,
  )
  console.log(
    `  latency = ${Math.round(aggregate.meanTotalLatencyMs)}ms · answerPass = ${(aggregate.answerPassRate * 100).toFixed(0)}% · chainPass = ${(aggregate.chainPassRate * 100).toFixed(0)}%`,
  )
}

/* ---- Runtime traces (US4) ---- */

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
      judge,
      sourceTexts,
      mode: traceMode,
      topK,
    })
    traceCases.push(result)
    const marker = result.pass ? 'PASS' : 'FAIL'
    console.log(
      `[${marker}] ${result.name || result.id} → covered:${result.retrievalCovered ? 'y' : 'n'} · action:${result.actionValid ? 'y' : 'n'} · grounded ${result.groundedness.toFixed(2)} · banned:${result.bannedViolation ? 'y' : 'n'}`,
    )
  }
  traceAggregate = aggregateTraces(
    traceCases,
    [...new Set(loadedTraces.map((trace) => trace.source))],
    traceMode,
    topK,
  )
  console.log(
    `traces: ${traceAggregate.count} · retrievalCover = ${(traceAggregate.retrievalCoverRate * 100).toFixed(0)}% · actionValid = ${(traceAggregate.actionValidRate * 100).toFixed(0)}% · grounded = ${(traceAggregate.groundedRate * 100).toFixed(0)}% · banned = ${(traceAggregate.bannedViolationRate * 100).toFixed(0)}% · pass = ${(traceAggregate.passRate * 100).toFixed(0)}%`,
  )
}

const modeAggregates = modes.map((modeName) => aggregateMode(modeName, cases))
await writeArtifact({
  generatedAt: new Date().toISOString(),
  config: {
    modes,
    topK,
    maxInjectChars: registry.MAX_INJECT_CHARS ?? 1800,
    sampling: samplingEnabled,
    device: 'cpu',
    dtype,
    chatModel: CHAT_MODEL,
  },
  fixtures: FIXTURES.length,
  modes: modeAggregates,
  cases,
  traces: traceAggregate,
})

const chainFailures = cases.filter((entry) => !entry.chainPass).length
const traceFailures = traceCases.filter((entry) => !entry.pass).length

console.log(`\nwritten ${join(srcDir, 'data', 'evalResults.ts')}`)
if (chainFailures > 0 || traceFailures > 0) {
  console.error(
    `${chainFailures}/${cases.length} chain cases failed · ${traceFailures}/${traceCases.length} traces failed`,
  )
  process.exitCode = 1
} else {
  console.log('all chain cases passed')
}