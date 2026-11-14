<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Canonical anchor id without the leading `#`. */
    href: string
    /** Heading level for the rendered element. */
    tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    /** Human-readable name used for the native tooltip. */
    label: string
  }>(),
  { tag: 'h3' },
)
</script>

<template>
  <component :is="tag" class="pixel-anchor-heading">
    <a :href="`#${href}`" class="pixel-anchor-link" :title="`Link to ${label}`">
      <slot />
      <span class="pixel-anchor-link__mark" aria-hidden="true">#</span>
    </a>
  </component>
</template>
