import { nextTick } from 'vue'
import type { AboutTopic } from '../data/siteData'
import { useSiteLayout, type ThemeName } from '../composables/useSiteLayout'
import { findContentItem, getContentById, listContentItems } from '../composables/useLlmsContent'

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

const CONTENT_IDS = listContentItems().map((item) => item.id)

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'list_contents',
      description:
        'List every piece of retrievable content on the site — the About, Projects, Contact and Blog sections plus each blog article — with a one-line description. Call this first to discover the available content ids before calling get_content. Does not change the page. Example: list_contents()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_content',
      description:
        'Fetch the full content for a content id and bring it into view on the right: navigates to the blog post page for a blog article, the projects page for projects, or expands and spotlights the matching section on the home page. Use list_contents first to discover the available content ids. Example: get_content(id="about", topic="skills")',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Which content to retrieve. The available ids come from list_contents.',
            enum: CONTENT_IDS,
          },
          topic: {
            type: 'string',
            description:
              'Optional: narrow the About content to one topic and spotlight its card. Only used when id="about".',
            enum: ['bio', 'education', 'skills', 'hobbies'],
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
]

/* ------------------------------------------------------------------ */
/* System prompt                                                       */
/* ------------------------------------------------------------------ */

export const ALL_TOOL_NAMES: string[] = TOOL_SCHEMAS.map((tool) => tool.function.name)

const TOOL_GUIDE: Record<string, string> = {
  list_contents:
    'list_contents() — list every retrievable content item with a one-line description. Call this first when you are not sure what content exists.',
  get_content:
    'get_content(id="about"|"projects"|"contact"|"blog"|"blog:<slug>"[, topic="skills"]) — fetch the full content for a content id AND bring it into view on the right (opens the blog post or projects page, or expands + spotlights the matching section). Use topic only when id="about".',
  set_theme: 'set_theme(theme="amber"|"orange"|"red") — switch the accent color theme.',
}

export function buildSystemPrompt(selectedNames: string[] = ALL_TOOL_NAMES): string {
  const tools = selectedNames.map((name) => `  - ${TOOL_GUIDE[name] ?? name}`).join('\n')
  return `You are MINI-MICHI, a tiny on-device AI assistant running entirely inside Michael Jaumann's personal website. A visitor is chatting with you. You can call tools to retrieve real information about Michael or to change the page.

How to answer questions about Michael:
1. If you know what to fetch, call get_content(id=...) directly, e.g. get_content(id="about", topic="skills"). The tool returns the real content AND brings the matching section or page into view on the right.
2. If you don't know which content exists, call list_contents() first to see the available content ids and their short descriptions, then call get_content(id=...) on the next turn with the right id.
3. Answer the visitor from the returned content. Never invent facts about Michael.

Rules:
- When you need to act, output one or more tool calls wrapped exactly in the markers, one call per block:
  <|tool_call_start|>get_content(id="about", topic="skills")<|tool_call_end|>
  <|tool_call_start|>set_theme(theme="red")<|tool_call_end|>
- Use Python-style keyword arguments. Strings are quoted with double quotes.
- You may call SEVERAL independent tools in one turn (each call in its own block). Do NOT bundle calls where one depends on another's result — wait for the previous result and call the next tool in the following turn.
- After the tools return, answer the visitor naturally.
- Keep answers short, friendly and concise. You can use the visitor's language.
- Tools you can call:
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

/** Extract every tool-call block in a response, so the model can emit several
    independent calls in a single turn. Each block may itself hold a list. */
export function extractToolCalls(content: string): string[] {
  const calls: string[] = []
  for (const match of content.matchAll(/<\|tool_call_start\|>(.*?)<\|tool_call_end\|>/gs)) {
    calls.push(...extractPythonicCalls(match[1].trim()))
  }
  return calls
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

export type ToolResultKind = 'text' | 'contact' | 'layout' | 'page'

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

/* Which content card inside the About window should be spotlit per topic. */
const TOPIC_SPOTLIGHT: Record<string, string> = {
  education: 'about-education',
  skills: 'about-skills',
  hobbies: 'about-hobbies',
}

/** Yield to the event loop so a hashchange → route → re-render settles first. */
function waitForRoute(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const executors: Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>> = {
  list_contents: () => {
    const items = listContentItems()
    return {
      kind: 'text',
      text: items.map((item) => `- ${item.id}: ${item.title} — ${item.description}`).join('\n'),
    }
  },

  get_content: async (args) => {
    const id = (args.id as string) ?? 'about'
    const item = findContentItem(id)
    if (!item) {
      return {
        kind: 'text',
        error: `Unknown content id "${id}". Call list_contents first to see the available ids.`,
      }
    }

    if (item.kind === 'page') {
      const href =
        item.section === 'projects' ? '#/projects' : item.slug ? `#/blog/${item.slug}` : '#'
      window.location.hash = href
      const content = await getContentById(id)
      return {
        kind: 'page',
        section: item.section,
        route:
          item.section === 'projects'
            ? { name: 'projects', slug: null }
            : { name: 'blog', slug: item.slug ?? null },
        text: content,
      }
    }

    // Section content: return to home and bring the section into view.
    const hashChanged = window.location.hash !== ''
    if (hashChanged) window.location.hash = ''
    const topic = (args.topic as AboutTopic | undefined) ?? undefined
    const target = topic ? TOPIC_SPOTLIGHT[topic] : undefined

    const { state, setVisible, setExpanded, focusSection } = useSiteLayout()
    state.sections.forEach((entry) => {
      entry.visible = entry.id === item.section
      entry.expanded = entry.id === item.section
    })
    if (!state.sections.some((entry) => entry.id === item.section)) {
      setVisible(item.section, true)
      setExpanded(item.section, true)
    }
    if (hashChanged) await waitForRoute()
    await nextTick()
    focusSection(item.section, { collapseOthers: false, target })

    const content = await getContentById(id)
    return {
      kind: item.section === 'contact' ? 'contact' : 'text',
      section: item.section,
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
  list_contents:
    'what can you do, what do you know, what is available, available content, list, list all, catalog, index, overview, give me an overview, site overview, what is on this page, contents, all content, everything on the site, statistics, numbers, blog articles, list of articles, show all, surprise me, explore',
  get_content:
    'who is michael, tell me about yourself, bio, background, career, education, degree, study, university, school, thesis, skills, tech stack, programming languages, hobbies, free time, running, cycling, dog, projects, mucgpt, chatbot munich, how to reach, email, linkedin, github, contact, blog, blog post, article, how does this page work, how the site works, what is this page, chat model, how fast is the chat model, on-device, webgpu, wasm',
  set_theme:
    'dark mode, color, colour, accent, red theme, orange theme, amber theme, recolor, palette, next color, switch color, change palette, another theme, change the look, recolor the page',
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
