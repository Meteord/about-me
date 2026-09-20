<script setup lang="ts">
import { computed, ref } from 'vue'
import { blogHref } from '../composables/useHashRoute'
import { siteData } from '../data/siteData'
import { useBlogAnimation } from '../composables/useBlogAnimation'

const articleRef = ref<HTMLElement | null>(null)
useBlogAnimation(articleRef)
const chipVariants = ['pixel-chip--amber', 'pixel-chip--orange', 'pixel-chip--red']
const stepVariants = [
  'model-card__step--amber',
  'model-card__step--orange',
  'model-card__step--red',
]
const nodeVariants = [
  'tech-diagram__node--amber',
  'tech-diagram__node--orange',
  'tech-diagram__node--red',
]

const steps = ['01', '02'] as const

const flowNodes = [
  {
    id: 'you',
    title: 'You',
    sub: 'ask a question',
    icon: 'chat',
  },
  {
    id: 'retriever',
    title: 'Tool retriever',
    sub: 'BM25 / vector search · top-k schemas',
    icon: 'funnel',
  },
  {
    id: 'model',
    title: 'Mini-Michi',
    sub: 'LFM2.5-350M · WebGPU / WASM',
    icon: 'chip',
  },
  {
    id: 'reply',
    title: 'Reply',
    sub: 'streamed token-by-token',
    icon: 'wave',
  },
]

const rankRows = [
  { name: 'retrieve', score: 96, hit: true },
  { name: 'show_stats', score: 41, hit: false },
  { name: 'set_theme', score: 12, hit: false },
]

const props = defineProps<{ slug: string }>()

const post = computed(() => siteData.blog.find((entry) => entry.slug === props.slug))
</script>

