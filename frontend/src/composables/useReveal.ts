import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * One motion system for the whole site: a one-shot reveal when a band first
 * enters the viewport, and a stepped count-up for numeric statistics.
 *
 * Guarantees (spec 007 FR-009–FR-012, contracts/section-layout.md C5)
 * - at most once per element per page load (module-level WeakSet),
 * - opacity/transform and text only, so nothing causes layout shift,
 * - `prefers-reduced-motion: reduce`, a missing IntersectionObserver or a
 *   failed animejs import ⇒ final state immediately, content never hidden,
 * - content stays readable with JavaScript disabled: the hidden state needs
 *   `html.js-anim` (added here) *and* a no-preference media query.
 */

export interface RevealOptions {
  /** IntersectionObserver threshold; the first observer created wins. */
  threshold?: number
  rootMargin?: string
  /** Stable identity: a remount (assistant hide/show) of the same key never
      replays the reveal. */
  key?: string
  /** Runs once when the element first becomes visible (or immediately when
      motion is reduced). Used to defer expensive work such as the mermaid
      diagram until the article is actually approached. */
  onReveal?: () => void
}

const COUNT_DURATION_MS = 1100

const SAFETY_MS = 600
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

type AnimeModule = typeof import('animejs')

let animePromise: Promise<AnimeModule> | null = null

function loadAnime(): Promise<AnimeModule> {
  animePromise ??= import('animejs')
  return animePromise
}

function reduceQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(REDUCE_QUERY)
}

/** No matchMedia ⇒ assume reduced motion (fail safe, never hide content). */
function prefersReducedMotion(): boolean {
  const query = reduceQuery()
  return query ? query.matches : true
}

const preferenceListeners = new Set<() => void>()
let preferenceBound = false

function onPreferenceChange(listener: () => void): () => void {
  preferenceListeners.add(listener)
  const query = reduceQuery()
  if (query && !preferenceBound) {
    preferenceBound = true
    query.addEventListener('change', () => {
      for (const notify of preferenceListeners) notify()
    })
  }
  return () => {
    preferenceListeners.delete(listener)
  }
}

/* ------------------------------------------------------------------ */
/* Shared one-shot intersection trigger                                */
/* ------------------------------------------------------------------ */

const finishedElements = new WeakSet<Element>()
/** Page-load memory keyed by stable identity, so remounts do not replay motion. */
const finishedKeys = new Set<string>()
/** One element can be watched by several composables (reveal + count-up). */
const waiting = new WeakMap<Element, Set<() => void>>()

let observer: IntersectionObserver | null = null

function sharedObserver(options: RevealOptions): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const runs = waiting.get(entry.target)
        waiting.delete(entry.target)
        observer?.unobserve(entry.target)
        runs?.forEach((run) => run())
      }
    },
    {
      // Any visible sliver is enough: a band taller than the viewport (the blog
      // band is >5 screens) can never reach a 0.2 intersection ratio, which
      // used to leave it permanently hidden after a programmatic jump.
      threshold: options.threshold ?? 0,
      rootMargin: options.rootMargin ?? '0px 0px -10% 0px',
    },
  )
  return observer
}

function runWhenFirstVisible(el: Element, run: () => void, options: RevealOptions): () => void {
  const shared = sharedObserver(options)
  if (!shared) {
    run()
    return () => {}
  }
  const runs = waiting.get(el) ?? new Set<() => void>()
  runs.add(run)
  waiting.set(el, runs)
  shared.observe(el)
  return () => {
    const current = waiting.get(el)
    if (!current) return
    current.delete(run)
    if (current.size === 0) {
      waiting.delete(el)
      observer?.unobserve(el)
    }
  }
}

/* ------------------------------------------------------------------ */
/* Reveal                                                              */
/* ------------------------------------------------------------------ */

if (typeof document !== 'undefined') {
  // CSS hides `.reveal` only while this class is present, so a page without
  // JavaScript (or a failed module) is fully visible.
  document.documentElement.classList.add('js-anim')
}

/** True when the element occupies part of the viewport right now. */
function isOnScreen(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  return rect.bottom > 0 && rect.top < (window.innerHeight || 0)
}

