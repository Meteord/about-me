<script setup lang="ts">
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'

const { state, isExpanded, toggle } = useSiteLayout()

const project = siteData.projects[0]
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
        <div class="project-grid">
          <div class="project-grid__main project-card">
            <div>
              <h3 class="project-card__title">{{ project.name }}</h3>
              <p class="project-card__desc">{{ project.description }}</p>
            </div>
            <a
              :href="project.link"
              target="_blank"
              rel="noopener"
              class="pixel-link-btn project-card__link"
            >
              View on GitHub
            </a>
          </div>
          <div class="project-grid__side">
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
        </div>
      </div>
    </transition>
  </section>
</template>
