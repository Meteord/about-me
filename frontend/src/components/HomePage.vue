<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useChatSession } from '../composables/useChatSession'
import { useSiteLayout } from '../composables/useSiteLayout'
import AboutIntro from './AboutIntro.vue'
import AboutSection from './AboutSection.vue'
import AiShowcase from './AiShowcase.vue'
import AssistantLauncher from './AssistantLauncher.vue'
import BlogSection from './BlogSection.vue'
import ContactSection from './ContactSection.vue'
import ProjectsSection from './ProjectsSection.vue'

const { state, isVisible } = useSiteLayout()
const { disposeDecide, disposeVector } = useChatSession()

/** Fixed editorial order — never data-driven (contract section-layout.md C1). */
const noSectionVisible = computed(
  () =>
    !isVisible('about') && !isVisible('blog') && !isVisible('projects') && !isVisible('contact'),
)

onBeforeUnmount(() => {
  disposeDecide()
  disposeVector()
})
</script>

<template>
  <div class="app-column">
    <AboutIntro v-if="isVisible('about')" />

    <AiShowcase v-if="state.showcaseVisible" />

    <AboutSection v-if="isVisible('about')" />

    <BlogSection v-if="isVisible('blog')" />
    <ProjectsSection v-if="isVisible('projects')" />
    <ContactSection v-if="isVisible('contact')" />

    <div v-if="noSectionVisible" class="app-column--empty" role="note">
      <p class="pixel-chat__hint">All sections are hidden. Ask Mini-Michi to show one again.</p>
    </div>

    <AssistantLauncher />
  </div>
</template>
