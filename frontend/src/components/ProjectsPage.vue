<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { homeHref } from '../composables/useHashRoute'
import { siteData } from '../data/siteData'

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'projects-page' })
</script>

<template>
  <article ref="root" class="pixel-window projects-page reveal">
    <div class="pixel-window__bar pixel-window__bar--static">
      <span class="pixel-window__crumb projects-page__crumb">Projects</span>
      <a :href="homeHref()" class="pixel-link-btn projects-page__back">← Home</a>
    </div>
    <div class="pixel-window__content pixel-window__content--open projects-page__body">
      <h1 class="pixel-title projects-page__title">
        Projects<span class="pixel-msg__cursor" aria-hidden="true"></span>
      </h1>
      <p class="pixel-chat__hint projects-page__lead">
        Open-source projects Michael builds and contributes to.
      </p>
      <div class="projects-page__list">
        <article v-for="project in siteData.projects" :key="project.name" class="project-card">
          <div class="projects-page__main">
            <h2 class="project-card__title">{{ project.name }}</h2>
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
          <div class="projects-page__side">
            <p class="tech-stack__label">Technology Stack:</p>
            <div class="tech-grid">
              <div
                v-for="(group, index) in project.techStack"
                :key="group.label"
                class="tech-card"
                :class="`tech-card--${index === 1 ? 'backend' : index === 2 ? 'deploy' : ''}`"
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
  </article>
</template>
