<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { blogHref } from '../composables/useHashRoute'
import { formatBlogDate } from '../composables/useBlogDate'
import { siteData } from '../data/siteData'

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
    <div class="pixel-window__content">
      <div class="blog-list">
        <a
          v-for="post in siteData.blog"
          :key="post.slug"
          :href="blogHref(post.slug)"
          class="pixel-card blog-list__item"
        >
          <h3 class="blog-list__title">{{ post.title }}</h3>
          <p class="blog-list__teaser">{{ post.teaser }}</p>
          <p class="blog-list__meta">
            <span class="blog-list__meta-start">
              <span class="blog-list__date">{{ formatBlogDate(post.date) }}</span>
              <span class="pixel-chip pixel-chip--sm pixel-chip--amber"
                >{{ post.readTime }} read</span
              >
            </span>
            <span class="blog-list__more">Read <span aria-hidden="true">→</span></span>
          </p>
        </a>
      </div>
    </div>
  </section>
</template>
