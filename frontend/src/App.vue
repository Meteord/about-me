<script setup lang="ts">
import HomePage from './components/HomePage.vue'
import { useLegacyHashRedirect } from './composables/useLegacyHashRedirect'

useLegacyHashRedirect()
</script>

<template>
  <main class="app-main">
    <div class="app-layout">
      <HomePage />
    </div>
  </main>
</template>
