<script setup lang="ts">
import type { Component } from 'vue'
import { useSiteLayout, type SectionId } from './composables/useSiteLayout'
import AboutSection from './components/AboutSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import ContactSection from './components/ContactSection.vue'
import AiSection from './components/AiSection.vue'

const { state } = useSiteLayout()

const components: Record<SectionId, Component> = {
  about: AboutSection,
  projects: ProjectsSection,
  contact: ContactSection,
}
</script>

<template>
  <main class="app-main">
    <div class="app-layout">
      <aside class="app-dock" aria-label="Chat with Micro-Mike">
        <AiSection />
      </aside>
      <div class="app-column">
        <component
          v-for="section in state.sections"
          :is="components[section.id]"
          :key="section.id"
        />
      </div>
    </div>
  </main>
</template>
