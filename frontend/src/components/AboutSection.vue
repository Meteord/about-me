<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'

const { state } = useSiteLayout()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'about-details' })

const tagVariants = ['pixel-chip--amber', 'pixel-chip--orange', 'pixel-chip--pink']
</script>

<template>
  <section
    ref="root"
    class="pixel-window about-details reveal"
    :class="{ 'pixel-window--highlight': state.highlight === 'about' }"
    aria-labelledby="about-details-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <h2 id="about-details-title" class="pixel-window__title">Background</h2>
    </div>
    <div class="pixel-window__content about-content">
      <div
        id="about-education"
        class="pixel-card"
        :class="{ 'pixel-spotlight': state.spotlight === 'about-education' }"
      >
        <h3 class="pixel-section-title">Education</h3>
        <ul class="pixel-list">
          <li v-for="entry in siteData.education" :key="entry.degree" class="pixel-edu">
            <span class="pixel-edu__head">
              <strong>{{ entry.degree }}</strong>
              <span class="pixel-edu__meta">{{ entry.school }} · {{ entry.period }}</span>
            </span>
            <span class="pixel-edu__detail">{{ entry.detail }}</span>
          </li>
        </ul>
      </div>
      <div
        id="about-skills"
        class="pixel-card"
        :class="{ 'pixel-spotlight': state.spotlight === 'about-skills' }"
      >
        <h3 class="pixel-section-title">Skills</h3>
        <ul class="pixel-skills">
          <li v-for="group in siteData.skills" :key="group.label" class="pixel-skill">
            <span class="pixel-skill__label">{{ group.label }}</span>
            <span class="pixel-skill__items">
              <span v-for="item in group.items" :key="item" class="pixel-chip pixel-chip--sm">{{
                item
              }}</span>
            </span>
          </li>
        </ul>
      </div>
      <div
        id="about-hobbies"
        class="pixel-card"
        :class="{ 'pixel-spotlight': state.spotlight === 'about-hobbies' }"
      >
        <h3 class="pixel-section-title">Hobbies</h3>
        <div class="pixel-tags pixel-tags--start">
          <span
            v-for="(hobby, index) in siteData.hobbies"
            :key="hobby"
            class="pixel-chip"
            :class="tagVariants[index % tagVariants.length]"
            >{{ hobby }}</span
          >
        </div>
      </div>
    </div>
  </section>
</template>
