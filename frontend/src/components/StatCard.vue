<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCountUp, useReveal } from '../composables/useReveal'
import { formatStatText, formatStatValue, type Statistic } from '../data/siteStats'

const props = defineProps<{ stat: Statistic }>()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: `stat:${props.stat.id}` })

const isNumeric = computed(() => props.stat.numeric && typeof props.stat.value === 'number')

const finalDigits = computed(() =>
  typeof props.stat.value === 'number' || typeof props.stat.value === 'string'
    ? formatStatValue(props.stat.value, props.stat.format)
    : '',
)

const { display } = useCountUp(
  root,
  () => (isNumeric.value ? (props.stat.value as number) : null),
  {
    format: (value) => formatStatValue(value, props.stat.format),
    key: `stat:${props.stat.id}`,
  },
)

const shownDigits = computed(() => (isNumeric.value ? display.value : finalDigits.value))
const spoken = computed(() => `${props.stat.label}: ${formatStatText(props.stat)}`)
</script>

<template>
  <article ref="root" class="stat-card reveal">
    <p class="stat-card__value">
      <span class="stat-card__digits" aria-hidden="true">{{ shownDigits }}</span>
      <span v-if="stat.suffix" class="stat-card__suffix" aria-hidden="true">{{ stat.suffix }}</span>
      <span class="pixel-sr-only">{{ spoken }}</span>
    </p>
    <p class="stat-card__label">{{ stat.label }}</p>
    <p class="stat-card__note">{{ stat.note }}</p>
    <a class="pixel-link stat-card__source" :href="stat.source.href">{{ stat.source.label }}</a>
  </article>
</template>
