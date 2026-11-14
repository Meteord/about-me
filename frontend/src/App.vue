<script setup lang="ts">
import { computed } from 'vue'
import { useHashRoute } from './composables/useHashRoute'
import BlogPostPage from './components/BlogPostPage.vue'
import HomePage from './components/HomePage.vue'
import ProjectsPage from './components/ProjectsPage.vue'

const { route } = useHashRoute()

const blogPost = computed(() =>
  route.value.name === 'blog' && route.value.slug ? route.value.slug : null,
)
const onProjects = computed(() => route.value.name === 'projects')
</script>

<template>
  <main class="app-main">
    <div class="app-layout">
      <transition-group v-if="blogPost" tag="div" name="stack" class="app-column app-column--wide">
        <BlogPostPage :key="`blog-${blogPost}`" :slug="blogPost" />
      </transition-group>
      <transition-group
        v-else-if="onProjects"
        tag="div"
        name="stack"
        class="app-column app-column--wide"
      >
        <ProjectsPage :key="'projects-page'" />
      </transition-group>
      <HomePage v-else />
    </div>
  </main>
</template>
