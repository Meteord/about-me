import { onBeforeUnmount, onMounted } from 'vue'

/**
 * The site used to expose hash-routed views (`#/projects`, `#/blog/<slug>`).
 * Everything now lives on one page, so map those old URLs onto the matching
 * in-page anchor before the browser tries to resolve them.
 */
function anchorFor(hash: string): string | null {
  if (!hash.startsWith('#/')) return null

  const segments = hash.slice(2).split('/').filter(Boolean)
  if (segments[0] === 'projects') return 'projects'
  if (segments[0] === 'blog') {
    return segments[1] ? `blog-${segments[1]}` : 'blog'
  }
  return null
}

function scrollTo(id: string): void {
  const element = document.getElementById(id)
  if (!element) return

  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

function redirectLegacy(): boolean {
  const target = anchorFor(window.location.hash)
  if (!target) return false

  window.history.replaceState(null, '', `#${target}`)
  scrollTo(target)
  return true
}

/** Vue renders the page after the browser's first anchor attempt, so a direct
    link to any in-page anchor is resolved again here. */
function restoreDeepLink(): void {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash || hash.startsWith('/')) return
  scrollTo(hash)
}

function restore(): void {
  if (!redirectLegacy()) restoreDeepLink()
}

export function useLegacyHashRedirect(): void {
  onMounted(() => {
    restore()
    // The browser can reset the scroll while finishing the initial navigation,
    // and web fonts shift the target afterwards — so resolve the anchor again.
    window.addEventListener('load', restore, { once: true })
    if (document.fonts?.ready) void document.fonts.ready.then(restore)
    window.addEventListener('hashchange', redirectLegacy)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('load', restore)
    window.removeEventListener('hashchange', redirectLegacy)
  })
}
