/**
 * Runtime-trace eval support: STS-format parser/validator, TraceSource loaders
 * (file / dir / url), and historical per-trace scoring. Single source of truth
 * for the trace schema is specs/002-agent-chain-eval/contracts/traces.md.
 *
 * A malformed line is recorded in `errors` and its trace skipped — the run
 * never aborts (SC-007). Trace loading sits behind loadTraceSource(spec) so new
 * origins are one loader away (FR-012).
 */

import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { BANNED_TRACE_FACTS } from './eval-fixtures.mjs'

const THEME_ORDER = ['amber', 'orange', 'red']

/* ------------------------------------------------------------------ */
/* STS-format parsing & validation                                     */
/* ------------------------------------------------------------------ */

const INJECTED_RE = /\binjected:\s*([a-zA-Z0-9_:,\s-]+)/

function parseSystemContent(content) {
  const text = String(content ?? '')
  const actionMatch = text.match(/^action:\s*(\w+)$/)
  const injectedMatch = text.match(INJECTED_RE)
  return {
    appliedTheme: actionMatch ? actionMatch[1] : null,
    injectedNames: injectedMatch
      ? injectedMatch[1]
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
      : [],
  }
}

export function parseTraceJsonl(text, source) {
  const errors = []
  const lines = String(text)
    .split('\n')
    .filter((line) => line.trim() !== '')

  if (lines.length === 0) {
    return { trace: null, errors: ['empty trace file'] }
  }

  let header
  try {
    header = JSON.parse(lines[0])
  } catch (error) {
    return { trace: null, errors: [`line 1 is not valid JSON (${error.message})`] }
  }
  if (header?.type !== 'session') {
    return { trace: null, errors: ['line 1 must be a session header ({"type":"session",...})'] }
  }
  if (header.harness !== 'about-me.mini-michi') {
    return { trace: null, errors: [`unexpected harness "${header.harness}" (expected "about-me.mini-michi")`] }
  }

  const id = typeof header.id === 'string' ? header.id : 'unnamed'
  const name = typeof header.name === 'string' ? header.name : id
  const turns = []
  let appliedTheme = null
  const injectedNames = []

  for (let i = 1; i < lines.length; i++) {
    let entry
    try {
      entry = JSON.parse(lines[i])
    } catch (error) {
      errors.push(`line ${i + 1}: invalid JSON (${error.message}) — trace skipped`)
      return { trace: null, errors }
    }
    const message = entry?.message
    if (entry?.type !== 'message' || !message || typeof message !== 'object') {
      errors.push(`line ${i + 1}: expected a message envelope ({"type":"message","message":{...}}) — trace skipped`)
      return { trace: null, errors }
    }
    if (!['user', 'assistant', 'system'].includes(message.role)) {
      errors.push(`line ${i + 1}: unknown message role "${message.role}" — trace skipped`)
      return { trace: null, errors }
    }
    if (message.role === 'system') {
      const parsed = parseSystemContent(message.content)
      if (parsed.appliedTheme) appliedTheme = parsed.appliedTheme
      injectedNames.push(...parsed.injectedNames)
    }
    turns.push({
      role: message.role,
      content: typeof message.content === 'string' ? message.content : '',
      model: message.model ?? null,
      timestamp: message.timestamp ?? null,
    })
  }

  const assistantTexts = turns.filter(
    (turn) => turn.role === 'assistant' && typeof turn.content === 'string' && turn.content.trim() !== '',
  )
  if (assistantTexts.length === 0) {
    errors.push('trace has no final assistant message — trace skipped')
    return { trace: null, errors }
  }

  const userQuery = turns.find((turn) => turn.role === 'user')?.content ?? ''
  const finalAnswer = assistantTexts[assistantTexts.length - 1].content

  const trace = {
    source,
    id,
    name,
    userQuery,
    appliedTheme,
    injectedNames: [...new Set(injectedNames)],
    turns,
    finalAnswer,
  }
  return { trace, errors }
}

