<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'
import AnchorHeading from './AnchorHeading.vue'
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
      <AnchorHeading id="blog-title" tag="h2" class="pixel-window__title" href="blog" label="Blog">
        Blog
      </AnchorHeading>
      <span class="pixel-window__crumb" aria-hidden="true">~/blog</span>
    </div>
    <div class="pixel-window__content blog-content">
      <BlogArticle v-for="post in siteData.blog" :key="post.slug" :post="post" />
    </div>
  </section>
</template>