<template>
  <article v-if="post" ref="articleRef" class="pixel-window blog-post fade-in-section">
    <div class="pixel-window__bar pixel-window__bar--static">
      <span class="pixel-window__title blog-post__crumb">Blog</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <a :href="blogHref()" class="pixel-link-btn blog-post__back">← Blog</a>
    </div>
    <div class="pixel-window__content pixel-window__content--open blog-post__body">
      <div class="blog-post__head">
        <img
          src="/mm.png"
          alt=""
          aria-hidden="true"
          width="56"
          height="56"
          class="pixel-avatar blog-post__avatar"
        />
        <div class="blog-post__head-text">
          <h1 class="blog-post__title" data-anim="title">
            {{ post.title
            }}<span class="pixel-msg__cursor blog-post__cursor" aria-hidden="true"></span>
          </h1>
          <p class="blog-post__tape" data-anim="meta">
            <span class="blog-list__date">{{ post.date }}</span>
            <span class="pixel-chip pixel-chip--orange">{{ post.readTime }} read</span>
            <span class="pixel-chip pixel-chip--amber">100% on-device</span>
          </p>
        </div>
      </div>
      <p class="tech-how__lead blog-post__lead" data-anim="lead">
        This page has no backend — everything runs on-device in your browser. Mini-Michi is a small
        language model streamed over WebGPU or WebAssembly, and before each reply a retrieval step
        picks the most relevant tools so the model only sees the schemas it actually needs.
      </p>

      <h2 class="blog-post__subhead" data-anim="lead">
        <span class="pixel-chip pixel-chip--amber">The flow</span>
        <span class="blog-post__subhead-rule" aria-hidden="true"></span>
      </h2>
      <div class="tech-diagram" aria-hidden="true">
        <div class="tech-diagram__flow">
          <template v-for="(node, index) in flowNodes" :key="node.title">
            <div
              class="tech-diagram__node"
              :class="nodeVariants[index % nodeVariants.length]"
              data-anim="node"
            >
              <div class="tech-diagram__socket">
                <svg
                  class="tech-diagram__icon"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  shape-rendering="crispEdges"
                  aria-hidden="true"
                >
                  <path
                    v-if="node.icon === 'chat'"
                    d="M1 1h14v9H8l-3 4V10H1z"
                    fill="currentColor"
                  />
                  <template v-else-if="node.icon === 'funnel'">
                    <path d="M1 1h14v3l-5 4v7H6V8L1 4z" fill="currentColor" />
                  </template>
                  <template v-else-if="node.icon === 'chip'">
                    <path
                      d="M5 5h6v6H5zM6 2h1v2H6zM9 2h1v2H9zM6 12h1v2H6zM9 12h1v2H9zM2 6h2v1H2zM2 9h2v1H2zM12 6h2v1h-2zM12 9h2v1h-2z"
                      fill="currentColor"
                    />
                  </template>
                  <template v-else>
                    <path d="M11 3h2v10h-2zM7 6h2v7H7zM3 9h2v4H3z" fill="currentColor" />
                  </template>
                </svg>
                <span class="tech-diagram__glow" aria-hidden="true"></span>
              </div>
              <div class="tech-diagram__body">
                <div class="tech-diagram__node-meta">
                  <span class="tech-diagram__leds" aria-hidden="true"
                    ><i></i><i></i><i class="tech-diagram__led--on"></i
                  ></span>
                </div>
                <span class="tech-diagram__node-title">{{ node.title }}</span>
                <span class="tech-diagram__node-sub">{{ node.sub }}</span>
              </div>
              <div v-if="node.id === 'you'" class="blog-term" aria-hidden="true">
                <span class="blog-term__prompt">&gt;</span>
                <span class="blog-term__text">"how does this site work?"</span>
                <span class="blog-term__cursor"></span>
              </div>
              <div v-if="node.id === 'retriever'" class="tech-diagram__pool">
                <div class="blog-ranks">
                  <div
                    v-for="row in rankRows"
                    :key="row.name"
                    class="blog-rank"
                    :class="{ 'blog-rank--hit': row.hit }"
                    :style="{ '--bar-w': row.score + '%' }"
                  >
                    <span class="blog-rank__name">{{ row.name }}</span>
                    <span class="blog-rank__bar"></span>
                    <span class="blog-rank__pct">{{ row.score }}%</span>
                  </div>
                </div>
                <div class="blog-ranks__foot">
                  <span class="blog-modes">hybrid</span>
                  <span class="blog-modes__sub">lex + vec · RRF fused</span>
                </div>
              </div>
              <div v-if="node.id === 'reply'" class="blog-tokens" aria-hidden="true">
                <i></i><i></i><i></i><i></i><i></i>
              </div>
              <div v-if="node.id === 'reply'" class="blog-term blog-reply" aria-hidden="true">
                <span class="blog-term__prompt">&gt;</span>
                <span class="blog-term__text">"it runs the ai fully on-device"</span>
                <span class="blog-term__cursor"></span>
              </div>
            </div>
            <span
              v-if="index < flowNodes.length - 1"
              class="tech-diagram__connector"
              aria-hidden="true"
            ></span>
          </template>
          <span class="blog-packet" aria-hidden="true"></span>
        </div>
        <span class="tech-diagram__note" data-anim="note"
          >no data leaves your browser · 100% on-device</span
        >
      </div>

      <h2 class="blog-post__subhead" data-anim="card">
        <span class="pixel-chip pixel-chip--orange">The models</span>
        <span class="blog-post__subhead-rule" aria-hidden="true"></span>
      </h2>
      <div class="model-flow">
        <template v-for="(model, index) in siteData.tech" :key="model.name">
          <article class="model-card" data-anim="card">
            <span class="model-card__watermark" aria-hidden="true">{{
              steps[index % steps.length]
            }}</span>
            <div class="model-card__head">
              <div class="model-card__head-row">
                <span class="model-card__step" :class="stepVariants[index % stepVariants.length]">{{
                  steps[index % steps.length]
                }}</span>
                <svg
                  class="tech-diagram__icon model-card__icon"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  shape-rendering="crispEdges"
                  aria-hidden="true"
                >
                  <path
                    v-if="model.icon === 'chip'"
                    d="M5 5h6v6H5zM6 2h1v2H6zM9 2h1v2H9zM6 12h1v2H6zM9 12h1v2H9zM2 6h2v1H2zM2 9h2v1H2zM12 6h2v1h-2zM12 9h2v1h-2z"
                    fill="currentColor"
                  />
                  <template v-else>
                    <path d="M1 1h14v3l-5 4v7H6V8L1 4z" fill="currentColor" />
                  </template>
                </svg>
              </div>
              <h3 class="model-card__title">{{ model.name }}</h3>
            </div>
            <p class="model-card__desc">{{ model.description }}</p>
            <div class="pixel-tags model-card__tags">
              <span
                v-for="tag in model.tags"
                :key="tag"
                class="pixel-chip"
                :class="chipVariants[(index + tag.length) % chipVariants.length]"
                >{{ tag }}</span
              >
            </div>
            <a
              :href="model.link"
              target="_blank"
              rel="noopener"
              class="pixel-link-btn model-card__link"
            >
              View
            </a>
          </article>
          <span v-if="index < siteData.tech.length - 1" class="model-arrow" aria-hidden="true"
            >→</span
          >
        </template>
      </div>

      <h2 class="blog-post__subhead" data-anim="card">
        <span class="pixel-chip pixel-chip--amber">Links</span>
        <span class="blog-post__subhead-rule" aria-hidden="true"></span>
      </h2>
      <ul class="pixel-list blog-post__links" data-anim="card">
        <li v-for="link in siteData.articleLinks" :key="link.url">
          <a :href="link.url" target="_blank" rel="noopener" class="pixel-link">{{ link.label }}</a>
          — {{ link.description }}
        </li>
      </ul>
    </div>
  </article>
</template>
