import { nextTick, reactive } from 'vue'

export type SectionId = 'about' | 'projects' | 'contact'
export type ThemeName = 'amber' | 'orange' | 'red'

export interface SectionState {
  id: SectionId
  expanded: boolean
  visible: boolean
}

export const DEFAULT_SECTIONS: SectionState[] = [
  { id: 'about', expanded: true, visible: true },
  { id: 'projects', expanded: false, visible: true },
  { id: 'contact', expanded: false, visible: true },
]

export interface SiteLayout {
  sections: SectionState[]
  theme: ThemeName
  scanlines: boolean
  highlight: SectionId | null
}

const state = reactive<SiteLayout>({
  sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
  theme: 'amber',
  scanlines: true,
  highlight: null,
})

function syncDocument(): void {
  document.documentElement.dataset.theme = state.theme
  document.body.classList.toggle('crt-off', !state.scanlines)
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

  const resetLayout = (): void => {
    state.sections = DEFAULT_SECTIONS.map((section) => ({ ...section }))
  }

  const setTheme = (theme: ThemeName): void => {
    state.theme = theme
    syncDocument()
  }

  const cycleTheme = (): void => {
    const order: ThemeName[] = ['amber', 'orange', 'red']
    const next = order[(order.indexOf(state.theme) + 1) % order.length]
    setTheme(next)
  }

  const toggleScanlines = (): void => {
    state.scanlines = !state.scanlines
    syncDocument()
  }

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
    isVisible,
    setVisible,
    visibleSections,
    moveSection,
    moveSectionTo,
    rotateSections,
    resetLayout,
    setTheme,
    cycleTheme,
    toggleScanlines,
    focusSection,
  }
}
