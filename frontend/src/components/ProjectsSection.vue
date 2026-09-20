<script setup lang="ts">
import { useSiteLayout } from '../composables/useSiteLayout'
import { projectsHref } from '../composables/useHashRoute'
import { siteData } from '../data/siteData'

const { state, isExpanded, toggle } = useSiteLayout()

const featured = siteData.projects[0]

const teaserText =
  featured.description.length > 140
    ? featured.description.slice(0, 137) + '…'
    : featured.description
</script>

<template>
  <section
    id="projects"
    class="pixel-window fade-in-section"
    :class="{ 'pixel-window--highlight': state.highlight === 'projects' }"
  >
    <button
      @click="toggle('projects')"
      class="pixel-window__bar"
      type="button"
      aria-controls="projects-content"
      :aria-expanded="isExpanded('projects')"
    >
      <span class="pixel-window__title">Projects</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="pixel-window__toggle">{{ isExpanded('projects') ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="isExpanded('projects')" id="projects-content" class="pixel-window__content">
        <div class="project-teaser" aria-label="Latest projects and link to all projects">
          <h3 class="project-card__title project-teaser__title">{{ featured.name }}</h3>
          <p class="project-teaser__desc">{{ teaserText }}</p>
          <a :href="projectsHref()" class="pixel-link-btn project-teaser__link"> All projects → </a>
        </div>
      </div>
    </transition>
  </section>
</template>
