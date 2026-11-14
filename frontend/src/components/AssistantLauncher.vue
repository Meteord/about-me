<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChatNav } from '../composables/useChatNav'
import { useSiteLayout } from '../composables/useSiteLayout'
import NavSurface from './NavSurface.vue'

const { open, announcement, clearFeedback } = useChatNav()
const { state } = useSiteLayout()
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const surface = ref<InstanceType<typeof NavSurface> | null>(null)

/** The launcher steps aside while the same showcase is already on screen. */
const showcaseOnScreen = ref(false)
let frame = 0

function measureShowcase(): void {
  frame = 0
  const target = document.getElementById('assistant')
  const button = trigger.value
  if (!target || !button) {
    showcaseOnScreen.value = false
    return
  }
  // Hide only when the floating button would land on top of the real chat.
  const showcase = target.getBoundingClientRect()
  const own = button.getBoundingClientRect()
  showcaseOnScreen.value = own.bottom > showcase.top && own.top < showcase.bottom
}

function requestShowcaseMeasure(): void {
  if (frame) return
  frame = window.requestAnimationFrame(measureShowcase)
}

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

onMounted(() => {
  window.addEventListener('scroll', requestShowcaseMeasure, { passive: true })
  window.addEventListener('resize', requestShowcaseMeasure)
  requestShowcaseMeasure()
})

watch(
  () => state.showcaseVisible,
  () => void nextTick(requestShowcaseMeasure),
)

onBeforeUnmount(() => {
  window.removeEventListener('scroll', requestShowcaseMeasure)
  window.removeEventListener('resize', requestShowcaseMeasure)
  if (frame) window.cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="assistant-launcher">
    <button
      ref="trigger"
      type="button"
      class="assistant-launcher__trigger"
      aria-label="Find it on this page"
      aria-controls="assistant-launcher-panel"
      :aria-expanded="open"
      :data-hidden="showcaseOnScreen && !open"
      @click="toggle"
    >
      <span class="assistant-launcher__trigger-full">Find it on this page</span>
      <span class="assistant-launcher__trigger-short" aria-hidden="true">Find</span>
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
