<script setup lang="ts">
import { computed } from 'vue'
import { useSiteLayout } from '../composables/useSiteLayout'

interface NavItem {
  id: string
  label: string
}

const { state, isVisible } = useSiteLayout()

const items = computed<NavItem[]>(() => {
  const list: NavItem[] = []

  if (isVisible('about')) {
    list.push({ id: 'about', label: 'About' })
    list.push({ id: 'education', label: 'Education' })
    list.push({ id: 'skills', label: 'Skills' })
    list.push({ id: 'hobbies', label: 'Hobbies' })
  }

  if (state.showcaseVisible) list.push({ id: 'assistant', label: 'Chat' })

  if (isVisible('blog')) {
    list.push({ id: 'blog', label: 'Blog' })
  }

  if (isVisible('projects')) list.push({ id: 'projects', label: 'Projects' })
  if (isVisible('contact')) list.push({ id: 'contact', label: 'Contact' })

  return list
})
</script>

<template>
  <nav v-if="items.length" class="pixel-jump" aria-label="Page contents">
    <span class="pixel-jump__label">Jump to</span>
    <ul class="pixel-jump__list">
      <li v-for="item in items" :key="item.id">
        <a class="pixel-jump__link" :href="`#${item.id}`">{{ item.label }}</a>
      </li>
    </ul>
  </nav>
</template>
