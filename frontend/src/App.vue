<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { useSiteLayout, type SectionId } from './composables/useSiteLayout'
import { useHashRoute } from './composables/useHashRoute'
import AboutSection from './components/AboutSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import ContactSection from './components/ContactSection.vue'
import BlogSection from './components/BlogSection.vue'
import BlogPostPage from './components/BlogPostPage.vue'
import ProjectsPage from './components/ProjectsPage.vue'
import AiSection from './components/AiSection.vue'

const { visibleSections } = useSiteLayout()
const { route } = useHashRoute()

const components: Record<SectionId, Component> = {
  about: AboutSection,
  blog: BlogSection,
  projects: ProjectsSection,
  contact: ContactSection,
}

const shown = computed(() => visibleSections())
const blogPost = computed(() =>
  route.value.name === 'blog' && route.value.slug ? route.value.slug : null,
)
const onProjects = computed(() => route.value.name === 'projects')
</script>

<template>
  <main class="app-main">
    <div class="app-layout">
      <aside class="app-dock" aria-label="Chat with Mini-Michi">
        <AiSection />
      </aside>
      <transition-group v-if="blogPost" tag="div" name="stack" class="app-column app-column--wide">
        <BlogPostPage :key="`blog-${blogPost}`" :slug="blogPost" />
      </transition-group>
      <transition-group
        v-else-if="onProjects"
        tag="div"
        name="stack"
        class="app-column app-column--wide"
      >
        <ProjectsPage :key="'projects-page'" />
      </transition-group>
      <transition-group v-else-if="shown.length" tag="div" name="stack" class="app-column">
        <component v-for="section in shown" :is="components[section.id]" :key="section.id" />
      </transition-group>
      <div v-else class="app-column app-column--empty" role="note">
        <p class="pixel-chat__hint">All sections are hidden. Ask Mini-Michi to show one again.</p>
      </div>
    </div>
  </main>
</template>
