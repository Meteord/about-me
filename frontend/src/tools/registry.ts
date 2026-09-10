import { aboutMeMarkdown, aboutTopicDescription, type AboutTopic } from '../data/siteData'
import { useSiteLayout, type SectionId, type ThemeName } from '../composables/useSiteLayout'

/* ------------------------------------------------------------------ */
/* Tool schemas (OpenAI-style JSON, passed into the chat template)     */
/* ------------------------------------------------------------------ */

export interface ToolSchema {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description: string; enum?: string[] }>
    }
  }
}

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'about_me',
      description:
        'Retrieve structured information about Michael Jaumann, the owner of this website.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: `Which topic to retrieve: ${aboutTopicDescription()}`,
            enum: ['bio', 'education', 'skills', 'hobbies', 'projects', 'contact', 'all'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_game',
      description:
        'Start a mini game rendered inside the chat. Currently only a Snake game exists.',
      parameters: {
        type: 'object',
        properties: {
          game: {
            type: 'string',
            description: 'Which game to start. Only "snake" is available.',
            enum: ['snake'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'restructure_site',
      description:
        'Restructure or restyle the website: move a section up or down, expand or collapse a section window, switch the accent color theme, or toggle the CRT scanline effect.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'What to do.',
            enum: ['move', 'expand', 'collapse', 'theme', 'scanlines'],
          },
          target: {
            type: 'string',
            description: 'Target section id for move/expand/collapse actions.',
            enum: ['about', 'projects', 'contact'],
          },
          direction: {
            type: 'string',
            description: 'Direction to move a section for the move action.',
            enum: ['up', 'down'],
          },
          theme: {
            type: 'string',
            description: 'Accent color theme for the theme action.',
            enum: ['amber', 'orange', 'red'],
          },
        },
      },
    },
  },
]

/* ------------------------------------------------------------------ */
/* System prompt                                                       */
/* ------------------------------------------------------------------ */

export const SYSTEM_PROMPT = `You are MICRO-MIKE, a tiny on-device AI assistant running entirely inside Michael Jaumann's personal website. A visitor is chatting with you. You can call tools to retrieve real information about Michael or to change the page.

Rules:
- Prefer calling a tool over guessing. Never invent facts about Michael — use the about_me tool.
- When you need to act, output a single tool call wrapped exactly in the markers:
  <|tool_call_start|>about_me(topic="skills")<|tool_call_end|>
- Use Python-style keyword arguments. Strings are quoted with double quotes.
- Call only ONE tool per turn. Wait for its result, then answer the visitor naturally.
- Keep answers short, friendly and concise. You can use the visitor's language.
- Tools you can call:
  - about_me(topic="bio"|"education"|"skills"|"hobbies"|"projects"|"contact"|"all") — retrieve info about Michael.
  - start_game(game="snake") — start the Snake mini-game inside the chat.
  - restructure_site(action="move"|"expand"|"collapse"|"theme"|"scanlines", target="about"|"projects"|"contact", direction="up"|"down", theme="amber"|"orange"|"red") — rearrange or restyle the website.`

/* ------------------------------------------------------------------ */
/* Tool-call parsing (ported from Liquid AI's LFM2-WebGPU demo)        */
/* ------------------------------------------------------------------ */

export interface ParsedCall {
  name: string
  positionalArgs: unknown[]
  keywordArgs: Record<string, unknown>
}

function parseArguments(argsString: string): string[] {
  const args: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  let depth = 0

  for (const char of argsString) {
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true
      quoteChar = char
      current += char
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false
      quoteChar = ''
      current += char
    } else if (!inQuotes && char === '(') {
      depth++
      current += char
    } else if (!inQuotes && char === ')') {
      depth--
      current += char
    } else if (!inQuotes && char === ',' && depth === 0) {
      args.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    args.push(current.trim())
  }

  return args
}

export function extractToolCallContent(content: string): string | null {
  const match = content.match(/<\|tool_call_start\|>(.*?)<\|tool_call_end\|>/s)
  return match ? match[1].trim() : null
}

