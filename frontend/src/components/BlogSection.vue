<script setup lang="ts">
import { useSiteLayout } from '../composables/useSiteLayout'
import { blogHref } from '../composables/useHashRoute'
import { formatBlogDate } from '../composables/useBlogDate'
import { siteData } from '../data/siteData'

const { state, isExpanded, toggle } = useSiteLayout()
</script>

<template>
  <section
    id="blog"
    class="pixel-window fade-in-section"
    :class="{ 'pixel-window--highlight': state.highlight === 'blog' }"
  >
    <button
      @click="toggle('blog')"
      class="pixel-window__bar"
      type="button"
      aria-controls="blog-content"
      :aria-expanded="isExpanded('blog')"
    >
      <span class="pixel-window__title">Blog</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="pixel-window__toggle">{{ isExpanded('blog') ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="isExpanded('blog')" id="blog-content" class="pixel-window__content">
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
    </transition>
  </section>
</template>