/** Reveals `target` once, when it first scrolls into view. */
export function useReveal(target: Ref<HTMLElement | null>, options: RevealOptions = {}): void {
  let stopObserving: (() => void) | null = null
  let stopListening: (() => void) | null = null
  let safety = 0
  let done = false
  const key = options.key ? `reveal:${options.key}` : null

  const settle = (): void => {
    if (done) return
    done = true
    if (safety) window.clearTimeout(safety)
    stopObserving?.()
    stopObserving = null
    if (key) finishedKeys.add(key)
    // A data attribute, not a class: Vue's `:class` bindings (highlight,
    // spotlight) rewrite `className` and would strip a manually added class.
    target.value?.setAttribute('data-reveal', 'in')
    options.onReveal?.()
  }

  onMounted(() => {
    const el = target.value
    if (!el) return

    if (prefersReducedMotion() || finishedElements.has(el) || (key && finishedKeys.has(key))) {
      finishedElements.add(el)
      el.setAttribute('data-reveal', 'in')
      options.onReveal?.()
      return
    }

    stopObserving = runWhenFirstVisible(
      el,
      () => {
        finishedElements.add(el)
        settle()
      },
      options,
    )
    stopListening = onPreferenceChange(() => {
      if (prefersReducedMotion()) settle()
    })
    // If an on-screen band never got an observer callback, never leave it hidden.
    safety = window.setTimeout(() => {
      if (isOnScreen(el)) settle()
    }, SAFETY_MS)
  })

  onBeforeUnmount(() => {
    if (safety) window.clearTimeout(safety)
    stopObserving?.()
    stopListening?.()
  })
}

/* ------------------------------------------------------------------ */
/* Count-up                                                            */
/* ------------------------------------------------------------------ */

export interface CountUpOptions {
  /** Formats an intermediate/final number into the digits shown to the visitor. */
  format: (value: number) => string
  /** Total run time. Capped so a card always settles within the motion budget. */
  duration?: number
  /** Stable identity: a remount of the same key never replays the count-up. */
  key?: string
}

export interface CountUp {
  /** Digits to render; the exact final text once the run finishes. */
  display: Ref<string>
}

/**
 * Counts `value()` from 0 to its final number once, stepped in four jumps,
 * after `target` first becomes visible. Pass `null` for non-numeric stats: the
 * composable then stays inert.
 */
export function useCountUp(
  target: Ref<HTMLElement | null>,
  value: () => number | null,
  options: CountUpOptions,
): CountUp {
  const duration = Math.min(options.duration ?? COUNT_DURATION_MS, 1200)
  const finalNumber = value()
  const display = ref(finalNumber === null ? '' : options.format(finalNumber))
  const key = options.key ? `count:${options.key}` : null

  let stopObserving: (() => void) | null = null
  let stopListening: (() => void) | null = null
  let safety = 0
  let animation: { cancel: () => void } | null = null
  let done = false

  const settle = (): void => {
    if (done) return
    done = true
    if (safety) window.clearTimeout(safety)
    stopObserving?.()
    stopObserving = null
    animation?.cancel()
    animation = null
    if (key) finishedKeys.add(key)
    if (finalNumber !== null) display.value = options.format(finalNumber)
  }

  const start = (): void => {
    if (done || finalNumber === null) return
    if (key) finishedKeys.add(key)
    void loadAnime()
      .then(({ animate, steps }) => {
        if (done) return
        const ticker = { value: 0 }
        display.value = options.format(0)
        animation = animate(ticker, {
          value: finalNumber,
          duration,
          ease: steps(4),
          onUpdate: () => {
            display.value = options.format(ticker.value)
          },
          onComplete: settle,
        })
      })
      .catch(() => {
        settle()
      })
  }

  onMounted(() => {
    const el = target.value
    if (el === null || finalNumber === null) return

    if (prefersReducedMotion() || (key && finishedKeys.has(key))) {
      display.value = options.format(finalNumber)
      return
    }

    stopObserving = runWhenFirstVisible(el, start, {})
    stopListening = onPreferenceChange(() => {
      if (prefersReducedMotion()) settle()
    })
    safety = window.setTimeout(() => {
      if (isOnScreen(el)) settle()
    }, duration + SAFETY_MS)
  })

  onBeforeUnmount(() => {
    if (safety) window.clearTimeout(safety)
    stopObserving?.()
    stopListening?.()
    animation?.cancel()
    animation = null
  })

  return { display }
}
