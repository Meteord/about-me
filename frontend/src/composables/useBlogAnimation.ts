import { onBeforeUnmount, onMounted, type Ref } from 'vue'

type AnimeModule = typeof import('animejs')

const GLOW_BASE = 0.18
const GLOW_FLASH = 0.75

const COLOR_AMBER = '#fde047'
const COLOR_RED = '#f87171'

let animePromise: Promise<AnimeModule> | null = null

function loadAnime(): Promise<AnimeModule> {
  animePromise ??= import('animejs')
  return animePromise
}

interface Point {
  x: number
  y: number
}

export function useBlogAnimation(rootRef: Ref<HTMLElement | null>) {
  let disposed = false
  let revealTl: import('animejs').Timeline | null = null
  let sequenceTl: import('animejs').Timeline | null = null
  let resizeObserver: ResizeObserver | null = null
  let sequenceRunning = false

  const startSequence = async (): Promise<void> => {
    const root = rootRef.value
    if (disposed || !root) return
    const flow = root.querySelector<HTMLElement>('.tech-diagram__flow')
    const packet = root.querySelector<HTMLElement>('.blog-packet')
    const sockets = Array.from(root.querySelectorAll<HTMLElement>('.tech-diagram__socket'))
    const glows = Array.from(root.querySelectorAll<HTMLElement>('.tech-diagram__glow'))
    const term = root.querySelector<HTMLElement>('.blog-term')
    const modes = root.querySelector<HTMLElement>('.blog-modes')
    const bars = Array.from(root.querySelectorAll<HTMLElement>('.blog-rank__bar'))
    const pcts = Array.from(root.querySelectorAll<HTMLElement>('.blog-rank__pct'))
    const hitBar = root.querySelector<HTMLElement>('.blog-rank--hit .blog-rank__bar')
    const nonHit = Array.from(root.querySelectorAll<HTMLElement>('.blog-rank:not(.blog-rank--hit)'))
    const tokens = Array.from(root.querySelectorAll<HTMLElement>('.blog-tokens i'))
    const reply = root.querySelector<HTMLElement>('.blog-reply')
    if (!flow || !packet || !term || !modes || !hitBar || !reply) return
    if (sockets.length < 4 || bars.length < 3 || tokens.length === 0) return

    sequenceTl?.cancel()
    sequenceTl = null
    sequenceRunning = false

    const { createTimeline, stagger, steps, utils } = await loadAnime()
    if (disposed) return

    const modelNode = sockets[2].closest('.tech-diagram__node')
    const busy = (on: boolean): void => {
      modelNode?.classList.toggle('is-busy', on)
    }

    const flowBox = flow.getBoundingClientRect()
    const centerOf = (el: Element): Point => {
      const box = el.getBoundingClientRect()
      return {
        x: box.left - flowBox.left + box.width / 2,
        y: box.top - flowBox.top + box.height / 2,
      }
    }
    const fit = (p: Point, w: number, h: number): Point => ({
      x: p.x - w / 2,
      y: p.y - h / 2,
    })

    const you = centerOf(sockets[0])
    const retriever = centerOf(sockets[1])
    const model = centerOf(sockets[2])

    const packetAt = (p: Point): Point => fit(p, 10, 10)

    utils.set(packet, { x: packetAt(you).x, y: packetAt(you).y, opacity: 1 })
    utils.set(pcts, { opacity: 0 })
    utils.set(nonHit, { opacity: 1 })
    utils.set(tokens, { opacity: 0, scale: 0.4 })
    utils.set(reply, { opacity: 0 })

    const tl = createTimeline({ loop: true, defaults: { ease: steps(3) } })

    // 1. query hop: You -> retriever; example question flickers in
    tl.add(packet, {
      x: packetAt(retriever).x,
      y: packetAt(retriever).y,
      opacity: 1,
      duration: 600,
    })
    tl.add(
      glows[1],
      { opacity: [GLOW_BASE, GLOW_FLASH, GLOW_BASE], duration: 300, ease: steps(2) },
      '-=180',
    )
    tl.add(term, { opacity: [0.3, 1], duration: 140, ease: steps(2) }, '-=160')

    // 2. scan: hybrid pill pulses
    tl.add(modes, { opacity: [0.35, 1, 0.35], duration: 420, ease: steps(2) })

    // 3. score: probability bars fill to their hybrid %, percentages pop in
    tl.add(
      bars,
      {
        scaleX: { from: 0, to: 1 },
        opacity: [0, 1],
        delay: stagger(150),
        duration: 360,
        ease: steps(3),
      },
      '-=120',
    )
    tl.add(pcts, { opacity: [0, 1], delay: stagger(150), duration: 180, ease: steps(2) }, '-=240')

    // 4. select: winner (retrieve) glows, the rest dim, cluster pops at the hit row
    tl.add(
      hitBar,
      {
        borderColor: COLOR_AMBER,
        boxShadow: '0 0 8px rgba(253, 224, 71, 0.6)',
        duration: 140,
        ease: steps(2),
      },
      '-=120',
    )
    tl.add(nonHit, { opacity: 0.4, duration: 200, ease: steps(2) }, '-=140')

    // 5. context: retriever hands off to the model, model goes "busy"
    busy(true)
    tl.add(
      glows[2],
      { opacity: [GLOW_BASE, GLOW_FLASH * 0.8, GLOW_BASE], duration: 500, ease: steps(2) },
      '+=40',
    )

    // 6. stream: reply token bars appear one-by-one
    tl.add(
      tokens,
      {
        opacity: [0, 1],
        scale: { from: 0.4, to: 1 },
        delay: stagger(90),
        duration: 220,
        ease: steps(3),
      },
      '-=160',
    )
    tl.add(
      glows[3],
      { opacity: [GLOW_BASE, GLOW_FLASH, GLOW_BASE], duration: 300, ease: steps(2) },
      '-=260',
    )
    tl.add(reply, { opacity: [0, 1], duration: 200, ease: steps(2) }, '-=120')

    // 7. round-trip: the packet turns red (tool call) and hops model -> retriever
    tl.add(packet, { backgroundColor: COLOR_RED, duration: 120, ease: steps(2) })
    tl.add(packet, { x: packetAt(retriever).x, y: packetAt(retriever).y, duration: 500 }, '-=60')
    tl.add(
      glows[1],
      { opacity: [GLOW_BASE, GLOW_FLASH, GLOW_BASE], duration: 300, ease: steps(2) },
      '-=200',
    )

    // 8. result: packet returns retriever -> model, model finishes thinking
    utils.set(packet, { x: packetAt(retriever).x, y: packetAt(retriever).y, opacity: 1 })
    tl.add(packet, { x: packetAt(model).x, y: packetAt(model).y, opacity: 1, duration: 520 })
    tl.add(
      glows[2],
      { opacity: [GLOW_BASE, GLOW_FLASH, GLOW_BASE], duration: 300, ease: steps(2) },
      '-=200',
    )

    // 9. reset: everything fades back to base for the next loop
    busy(false)
    tl.add(packet, { backgroundColor: COLOR_AMBER, duration: 120, ease: steps(2) })
    tl.add(packet, {
      x: packetAt(you).x,
      y: packetAt(you).y,
      opacity: 0,
      duration: 140,
      ease: steps(2),
    })
    tl.add(hitBar, { borderColor: 'transparent', boxShadow: 'none', duration: 120, ease: steps(2) })
    tl.add(nonHit, { opacity: 1, duration: 160, ease: steps(2) })
    tl.add(bars, { scaleX: 0, opacity: 0, delay: stagger(30), duration: 160, ease: steps(2) })
    tl.add(pcts, { opacity: 0, duration: 120, ease: steps(2) })
    tl.add(
      tokens,
      { opacity: 0, scale: 0.4, delay: stagger(40), duration: 160, ease: steps(2) },
      '-=80',
    )
    tl.add(reply, { opacity: 0, duration: 120, ease: steps(2) }, '-=100')

    sequenceTl = tl
    sequenceRunning = true
  }

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
    const nodes = query('[data-anim="node"]')
    const cards = query('[data-anim="card"]')
    const glows = query('.tech-diagram__glow')

    utils.set([...title, ...meta, ...lead, ...note, ...cards], { opacity: 0 })
    utils.set(nodes, { opacity: 0, scale: 0 })
    utils.set(glows, { opacity: GLOW_BASE })

    revealTl = createTimeline({
      defaults: { ease: steps(2), duration: 240 },
      onComplete: () => {
        sequenceRunning = false
        startSequence()
      },
    })

    if (title.length) revealTl.add(title, { opacity: 1, duration: 120 })
    if (nodes.length)
      revealTl.add(nodes, {
        opacity: 1,
        scale: { from: 0.6, to: 1 },
        delay: stagger(110),
        duration: 260,
        ease: steps(3),
      })
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

    resizeObserver = new ResizeObserver(() => {
      if (sequenceRunning) startSequence()
    })
    resizeObserver.observe(root)
  })

  onBeforeUnmount(() => {
    disposed = true
    revealTl?.cancel()
    sequenceTl?.cancel()
    revealTl = null
    sequenceTl = null
    resizeObserver?.disconnect()
    resizeObserver = null
  })
}
