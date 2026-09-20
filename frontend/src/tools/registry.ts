import { aboutTopicDescription, siteData, type AboutTopic } from '../data/siteData'
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
      name: 'retrieve',
      description:
        'Retrieve information about Michael Jaumann and bring the matching section into view: expands the right section, spotlights the relevant content card and collapses all other sections so the answer is the only thing on screen. Use this for ANY question about Michael (bio, education, skills, hobbies, projects like MUCGPT, contact links, the blog / how this site works). Example: retrieve(topic="skills")',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: `Which topic to retrieve: ${aboutTopicDescription()}`,
            enum: ['bio', 'education', 'skills', 'hobbies', 'projects', 'contact', 'blog', 'all'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_theme',
      description:
        'Switch the accent color theme of the whole page. Example: set_theme(theme="red")',
      parameters: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            description: 'Accent color theme to apply.',
            enum: ['amber', 'orange', 'red'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_stats',
      description:
        'Show the statistics dashboard in the Visuals section: site facts (tool count, sections, theme) plus a skills-per-category chart, and collapse the other sections so the dashboard is centered on screen. Example: show_stats()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]

/* ------------------------------------------------------------------ */
/* System prompt                                                       */
/* ------------------------------------------------------------------ */

export const ALL_TOOL_NAMES: string[] = TOOL_SCHEMAS.map((tool) => tool.function.name)

const TOOL_GUIDE: Record<string, string> = {
  retrieve:
    'retrieve(topic="bio"|"education"|"skills"|"hobbies"|"projects"|"contact"|"blog"|"all") — look up info about Michael AND bring the matching section into view (expands it, spotlights the content, collapses the other sections). Use for any question about Michael.',
  set_theme: 'set_theme(theme="amber"|"orange"|"red") — switch the accent color theme.',
  show_stats:
    'show_stats() — show the statistics dashboard (site facts + skills chart) in the Visuals section, centered on screen.',
}

export function buildSystemPrompt(selectedNames: string[] = ALL_TOOL_NAMES): string {
  const tools = selectedNames.map((name) => `  - ${TOOL_GUIDE[name] ?? name}`).join('\n')
  return `You are MINI-MICHI, a tiny on-device AI assistant running entirely inside Michael Jaumann's personal website. A visitor is chatting with you. You can call tools to retrieve real information about Michael or to change the page.

Rules:
- Prefer calling a tool over guessing. Never invent facts about Michael — use the retrieve tool.
- When you need to act, output a single tool call wrapped exactly in the markers:
  <|tool_call_start|>retrieve(topic="skills")<|tool_call_end|>
- Use Python-style keyword arguments. Strings are quoted with double quotes.
- Call only ONE tool per turn. Wait for its result, then answer the visitor naturally.
- Keep answers short, friendly and concise. You can use the visitor's language.
- Tools you can call (ONE per turn):
${tools}`
}

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

/* Which pixel-window each topic lives in, and which content card inside the
   About window should be spotlit. */
const TOPIC_SECTION: Record<string, SectionId> = {
  bio: 'about',
  education: 'about',
  skills: 'about',
  hobbies: 'about',
  projects: 'projects',
  contact: 'contact',
  blog: 'blog',
}

const TOPIC_SPOTLIGHT: Record<string, string> = {
  education: 'about-education',
  skills: 'about-skills',
  hobbies: 'about-hobbies',
}

function sectionForTopic(topic: AboutTopic): SectionId {
  return TOPIC_SECTION[topic] ?? 'about'
}

const executors: Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>> = {
  retrieve: async (args) => {
    const { state, setVisible, setExpanded, focusSection } = useSiteLayout()
    const topic = (args.topic as AboutTopic) ?? 'all'
    const content = await getSiteContent()
    const section = sectionForTopic(topic)
    const target = TOPIC_SPOTLIGHT[topic]

    // The combined view action: only the matching section stays on screen.
    state.sections.forEach((entry) => {
      entry.visible = entry.id === section
      entry.expanded = entry.id === section
    })
    if (!state.sections.some((entry) => entry.id === section)) {
      setVisible(section, true)
      setExpanded(section, true)
    }
    focusSection(section, { collapseOthers: false, target })

    return {
      kind: topic === 'contact' ? 'contact' : 'text',
      section,
      topic,
      spotlight: true,
      target,
      text: content,
    }
  },

  set_theme: (args) => {
    const { setTheme } = useSiteLayout()
    const theme = args.theme as ThemeName
    if (!theme) return { kind: 'text', error: 'set_theme requires "theme" (amber, orange or red).' }
    setTheme(theme)
    return { kind: 'layout', theme }
  },

  show_stats: () => {
    const { state, setVisible, setExpanded, focusSection } = useSiteLayout()
    // Only the Visuals dashboard stays on screen.
    state.sections.forEach((entry) => {
      entry.visible = entry.id === 'visuals'
      entry.expanded = entry.id === 'visuals'
    })
    if (!state.sections.some((entry) => entry.id === 'visuals')) {
      setVisible('visuals', true)
      setExpanded('visuals', true)
    }
    focusSection('visuals', { collapseOthers: false })

    const visible = state.sections.filter((entry) => entry.visible)
    return {
      kind: 'layout',
      section: 'visuals',
      message: `Site facts: ${TOOL_SCHEMAS.length} tools · ${visible.length}/${state.sections.length} sections visible · theme: ${state.theme}. Skills: ${siteSkillSummary()}`,
      topic: 'stats',
      spotlight: true,
      text: `Tool count: ${TOOL_SCHEMAS.length}. Sections: ${state.sections
        .map((entry) => entry.id)
        .join(', ')}. Theme: ${state.theme}. ${siteSkillSummary()}`,
    }
  },
}

function siteSkillSummary(): string {
  const rows = skillsChartRows()
  return rows
    .slice(0, 3)
    .map((row) => `${row.label}: ${row.count}`)
    .join(', ')
}

/* ------------------------------------------------------------------ */
/* Skills chart data (shared with the Visuals section)                 */
/* ------------------------------------------------------------------ */

export interface SkillChartRow {
  label: string
  count: number
  items: string[]
  percent: number
  variant: string
}

const BAR_VARIANTS = ['viz-bar--amber', 'viz-bar--orange', 'viz-bar--red']

export function skillsChartRows(): SkillChartRow[] {
  const groups = siteData.skills
  const max = Math.max(...groups.map((group) => group.items.length), 1)
  return groups.map((group, index) => ({
    label: group.label,
    count: group.items.length,
    items: group.items,
    percent: Math.round((group.items.length / max) * 100),
    variant: BAR_VARIANTS[index % BAR_VARIANTS.length],
  }))
}

/* ------------------------------------------------------------------ */
/* Retrieval index (tool documents for the tool selector)              */
/* ------------------------------------------------------------------ */

export interface ToolDoc {
  name: string
  text: string
}

/* Colloquial synonyms and example phrasings visitors use, per tool. They are
   appended to the doc text so both BM25 and the vector-search retriever can match
   queries that never literally say the tool name. */
const TOOL_ALIASES: Record<string, string> = {
  retrieve:
    'who is michael, tell me about yourself, bio, background, career, education, degree, study, university, school, thesis, skills, tech stack, programming languages, hobbies, free time, running, cycling, dog, projects, mucgpt, chatbot munich, how to reach, email, linkedin, github, contact, blog, article, how does this page work, how the site works, what is this page, chat model, how fast is the chat model, on-device, webgpu, wasm',
  set_theme:
    'dark mode, color, colour, accent, red theme, orange theme, amber theme, recolor, palette, next color, switch color, change palette, another theme, change the look, recolor the page',
  show_stats:
    'statistics, stats, dashboard, numbers, facts, how many tools, how many skills, skill chart, skills chart, bar chart, diagram, visualize skills, capabilities, site status, overview of the site, show data',
}

function toolDocText(schema: ToolSchema): string {
  const { name, description, parameters } = schema.function
  const params = Object.entries(parameters.properties)
    .map(([key, value]) => `${key} ${value.description ?? ''}`)
    .join(' ')
  const enums = Object.values(parameters.properties)
    .flatMap((value) => value.enum ?? [])
    .join(' ')
  const aliases = TOOL_ALIASES[name] ?? ''
  return `${name}. ${description} ${params} ${enums} ${aliases}`
}

export function getToolDocs(): ToolDoc[] {
  return TOOL_SCHEMAS.map((schema) => ({
    name: schema.function.name,
    text: toolDocText(schema),
  }))
}

export function pruneSchemas(names: string[]): ToolSchema[] {
  return TOOL_SCHEMAS.filter((tool) => names.includes(tool.function.name))
}

export function schemaChars(schemas: ToolSchema[]): number {
  return schemas.reduce((total, schema) => total + JSON.stringify(schema).length, 0)
}
