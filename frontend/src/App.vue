<script setup lang="ts">
import HomePage from './components/HomePage.vue'
import { useHashNavigation } from './composables/useHashNavigation'

useHashNavigation()
</script>

<template>
  <main class="app-main">
    <div class="app-layout">
      <HomePage />
    </div>
  </main>
</template>
