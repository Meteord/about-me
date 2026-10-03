import { TOOL_SCHEMAS, parsePythonicCalls, type ToolResult } from '../tools/registry'
import type { RetrievalStats } from '../composables/useToolRetrieval'

const CHAT_MODEL = 'LiquidAI/LFM2.5-350M'

/**
 * Maps the Mini-Michi chat transcript into the HuggingFace Session Trace
 * Simple Format (STS-Format) JSONL — contracts/traces.md. Pure client-side:
 * the produced file is downloaded, never uploaded (constitution Principle I).
 */
export interface TraceTranscriptMessage {
  role: 'user' | 'assistant' | 'retrieval' | 'tool-call' | 'tool-result' | 'error'
  content?: string
  calls?: string[]
  results?: ToolResult[]
  selectedNames?: string[]
  stats?: RetrievalStats
}

function toNamedArgs(
  name: string,
  parsed: { positionalArgs: unknown[]; keywordArgs: Record<string, unknown> },
): Record<string, unknown> {
  const schema = TOOL_SCHEMAS.find((entry) => entry.function.name === name)
  const paramNames = schema ? Object.keys(schema.function.parameters.properties) : []
  const named: Record<string, unknown> = {}
  parsed.positionalArgs.forEach((value, index) => {
    if (index < paramNames.length) named[paramNames[index]] = value
  })
  Object.assign(named, parsed.keywordArgs)
  return named
}

function timestampId(): string {
  const now = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function firstUserQuery(messages: TraceTranscriptMessage[]): string {
  const first = messages.find((message) => message.role === 'user')
  return (first?.content ?? 'Mini-Michi session').slice(0, 80)
}

function toolCallId(round: number, index: number): string {
  return `tc${round}-${index}`
}

export function useTraceRecorder() {
  function buildJsonl(messages: TraceTranscriptMessage[]): string {
    const stamp = timestampId()
    const header = {
      type: 'session',
      harness: 'about-me.mini-michi',
      id: `mini-michi-${stamp}`,
      name: firstUserQuery(messages),
    }
    const lines = [JSON.stringify(header)]
    let round = 0

    for (const message of messages) {
      if (message.role === 'user') {
        lines.push(
          JSON.stringify({
            type: 'message',
            message: { role: 'user', content: message.content ?? '' },
          }),
        )
      } else if (message.role === 'assistant') {
        lines.push(
          JSON.stringify({
            type: 'message',
            message: { role: 'assistant', content: message.content ?? '', model: CHAT_MODEL },
          }),
        )
      } else if (message.role === 'retrieval') {
        const selectedNames = message.selectedNames ?? []
        const stats = message.stats
        const summary =
          `retrieval · top ${selectedNames.length}/${stats?.total ?? selectedNames.length} · ` +
          `effective ${stats?.effective ?? 'lexical'} · ${stats?.latencyMs ?? 0}ms · ` +
          `selected: ${selectedNames.join(', ')}`
        lines.push(
          JSON.stringify({ type: 'message', message: { role: 'system', content: summary } }),
        )
      } else if (message.role === 'tool-call') {
        const toolCalls = (message.calls ?? []).map((call, index) => {
          const parsed = parsePythonicCalls(call)
          const name = parsed?.name ?? `unknown_${call.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32)}`
          const args = parsed ? toNamedArgs(name, parsed) : {}
          return {
            id: toolCallId(round, index),
            function: { name, arguments: JSON.stringify(args) },
          }
        })
        lines.push(
          JSON.stringify({
            type: 'message',
            message: { role: 'assistant', content: '', toolCalls, model: CHAT_MODEL },
          }),
        )
        round++
      } else if (message.role === 'tool-result') {
        const currentRound = round - 1
        ;(message.results ?? []).forEach((result, index) => {
          lines.push(
            JSON.stringify({
              type: 'message',
              message: {
                role: 'tool',
                toolCallId: toolCallId(currentRound, index),
                content: JSON.stringify(result.result ?? result.error ?? null),
                model: CHAT_MODEL,
              },
            }),
          )
        })
      }
    }

    return `${lines.join('\n')}\n`
  }

  function downloadTrace(messages: TraceTranscriptMessage[]): void {
    const jsonl = buildJsonl(messages)
    const blob = new Blob([jsonl], { type: 'application/x-ndjson' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mini-michi-${timestampId()}.jsonl`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return { buildJsonl, downloadTrace }
}
