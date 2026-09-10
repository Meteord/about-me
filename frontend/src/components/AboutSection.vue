<script setup lang="ts">
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'

const { state, isExpanded, toggle } = useSiteLayout()

const tagVariants = ['pixel-chip--amber', 'pixel-chip--orange', 'pixel-chip--red']
</script>

<template>
  <section
    id="about"
    class="pixel-window fade-in-section"
    :class="{ 'pixel-window--highlight': state.highlight === 'about' }"
  >
    <button
      @click="toggle('about')"
      class="pixel-window__bar"
      type="button"
      aria-controls="about-content"
      :aria-expanded="isExpanded('about')"
    >
      <span class="pixel-window__title">About</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="pixel-window__toggle">{{ isExpanded('about') ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div
        v-if="isExpanded('about')"
        id="about-content"
        class="pixel-window__content about-content"
      >
        <img src="/mj.jpg" alt="Michael Jaumann" class="pixel-avatar" />
        <h1 class="pixel-name">{{ siteData.name }}</h1>
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
        <div class="pixel-card">
          <h2 class="pixel-section-title">Education</h2>
          <ul class="pixel-list">
            <li v-for="entry in siteData.education" :key="entry.degree">
              <strong>{{ entry.degree }}</strong
              >, {{ entry.school }} ({{ entry.period }})<br />
              {{ entry.detail }}
            </li>
          </ul>
        </div>
        <div class="pixel-card">
          <h2 class="pixel-section-title">Skills</h2>
          <ul class="pixel-list">
            <li v-for="group in siteData.skills" :key="group.label">
              <strong>{{ group.label }}:</strong> {{ group.items.join(', ') }}
            </li>
          </ul>
        </div>
        <div class="pixel-card">
          <h2 class="pixel-section-title">Hobbies</h2>
          <div class="pixel-tags">
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
    </transition>
  </section>
</template>
