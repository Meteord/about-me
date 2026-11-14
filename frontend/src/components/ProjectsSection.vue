<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'
import AnchorHeading from './AnchorHeading.vue'

const { state } = useSiteLayout()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'projects' })

function techVariant(index: number): string {
  if (index === 1) return 'tech-card--backend'
  if (index === 2) return 'tech-card--deploy'
  return ''
}
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
      <AnchorHeading
        id="projects-title"
        tag="h2"
        class="pixel-window__title"
        href="projects"
        label="Projects"
      >
        Projects
      </AnchorHeading>
    </div>
    <div class="pixel-window__content">
      <p class="projects-inline__lead">Open-source projects Michael builds and contributes to.</p>
      <div class="projects-inline">
        <article v-for="project in siteData.projects" :key="project.name" class="project-card">
          <div class="projects-inline__main">
            <h3 class="project-card__title">{{ project.name }}</h3>
            <p class="project-card__desc">{{ project.description }}</p>
            <a
              :href="project.link"
              target="_blank"
              rel="noopener"
              class="pixel-link-btn project-card__link"
            >
              View on GitHub
            </a>
          </div>
          <div class="projects-inline__side">
            <p class="tech-stack__label">Technology Stack:</p>
            <div class="tech-grid">
              <div
                v-for="(group, index) in project.techStack"
                :key="group.label"
                class="tech-card"
                :class="techVariant(index)"
              >
                <p class="tech-card__title">{{ group.label }}</p>
                <ul>
                  <li v-for="item in group.items" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