export function extractPythonicCalls(toolCallContent: string): string[] {
  const clean = toolCallContent.trim()
  try {
    const parsed: unknown = JSON.parse(clean)
    if (Array.isArray(parsed)) return parsed as string[]
  } catch {
    // not JSON — fall through to manual parsing
  }
  if (clean.startsWith('[') && clean.endsWith(']')) {
    const inner = clean.slice(1, -1).trim()
    if (!inner) return []
    return parseArguments(inner).map((call) => call.trim().replace(/^['"]|['"]$/g, ''))
  }
  return [clean]
}

export function parsePythonicCalls(command: string): ParsedCall | null {
  const match = command.match(/^([a-zA-Z0-9_]+)\((.*)\)$/s)
  if (!match) return null

  const [, name, argsStr] = match
  const args = parseArguments(argsStr)
  const positionalArgs: unknown[] = []
  const keywordArgs: Record<string, unknown> = {}

  for (const arg of args) {
    const kwargMatch = arg.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*)$/s)
    if (kwargMatch) {
      const [, key, value] = kwargMatch
      try {
        keywordArgs[key] = JSON.parse(value)
      } catch {
        keywordArgs[key] = value
      }
    } else {
      try {
        positionalArgs.push(JSON.parse(arg))
      } catch {
        positionalArgs.push(arg)
      }
    }
  }

  return { name, positionalArgs, keywordArgs }
}

function mapArgsToNamedParams(
  paramNames: string[],
  positionalArgs: unknown[],
  keywordArgs: Record<string, unknown>,
): Record<string, unknown> {
  const namedParams: Record<string, unknown> = Object.create(null)
  positionalArgs.forEach((arg, index) => {
    if (index < paramNames.length) {
      namedParams[paramNames[index]] = arg
    }
  })
  Object.assign(namedParams, keywordArgs)
  return namedParams
}

function toolParamNames(schema: ToolSchema): string[] {
  return Object.keys(schema.function.parameters.properties)
}

/* ------------------------------------------------------------------ */
/* Tool executors                                                      */
/* ------------------------------------------------------------------ */

export interface ToolResult {
  call: string
  result?: unknown
  error?: string
}

export async function executeToolCall(call: string): Promise<ToolResult> {
  const parsed = parsePythonicCalls(call)
  if (!parsed) {
    return { call, error: `Invalid tool call format: ${call}` }
  }

  const schema = TOOL_SCHEMAS.find((tool) => tool.function.name === parsed.name)
  if (!schema) {
    return { call, error: `Unknown tool: ${parsed.name}` }
  }

  const args = mapArgsToNamedParams(
    toolParamNames(schema),
    parsed.positionalArgs,
    parsed.keywordArgs,
  )

  try {
    const result = await executors[parsed.name](args)
    return { call, result }
  } catch (error) {
    return { call, error: error instanceof Error ? error.message : String(error) }
  }
}

const executors: Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>> = {
  about_me: (args) => {
    const topic = (args.topic as AboutTopic) ?? 'all'
    return aboutMeMarkdown(topic)
  },

  start_game: (args) => {
    const game = (args.game as string) ?? 'snake'
    if (game !== 'snake') {
      return { error: `Unknown game "${game}". Only "snake" is supported.` }
    }
    return {
      game: 'snake',
      started: true,
      message: 'Snake loaded. Move with arrow keys or the on-screen pad. Good luck!',
    }
  },

  restructure_site: (args) => {
    const { setExpanded, moveSection, setTheme, toggleScanlines } = useSiteLayout()
    const action = (args.action as string) ?? ''
    const target = args.target as SectionId
    const direction = args.direction as 'up' | 'down'
    const theme = args.theme as ThemeName

    switch (action) {
      case 'move':
        if (!target || !direction) {
          return { error: 'move requires both "target" and "direction".' }
        }
        return moveSection(target, direction)
          ? { moved: `${target} ${direction}` }
          : { error: `Could not move "${target}" ${direction} — it may already be at the edge.` }
      case 'expand':
        if (!target) return { error: 'expand requires "target".' }
        setExpanded(target, true)
        return { expanded: target }
      case 'collapse':
        if (!target) return { error: 'collapse requires "target".' }
        setExpanded(target, false)
        return { collapsed: target }
      case 'theme':
        if (!theme) return { error: 'theme requires "theme" (amber, orange or red).' }
        setTheme(theme)
        return { theme }
      case 'scanlines':
        toggleScanlines()
        return { scanlines_toggled: true }
      default:
        return { error: `Unknown action "${action}".` }
    }
  },
}

export function toolCallSummary(calls: string[]): string[] {
  return calls.map((call) => {
    const parsed = parsePythonicCalls(call)
    return parsed ? parsed.name : call
  })
}
