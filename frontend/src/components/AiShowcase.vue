<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import ChatDetails from './ChatDetails.vue'
import ChatSurface from './ChatSurface.vue'

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'ai-showcase' })
</script>

<template>
  <section
    ref="root"
    id="assistant"
    class="pixel-window ai-showcase reveal"
    aria-labelledby="ai-showcase-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <h2 id="ai-showcase-title" class="pixel-window__title">Chat with Mini-Michi</h2>
    </div>
    <div class="pixel-window__content ai-showcase__content">
      <p class="ai-showcase__lead">
        A small language model runs entirely in your browser — no server, no account, no API key.
        Ask it about anything on this page.
      </p>
      <ChatSurface variant="inline" />
      <ChatDetails />
    </div>
  </section>
</template>
