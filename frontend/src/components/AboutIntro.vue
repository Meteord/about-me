<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'
import AnchorHeading from './AnchorHeading.vue'

const { state } = useSiteLayout()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'about-intro' })

const tagVariants = ['pixel-chip--amber', 'pixel-chip--orange', 'pixel-chip--pink']
</script>

<template>
  <section
    ref="root"
    id="about"
    class="pixel-window about-intro reveal"
    :class="{ 'pixel-window--highlight': state.highlight === 'about' }"
    aria-labelledby="about-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static about-intro__bar">
      <AnchorHeading id="about-title" tag="h1" class="pixel-name" href="about" label="About">
        {{ siteData.name }}
      </AnchorHeading>
      <span class="pixel-window__crumb" aria-hidden="true">~/about</span>
    </div>
    <div class="pixel-window__content about-intro__body">
      <div class="about-intro__text">
        <p class="about-intro__status">
          <span class="about-intro__led" aria-hidden="true"></span>
          <span class="about-intro__role">AI / ML Engineer</span>
          <span class="about-intro__sep" aria-hidden="true">/</span>
          <span>{{ siteData.location }}, Germany</span>
        </p>
        <p class="pixel-lede">
          {{ siteData.lede }}
          <a :href="siteData.employerUrl" target="_blank" rel="noopener" class="pixel-link">{{
            siteData.employer
          }}</a
          >.
        </p>
        <div class="pixel-tags pixel-tags--start about-intro__tags">
          <span
            v-for="(tag, index) in siteData.tags"
            :key="tag.label"
            class="pixel-chip"
            :class="tagVariants[index % tagVariants.length]"
          >
            <a v-if="tag.url" :href="tag.url" target="_blank" rel="noopener" class="pixel-link">{{
              tag.label
            }}</a>
            <template v-else>{{ tag.label }}</template>
          </span>
        </div>
        <div class="about-intro__actions">
          <a class="pixel-link-btn" href="#assistant">Ask Mini-Michi</a>
          <a class="pixel-link-btn pixel-link-btn--quiet" href="#projects">See the projects</a>
        </div>
      </div>
      <figure class="about-intro__portrait">
        <span class="about-intro__screen">
          <img
            src="/mj.webp"
            alt="Michael Jaumann"
            width="320"
            height="320"
            class="about-intro__photo"
          />
        </span>
        <figcaption class="about-intro__caption">
          <span class="about-intro__led" aria-hidden="true"></span>
          {{ siteData.location }}, DE
        </figcaption>
      </figure>
    </div>
  </section>
</template>
