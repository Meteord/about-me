import { nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useSiteLayout, type SectionId } from './useSiteLayout'

/**
 * In-page deep links: every band, card and blog entry has a stable anchor.
 * Clicking a link (or opening `#education`, `#blog-chat-with-my-website`, …)
 * scrolls to the target, highlights it and keeps the address bar in sync.
 *
 * Old hash-routed URLs (`#/projects`, `#/blog/<slug>`) and the former card ids
 * (`#about-education`, …) are rewritten to their canonical anchors.
 */

/** Canonical anchor ids and the band they belong to. */
const SECTION_BY_ANCHOR: Record<string, SectionId> = {
  about: 'about',
  background: 'about',
  education: 'about',
  skills: 'about',
  hobbies: 'about',
  nubi: 'about',
  'cycling-adventures': 'about',
  blog: 'blog',
  projects: 'projects',
  contact: 'contact',
}

/** Former card ids stay valid as aliases of the shorter anchors. */
const LEGACY_ALIASES: Record<string, string> = {
  'about-details': 'background',
  'about-education': 'education',
  'about-skills': 'skills',
  'about-hobbies': 'hobbies',
}

function fromLegacyRoute(path: string): string | null {
  const segments = path.split('/').filter(Boolean)
  if (segments[0] === 'projects') return 'projects'
  if (segments[0] === 'blog') return segments[1] ? `blog-${segments[1]}` : 'blog'
  if (segments[0] === 'about') return segments[1] ?? 'about'
  return null
}

/** Resolve a raw `href`/`location.hash` value to a canonical anchor id. */
export function resolveAnchor(value: string): string | null {
  const raw = value.startsWith('#') ? value.slice(1) : value
  if (!raw) return null
  if (raw.startsWith('/')) return fromLegacyRoute(raw)
  return LEGACY_ALIASES[raw] ?? raw
}

/** Set once the app mounts; lets non-component code (the launcher) navigate. */
let navigateTo: ((id: string) => void) | null = null

/** Navigate to a canonical anchor from outside the page's Vue tree. */
export function navigateToAnchor(value: string): boolean {
  const id = resolveAnchor(value)
  if (!id || !navigateTo) return false
  navigateTo(id)
  return true
}

function sectionFor(id: string): SectionId | null {
  const direct = SECTION_BY_ANCHOR[id]
  if (direct) return direct
  if (id.startsWith('blog-') || id === 'eval-results') return 'blog'
  if (id.startsWith('cycling-')) return 'about'
  if (id.startsWith('projects-')) return 'projects'
  if (id.startsWith('contact-')) return 'contact'
  return null
}

function scrollBehavior(): ScrollBehavior {
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduced ? 'auto' : 'smooth'
}

export function useHashNavigation(): void {
  const { state, isVisible, setVisible, setShowcaseVisible, focusSection } = useSiteLayout()

  /** A deep link must lead somewhere even if the assistant hid that band. */
  function revealTarget(id: string): void {
    const section = sectionFor(id)
    if (section && !isVisible(section)) setVisible(section, true)
    if (id === 'assistant' && !state.showcaseVisible) setShowcaseVisible(true)
  }

  function flashSpotlight(id: string): void {
    state.spotlight = id
    window.setTimeout(() => {
      if (state.spotlight === id) state.spotlight = null
    }, 1400)
  }

  /** A jump can land before the reveal observer has fired; make the target and
      its enclosing band visible immediately so the destination is never blank. */
  function revealAncestors(id: string): void {
    let node: Element | null = document.getElementById(id)
    while (node) {
      if (node.classList.contains('reveal')) node.setAttribute('data-reveal', 'in')
      node = node.parentElement
    }
  }

  function focusAnchor(id: string): void {
    revealTarget(id)

    const section = sectionFor(id)
    if (section) {
      if (id === section) focusSection(section)
      else focusSection(section, { target: id })
      // The element only exists after a hidden band has been re-rendered.
      nextTick(() => revealAncestors(id))
      return
    }

    nextTick(() => {
      const element = document.getElementById(id)
      if (!element) return
      revealAncestors(id)
      element.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
      flashSpotlight(id)
    })
  }

  function writeHash(id: string, replace: boolean): void {
    const url = `#${id}`
    if (window.location.hash === url) return
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
  }

  function navigate(id: string): void {
    writeHash(id, false)
    focusAnchor(id)
  }

  navigateTo = navigate

  function syncFromLocation(replace: boolean): void {
    const id = resolveAnchor(window.location.hash)
    if (!id) return
    writeHash(id, replace)
    focusAnchor(id)
  }

  function restore(): void {
    syncFromLocation(true)
  }

  function onClick(event: MouseEvent): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    const target = event.target
    if (!(target instanceof Element)) return

    const anchor = target.closest('a[href]')
    if (!anchor) return
    if (anchor.hasAttribute('download')) return

    const targetAttr = anchor.getAttribute('target')
    if (targetAttr && targetAttr !== '_self') return

    const href = anchor.getAttribute('href')
    if (!href || !href.startsWith('#')) return

    const id = resolveAnchor(href)
    if (!id) return

    event.preventDefault()
    navigate(id)
  }

  function onHashChange(): void {
    syncFromLocation(true)
  }

  onMounted(() => {
    restore()
    // The browser can reset the scroll while finishing the initial navigation,
    // and web fonts shift the target afterwards — so resolve the anchor again.
    window.addEventListener('load', restore, { once: true })
    if (document.fonts?.ready) void document.fonts.ready.then(restore)
    window.addEventListener('hashchange', onHashChange)
    document.addEventListener('click', onClick)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('load', restore)
    window.removeEventListener('hashchange', onHashChange)
    document.removeEventListener('click', onClick)
  })
}
