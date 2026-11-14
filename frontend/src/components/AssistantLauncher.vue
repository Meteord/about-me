<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useChatNav } from '../composables/useChatNav'
import NavSurface from './NavSurface.vue'

const { open, announcement, clearFeedback } = useChatNav()
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const surface = ref<InstanceType<typeof NavSurface> | null>(null)

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

function toggle(): void {
  open.value = !open.value
}

function closePanel(): void {
  open.value = false
}

/** Focus moves into the panel on open and back to the trigger on close. */
watch(
  open,
  (isOpen) => {
    if (isOpen) {
      // No transcript: the ranking belongs to the last question only.
      clearFeedback()
      lockScrollIfNarrow()
      nextTick(() => {
        surface.value?.focusInput()
        if (!panel.value?.contains(document.activeElement)) panel.value?.focus()
      })
    } else {
      unlockScroll()
      trigger.value?.focus({ preventScroll: true })
    }
  },
  { flush: 'post' },
)

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
      Find it on this page
    </button>

    <p class="pixel-sr-only" aria-live="polite">{{ announcement }}</p>

    <section
      v-if="open"
      id="assistant-launcher-panel"
      ref="panel"
      class="assistant-launcher__panel"
      role="dialog"
      aria-modal="true"
      aria-label="Find it on this page"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="assistant-launcher__bar">
        <p class="assistant-launcher__title">Find it on this page</p>
        <button type="button" class="pixel-link-btn assistant-launcher__close" @click="closePanel">
          Close
        </button>
      </div>
      <NavSurface ref="surface" />
    </section>
  </div>
</template>
