import { aboutMeMarkdown, aboutTopicDescription, type AboutTopic } from '../data/siteData'
import { useSiteLayout, type SectionId, type ThemeName } from '../composables/useSiteLayout'
import { getSiteContent } from '../composables/useLlmsContent'

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
      name: 'about_site',
      description:
        'Retrieve the site-wide narrative content about Michael Jaumann from the llms.txt files. Richer than about_me, covering bio, education, skills, hobbies, projects (MUCGPT) and contact links. Prefer this for detailed answers.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description:
              'Which topic to focus on: bio, education, skills, hobbies, projects, contact, or all.',
            enum: ['bio', 'education', 'skills', 'hobbies', 'projects', 'contact', 'all'],
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
        'Restructure or restyle the website: jump to a section, move a section up or down, expand or collapse a section window, switch the accent color theme, or toggle the CRT scanline effect.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'What to do.',
            enum: ['jump_to', 'move', 'expand', 'collapse', 'theme', 'scanlines'],
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

export const SYSTEM_PROMPT = `You are MINI-MICHI, a tiny on-device AI assistant running entirely inside Michael Jaumann's personal website. A visitor is chatting with you. You can call tools to retrieve real information about Michael or to change the page.

Rules:
- Prefer calling a tool over guessing. Never invent facts about Michael — use the about_site tool (preferred) or about_me tool.
- When you need to act, output a single tool call wrapped exactly in the markers:
  <|tool_call_start|>about_me(topic="skills")<|tool_call_end|>
- Use Python-style keyword arguments. Strings are quoted with double quotes.
- Call only ONE tool per turn. Wait for its result, then answer the visitor naturally.
- Keep answers short, friendly and concise. You can use the visitor's language.
- Tools you can call:
  - about_site(topic="all") — retrieve the rich narrative content about Michael from the site's llms.txt files (bio, education, skills, hobbies, projects like MUCGPT, contact). Prefer this for detailed or broad answers.
  - about_me(topic="bio"|"education"|"skills"|"hobbies"|"projects"|"contact"|"all") — retrieve structured info about Michael as a fallback.
  - restructure_site(action="jump_to"|"move"|"expand"|"collapse"|"theme"|"scanlines", target="about"|"projects"|"contact", direction="up"|"down", theme="amber"|"orange"|"red") — jump to, rearrange or restyle the website.`

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
  kind: ToolResultKind
}

export type ToolResultKind = 'text' | 'contact' | 'layout'

export interface ContactInfo {
  linkedin: string
  github: string
}

export async function executeToolCall(call: string): Promise<ToolResult> {
  const parsed = parsePythonicCalls(call)
  if (!parsed) {
    return { call, error: `Invalid tool call format: ${call}`, kind: 'text' }
  }

  const schema = TOOL_SCHEMAS.find((tool) => tool.function.name === parsed.name)
  if (!schema) {
    return { call, error: `Unknown tool: ${parsed.name}`, kind: 'text' }
  }

  const args = mapArgsToNamedParams(
    toolParamNames(schema),
    parsed.positionalArgs,
    parsed.keywordArgs,
  )

  try {
    const result = await executors[parsed.name](args)
    return { call, result, kind: (result as { kind?: ToolResultKind })?.kind ?? 'text' }
  } catch (error) {
    return { call, error: error instanceof Error ? error.message : String(error), kind: 'text' }
  }
}

const TOPIC_SECTION: Record<string, SectionId> = {
  bio: 'about',
  education: 'about',
  skills: 'about',
  hobbies: 'about',
  projects: 'projects',
  contact: 'contact',
}

function sectionForTopic(topic: AboutTopic): SectionId {
  return TOPIC_SECTION[topic] ?? 'about'
}

const executors: Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>> = {
  about_me: (args) => {
    const topic = (args.topic as AboutTopic) ?? 'all'
    return {
      kind: topic === 'contact' ? 'contact' : 'text',
      section: sectionForTopic(topic),
      topic,
      text: aboutMeMarkdown(topic),
    }
  },

  about_site: async (args) => {
    const topic = (args.topic as AboutTopic) ?? 'all'
    const content = await getSiteContent()
    return {
      kind: topic === 'contact' ? 'contact' : 'text',
      section: sectionForTopic(topic),
      topic,
      text: content,
    }
  },

  restructure_site: (args) => {
    const { setExpanded, moveSection, setTheme, toggleScanlines, focusSection } = useSiteLayout()
    const action = (args.action as string) ?? ''
    const target = args.target as SectionId
    const direction = args.direction as 'up' | 'down'
    const theme = args.theme as ThemeName

    switch (action) {
      case 'jump_to':
        if (!target) return { kind: 'text', error: 'jump_to requires "target".' }
        focusSection(target)
        return { kind: 'layout', section: target, jumped: target }
      case 'move':
        if (!target || !direction) {
          return { kind: 'text', error: 'move requires both "target" and "direction".' }
        }
        return moveSection(target, direction)
          ? { kind: 'layout', moved: `${target} ${direction}` }
          : {
              kind: 'text',
              error: `Could not move "${target}" ${direction} — it may already be at the edge.`,
            }
      case 'expand':
        if (!target) return { kind: 'text', error: 'expand requires "target".' }
        setExpanded(target, true)
        return { kind: 'layout', expanded: target }
      case 'collapse':
        if (!target) return { kind: 'text', error: 'collapse requires "target".' }
        setExpanded(target, false)
        return { kind: 'layout', collapsed: target }
      case 'theme':
        if (!theme) return { kind: 'text', error: 'theme requires "theme" (amber, orange or red).' }
        setTheme(theme)
        return { kind: 'layout', theme }
      case 'scanlines':
        toggleScanlines()
        return { kind: 'layout', scanlines_toggled: true }
      default:
        return { kind: 'text', error: `Unknown action "${action}".` }
    }
  },
}

export function toolCallSummary(calls: string[]): string[] {
  return calls.map((call) => {
    const parsed = parsePythonicCalls(call)
    return parsed ? parsed.name : call
  })
}
