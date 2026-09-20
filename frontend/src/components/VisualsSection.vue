<script setup lang="ts">
import { computed } from 'vue'
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'
import { TOOL_SCHEMAS, skillsChartRows } from '../tools/registry'

const { state, isExpanded, toggle } = useSiteLayout()

const rows = computed(skillsChartRows)

const stats = computed(() => [
  { label: 'Tools', value: String(TOOL_SCHEMAS.length) },
  { label: 'Sections', value: String(state.sections.length) },
  { label: 'Skill groups', value: String(siteData.skills.length) },
  {
    label: 'Skills',
    value: String(siteData.skills.reduce((total, group) => total + group.items.length, 0)),
  },
  { label: 'Projects', value: String(siteData.projects.length) },
  { label: 'Theme', value: state.theme },
])
</script>

<template>
  <section
    id="visuals"
    class="pixel-window fade-in-section"
    :class="{ 'pixel-window--highlight': state.highlight === 'visuals' }"
  >
    <button
      @click="toggle('visuals')"
      class="pixel-window__bar"
      type="button"
      aria-controls="visuals-content"
      :aria-expanded="isExpanded('visuals')"
    >
      <span class="pixel-window__title">Visuals</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="pixel-window__toggle">{{ isExpanded('visuals') ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="isExpanded('visuals')" id="visuals-content" class="pixel-window__content">
        <div class="viz-stats">
          <p class="viz-chart__caption">Site statistics</p>
          <div class="viz-stats__grid">
            <div v-for="entry in stats" :key="entry.label" class="viz-stats__cell">
              <span class="viz-stats__value">{{ entry.value }}</span>
              <span class="viz-stats__label">{{ entry.label }}</span>
            </div>
          </div>
        </div>
        <div class="viz-chart" id="viz-skills">
          <p class="viz-chart__caption">Skills per category</p>
          <div
            v-for="(row, index) in rows"
            :key="row.label"
            class="viz-chart__row"
            :style="{ '--viz-delay': index * 120 + 'ms', '--viz-width': row.percent + '%' }"
          >
            <span class="viz-chart__label">{{ row.label }}</span>
            <span class="viz-chart__track" aria-hidden="true">
              <span class="viz-chart__bar" :class="row.variant">
                <i v-for="item in row.count" :key="item" class="viz-chart__block"></i>
              </span>
            </span>
            <span class="viz-chart__count">{{ row.count }}</span>
          </div>
          <p class="viz-chart__note">
            {{ siteData.skills.reduce((total, group) => total + group.items.length, 0) }} skills
            across {{ siteData.skills.length }} categories
          </p>
        </div>
      </div>
    </transition>
  </section>
</template>
