<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { assistant } from '../data/siteData'
import AnchorHeading from './AnchorHeading.vue'
import ChatDetails from './ChatDetails.vue'
import ChatSurface from './ChatSurface.vue'

const { state } = useSiteLayout()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'ai-showcase' })
</script>

<template>
  <section
    ref="root"
    id="assistant"
    class="pixel-window ai-showcase reveal"
    :class="{ 'pixel-spotlight': state.spotlight === 'assistant' }"
    aria-labelledby="ai-showcase-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <AnchorHeading
        id="ai-showcase-title"
        tag="h2"
        class="pixel-window__title"
        href="assistant"
        :label="`Chat with ${assistant.name}`"
      >
        Chat with {{ assistant.name }}
      </AnchorHeading>
      <span class="pixel-window__crumb" aria-hidden="true">~/assistant</span>
    </div>
    <div class="pixel-window__content ai-showcase__content">
      <p class="ai-showcase__lead">
        A friendly 350M-parameter language model at your service, living in your local browser.
        Ready to answer any question without hesitation.
      </p>
      <ChatSurface />
      <ChatDetails />
    </div>
  </section>
</template>
