import { nextTick, reactive } from 'vue'

export type SectionId = 'about' | 'blog' | 'projects' | 'contact'
export type ThemeName = 'amber' | 'orange' | 'red'
export type ZoomLevel = 'compact' | 'normal' | 'comfortable'

/** A band of the home page. Sections are never collapsed or reordered — the
    composition is fixed in `HomePage.vue`; only an assistant action may hide
    or show one (spec 007 FR-021). */
export interface SectionState {
  id: SectionId
  visible: boolean
}

export const DEFAULT_SECTIONS: SectionState[] = [
  { id: 'about', visible: true },
  { id: 'blog', visible: true },
  { id: 'projects', visible: true },
  { id: 'contact', visible: true },
]

export interface SiteLayout {
  sections: SectionState[]
  theme: ThemeName
  highlight: SectionId | null
  spotlight: string | null
  zoom: ZoomLevel
  /** Assistant-only: hides the AI showcase band. The launcher stays reachable. */
  showcaseVisible: boolean
}

const state = reactive<SiteLayout>({
  sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
  theme: 'amber',
  highlight: null,
  spotlight: null,
  zoom: 'normal',
  showcaseVisible: true,
})

const THEME_ORDER: ThemeName[] = ['amber', 'orange', 'red']

function syncDocument(): void {
  const root = document.documentElement
  root.dataset.theme = state.theme
  root.dataset.zoom = state.zoom
}

function findIndex(id: SectionId): number {
  return state.sections.findIndex((section) => section.id === id)
}

export interface FocusOptions {
  target?: string
}

export function useSiteLayout() {
  const isVisible = (id: SectionId): boolean =>
    state.sections.find((section) => section.id === id)?.visible ?? true

  const setVisible = (id: SectionId, visible: boolean): void => {
    const index = findIndex(id)
    if (index !== -1) state.sections[index].visible = visible
  }

  /** Presence only — page order is fixed by `HomePage.vue`. */
  const visibleSections = (): SectionState[] => state.sections.filter((section) => section.visible)

  const setShowcaseVisible = (visible: boolean): void => {
    state.showcaseVisible = visible
  }

  const setTheme = (theme: ThemeName): void => {
    state.theme = theme
    syncDocument()
  }

  const cycleTheme = (): ThemeName => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(state.theme) + 1) % THEME_ORDER.length]
    setTheme(next)
    return next
  }

  const setZoom = (zoom: ZoomLevel): void => {
    state.zoom = zoom
    syncDocument()
  }

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /** Scroll to a section (or sub-block) and spotlight it. Never expands,
      collapses or reorders anything — every band is already open. */
  const focusSection = (id: SectionId, options: FocusOptions = {}): void => {
    const { target } = options

    state.highlight = id
    if (target) state.spotlight = target
    nextTick(() => {
      const el = target ? document.getElementById(target) : null
      const fallback = document.getElementById(id)
      const focusTarget = el ?? fallback
      // Small spotlights read better centred; a tall article should start at
      // its title instead of jumping into the middle of it.
      const block =
        el && el.getBoundingClientRect().height < (window.innerHeight || 0) * 0.8
          ? 'center'
          : 'start'
      focusTarget?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block,
      })
    })

    window.setTimeout(
      () => {
        if (state.highlight === id) state.highlight = null
        if (target && state.spotlight === target) state.spotlight = null
      },
      target ? 1400 : 700,
    )
  }

  syncDocument()

  return {
    state,
    isVisible,
    setVisible,
    visibleSections,
    setShowcaseVisible,
    setTheme,
    cycleTheme,
    setZoom,
    focusSection,
  }
}
