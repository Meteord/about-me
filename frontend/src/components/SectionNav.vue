<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSiteLayout } from '../composables/useSiteLayout'

interface NavItem {
  id: string
  label: string
}

const { state, isVisible } = useSiteLayout()

const items = computed<NavItem[]>(() => {
  const list: NavItem[] = []

  if (isVisible('about')) list.push({ id: 'about', label: 'About' })
  if (state.showcaseVisible) list.push({ id: 'assistant', label: 'Chat' })
  if (isVisible('about')) list.push({ id: 'background', label: 'Background' })
  if (isVisible('hobbies')) list.push({ id: 'hobbies', label: 'Hobbies' })

  if (isVisible('blog')) {
    list.push({ id: 'blog', label: 'Blog' })
  }

  if (isVisible('projects')) list.push({ id: 'projects', label: 'Projects' })
  if (isVisible('contact')) list.push({ id: 'contact', label: 'Contact' })

  return list
})

/** Which band fills the screen right now: "you are here" for a 7,000px page. */
const activeId = ref<string | null>(null)

let frame = 0

function measure(): void {
  frame = 0
  const list = items.value
  if (!list.length) {
    activeId.value = null
    return
  }

  const doc = document.documentElement
  const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 2
  if (atBottom) {
    activeId.value = list[list.length - 1].id
    return
  }

  // The band that actually occupies most of the viewport — not simply the one
  // whose top just crossed a line, which misreads the tall article band.
  const viewport = window.innerHeight || 1
  let best = list[0].id
  let bestArea = -1
  for (const item of list) {
    const element = document.getElementById(item.id)
    if (!element) continue
    const rect = element.getBoundingClientRect()
    const visible = Math.min(rect.bottom, viewport) - Math.max(rect.top, 0)
    if (visible > bestArea) {
      bestArea = visible
      best = item.id
    }
  }
  activeId.value = best
}

function requestMeasure(): void {
  if (frame) return
  frame = window.requestAnimationFrame(measure)
}

watch(items, requestMeasure, { flush: 'post' })

onMounted(() => {
  window.addEventListener('scroll', requestMeasure, { passive: true })
  window.addEventListener('resize', requestMeasure)
  requestMeasure()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', requestMeasure)
  window.removeEventListener('resize', requestMeasure)
  if (frame) window.cancelAnimationFrame(frame)
})
</script>

<template>
  <nav v-if="items.length" class="pixel-jump" aria-label="Page contents">
    <span class="pixel-jump__label">Jump to</span>
    <ul class="pixel-jump__list">
      <li v-for="item in items" :key="item.id">
        <a
          class="pixel-jump__link"
          :href="`#${item.id}`"
          :aria-current="activeId === item.id ? 'location' : undefined"
          >{{ item.label }}</a
        >
      </li>
    </ul>
  </nav>
</template>
