<script setup lang="ts">
import { ref } from 'vue'
import { DEFAULT_RETRIEVAL_MODE } from '../composables/retrievalSettings'
import { useReveal } from '../composables/useReveal'
import { evalResults } from '../data/evalResults'
import { siteData } from '../data/siteData'
import { buildStatGroups } from '../data/siteStats'
import { MAX_INJECT_CHARS, SOURCE_DEFS } from '../tools/registry'
import StatCard from './StatCard.vue'

// Build-time derivation: pure, static, and empty when nothing is derivable.
const groups = buildStatGroups({
  buildYear: __BUILD_YEAR__,
  site: siteData,
  eval: evalResults,
  sources: SOURCE_DEFS,
  maxInjectChars: MAX_INJECT_CHARS,
  defaultMode: DEFAULT_RETRIEVAL_MODE,
})

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'stats-band' })
</script>

<template>
  <section
    v-if="groups.length"
    ref="root"
    class="pixel-window stats-band reveal"
    aria-labelledby="stats-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <h2 id="stats-title" class="pixel-window__title">By the numbers</h2>
    </div>
    <div class="pixel-window__content stats-band__content">
      <section
        v-for="group in groups"
        :key="group.id"
        class="stats-group"
        :aria-labelledby="`stats-${group.id}-title`"
      >
        <h3 :id="`stats-${group.id}-title`" class="stats-group__title">{{ group.title }}</h3>
        <p class="stats-group__blurb">{{ group.blurb }}</p>
        <div class="stats-grid">
          <StatCard v-for="stat in group.stats" :key="stat.id" :stat="stat" />
        </div>
      </section>
    </div>
  </section>
</template>
