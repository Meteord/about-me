import { ref } from 'vue'

export interface BlogRoute {
  name: 'blog'
  slug: string | null
}

export interface HomeRoute {
  name: 'home'
}

export type SiteRoute = HomeRoute | BlogRoute

const route = ref<SiteRoute>(parseRoute())

function parseRoute(): SiteRoute {
  const hash = window.location.hash.replace(/^#/, '')
  const segments = hash.split('/').filter(Boolean)
  if (segments[0] === 'blog') {
    return { name: 'blog', slug: segments[1] ?? null }
  }
  return { name: 'home' }
}

window.addEventListener('hashchange', () => {
  route.value = parseRoute()
})

export function useHashRoute() {
  return { route }
}

export function blogHref(slug?: string): string {
  return slug ? `#/blog/${slug}` : '#/blog'
}
