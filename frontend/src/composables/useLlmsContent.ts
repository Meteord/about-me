import { aboutMeMarkdown } from '../data/siteData'

const LLMS_FILES = ['about.md', 'projects.md', 'contact.md']

let cached: string | null = null

async function fetchContent(): Promise<string> {
  const base = import.meta.env.BASE_URL ?? '/'
  const parts = await Promise.all(
    LLMS_FILES.map(async (file) => {
      const res = await fetch(`${base}llms/${file}`)
      if (!res.ok) throw new Error(`Failed to load llms/${file}`)
      return res.text()
    }),
  )
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
