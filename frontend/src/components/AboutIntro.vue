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
      <img
        src="/mj.webp"
        alt="Michael Jaumann"
        width="104"
        height="104"
        class="pixel-avatar about-intro__avatar"
      />
      <AnchorHeading id="about-title" tag="h1" class="pixel-name" href="about" label="About">
        {{ siteData.name }}
      </AnchorHeading>
    </div>
    <div class="pixel-window__content about-intro__body">
      <p class="pixel-lede">
        {{ siteData.lede }}
        <a :href="siteData.employerUrl" target="_blank" rel="noopener" class="pixel-link">{{
          siteData.employer
        }}</a
        >.
      </p>
      <div class="pixel-tags">
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
    </div>
  </section>
</template>
