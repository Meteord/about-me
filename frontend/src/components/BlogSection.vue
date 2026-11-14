<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'
import BlogArticle from './BlogArticle.vue'

const { state } = useSiteLayout()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'blog' })
</script>

<template>
  <section
    ref="root"
    id="blog"
    class="pixel-window reveal"
    :class="{ 'pixel-window--highlight': state.highlight === 'blog' }"
    aria-labelledby="blog-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <h2 id="blog-title" class="pixel-window__title">Blog</h2>
    </div>
    <div class="pixel-window__content blog-content">
      <BlogArticle v-for="post in siteData.blog" :key="post.slug" :post="post" />
    </div>
  </section>
</template>
