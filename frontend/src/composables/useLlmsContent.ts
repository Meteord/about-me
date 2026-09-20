import { aboutMeMarkdown, siteData } from '../data/siteData'
import type { SectionId } from './useSiteLayout'

export type ContentKind = 'section' | 'page'

export interface ContentItem {
  id: string
  title: string
  description: string
  kind: ContentKind
  section: SectionId
  slug?: string
}

const LLMS_FILES = ['about.md', 'projects.md', 'contact.md', 'blog.md']

let cached: string | null = null

const fileCache = new Map<string, string>()

async function fetchFile(file: string): Promise<string> {
  const base = import.meta.env.BASE_URL ?? '/'
  const res = await fetch(`${base}llms/${file}`)
  if (!res.ok) throw new Error(`Failed to load llms/${file}`)
  return res.text()
}

function getFile(file: string): Promise<string> {
  const hit = fileCache.get(file)
  if (hit) return Promise.resolve(hit)
  return fetchFile(file).then((text) => {
    fileCache.set(file, text)
    return text
  })
}

async function fetchContent(): Promise<string> {
  const parts = await Promise.all(LLMS_FILES.map((file) => getFile(file)))
  return parts.join('\n\n')
}

export async function getSiteContent(): Promise<string> {
  if (cached) return cached

  try {
    cached = await fetchContent()
  } catch {
    cached = null
  }

  return cached ?? aboutMeMarkdown('all')
}

export async function refreshSiteContent(): Promise<string> {
  cached = null
  return getSiteContent()
}

/* ------------------------------------------------------------------ */
/* Content index (used by list_contents / get_content tools)           */
/* ------------------------------------------------------------------ */

const SECTION_ITEMS: ContentItem[] = [
  {
    id: 'about',
    title: 'About',
    description: 'Bio, education, skills and hobbies',
    kind: 'section',
    section: 'about',
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Open-source projects like MUCGPT, on their own page',
    kind: 'page',
    section: 'projects',
  },
  {
    id: 'contact',
    title: 'Contact',
    description: 'LinkedIn and GitHub links',
    kind: 'section',
    section: 'contact',
  },
  {
    id: 'blog',
    title: 'Blog',
    description: 'Blog articles about this site and the models that power it',
    kind: 'section',
    section: 'blog',
  },
]

const FILE_BY_ID: Record<string, string> = {
  about: 'about.md',
  projects: 'projects.md',
  contact: 'contact.md',
  blog: 'blog.md',
}

export function listContentItems(): ContentItem[] {
  const posts = siteData.blog.map(
    (post): ContentItem => ({
      id: `blog:${post.slug}`,
      title: post.title,
      description: post.teaser,
      kind: 'page',
      section: 'blog',
      slug: post.slug,
    }),
  )
  return [...SECTION_ITEMS, ...posts]
}

export function findContentItem(id: string): ContentItem | undefined {
  return listContentItems().find((item) => item.id === id)
}

export function getContentById(id: string): Promise<string> {
  const item = findContentItem(id)
  if (!item) throw new Error(`Unknown content id: ${id}`)
  return getFile(item.slug ? FILE_BY_ID.blog : (FILE_BY_ID[item.id] ?? 'about.md'))
}
