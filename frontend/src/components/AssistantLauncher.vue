<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useChatSession } from '../composables/useChatSession'
import ChatSurface from './ChatSurface.vue'

const { launcherOpen, setLauncherOpen } = useChatSession()
const open = computed({
  get: () => launcherOpen.value,
  set: (value: boolean) => setLauncherOpen(value),
})
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const surface = ref<InstanceType<typeof ChatSurface> | null>(null)

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

let scrollLocked = false

function lockScrollIfNarrow(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  if (!window.matchMedia('(max-width: 480px)').matches) return
  document.body.style.overflow = 'hidden'
  scrollLocked = true
}

function unlockScroll(): void {
  if (!scrollLocked) return
  document.body.style.overflow = ''
  scrollLocked = false
}

function openPanel(): void {
  if (open.value) return
  open.value = true
  lockScrollIfNarrow()
  nextTick(() => {
    surface.value?.focusInput()
    if (!panel.value?.contains(document.activeElement)) panel.value?.focus()
  })
}

function closePanel(): void {
  if (!open.value) return
  open.value = false
  unlockScroll()
  trigger.value?.focus()
}

function toggle(): void {
  if (open.value) closePanel()
  else openPanel()
}

/** Escape closes; Tab/Shift+Tab cycle inside the panel while it is open. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    closePanel()
    return
  }
  if (event.key !== 'Tab') return

  const container = panel.value
  if (!container) return
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
  if (!focusables.length) return

  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault()
    last.focus()
  }
}

onBeforeUnmount(unlockScroll)
</script>

<template>
  <div class="assistant-launcher">
    <button
      ref="trigger"
      type="button"
      class="assistant-launcher__trigger"
      aria-controls="assistant-launcher-panel"
      :aria-expanded="open"
      @click="toggle"
    >
      Chat with Mini-Michi
    </button>

    <section
      v-if="open"
      id="assistant-launcher-panel"
      ref="panel"
      class="assistant-launcher__panel"
      role="dialog"
      aria-modal="true"
      aria-label="Chat with Mini-Michi"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="assistant-launcher__bar">
        <p class="assistant-launcher__title">Mini-Michi</p>
        <button type="button" class="pixel-link-btn assistant-launcher__close" @click="closePanel">
          Close
        </button>
      </div>
      <ChatSurface ref="surface" variant="launcher" />
    </section>
  </div>
</template>
