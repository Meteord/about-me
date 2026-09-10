<script setup lang="ts">
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'

const { state, isExpanded, toggle } = useSiteLayout()
</script>

<template>
  <section
    id="tech"
    class="pixel-window fade-in-section"
    :class="{ 'pixel-window--highlight': state.highlight === 'tech' }"
  >
    <button
      @click="toggle('tech')"
      class="pixel-window__bar"
      type="button"
      aria-controls="tech-content"
      :aria-expanded="isExpanded('tech')"
    >
      <span class="pixel-window__title">How it works</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="pixel-window__toggle">{{ isExpanded('tech') ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="isExpanded('tech')" id="tech-content" class="pixel-window__content">
        <div class="tech-how">
          <p class="tech-how__lead">
            This page has no backend — everything runs on-device in your browser. Mini-Michi is a
            small language model streamed over WebGPU or WebAssembly, and before each reply a
            retrieval step picks the most relevant tools so the model only sees the schemas it
            actually needs.
          </p>
          <div class="model-grid">
            <article v-for="model in siteData.tech" :key="model.name" class="model-card">
              <h3 class="model-card__title">{{ model.name }}</h3>
              <p class="model-card__desc">{{ model.description }}</p>
              <div class="pixel-tags model-card__tags">
                <span v-for="tag in model.tags" :key="tag" class="pixel-chip">{{ tag }}</span>
              </div>
              <a
                :href="model.link"
                target="_blank"
                rel="noopener"
                class="pixel-link-btn model-card__link"
              >
                View
              </a>
            </article>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>
