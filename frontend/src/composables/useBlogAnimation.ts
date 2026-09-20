import { onBeforeUnmount, onMounted, type Ref } from 'vue'

type AnimeModule = typeof import('animejs')

let animePromise: Promise<AnimeModule> | null = null

function loadAnime(): Promise<AnimeModule> {
  animePromise ??= import('animejs')
  return animePromise
}

export function useBlogAnimation(rootRef: Ref<HTMLElement | null>) {
  let disposed = false
  let revealTl: import('animejs').Timeline | null = null

  onMounted(async () => {
    const root = rootRef.value
    if (disposed || !root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const { createTimeline, stagger, steps, utils } = await loadAnime()
    if (disposed) return

    const query = (selector: string): HTMLElement[] =>
      Array.from(root.querySelectorAll<HTMLElement>(selector))

    const title = query('[data-anim="title"]')
    const meta = query('[data-anim="meta"]')
    const lead = query('[data-anim="lead"]')
    const note = query('[data-anim="note"]')
    const cards = query('[data-anim="card"]')

    utils.set([...title, ...meta, ...lead, ...note, ...cards], { opacity: 0 })

    revealTl = createTimeline({
      defaults: { ease: steps(2), duration: 240 },
    })

    if (title.length) revealTl.add(title, { opacity: 1, duration: 120 })
    if (meta.length) revealTl.add(meta, { opacity: 1, duration: 120 })
    if (lead.length) revealTl.add(lead, { opacity: 1, duration: 120 })
    if (note.length) revealTl.add(note, { opacity: 1, duration: 120 })
    if (cards.length)
      revealTl.add(cards, {
        opacity: 1,
        translateY: { from: 10, to: 0 },
        delay: stagger(170),
        duration: 280,
        ease: steps(3),
      })
  })

  onBeforeUnmount(() => {
    disposed = true
    revealTl?.cancel()
    revealTl = null
  })
}
