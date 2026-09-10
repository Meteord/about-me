<script setup lang="ts">
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'

const { state, isExpanded, toggle } = useSiteLayout()

const chipVariants = ['pixel-chip--amber', 'pixel-chip--orange', 'pixel-chip--red']
const stepVariants = [
  'model-card__step--amber',
  'model-card__step--orange',
  'model-card__step--red',
]
const nodeVariants = [
  'tech-diagram__node--amber',
  'tech-diagram__node--orange',
  'tech-diagram__node--red',
]

const steps = ['01', '02', '03'] as const

const flowNodes = [
  { title: 'You', sub: 'ask a question' },
  { title: 'Tool retriever', sub: 'BM25 / neural · top-k schemas' },
  { title: 'Mini-Michi', sub: 'LFM2.5-350M · WebGPU / WASM' },
  { title: 'Reply', sub: 'streamed token-by-token' },
]
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
          <div class="tech-diagram" aria-hidden="true">
            <div class="tech-diagram__flow">
              <template v-for="(node, index) in flowNodes" :key="node.title">
                <div class="tech-diagram__node" :class="nodeVariants[index % nodeVariants.length]">
                  <span class="tech-diagram__node-title">{{ node.title }}</span>
                  <span class="tech-diagram__node-sub">{{ node.sub }}</span>
                </div>
                <span
                  v-if="index < flowNodes.length - 1"
                  class="tech-diagram__arrow"
                  aria-hidden="true"
                  >→</span
                >
              </template>
            </div>
            <span class="tech-diagram__note">100% on-device · no data leaves your browser</span>
          </div>
          <div class="model-flow">
            <template v-for="(model, index) in siteData.tech" :key="model.name">
              <article class="model-card">
                <div class="model-card__head">
                  <span
                    class="model-card__step"
                    :class="stepVariants[index % stepVariants.length]"
                    >{{ steps[index % steps.length] }}</span
                  >
                  <h3 class="model-card__title">{{ model.name }}</h3>
                </div>
                <p class="model-card__desc">{{ model.description }}</p>
                <div class="pixel-tags model-card__tags">
                  <span
                    v-for="tag in model.tags"
                    :key="tag"
                    class="pixel-chip"
                    :class="chipVariants[(index + tag.length) % chipVariants.length]"
                    >{{ tag }}</span
                  >
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
              <span v-if="index < siteData.tech.length - 1" class="model-arrow" aria-hidden="true"
                >→</span
              >
            </template>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>
