import type { RetrievalStats } from '../composables/useToolRetrieval'
import type { ThemeName } from '../composables/useSiteLayout'

const CHAT_MODEL = 'LiquidAI/LFM2.5-350M'

/**
 * Maps the Mini-Michi chat transcript into the HuggingFace Session Trace
 * Simple Format (STS-Format) JSONL — contracts/traces.md. Pure client-side:
 * the produced file is downloaded, never uploaded (constitution Principle I).
 */
export interface TraceTranscriptMessage {
  role: 'user' | 'assistant' | 'retrieval' | 'action' | 'error'
  content?: string
  selectedNames?: string[]
  injectedNames?: string[]
  stats?: RetrievalStats
  payload?: { kind: 'theme'; theme: ThemeName } | { kind: string; [key: string]: unknown }
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
        const injected = (message.injectedNames ?? []).join(', ')
        const summary =
          `retrieval · top ${selectedNames.length}/${stats?.total ?? selectedNames.length} · ` +
          `effective ${stats?.effective ?? 'lexical'} · ${stats?.latencyMs ?? 0}ms · ` +
          `selected: ${selectedNames.join(', ') || '(none)'}` +
          (injected ? ` · injected: ${injected}` : '')
        lines.push(
          JSON.stringify({ type: 'message', message: { role: 'system', content: summary } }),
        )
      } else if (message.role === 'action') {
        if (message.payload?.kind === 'theme') {
          lines.push(
            JSON.stringify({
              type: 'message',
              message: { role: 'system', content: `action: ${message.payload.theme}` },
            }),
          )
        } else {
          const kind = message.payload?.kind ?? 'unknown'
          const detail =
            message.payload?.kind === 'page'
              ? message.payload.page === 'projects'
                ? 'projects'
                : message.payload.slug
              : message.payload?.kind === 'section'
                ? message.payload.section
                : ''
          lines.push(
            JSON.stringify({
              type: 'message',
              message: {
                role: 'system',
                content: `navigate: ${kind}${detail ? `:${detail}` : ''}`,
              },
            }),
          )
        }
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