/* ------------------------------------------------------------------ */
/* TraceSource loaders (the extension seam)                            */
/* ------------------------------------------------------------------ */

async function loadFileTrace(file) {
  const text = await readFile(file, 'utf8')
  const { trace, errors } = parseTraceJsonl(text, file)
  return { traces: trace ? [trace] : [], errors }
}

async function loadDirTraces(dir) {
  const entries = await readdir(dir)
  const files = entries.filter((name) => name.endsWith('.jsonl')).sort()
  const traces = []
  const errors = []
  for (const name of files) {
    const file = join(dir, name)
    const { trace, errors: lineErrors } = parseTraceJsonl(await readFile(file, 'utf8'), file)
    if (trace) traces.push(trace)
    else errors.push(...lineErrors.map((lineError) => `${file}: ${lineError}`))
  }
  return { traces, errors }
}

async function loadUrlTrace(url) {
  const response = await fetch(url)
  if (!response.ok) {
    return { traces: [], errors: [`failed to fetch ${url}: HTTP ${response.status}`] }
  }
  const text = await response.text()
  const { trace, errors } = parseTraceJsonl(text, url)
  return { traces: trace ? [trace] : [], errors }
}

export async function loadTraceSource(spec) {
  if (spec.startsWith('http://') || spec.startsWith('https://')) {
    return loadUrlTrace(spec)
  }
  const info = await import('fs/promises').then((fs) => fs.stat(spec).catch(() => null))
  if (!info) return { traces: [], errors: [`trace source not found: ${spec}`] }
  if (info.isDirectory()) return loadDirTraces(spec)
  return loadFileTrace(spec)
}

/* ------------------------------------------------------------------ */
/* Historical per-trace scoring (no re-execution)                      */
/* ------------------------------------------------------------------ */

export async function scoreTrace(trace, { retriever, judge, sourceTexts, mode, topK }) {
  let retrievalCovered = false
  try {
    const result = await retriever.retrieve(trace.userQuery, { mode, topK })
    const topNames = result.selectedNames.slice(0, topK)
    retrievalCovered =
      trace.injectedNames.length > 0 && trace.injectedNames.every((name) => topNames.includes(name))
  } catch {
    retrievalCovered = false
  }

  const actionValid =
    trace.appliedTheme !== null && THEME_ORDER.includes(trace.appliedTheme)

  let score
  if (actionValid) {
    score = judge.assess(
      {
        query: trace.userQuery,
        expected: ['set_theme'],
        expectAction: true,
        expectedArgs: {},
        expectedAnswerFacts: [],
        bannedFacts: BANNED_TRACE_FACTS,
      },
      {
        finalAnswer: trace.finalAnswer,
        injectedNames: [],
        injectedText: '',
        appliedTheme: trace.appliedTheme,
        sourceTexts,
      },
    )
  } else {
    const injectedText = (trace.injectedNames ?? [])
      .map((name) => sourceTexts[name] ?? '')
      .filter(Boolean)
      .join('\n\n')
    score = judge.assess(
      {
        query: trace.userQuery,
        expected: [],
        expectedAnswerFacts: [],
        bannedFacts: BANNED_TRACE_FACTS,
      },
      {
        finalAnswer: trace.finalAnswer,
        injectedNames: trace.injectedNames ?? [],
        injectedText,
        appliedTheme: null,
        sourceTexts,
      },
    )
  }

  const groundedness = score.faithfulness
  const bannedViolation = score.bannedViolation
  const pass = (retrievalCovered || actionValid) && groundedness >= 0.8 && !bannedViolation

  return {
    source: trace.source,
    id: trace.id,
    name: trace.name,
    userQuery: trace.userQuery,
    injectedNames: trace.injectedNames ?? [],
    appliedTheme: trace.appliedTheme,
    retrievalCovered,
    actionValid,
    groundedness,
    bannedViolation,
    pass,
    error: null,
  }
}