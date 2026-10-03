import { aboutMeMarkdown, type AboutTopic } from '../data/siteData'
import type { SectionId, ThemeName } from '../composables/useSiteLayout'
import { getContentById, listContentItems } from '../composables/useLlmsContent'

export const THEME_ORDER: ThemeName[] = ['amber', 'orange', 'red']

/* ------------------------------------------------------------------ */
/* Retrieval candidates: granular content sources + one heuristic action */
/* ------------------------------------------------------------------ */

export interface SourceDef {
  name: string
  kind: 'content' | 'action'
  title: string
  description: string
  aliases: string[]
  section?: SectionId
  slug?: string | null
  topic?: AboutTopic
  spotlight?: string
}

export const SOURCE_DEFS: SourceDef[] = [
  {
    name: 'about_bio',
    kind: 'content',
    title: 'About — bio',
    section: 'about',
    topic: 'bio',
    description: "Michael's bio: name, location (Munich), employer (KIES) and personal tags.",
    aliases: [
      'who is michael',
      'tell me about yourself',
      'bio',
      'background',
      'about michael',
      'where does michael live',
      'where does michael work',
      'what does michael do',
      'employer',
      'kies',
      'wo wohnt michael',
      'wo arbeitet michael',
    ],
  },
  {
    name: 'about_education',
    kind: 'content',
    title: 'About — education',
    section: 'about',
    topic: 'education',
    spotlight: 'about-education',
    description:
      "Michael's education: B.Sc. from Hochschule München and M.Sc. from TU München, periods and theses.",
    aliases: [
      'education',
      'degree',
      'degrees',
      'university',
      'studies',
      'studied',
      'bachelor',
      'master',
      'school',
      'thesis',
      'academic',
      'hochschule',
      'tu münchen',
      'ausbildung',
      'studium',
    ],
  },
  {
    name: 'about_skills',
    kind: 'content',
    title: 'About — skills',
    section: 'about',
    topic: 'skills',
    spotlight: 'about-skills',
    description:
      "Michael's technical skills grouped by category (machine learning, frontend, backend, DevOps, languages).",
    aliases: [
      'skills',
      'skill',
      'tech stack',
      'technology',
      'technologies',
      'programming languages',
      'pytorch',
      'typescript',
      'python',
      'java',
      'react',
      'vue',
      'what he knows',
      'competencies',
      'fähigkeiten',
    ],
  },
  {
    name: 'about_hobbies',
    kind: 'content',
    title: 'About — hobbies',
    section: 'about',
    topic: 'hobbies',
    spotlight: 'about-hobbies',
    description: "Michael's hobbies: running, cycling and walking with his dog.",
    aliases: [
      'hobbies',
      'hobby',
      'free time',
      'spare time',
      'running',
      'cycling',
      'dog',
      'fun',
      'interests',
      'for fun',
      'freizeit',
    ],
  },
  {
    name: 'projects',
    kind: 'content',
    title: 'Projects',
    section: 'projects',
    description: "Michael's open-source projects, like MUCGPT, on their own page.",
    aliases: [
      'projects',
      'project',
      'mucgpt',
      'what has he built',
      'open source',
      'open-source',
      'portfolio',
      'github projects',
      'projekte',
    ],
  },
  {
    name: 'contact',
    kind: 'content',
    title: 'Contact',
    section: 'contact',
    description: 'How to reach Michael: LinkedIn and GitHub links.',
    aliases: [
      'contact',
      'reach',
      'email',
      'linkedin',
      'github',
      'social',
      'socials',
      'how to contact',
      'how to reach',
      'kontakt',
      'kontaktieren',
      'wo finde ich seinen github',
    ],
  },
  {
    name: 'blog',
    kind: 'content',
    title: 'Blog',
    section: 'blog',
    description: "Michael's blog articles about this site and the models that power it.",
    aliases: ['blog', 'blog articles', 'blog posts', 'posts', 'articles', 'artikel'],
  },
  {
    name: 'blog:chat-with-my-website',
    kind: 'content',
    title: 'Blog — Chat with my website',
    section: 'blog',
    slug: 'chat-with-my-website',
    description:
      "The blog article 'Chat with my website' — how Mini-Michi, the on-device assistant, runs a real language model in the browser.",
    aliases: [
      'chat with my website',
      'how does this page work',
      'how the site works',
      'what is this page',
      'chat model',
      'how fast is the chat model',
      'on-device',
      'transformers.js',
      'webgpu',
      'wasm',
      'blog post',
      'blog article',
    ],
  },
  {
    name: 'site_index',
    kind: 'content',
    title: 'Site index',
    description:
      'An index of every piece of content on the site (About, Projects, Contact, Blog and each article).',
    aliases: [
      'what can you do',
      'what do you know',
      'what is available',
      'overview',
      'give me an overview',
      'site overview',
      'list',
      'list all',
      'catalog',
      'index',
      'contents',
      'all content',
      'statistics',
      'stats',
      'numbers',
      'show all',
      'surprise me',
      'something random',
      'random fact',
      'explore',
    ],
  },
  {
    name: 'set_theme',
    kind: 'action',
    title: 'Switch theme',
    description:
      'Switch the accent color theme of the whole page to amber, orange or red. Applied directly by the retriever — the chat model never calls it.',
    aliases: [
      'theme',
      'color',
      'colour',
      'accent',
      'dark mode',
      'red theme',
      'orange theme',
      'amber theme',
      'recolor',
      'palette',
      'next color',
      'another color',
      'switch color',
      'switch the theme',
      'change palette',
      'change the look',
      'change the theme',
      'paint the page',
      'make the page red',
      'can you change the theme',
    ],
  },
]

