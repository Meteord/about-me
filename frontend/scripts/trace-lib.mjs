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

/* ------------------------------------------------------------------ */
/* STS-format parsing & validation                                     */
/* ------------------------------------------------------------------ */

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
    if (!['user', 'assistant', 'system', 'tool'].includes(message.role)) {
      errors.push(`line ${i + 1}: unknown message role "${message.role}" — trace skipped`)
      return { trace: null, errors }
    }
    turns.push({
      role: message.role,
      content: typeof message.content === 'string' ? message.content : '',
      toolCalls: message.toolCalls ?? [],
      toolCallId: message.toolCallId ?? null,
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
  const retrievalSummary = turns.find((turn) => turn.role === 'system')?.content ?? null
  const calledTools = []
  for (const turn of turns) {
    for (const toolCall of turn.toolCalls) {
      if (toolCall?.function?.name) calledTools.push(toolCall.function.name)
    }
  }
  const toolResults = turns
    .filter((turn) => turn.role === 'tool')
    .map((turn) => {
      try {
        return JSON.parse(turn.content)
      } catch {
        return turn.content
      }
    })
  const finalAnswer = assistantTexts[assistantTexts.length - 1].content

  const trace = {
    source,
    id,
    name,
    userQuery,
    retrievalSummary,
    turns,
    calledTools,
    toolResults,
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

function callsAreValid(trace, registry) {
  const schemaNames = new Set(registry.TOOL_SCHEMAS.map((schema) => schema.function.name))
  const schemaByName = new Map(registry.TOOL_SCHEMAS.map((schema) => [schema.function.name, schema]))

  for (const turn of trace.turns) {
    for (const toolCall of turn.toolCalls) {
      const name = toolCall?.function?.name
      if (!name || !schemaNames.has(name)) return false

      let args = {}
      try {
        args = JSON.parse(toolCall.function.arguments ?? '{}')
      } catch {
        return false
      }
      if (!args || typeof args !== 'object' || Array.isArray(args)) return false

      const roundTrip = `${name}(${Object.entries(args)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ')})`
      const parsed = registry.parsePythonicCalls(roundTrip)
      if (!parsed || parsed.name !== name) return false

      const schema = schemaByName.get(name)
      const props = schema.function.parameters.properties
      for (const [key, value] of Object.entries(args)) {
        const prop = props[key]
        if (!prop) return false
        if (Array.isArray(prop.enum) && !prop.enum.map((entry) => String(entry)).includes(String(value))) {
          return false
        }
      }
      if (name === 'set_theme' && typeof args.theme !== 'string') return false
    }
  }
  return true
}

export async function scoreTrace(trace, { retriever, registry, judge, mode, topK }) {
  let retrievalCovered = false
  try {
    const result = await retriever.retrieve(trace.userQuery, { mode, topK })
    const topNames = result.selectedNames.slice(0, topK)
    retrievalCovered =
      trace.calledTools.length > 0 && trace.calledTools.every((tool) => topNames.includes(tool))
  } catch {
    retrievalCovered = false
  }

  const toolValid = trace.calledTools.length > 0 && callsAreValid(trace, registry)

  const score = judge.assess(
    {
      query: trace.userQuery,
      expected: [],
      expectedArgs: {},
      expectedAnswerFacts: [],
      bannedFacts: BANNED_TRACE_FACTS,
    },
    {
      finalAnswer: trace.finalAnswer,
      toolResults: trace.toolResults,
      toolCalls: [],
      selectedNames: [],
      timings: null,
    },
  )

  const groundedness = score.faithfulness
  const bannedViolation = score.bannedViolation
  const pass = toolValid && retrievalCovered && groundedness >= 0.8 && !bannedViolation

  return {
    source: trace.source,
    id: trace.id,
    name: trace.name,
    userQuery: trace.userQuery,
    calledTools: trace.calledTools,
    retrievalCovered,
    toolValid,
    groundedness,
    bannedViolation,
    pass,
    error: null,
  }
}