<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { useSiteLayout, type SectionId } from './composables/useSiteLayout'
import AboutSection from './components/AboutSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import ContactSection from './components/ContactSection.vue'
import TechSection from './components/TechSection.vue'
import AiSection from './components/AiSection.vue'

const { visibleSections } = useSiteLayout()

const components: Record<SectionId, Component> = {
  about: AboutSection,
  projects: ProjectsSection,
  contact: ContactSection,
  tech: TechSection,
}

const shown = computed(() => visibleSections())
</script>

<template>
  <main class="app-main">
    <div class="app-layout">
      <aside class="app-dock" aria-label="Chat with Mini-Michi">
        <AiSection />
      </aside>
      <transition-group v-if="shown.length" tag="div" name="stack" class="app-column">
        <component v-for="section in shown" :is="components[section.id]" :key="section.id" />
      </transition-group>
      <div v-else class="app-column app-column--empty" role="note">
        <p class="pixel-chat__hint">All sections are hidden. Ask Mini-Michi to show one again.</p>
      </div>
    </div>
  </main>
</template>