export interface SourceDoc {
  name: string
  text: string
}

function sourceDocText(def: SourceDef): string {
  return `${def.name} — ${def.title}: ${def.description}. ${def.aliases.join(', ')}`
}

export function getSourceDocs(): SourceDoc[] {
  return SOURCE_DEFS.map((def) => ({ name: def.name, text: sourceDocText(def) }))
}

export function filterSources(names: string[]): SourceDef[] {
  return SOURCE_DEFS.filter((def) => names.includes(def.name))
}

export function sourceChars(defs: SourceDef[]): number {
  return defs.reduce((total, def) => total + sourceDocText(def).length, 0)
}

/* ------------------------------------------------------------------ */
/* Content injection                                                   */
/* ------------------------------------------------------------------ */

export const MAX_INJECT_CHARS = 1800

function buildSiteIndex(): string {
  return listContentItems()
    .map((item) => `- ${item.id}: ${item.title} — ${item.description}`)
    .join('\n')
}

export async function getSourceContent(name: string): Promise<string> {
  const def = SOURCE_DEFS.find((entry) => entry.name === name)
  if (!def || def.kind !== 'content') throw new Error(`Unknown content source: ${name}`)
  if (name === 'site_index') return buildSiteIndex()
  if (def.topic) return aboutMeMarkdown(def.topic)
  if (def.slug) return getContentById(`blog:${def.slug}`)
  return getContentById(name)
}

/** Fetch the selected content sources and format them into one context block,
    trimming to a token budget so the 350M context stays healthy. */
export async function buildContextText(
  names: string[],
): Promise<{ names: string[]; text: string }> {
  const defs = filterSources(names).filter((def) => def.kind === 'content')
  const chunks: string[] = []
  const used: string[] = []
  let budget = MAX_INJECT_CHARS
  for (const def of defs) {
    const content = (await getSourceContent(def.name)).trim()
    const block = `[${def.name}]\n${content}`
    if (block.length <= budget) {
      chunks.push(block)
      budget -= block.length
      used.push(def.name)
    } else if (budget > 0) {
      chunks.push(block.slice(0, budget))
      budget = 0
      used.push(def.name)
    }
  }
  return { names: used, text: chunks.join('\n\n') }
}

/* ------------------------------------------------------------------ */
/* System prompt                                                       */
/* ------------------------------------------------------------------ */

export function buildSystemPrompt(contextText = ''): string {
  const context = contextText ? `\n--- retrieved content ---\n${contextText}` : ''
  return `You are MINI-MICHI, a tiny on-device AI assistant running entirely inside Michael Jaumann's personal website. A visitor is chatting with you. Answer the visitor's question from the retrieved content below.

Rules:
- Base your answer ONLY on the retrieved content. Never invent facts about Michael.
- If the retrieved content does not answer the question, say so briefly instead of guessing.
- Keep answers short, friendly and concise. Use the visitor's language.
- You cannot change the page, open links or look anything up — the content you were given is all you have.${context}`
}

/* ------------------------------------------------------------------ */
/* Heuristic action decision (no LLM call syntax)                      */
/* ------------------------------------------------------------------ */

export interface ToolScoreLike {
  name: string
  score: number
  rank: number
}

const ACTION_MIN_SCORE = 0.6

function resolveTheme(query: string): ThemeName | null {
  const lower = query.toLowerCase()
  for (const theme of THEME_ORDER) {
    if (new RegExp(`\\b${theme}\\b`).test(lower)) return theme
  }
  return null
}

/** Decide the theme to apply, or null if the query is not a theme request.
    Deterministic: the set_theme candidate must rank first with a strong score;
    an explicit color in the query wins, otherwise the theme cycles forward. */
export function decideAction(
  query: string,
  rows: ToolScoreLike[],
  currentTheme: ThemeName,
): ThemeName | null {
  const themeRow = rows.find((row) => row.name === 'set_theme')
  if (!themeRow || themeRow.rank !== 0 || themeRow.score < ACTION_MIN_SCORE) return null
  const explicit = resolveTheme(query)
  if (explicit) return explicit
  return THEME_ORDER[(THEME_ORDER.indexOf(currentTheme) + 1) % THEME_ORDER.length]
}
