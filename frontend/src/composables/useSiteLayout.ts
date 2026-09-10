import { reactive } from 'vue'

export type SectionId = 'about' | 'projects' | 'contact'
export type ThemeName = 'amber' | 'orange' | 'red'

export interface SectionState {
  id: SectionId
  expanded: boolean
}

export interface SiteLayout {
  sections: SectionState[]
  theme: ThemeName
  scanlines: boolean
}

const state = reactive<SiteLayout>({
  sections: [
    { id: 'about', expanded: true },
    { id: 'projects', expanded: false },
    { id: 'contact', expanded: false },
  ],
  theme: 'amber',
  scanlines: true,
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

  const moveSection = (id: SectionId, direction: 'up' | 'down'): boolean => {
    const index = findIndex(id)
    if (index === -1) return false
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= state.sections.length) return false
    const [section] = state.sections.splice(index, 1)
    state.sections.splice(target, 0, section)
    return true
  }

  const moveSectionTo = (id: SectionId, position: number): boolean => {
    const index = findIndex(id)
    if (index === -1) return false
    const clamped = Math.max(0, Math.min(state.sections.length - 1, position))
    const [section] = state.sections.splice(index, 1)
    state.sections.splice(clamped, 0, section)
    return true
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

  syncDocument()

  return {
    state,
    isExpanded,
    toggle,
    setExpanded,
    moveSection,
    moveSectionTo,
    setTheme,
    cycleTheme,
    toggleScanlines,
  }
}
