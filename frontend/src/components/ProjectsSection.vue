<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { projectsHref } from '../composables/useHashRoute'
import { siteData } from '../data/siteData'

const { state } = useSiteLayout()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'projects' })

const featured = siteData.projects[0]

const teaserText =
  featured.description.length > 140
    ? featured.description.slice(0, 137) + '…'
    : featured.description
</script>

<template>
  <section
    ref="root"
    id="projects"
    class="pixel-window reveal"
    :class="{ 'pixel-window--highlight': state.highlight === 'projects' }"
    aria-labelledby="projects-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <h2 id="projects-title" class="pixel-window__title">Projects</h2>
    </div>
    <div class="pixel-window__content">
      <div class="project-teaser">
        <h3 class="project-card__title project-teaser__title">{{ featured.name }}</h3>
        <p class="project-teaser__desc">{{ teaserText }}</p>
        <a :href="projectsHref()" class="pixel-link-btn project-teaser__link">All projects →</a>
      </div>
    </div>
  </section>
</template>
