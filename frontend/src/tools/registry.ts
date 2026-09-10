import { aboutMeMarkdown, aboutTopicDescription, type AboutTopic } from '../data/siteData'
import { useSiteLayout, type SectionId, type ThemeName } from '../composables/useSiteLayout'
import type { BackgroundMode, ZoomLevel } from '../composables/useSiteLayout'
import { getSiteContent } from '../composables/useLlmsContent'
import { mode as retrievalMode, topK, toolSelectorOpen } from '../composables/retrievalSettings'
import type { RetrievalMode } from '../composables/useToolRetrieval'

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
            enum: ['bio', 'education', 'skills', 'hobbies', 'projects', 'contact', 'tech', 'all'],
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
        'Retrieve the site-wide narrative content about Michael Jaumann from the llms.txt files. Richer than about_me, covering bio, education, skills, hobbies, projects (MUCGPT), contact links and how this site works. Prefer this for detailed answers.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description:
              'Which topic to focus on: bio, education, skills, hobbies, projects, contact, tech, or all.',
            enum: ['bio', 'education', 'skills', 'hobbies', 'projects', 'contact', 'tech', 'all'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'jump_to_section',
      description:
        'Jump to a section: expand only that section, scroll to it and flash a highlight. Example: jump_to_section(target="projects")',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Which section to jump to.',
            enum: ['about', 'projects', 'contact', 'tech'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'expand_section',
      description:
        'Expand a collapsed section window so its content is visible. Example: expand_section(target="projects")',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Which section to expand.',
            enum: ['about', 'projects', 'contact', 'tech'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'collapse_section',
      description:
        'Collapse a section window so only its title bar is visible. Example: collapse_section(target="contact")',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Which section to collapse.',
            enum: ['about', 'projects', 'contact', 'tech'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_section',
      description:
        'Move a section one position up or down in the page stack. Example: move_section(target="contact", direction="up")',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Which section to move.',
            enum: ['about', 'projects', 'contact', 'tech'],
          },
          direction: {
            type: 'string',
            description: 'Move up (earlier on the page) or down (later on the page).',
            enum: ['up', 'down'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'translate_section',
      description:
        'Move a section directly to a specific position on the page: the top, the bottom, or a numbered spot (0 is the top). Example: translate_section(target="contact", position="top")',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Which section to reposition.',
            enum: ['about', 'projects', 'contact', 'tech'],
          },
          position: {
            type: 'string',
            description: 'Destination: "top", "bottom", or a number like 0 or 2.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rotate_sections',
      description:
        'Rotate the whole section stack like a carousel. "next" moves the top section to the bottom; "prev" moves the bottom section to the top. Example: rotate_sections(direction="next")',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            description: 'Direction to rotate the stack.',
            enum: ['next', 'prev'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hide_section',
      description:
        'Remove a section from the page view. It can be brought back later with show_section. Example: hide_section(target="projects")',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Which section to hide.',
            enum: ['about', 'projects', 'contact', 'tech'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_section',
      description:
        'Restore a previously hidden section back onto the page. Example: show_section(target="projects")',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Which section to show again.',
            enum: ['about', 'projects', 'contact', 'tech'],
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
      name: 'toggle_scanlines',
      description: 'Toggle the CRT scanline overlay on or off. Example: toggle_scanlines()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reset_layout',
      description:
        'Reset the page to its default layout: restore all sections in the original order (about, projects, contact), expanded as before, amber theme. Example: reset_layout()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'expand_all_sections',
      description:
        'Expand every section window on the page at once so all content is visible. Example: expand_all_sections()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'collapse_all_sections',
      description:
        'Collapse every section window on the page at once so only title bars are visible. Example: collapse_all_sections()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reverse_sections',
      description:
        'Reverse the order of all sections on the page, flipping the stack bottom to top. Example: reverse_sections()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'shuffle_sections',
      description:
        'Shuffle the sections into a random order for a surprising new layout. Example: shuffle_sections()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sort_sections',
      description:
        'Sort the sections into a consistent order: alphabetical by name, or the page\'s original default order. Example: sort_sections(order="alphabetical")',
      parameters: {
        type: 'object',
        properties: {
          order: {
            type: 'string',
            description: 'Sorting order for the section stack.',
            enum: ['alphabetical', 'default'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scroll_page',
      description:
        'Scroll the whole page to the very top or the very bottom. Example: scroll_page(position="top")',
      parameters: {
        type: 'object',
        properties: {
          position: {
            type: 'string',
            description: 'Where to scroll the page.',
            enum: ['top', 'bottom'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'flash_section',
      description:
        'Pulse a short highlight animation on a section without expanding it or scrolling. Good to answer "where is X?". Example: flash_section(target="contact")',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Which section to highlight.',
            enum: ['about', 'projects', 'contact', 'tech'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cycle_theme',
      description:
        'Switch the accent color theme to the next one in the cycle: amber, orange, red. Example: cycle_theme()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_background',
      description:
        'Change the page background pattern: subtle dots, a pixel grid, or plain dark. Example: set_background(mode="grid")',
      parameters: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            description: 'Background pattern.',
            enum: ['dots', 'grid', 'plain'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_glitch',
      description:
        'Toggle a CRT glitch flicker effect over the whole page for extra retro chaos. Example: toggle_glitch()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_zoom',
      description:
        'Change the size of the page content: compact, normal or comfortable. Example: set_zoom(level="comfortable")',
      parameters: {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            description: 'Content size level.',
            enum: ['compact', 'normal', 'comfortable'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'site_stats',
      description:
        'Return live facts about this website: how many tools Mini-Michi has, number of sections, the models powering it and current visual settings. Use it for questions like "how many tools do you have?". Example: site_stats()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'now',
      description:
        'Get the visitor\'s current local date and time plus a fitting greeting. Useful before answering "good morning" style questions. Example: now()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'random_fact',
      description:
        'Pull one random fact about Michael or this website from the site content. Great when the visitor says "surprise me" or "random fact". Example: random_fact()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_retrieval_mode',
      description:
        'Change how Mini-Michi picks its tools before each reply: lexical (instant BM25), neural (encoder embeddings) or hybrid (both blended). Example: set_retrieval_mode(mode="lexical")',
      parameters: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            description: 'Retrieval strategy for tool selection.',
            enum: ['lexical', 'neural', 'hybrid'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_topk',
      description:
        'Change how many tools the retriever pre-selects as context before each reply, between 1 and the total number of tools. Example: set_topk(count=3)',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of tools to keep in context (1 or more).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_tool_selector',
      description:
        'Open or close the Tool Selector panel in the chat dock, which shows how tools are ranked for each request. Example: toggle_tool_selector()',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tools',
      description:
        'Get a grouped overview of every tool Mini-Michi can call: info retrieval, page layout, visual effects, site stats and self-tuning. Use it when the visitor asks what tools exist or what Mini-Michi can do. Example: list_tools()',
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
  about_site:
    'about_site(topic="all") — retrieve the rich narrative content about Michael from the site\u2019s llms.txt files (bio, education, skills, hobbies, projects like MUCGPT, contact, how the site works). Prefer this for detailed or broad answers.',
  about_me:
    'about_me(topic="bio"|"education"|"skills"|"hobbies"|"projects"|"contact"|"tech"|"all") — retrieve structured info about Michael as a fallback.',
  jump_to_section:
    'jump_to_section(target="about"|"projects"|"contact"|"tech") — expand, scroll to and highlight a section.',
  expand_section: 'expand_section(target="...") — expand a collapsed section.',
  collapse_section: 'collapse_section(target="...") — collapse a section.',
  move_section:
    'move_section(target="...", direction="up"|"down") — move a section one step up or down the page.',
  translate_section:
    'translate_section(target="...", position="top"|"bottom"|number) — move a section straight to the top, bottom or a numbered spot.',
  rotate_sections: 'rotate_sections(direction="next"|"prev") — cycle the whole section stack.',
  hide_section: 'hide_section(target="...") — remove a section from the page.',
  show_section: 'show_section(target="...") — bring a hidden section back.',
  set_theme: 'set_theme(theme="amber"|"orange"|"red") — switch the accent color theme.',
  toggle_scanlines: 'toggle_scanlines() — toggle the CRT scanline overlay.',
  reset_layout: 'reset_layout() — restore the default page layout.',
  expand_all_sections: 'expand_all_sections() — expand every section window at once.',
  collapse_all_sections: 'collapse_all_sections() — collapse every section window at once.',
  reverse_sections: 'reverse_sections() — flip the order of all sections.',
  shuffle_sections: 'shuffle_sections() — randomize the order of the sections.',
  sort_sections:
    'sort_sections(order="alphabetical"|"default") — sort the sections alphabetically or back into the default order.',
  scroll_page: 'scroll_page(position="top"|"bottom") — scroll the page to the top or bottom.',
  flash_section:
    'flash_section(target="about"|"projects"|"contact"|"tech") — pulse a highlight on a section without scrolling.',
  cycle_theme: 'cycle_theme() — switch to the next accent color theme.',
  set_background: 'set_background(mode="dots"|"grid"|"plain") — change the background pattern.',
  toggle_glitch: 'toggle_glitch() — toggle a CRT glitch flicker effect.',
  set_zoom:
    'set_zoom(level="compact"|"normal"|"comfortable") — change the size of the page content.',
  site_stats:
    'site_stats() — live facts about this site: tool count, sections, models and current settings.',
  now: 'now() — current local date and time plus a greeting.',
  random_fact: 'random_fact() — one random fact about Michael or this site.',
  set_retrieval_mode:
    'set_retrieval_mode(mode="lexical"|"neural"|"hybrid") — change how tools are pre-selected.',
  set_topk: 'set_topk(count=n) — change how many tools are kept in context.',
  toggle_tool_selector:
    'toggle_tool_selector() — open or close the Tool Selector panel in the dock.',
  list_tools: 'list_tools() — grouped overview of every tool Mini-Michi can call.',
}

export function buildSystemPrompt(selectedNames: string[] = ALL_TOOL_NAMES): string {
  const tools = selectedNames.map((name) => `  - ${TOOL_GUIDE[name] ?? name}`).join('\n')
  return `You are MINI-MICHI, a tiny on-device AI assistant running entirely inside Michael Jaumann's personal website. A visitor is chatting with you. You can call tools to retrieve real information about Michael or to change the page.

Rules:
- Prefer calling a tool over guessing. Never invent facts about Michael — use the about_site tool (preferred) or about_me tool.
- When you need to act, output a single tool call wrapped exactly in the markers:
  <|tool_call_start|>about_me(topic="skills")<|tool_call_end|>
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
  tech: 'tech',
}

const TOOL_CATEGORIES: Record<string, string> = {
  about_me: 'info retrieval',
  about_site: 'info retrieval',
  random_fact: 'info retrieval',
  list_tools: 'info retrieval',
  site_stats: 'site facts',
  now: 'site facts',
  jump_to_section: 'page layout',
  expand_section: 'page layout',
  collapse_section: 'page layout',
  expand_all_sections: 'page layout',
  collapse_all_sections: 'page layout',
  move_section: 'page layout',
  translate_section: 'page layout',
  rotate_sections: 'page layout',
  reverse_sections: 'page layout',
  shuffle_sections: 'page layout',
  sort_sections: 'page layout',
  hide_section: 'page layout',
  show_section: 'page layout',
  scroll_page: 'page layout',
  flash_section: 'page layout',
  reset_layout: 'page layout',
  set_theme: 'visuals',
  cycle_theme: 'visuals',
  set_background: 'visuals',
  toggle_scanlines: 'visuals',
  toggle_glitch: 'visuals',
  set_zoom: 'visuals',
  set_retrieval_mode: 'self-tuning',
  set_topk: 'self-tuning',
  toggle_tool_selector: 'self-tuning',
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

  jump_to_section: (args) => {
    const { focusSection, setVisible } = useSiteLayout()
    const target = args.target as SectionId
    if (!target) return { kind: 'text', error: 'jump_to_section requires "target".' }
    setVisible(target, true)
    focusSection(target)
    return { kind: 'layout', section: target, jumped: target }
  },

  expand_section: (args) => {
    const { setExpanded } = useSiteLayout()
    const target = args.target as SectionId
    if (!target) return { kind: 'text', error: 'expand_section requires "target".' }
    setExpanded(target, true)
    return { kind: 'layout', expanded: target }
  },

  collapse_section: (args) => {
    const { setExpanded } = useSiteLayout()
    const target = args.target as SectionId
    if (!target) return { kind: 'text', error: 'collapse_section requires "target".' }
    setExpanded(target, false)
    return { kind: 'layout', collapsed: target }
  },

  move_section: (args) => {
    const { moveSection } = useSiteLayout()
    const target = args.target as SectionId
    const direction = args.direction as 'up' | 'down'
    if (!target || !direction) {
      return { kind: 'text', error: 'move_section requires both "target" and "direction".' }
    }
    return moveSection(target, direction)
      ? { kind: 'layout', moved: `${target} ${direction}` }
      : {
          kind: 'text',
          error: `Could not move "${target}" ${direction} — it may already be at the edge.`,
        }
  },

  translate_section: (args) => {
    const { moveSectionTo } = useSiteLayout()
    const target = args.target as SectionId
    const position = args.position as string | number
    if (!target || position === undefined) {
      return { kind: 'text', error: 'translate_section requires both "target" and "position".' }
    }
    const raw =
      position === 'top'
        ? 'top'
        : position === 'bottom'
          ? 'bottom'
          : typeof position === 'string'
            ? parseInt(position, 10)
            : position
    if (typeof raw === 'number' && Number.isNaN(raw)) {
      return { kind: 'text', error: `Invalid position "${position}" for translate_section.` }
    }
    return moveSectionTo(target, raw)
      ? { kind: 'layout', translated: `${target} → ${position}` }
      : { kind: 'text', error: `Could not move "${target}" to ${position}.` }
  },

  rotate_sections: (args) => {
    const { rotateSections } = useSiteLayout()
    const direction = (args.direction as 'next' | 'prev') ?? 'next'
    rotateSections(direction)
    return { kind: 'layout', rotated: direction }
  },

  hide_section: (args) => {
    const { setVisible } = useSiteLayout()
    const target = args.target as SectionId
    if (!target) return { kind: 'text', error: 'hide_section requires "target".' }
    setVisible(target, false)
    return { kind: 'layout', hidden: target }
  },

  show_section: (args) => {
    const { setVisible } = useSiteLayout()
    const target = args.target as SectionId
    if (!target) return { kind: 'text', error: 'show_section requires "target".' }
    setVisible(target, true)
    return { kind: 'layout', shown: target }
  },

  set_theme: (args) => {
    const { setTheme } = useSiteLayout()
    const theme = args.theme as ThemeName
    if (!theme) return { kind: 'text', error: 'set_theme requires "theme" (amber, orange or red).' }
    setTheme(theme)
    return { kind: 'layout', theme }
  },

  toggle_scanlines: () => {
    const { toggleScanlines } = useSiteLayout()
    toggleScanlines()
    return { kind: 'layout', scanlines_toggled: true }
  },

  reset_layout: () => {
    const { resetLayout } = useSiteLayout()
    resetLayout()
    return { kind: 'layout', reset: true }
  },

  expand_all_sections: () => {
    const { setAllExpanded } = useSiteLayout()
    setAllExpanded(true)
    return { kind: 'layout', expanded_all: true }
  },

  collapse_all_sections: () => {
    const { setAllExpanded } = useSiteLayout()
    setAllExpanded(false)
    return { kind: 'layout', collapsed_all: true }
  },

  reverse_sections: () => {
    const { reverseSections } = useSiteLayout()
    reverseSections()
    return { kind: 'layout', reversed: true }
  },

  shuffle_sections: () => {
    const { shuffleSections } = useSiteLayout()
    shuffleSections()
    return { kind: 'layout', shuffled: true }
  },

  sort_sections: (args) => {
    const { sortSections } = useSiteLayout()
    const order = args.order === 'alphabetical' ? 'alphabetical' : 'default'
    sortSections(order)
    return { kind: 'layout', sorted: order }
  },

  scroll_page: (args) => {
    const { scrollPage } = useSiteLayout()
    const position = args.position === 'bottom' ? 'bottom' : 'top'
    scrollPage(position)
    return { kind: 'layout', scrolled: position }
  },

  flash_section: (args) => {
    const { flashSection } = useSiteLayout()
    const target = args.target as SectionId
    if (!target) return { kind: 'text', error: 'flash_section requires "target".' }
    flashSection(target)
    return { kind: 'layout', flashed: target, section: target }
  },

  cycle_theme: () => {
    const { cycleTheme } = useSiteLayout()
    const theme = cycleTheme()
    return { kind: 'layout', theme }
  },

  set_background: (args) => {
    const { setBackground } = useSiteLayout()
    const background = args.mode as BackgroundMode
    if (background !== 'dots' && background !== 'grid' && background !== 'plain') {
      return { kind: 'text', error: 'set_background requires "mode" (dots, grid or plain).' }
    }
    setBackground(background)
    return { kind: 'layout', background }
  },

  toggle_glitch: () => {
    const { toggleGlitch } = useSiteLayout()
    const glitch = toggleGlitch()
    return { kind: 'layout', glitch }
  },

  set_zoom: (args) => {
    const { setZoom } = useSiteLayout()
    const level = args.level as ZoomLevel
    if (level !== 'compact' && level !== 'normal' && level !== 'comfortable') {
      return { kind: 'text', error: 'set_zoom requires "level" (compact, normal or comfortable).' }
    }
    setZoom(level)
    return { kind: 'layout', zoom: level }
  },

  site_stats: () => {
    const { state } = useSiteLayout()
    const visible = state.sections.filter((section) => section.visible)
    return {
      kind: 'text',
      message: `${TOOL_SCHEMAS.length} tools · ${visible.length}/${state.sections.length} sections visible (${visible
        .map((section) => section.id)
        .join(', ')}) · theme: ${state.theme} · background: ${state.background}`,
      tools: TOOL_SCHEMAS.length,
      sections: visible.length,
      section_ids: visible.map((section) => section.id),
      theme: state.theme,
      background: state.background,
      zoom: state.zoom,
      scanlines: state.scanlines,
      glitch: state.glitch,
    }
  },

  now: () => {
    const nowDate = new Date()
    const hour = nowDate.getHours()
    const greeting =
      hour < 5
        ? 'Good night'
        : hour < 12
          ? 'Good morning'
          : hour < 18
            ? 'Good afternoon'
            : 'Good evening'
    return {
      kind: 'text',
      message: `${greeting}! It is now ${nowDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })} on ${nowDate.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}.`,
      iso: nowDate.toISOString(),
    }
  },

  random_fact: async () => {
    const content = await getSiteContent()
    const bullets = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.replace(/^-\s*/, '').replace(/\*\*/g, ''))
    if (bullets.length === 0) {
      return { kind: 'text', text: content }
    }
    const fact = bullets[Math.floor(Math.random() * bullets.length)]
    return { kind: 'text', message: `Random fact: ${fact}`, text: fact }
  },

  set_retrieval_mode: (args) => {
    const value = args.mode as RetrievalMode | undefined
    if (value !== 'lexical' && value !== 'neural' && value !== 'hybrid') {
      return {
        kind: 'text',
        error: 'set_retrieval_mode requires "mode" (lexical, neural or hybrid).',
      }
    }
    retrievalMode.value = value
    return { kind: 'text', message: `Tool retrieval mode is now "${value}".` }
  },

  set_topk: (args) => {
    const count = Number(args.count)
    if (!Number.isFinite(count) || count < 1) {
      return { kind: 'text', error: 'set_topk requires "count" (a number >= 1).' }
    }
    const clamped = Math.min(TOOL_SCHEMAS.length, Math.round(count))
    topK.value = clamped
    return { kind: 'text', message: `The retriever now keeps the top ${clamped} tools.` }
  },

  toggle_tool_selector: () => {
    toolSelectorOpen.value = !toolSelectorOpen.value
    return {
      kind: 'text',
      message: `Tool Selector panel is now ${toolSelectorOpen.value ? 'open' : 'closed'}.`,
    }
  },

  list_tools: () => {
    const groups: Record<string, string[]> = {}
    for (const schema of TOOL_SCHEMAS) {
      const category = TOOL_CATEGORIES[schema.function.name] ?? 'other'
      const oneLiner = schema.function.description.split('.')[0]
      ;(groups[category] ??= []).push(`${schema.function.name} — ${oneLiner.toLowerCase()}.`)
    }
    const summary = Object.entries(groups)
      .map(([category, lines]) => `${category}: ${lines.join(' ')}`)
      .join(' ')
    return {
      kind: 'text',
      message: `I have ${TOOL_SCHEMAS.length} tools. ${summary}`,
      tools: TOOL_SCHEMAS.map((schema) => ({
        name: schema.function.name,
        description: schema.function.description,
        category: TOOL_CATEGORIES[schema.function.name] ?? 'other',
      })),
    }
  },
}

export function toolCallSummary(calls: string[]): string[] {
  return calls.map((call) => {
    const parsed = parsePythonicCalls(call)
    return parsed ? parsed.name : call
  })
}

/* ------------------------------------------------------------------ */
/* Retrieval index (tool documents for the tool selector)              */
/* ------------------------------------------------------------------ */

export interface ToolDoc {
  name: string
  text: string
}

function toolDocText(schema: ToolSchema): string {
  const { name, description, parameters } = schema.function
  const params = Object.entries(parameters.properties)
    .map(([key, value]) => `${key} ${value.description ?? ''}`)
    .join(' ')
  const enums = Object.values(parameters.properties)
    .flatMap((value) => value.enum ?? [])
    .join(' ')
  return `${name}. ${description} ${params} ${enums}`
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
