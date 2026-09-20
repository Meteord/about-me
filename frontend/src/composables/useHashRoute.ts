import { ref } from 'vue'

export interface BlogRoute {
  name: 'blog'
  slug: string | null
}

export interface HomeRoute {
  name: 'home'
}

export interface ProjectsRoute {
  name: 'projects'
  slug: string | null
}

export type SiteRoute = HomeRoute | BlogRoute | ProjectsRoute

const route = ref<SiteRoute>(parseRoute())

function parseRoute(): SiteRoute {
  const hash = window.location.hash.replace(/^#/, '')
  const segments = hash.split('/').filter(Boolean)
  if (segments[0] === 'blog') {
    return { name: 'blog', slug: segments[1] ?? null }
  }
  if (segments[0] === 'projects') {
    return { name: 'projects', slug: segments[1] ?? null }
  }
  return { name: 'home' }
}

window.addEventListener('hashchange', () => {
  route.value = parseRoute()
})

export function useHashRoute() {
  return { route }
}

export function homeHref(): string {
  return '#'
}

export function projectsHref(): string {
  return '#/projects'
}

export function blogHref(slug?: string): string {
  return slug ? `#/blog/${slug}` : '#/blog'
}
