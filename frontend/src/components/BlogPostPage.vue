<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { homeHref } from '../composables/useHashRoute'
import { formatBlogDate } from '../composables/useBlogDate'
import { siteData, type TechModel } from '../data/siteData'
import { useBlogAnimation } from '../composables/useBlogAnimation'
import { evalResults, type CaseResult, type ModeAggregate } from '../data/evalResults'

const pct = (value: number): string => `${Math.round(value * 100)}%`
const barClip = (value: number): string => `inset(0 ${100 - Math.round(value * 100)}% 0 0)`
const formatGeneratedAt = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const formatLatency = (ms: number): string =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
const caseReason = (entry: CaseResult): string => {
  if (!entry.retrievalPass) return 'retrieval missed'
  if (!entry.toolsPass) return 'wrong tool call'
  if (!entry.answerPass) return 'answer drifted'
  return 'chain failed'
}

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

const CASES_PREVIEW = 3
const casesExpanded = ref(false)
const visibleCases = computed(() =>
  casesExpanded.value ? evalResults.cases : evalResults.cases.slice(0, CASES_PREVIEW),
)

const evalAggregate = computed(() => {
  const { modes } = evalResults
  if (!modes.length) return null
  const mean = (key: keyof ModeAggregate): number =>
    modes.reduce((acc, mode) => acc + (mode[key] as number), 0) / modes.length
  return {
    factRecall: mean('factRecall'),
    faithfulness: mean('faithfulness'),
    chainPassRate: mean('chainPassRate'),
  }
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

      <h2 class="blog-post__subhead" data-anim="card">
        <span class="pixel-chip pixel-chip--amber">The eval</span>
        <span class="blog-post__subhead-rule" aria-hidden="true"></span>
      </h2>
      <h3 class="blog-post__eval-question" data-anim="card">
        How well does the whole chain actually work?
      </h3>
      <div class="eval-results" data-anim="card">
        <template v-if="evalResults.fixtures > 0">
          <p class="eval-results__meta">
            The numbers below come from a real run of the whole on-device chain — retrieval → tool
            selection → {{ evalResults.config.chatModel }} → tool calls → final answer — scored by a
            deterministic judge.
          </p>
          <p class="eval-results__meta">
            Generated
            <time :datetime="evalResults.generatedAt">{{
              formatGeneratedAt(evalResults.generatedAt)
            }}</time>
            · {{ evalResults.config.device }} · {{ evalResults.config.dtype }} ·
            {{ evalResults.config.sampling ? 'sampling' : 'greedy' }} · top-{{
              evalResults.config.topK
            }}
            · max {{ evalResults.config.maxRounds }} rounds.
          </p>
          <p class="eval-results__legend">
            hit@5 — the right tool is in the top 5 · tool recall — the model calls it · fact recall
            — the answer keeps the retrieved facts · faithfulness — every sentence stays grounded in
            them · chain pass — retrieval, tools and answer together.
          </p>

          <div class="eval-modes">
            <article v-for="mode in evalResults.modes" :key="mode.mode" class="eval-mode">
              <h3 class="eval-mode__title">{{ mode.mode }}</h3>
              <dl class="eval-mode__stats">
                <div class="eval-mode__stat">
                  <dt>hit@{{ evalResults.config.topK }}</dt>
                  <dd>{{ pct(mode.retrievalHitRate) }}</dd>
                </div>
                <div class="eval-mode__stat">
                  <dt>tool recall</dt>
                  <dd>{{ pct(mode.toolRecall) }}</dd>
                </div>
                <div class="eval-mode__stat">
                  <dt>fact recall</dt>
                  <dd>{{ pct(mode.factRecall) }}</dd>
                </div>
                <div class="eval-mode__stat">
                  <dt>faithfulness</dt>
                  <dd>{{ pct(mode.faithfulness) }}</dd>
                </div>
                <div class="eval-mode__stat">
                  <dt>latency</dt>
                  <dd>{{ formatLatency(mode.meanTotalLatencyMs) }}</dd>
                </div>
                <div class="eval-mode__stat">
                  <dt>rounds</dt>
                  <dd>{{ mode.meanRounds.toFixed(2) }}</dd>
                </div>
                <div class="eval-mode__stat eval-mode__stat--pass">
                  <dt>chain pass</dt>
                  <dd>{{ pct(mode.chainPassRate) }}</dd>
                </div>
              </dl>
            </article>
          </div>

          <aside class="eval-takeaway">
            <h4 class="eval-takeaway__title">What this tells us</h4>
            <p class="eval-takeaway__text" v-if="evalAggregate">
              Retrieval never misses — the right tools are always in context. The 350M model is the
              bottleneck: it pulls the right facts ({{ pct(evalAggregate.factRecall) }}) but drifts
              in the final answer ({{ pct(evalAggregate.faithfulness) }} faithful), so only
              {{ pct(evalAggregate.chainPassRate) }} of runs pass end to end.
            </p>
          </aside>

          <h4 class="eval-cases__title">Per fixture</h4>
          <ol id="eval-cases-list" class="eval-cases">
            <li
              v-for="entry in visibleCases"
              :key="`${entry.mode}-${entry.fixtureIndex}`"
              class="eval-case"
            >
              <div class="eval-case__head">
                <span class="eval-case__query">{{ entry.query }}</span>
                <span
                  class="eval-case__marker"
                  :class="entry.chainPass ? 'eval-case__marker--pass' : 'eval-case__marker--fail'"
                  >{{ entry.chainPass ? 'PASS' : 'FAIL' }}</span
                >
              </div>
              <p class="eval-case__meta">
                {{ entry.mode
                }}<template v-if="entry.effectiveMode !== entry.mode">
                  → {{ entry.effectiveMode }}</template
                >
                · tools:
                {{
                  entry.toolCalls.length ? entry.toolCalls.map((c) => c.name).join(', ') : 'none'
                }}
              </p>
              <p v-if="!entry.chainPass" class="eval-case__reason">{{ caseReason(entry) }}</p>
              <div class="eval-case__bars">
                <div class="eval-bar">
                  <span class="eval-bar__label">fact recall</span>
                  <span class="tool-result__bar eval-bar__track" aria-hidden="true">
                    <i :style="{ clipPath: barClip(entry.score.factRecall) }"></i>
                  </span>
                  <span class="eval-bar__value">{{ pct(entry.score.factRecall) }}</span>
                </div>
                <div class="eval-bar">
                  <span class="eval-bar__label">faithfulness</span>
                  <span class="tool-result__bar eval-bar__track" aria-hidden="true">
                    <i :style="{ clipPath: barClip(entry.score.faithfulness) }"></i>
                  </span>
                  <span class="eval-bar__value">{{ pct(entry.score.faithfulness) }}</span>
                </div>
              </div>
            </li>
          </ol>
          <button
            v-if="evalResults.cases.length > CASES_PREVIEW"
            type="button"
            class="pixel-link-btn eval-cases__more"
            :aria-expanded="casesExpanded"
            aria-controls="eval-cases-list"
            @click="casesExpanded = !casesExpanded"
          >
            {{ casesExpanded ? 'Show fewer' : `Show all ${evalResults.cases.length} cases` }}
          </button>

          <div v-if="evalResults.traces" class="eval-traces">
            <h4 class="eval-traces__title">Runtime traces</h4>
            <p class="eval-traces__meta">
              {{ evalResults.traces.count }}
              saved session{{ evalResults.traces.count === 1 ? '' : 's' }} scored historically ({{
                evalResults.traces.mode
              }}
              · top-{{ evalResults.traces.topK }}).
            </p>
            <dl class="eval-traces__rates">
              <div>
                <dt>retrieval covered</dt>
                <dd>{{ pct(evalResults.traces.retrievalCoverRate) }}</dd>
              </div>
              <div>
                <dt>tool valid</dt>
                <dd>{{ pct(evalResults.traces.toolValidRate) }}</dd>
              </div>
              <div>
                <dt>grounded</dt>
                <dd>{{ pct(evalResults.traces.groundedRate) }}</dd>
              </div>
              <div>
                <dt>pass</dt>
                <dd>{{ pct(evalResults.traces.passRate) }}</dd>
              </div>
            </dl>
          </div>

          <p class="eval-results__footnote">
            Nothing here is simulated — every number comes from a real run of the on-device chain
            (retrieval → {{ evalResults.config.chatModel }} → tools → answer). To refresh it, run
            <code>npm run eval:chain</code> from <code>frontend/</code>.
          </p>
        </template>
        <p v-else class="eval-results__empty">
          No evaluation results committed yet. Run <code>npm run eval:chain</code> from
          <code>frontend/</code> to measure the whole agent chain — retrieval → tool calls → final
          answer — and this section will render the numbers.
        </p>
      </div>

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
