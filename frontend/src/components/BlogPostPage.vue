<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { homeHref } from '../composables/useHashRoute'
import { formatBlogDate } from '../composables/useBlogDate'
import { siteData, type TechModel } from '../data/siteData'
import { useBlogAnimation } from '../composables/useBlogAnimation'

const articleRef = ref<HTMLElement | null>(null)
useBlogAnimation(articleRef)
const stepVariants = ['model-card__step--amber', 'model-card__step--orange']
const chipVariants = ['pixel-chip--amber', 'pixel-chip--orange']
const steps = ['01', '02'] as const

const props = defineProps<{ slug: string }>()

const post = computed(() => siteData.blog.find((entry) => entry.slug === props.slug))

const techCards = computed<{ model: TechModel; index: number }[]>(() => {
  const retriever = siteData.tech.find((m) => m.icon === 'funnel')
  const chat = siteData.tech.find((m) => m.icon === 'chip')
  return [retriever, chat]
    .filter((m): m is TechModel => Boolean(m))
    .map((model, index) => ({ model, index }))
})

const diagramSvg = ref('')
const diagramFailed = ref(false)
const diagramLabel =
  'Request flow: you ask a question, the tool retriever ranks the tools by BM25 and vector search, and Mini-Michi streams a reply, calling tools back through the retriever when needed.'

const previousTitle = document.title

onMounted(async () => {
  document.title = post.value ? `${post.value.title} — Michael Jaumann` : 'Blog — Michael Jaumann'
  articleRef.value?.focus({ preventScroll: true })

  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        background: 'transparent',
        primaryColor: '#2a2118',
        primaryTextColor: '#f6efe4',
        primaryBorderColor: '#4a3f32',
        lineColor: '#fbbf24',
        secondaryColor: '#201a13',
        tertiaryColor: '#171310',
        edgeLabelBackground: '#201a13',
        edgeLabelColor: '#f6efe4',
        fontFamily: 'var(--font-body)',
      },
      flowchart: { curve: 'step' },
    })
    const { svg } = await mermaid.render(
      'mm-request-flow',
      `flowchart LR
      A["You<br/>ask a question"] --> B["Tool retriever<br/>BM25 + vector · top-k"]
      B --> C["Mini-Michi<br/>LFM2.5-350M"]
      C -- "tool call" --> B
      C --> D["Reply<br/>streamed tokens"]`,
    )
    diagramSvg.value = svg
  } catch {
    diagramFailed.value = true
  }
})

onBeforeUnmount(() => {
  document.title = previousTitle
})
</script>

<template>
  <article
    v-if="post"
    ref="articleRef"
    tabindex="-1"
    class="pixel-window blog-post fade-in-section"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <span class="pixel-window__title blog-post__crumb">Blog</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <a :href="homeHref()" class="pixel-link-btn blog-post__back">← Home</a>
    </div>
    <div class="pixel-window__content pixel-window__content--open blog-post__body">
      <div class="blog-post__head">
        <img
          src="/mm.webp"
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
            <time class="blog-list__date" :datetime="post.date">{{
              formatBlogDate(post.date)
            }}</time>
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

      <h2 class="blog-post__subhead" data-anim="card">
        <span class="pixel-chip pixel-chip--amber">The flow</span>
        <span class="blog-post__subhead-rule" aria-hidden="true"></span>
      </h2>
      <div class="blog-flow" data-anim="card" aria-live="polite">
        <div
          v-if="diagramSvg"
          class="blog-flow__diagram"
          role="img"
          :aria-label="diagramLabel"
          tabindex="0"
          v-html="diagramSvg"
        ></div>
        <div v-else-if="diagramFailed" class="blog-flow__diagram blog-flow__diagram--fallback">
          <p class="blog-flow__fallback">
            <span class="blog-flow__fallback-kicker"
              >The diagram couldn't render, but here's the flow:</span
            >
            You ask a question → Tool retriever (BM25 + vector · top-k) → Mini-Michi (LFM2.5-350M) →
            Reply (streamed tokens), with tool calls looping back through the retriever.
          </p>
        </div>
        <div v-else class="blog-flow__diagram blog-flow__diagram--loading">
          <span class="blog-flow__loading" aria-hidden="true">rendering diagram…</span>
        </div>
        <span class="tech-diagram__note">no data leaves your browser · 100% on-device</span>
      </div>

      <h2 class="blog-post__subhead" data-anim="card">
        <span class="pixel-chip pixel-chip--amber">The models</span>
        <span class="blog-post__subhead-rule" aria-hidden="true"></span>
      </h2>
      <div class="model-flow">
        <template v-for="card in techCards" :key="card.model.name">
          <article class="model-card" data-anim="card">
            <span class="model-card__watermark" aria-hidden="true">{{
              steps[card.index % steps.length]
            }}</span>
            <div class="model-card__head">
              <div class="model-card__head-row">
                <span
                  class="model-card__step"
                  :class="stepVariants[card.index % stepVariants.length]"
                  >{{ steps[card.index % steps.length] }}</span
                >
                <svg
                  class="tech-diagram__icon model-card__icon"
                  viewBox="0 0 16 16"
                  width="24"
                  height="24"
                  shape-rendering="crispEdges"
                  aria-hidden="true"
                >
                  <path
                    v-if="card.model.icon === 'chip'"
                    d="M5 5h6v6H5zM6 2h1v2H6zM9 2h1v2H9zM6 12h1v2H6zM9 12h1v2H9zM2 6h2v1H2zM2 9h2v1H2zM12 6h2v1h-2zM12 9h2v1h-2z"
                    fill="currentColor"
                  />
                  <template v-else>
                    <path d="M1 1h14v3l-5 4v7H6V8L1 4z" fill="currentColor" />
                  </template>
                </svg>
              </div>
              <h3 class="model-card__title">{{ card.model.name }}</h3>
            </div>
            <p class="model-card__desc">{{ card.model.description }}</p>
            <p v-if="card.model.icon === 'funnel'" class="model-card__gloss">
              BM25 = keyword match · vector = meaning match · hybrid = both
            </p>
            <div class="pixel-tags model-card__tags">
              <span
                v-for="tag in card.model.tags"
                :key="tag"
                class="pixel-chip"
                :class="chipVariants[card.index % chipVariants.length]"
                >{{ tag }}</span
              >
            </div>
            <a
              :href="card.model.link"
              target="_blank"
              rel="noopener"
              class="pixel-link-btn model-card__link"
            >
              View
            </a>
          </article>
          <span v-if="card.index < techCards.length - 1" class="model-arrow" aria-hidden="true"
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

      <div class="blog-post__closer" data-anim="card">
        <span class="blog-post__closer-tag">Try it yourself</span>
        <p class="blog-post__closer-text">
          The thing this article describes is running on this page. Ask Mini-Michi in the dock what
          BM25 means or which tools are in context — the reply is streamed to your browser by
          LFM2.5-350M.
        </p>
      </div>
    </div>
  </article>

  <div v-else ref="articleRef" tabindex="-1" class="pixel-window blog-post fade-in-section">
    <div class="pixel-window__bar pixel-window__bar--static">
      <span class="pixel-window__title blog-post__crumb">Blog</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <a :href="homeHref()" class="pixel-link-btn blog-post__back">← Home</a>
    </div>
    <div class="pixel-window__content pixel-window__content--open">
      <h1 class="blog-post__title">Post not found</h1>
      <p class="blog-post__missing">
        That post doesn't exist or was removed.
        <a :href="homeHref()" class="pixel-link">Back to the blog</a>.
      </p>
    </div>
  </div>
</template>
