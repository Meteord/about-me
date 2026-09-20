import { nextTick, reactive } from 'vue'

export type SectionId = 'about' | 'projects' | 'contact' | 'blog' | 'visuals'
export type ThemeName = 'amber' | 'orange' | 'red'
export type ZoomLevel = 'compact' | 'normal' | 'comfortable'

export interface SectionState {
  id: SectionId
  expanded: boolean
  visible: boolean
}

export const DEFAULT_SECTIONS: SectionState[] = [
  { id: 'about', expanded: true, visible: true },
  { id: 'projects', expanded: false, visible: true },
  { id: 'contact', expanded: false, visible: true },
  { id: 'blog', expanded: false, visible: true },
  { id: 'visuals', expanded: false, visible: true },
]

export interface SiteLayout {
  sections: SectionState[]
  theme: ThemeName
  highlight: SectionId | null
  spotlight: string | null
  zoom: ZoomLevel
}

const state = reactive<SiteLayout>({
  sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
  theme: 'amber',
  highlight: null,
  spotlight: null,
  zoom: 'normal',
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
  collapseOthers?: boolean
  target?: string
}

export function useSiteLayout() {
  const isExpanded = (id: SectionId): boolean =>
    state.sections.find((section) => section.id === id)?.expanded ?? false

  const toggle = (id: SectionId): void => {
    const index = findIndex(id)
    if (index !== -1) state.sections[index].expanded = !state.sections[index].expanded
  }

  const setExpanded = (id: SectionId, expanded: boolean): void => {
    const index = findIndex(id)
    if (index !== -1) state.sections[index].expanded = expanded
  }

  const setAllExpanded = (expanded: boolean): void => {
    state.sections.forEach((section) => {
      section.expanded = expanded
    })
  }

  const isVisible = (id: SectionId): boolean =>
    state.sections.find((section) => section.id === id)?.visible ?? true

  const setVisible = (id: SectionId, visible: boolean): void => {
    const index = findIndex(id)
    if (index !== -1) state.sections[index].visible = visible
  }

  const visibleSections = (): SectionState[] => state.sections.filter((section) => section.visible)

  const moveSection = (id: SectionId, direction: 'up' | 'down'): boolean => {
    const index = findIndex(id)
    if (index === -1) return false
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= state.sections.length) return false
    const [section] = state.sections.splice(index, 1)
    state.sections.splice(target, 0, section)
    return true
  }

  const moveSectionTo = (id: SectionId, position: number | 'top' | 'bottom'): boolean => {
    const index = findIndex(id)
    if (index === -1) return false
    const raw =
      position === 'top' ? 0 : position === 'bottom' ? state.sections.length - 1 : position
    const clamped = Math.max(0, Math.min(state.sections.length - 1, raw))
    const [section] = state.sections.splice(index, 1)
    state.sections.splice(clamped, 0, section)
    return true
  }

  const resetLayout = (): void => {
    state.sections = DEFAULT_SECTIONS.map((section) => ({ ...section }))
    state.zoom = 'normal'
    syncDocument()
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

  const scrollPage = (position: 'top' | 'bottom'): void => {
    window.scrollTo({
      top: position === 'top' ? 0 : document.documentElement.scrollHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  const flashSection = (id: SectionId): void => {
    state.highlight = id
    window.setTimeout(() => {
      if (state.highlight === id) state.highlight = null
    }, 700)
  }

  const clearSpotlight = (): void => {
    state.spotlight = null
  }

  const focusSection = (id: SectionId, options: FocusOptions = {}): void => {
    const { collapseOthers = true, target } = options
    if (collapseOthers) {
      state.sections.forEach((section) => {
        section.expanded = section.id === id
      })
    } else {
      const index = findIndex(id)
      if (index !== -1) state.sections[index].expanded = true
    }

    state.highlight = id
    if (target) state.spotlight = target
    nextTick(() => {
      const el = target ? document.getElementById(target) : null
      const fallback = document.getElementById(id)
      ;(el ?? fallback)?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: el ? 'center' : 'start',
      })
    })

    window.setTimeout(
      () => {
        if (state.highlight === id) state.highlight = null
        if (target && state.spotlight === target) clearSpotlight()
      },
      target ? 1400 : 700,
    )
  }

  syncDocument()

  return {
    state,
    isExpanded,
    toggle,
    setExpanded,
    setAllExpanded,
    isVisible,
    setVisible,
    visibleSections,
    moveSection,
    moveSectionTo,
    resetLayout,
    setTheme,
    cycleTheme,
    setZoom,
    scrollPage,
    flashSection,
    focusSection,
    clearSpotlight,
  }
}
