<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const COLS = 20
const ROWS = 20
const CELL = 16

interface Point {
  x: number
  y: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const gameOver = ref(false)
const running = ref(true)

let ctx: CanvasRenderingContext2D | null = null
let snake: Point[] = []
let direction: Point = { x: 1, y: 0 }
let queued: Point[] = []
let food: Point = { x: 5, y: 5 }
let timeout: number | undefined

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const SPEED = reducedMotion ? 240 : 130

function spawnFood(): void {
  const free: Point[] = []
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        free.push({ x, y })
      }
    }
  }
  if (free.length === 0) {
    gameOver.value = true
    running.value = false
    return
  }
  food = free[Math.floor(Math.random() * free.length)]
}

function draw(): void {
  const c = ctx
  if (!c) return
  c.fillStyle = '#171310'
  c.fillRect(0, 0, COLS * CELL, ROWS * CELL)

  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if ((x + y) % 2 === 0) {
        c.fillStyle = 'rgba(255, 244, 230, 0.025)'
        c.fillRect(x * CELL, y * CELL, CELL, CELL)
      }
    }
  }

  c.fillStyle = '#f87171'
  c.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4)

  snake.forEach((segment, index) => {
    c.fillStyle = index === 0 ? '#fde047' : '#fbbf24'
    c.fillRect(segment.x * CELL + 1, segment.y * CELL + 1, CELL - 2, CELL - 2)
  })
}

function reset(): void {
  snake = [{ x: 8, y: 8 }]
  direction = { x: 1, y: 0 }
  queued = []
  score.value = 0
  gameOver.value = false
  running.value = true
  spawnFood()
  draw()
}

function step(): void {
  if (queued.length > 0) {
    const next = queued.shift()
    if (next && !(next.x === -direction.x && next.y === -direction.y)) {
      direction = next
    }
  }

  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y }
  head.x = (head.x + COLS) % COLS
  head.y = (head.y + ROWS) % ROWS

  if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
    gameOver.value = true
    running.value = false
    draw()
    return
  }

  snake.unshift(head)
  if (head.x === food.x && head.y === food.y) {
    score.value += 1
    spawnFood()
  } else {
    snake.pop()
  }
  draw()
}

function loop(): void {
  if (running.value) step()
  timeout = window.setTimeout(loop, SPEED)
}

function setDirection(dx: number, dy: number): void {
  if (running.value && !gameOver.value) {
    queued.push({ x: dx, y: dy })
  }
}

function onKeyDown(event: KeyboardEvent): void {
  const keyMap: Record<string, [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
    W: [0, -1],
    S: [0, 1],
    A: [-1, 0],
    D: [1, 0],
  }
  const mapped = keyMap[event.key]
  if (mapped) {
    event.preventDefault()
    setDirection(mapped[0], mapped[1])
  }
}

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') ?? null
  reset()
  window.addEventListener('keydown', onKeyDown)
  loop()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (timeout !== undefined) window.clearTimeout(timeout)
})
</script>

<template>
  <div class="snake-game">
    <div class="snake-game__hud">
      <span class="snake-game__score">SCORE: {{ score }}</span>
      <button class="pixel-link-btn snake-game__reset" type="button" @click="reset">
        {{ gameOver ? 'Retry' : 'Reset' }}
      </button>
    </div>
    <canvas
      ref="canvasRef"
      class="snake-game__canvas"
      width="320"
      height="320"
      aria-label="Snake game"
    ></canvas>
    <p v-if="gameOver" class="snake-game__over">GAME OVER</p>
    <div class="snake-game__pad" aria-hidden="true">
      <button
        type="button"
        class="snake-game__pad-btn snake-game__pad-btn--up"
        @click="setDirection(0, -1)"
      >
        ▲
      </button>
      <button
        type="button"
        class="snake-game__pad-btn snake-game__pad-btn--left"
        @click="setDirection(-1, 0)"
      >
        ◀
      </button>
      <button
        type="button"
        class="snake-game__pad-btn snake-game__pad-btn--right"
        @click="setDirection(1, 0)"
      >
        ▶
      </button>
      <button
        type="button"
        class="snake-game__pad-btn snake-game__pad-btn--down"
        @click="setDirection(0, 1)"
      >
        ▼
      </button>
    </div>
  </div>
</template>
