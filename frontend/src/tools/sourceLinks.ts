import { findContentItem } from '../composables/useLlmsContent'
import { SOURCE_DEFS, type SourceDef } from './registry'

/**
 * Human-facing destinations for retrieved content sources. The inline chat
 * renders these as link rows under its answers (user-initiated only), and the
 * launcher navigates to them. One mapping shared by both surfaces.
 */

export interface SourceLink {
  name: string
  label: string
  /** Canonical anchor id without the leading `#`; null when there is no single destination. */
  anchor: string | null
}

const TOPIC_LABEL: Record<string, string> = {
  bio: 'Bio',
  education: 'Education',
  skills: 'Skills',
  hobbies: 'Hobbies',
}

const SECTION_LINK: Record<string, { label: string; anchor: string }> = {
  about: { label: 'About', anchor: 'about' },
  hobbies: { label: 'Hobbies', anchor: 'hobbies' },
  blog: { label: 'Blog', anchor: 'blog' },
  projects: { label: 'Projects', anchor: 'projects' },
  contact: { label: 'Contact', anchor: 'contact' },
}

/** The site's five top-level bands, for an index-style ("what can you do?") query. */
export const SECTION_LINKS: SourceLink[] = Object.entries(SECTION_LINK).map(([name, link]) => ({
  name,
  label: link.label,
  anchor: link.anchor,
}))

export function sourceLink(def: SourceDef): SourceLink {
  if (def.name === 'site_index') return { name: def.name, label: 'Site index', anchor: null }

  if (def.slug) {
    const item = findContentItem(`blog:${def.slug}`)
    return {
      name: def.name,
      label: item?.title ?? 'Blog article',
      anchor: `blog-${def.slug}`,
    }
  }

  if (def.topic && def.topic !== 'all') {
    return {
      name: def.name,
      label: TOPIC_LABEL[def.topic] ?? def.title,
      anchor: def.spotlight ?? def.section ?? null,
    }
  }

  if (def.section) {
    const section = SECTION_LINK[def.section]
    return {
      name: def.name,
      label: section?.label ?? def.title,
      anchor: section?.anchor ?? null,
    }
  }

  return { name: def.name, label: def.title, anchor: null }
}

const SOURCE_BY_NAME = new Map(SOURCE_DEFS.map((def) => [def.name, def]))

/** Map a retrieval `injectedNames` list to de-duplicated, readable sources. */
export function sourceLinksFor(names: readonly string[]): SourceLink[] {
  const seen = new Set<string>()
  const links: SourceLink[] = []
  for (const name of names) {
    if (seen.has(name)) continue
    seen.add(name)
    const def = SOURCE_BY_NAME.get(name)
    if (!def || def.kind !== 'content') continue
    links.push(sourceLink(def))
  }
  return links
}
