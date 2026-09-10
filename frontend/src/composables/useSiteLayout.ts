import { nextTick, reactive } from 'vue'

export type SectionId = 'about' | 'projects' | 'contact' | 'tech'
export type ThemeName = 'amber' | 'orange' | 'red'
export type BackgroundMode = 'dots' | 'grid' | 'plain'
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
  { id: 'tech', expanded: false, visible: true },
]

export interface SiteLayout {
  sections: SectionState[]
  theme: ThemeName
  scanlines: boolean
  highlight: SectionId | null
  glitch: boolean
  background: BackgroundMode
  zoom: ZoomLevel
}

const state = reactive<SiteLayout>({
  sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
  theme: 'amber',
  scanlines: true,
  highlight: null,
  glitch: false,
  background: 'dots',
  zoom: 'normal',
})

const THEME_ORDER: ThemeName[] = ['amber', 'orange', 'red']
const DEFAULT_ORDER: SectionId[] = ['about', 'projects', 'contact', 'tech']

function syncDocument(): void {
  const root = document.documentElement
  root.dataset.theme = state.theme
  root.dataset.background = state.background
  root.dataset.zoom = state.zoom
  document.body.classList.toggle('crt-off', !state.scanlines)
  document.body.classList.toggle('crt-glitch', state.glitch)
}

function findIndex(id: SectionId): number {
  return state.sections.findIndex((section) => section.id === id)
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

  const rotateSections = (direction: 'next' | 'prev'): void => {
    if (state.sections.length < 2) return
    if (direction === 'next') {
      const [section] = state.sections.splice(0, 1)
      state.sections.push(section)
    } else {
      const section = state.sections.pop()
      if (section) state.sections.unshift(section)
    }
  }

  const reverseSections = (): void => {
    state.sections.reverse()
  }

  const shuffleSections = (): void => {
    for (let i = state.sections.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[state.sections[i], state.sections[j]] = [state.sections[j], state.sections[i]]
    }
  }

  const sortSections = (order: 'alphabetical' | 'default'): void => {
    if (order === 'alphabetical') {
      state.sections.sort((a, b) => a.id.localeCompare(b.id))
    } else {
      state.sections.sort((a, b) => DEFAULT_ORDER.indexOf(a.id) - DEFAULT_ORDER.indexOf(b.id))
    }
  }

  const resetLayout = (): void => {
    state.sections = DEFAULT_SECTIONS.map((section) => ({ ...section }))
    state.glitch = false
    state.background = 'dots'
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

  const toggleScanlines = (): void => {
    state.scanlines = !state.scanlines
    syncDocument()
  }

  const toggleGlitch = (): boolean => {
    state.glitch = !state.glitch
    syncDocument()
    return state.glitch
  }

  const setBackground = (background: BackgroundMode): void => {
    state.background = background
    syncDocument()
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

  const focusSection = (id: SectionId, collapseOthers = true): void => {
    if (collapseOthers) {
      state.sections.forEach((section) => {
        section.expanded = section.id === id
      })
    } else {
      const index = findIndex(id)
      if (index !== -1) state.sections[index].expanded = true
    }

    state.highlight = id
    nextTick(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    })

    window.setTimeout(() => {
      state.highlight = null
    }, 700)
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
    rotateSections,
    reverseSections,
    shuffleSections,
    sortSections,
    resetLayout,
    setTheme,
    cycleTheme,
    toggleScanlines,
    toggleGlitch,
    setBackground,
    setZoom,
    scrollPage,
    flashSection,
    focusSection,
  }
}
