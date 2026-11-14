<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useChatNav, type NavDestination } from '../composables/useChatNav'

const { input, busy, result, notice, suggestions, send, follow, pickSuggestions } = useChatNav()

const inputEl = ref<HTMLInputElement | null>(null)

const prunedPercent = computed(() => {
  const stats = result.value?.stats
  if (!stats || !stats.totalChars) return 0
  return Math.round((stats.prunedChars / stats.totalChars) * 100)
})

const statsLine = computed(() => {
  const stats = result.value?.stats
  if (!stats) return ''
  const effective = stats.effective === stats.mode ? stats.mode : `${stats.effective} (fallback)`
  return `${stats.total} candidates · top ${stats.selected} selected · ${effective} · ~${prunedPercent.value}% pruned · ${stats.latencyMs}ms`
})

async function handleSend(raw?: string): Promise<void> {
  await send(raw)
  nextTick(() => inputEl.value?.focus())
}

function select(destination: NavDestination): void {
  follow(destination)
}

function focusInput(): void {
  inputEl.value?.focus()
}

defineExpose({ focusInput })
</script>

<template>
  <div class="nav-surface">
    <form class="pixel-chat__input nav-surface__input" @submit.prevent="handleSend()">
      <input
        ref="inputEl"
        v-model="input"
        class="pixel-chat__field nav-surface__field"
        type="text"
        autocomplete="off"
        :disabled="busy"
        placeholder="Where do you want to go?"
        aria-label="Where do you want to go?"
      />
      <button class="pixel-chat__send" type="submit" :disabled="busy || !input.trim()">
        {{ busy ? 'Looking…' : 'Go' }}
      </button>
    </form>

    <p v-if="notice" class="nav-surface__notice" role="status">{{ notice }}</p>

    <div v-if="result" class="nav-surface__result">
      <ol
        v-if="result.destinations.length"
        class="nav-surface__rankings"
        aria-label="Ranked matches"
      >
        <li v-for="(destination, index) in result.destinations" :key="destination.anchor">
          <a
            :href="`#${destination.anchor}`"
            class="nav-surface__match"
            :class="{ 'nav-surface__match--active': result.activeAnchor === destination.anchor }"
            :aria-current="result.activeAnchor === destination.anchor ? 'true' : undefined"
            @click.prevent="select(destination)"
          >
            <span class="nav-surface__rank">{{ index + 1 }}</span>
            <span class="nav-surface__label">{{ destination.label }}</span>
            <span v-if="destination.score !== undefined" class="nav-surface__score">
              {{ destination.score.toFixed(2) }}
            </span>
          </a>
        </li>
      </ol>

      <p v-if="statsLine" class="nav-surface__stats">{{ statsLine }}</p>
    </div>

    <div class="pixel-tags nav-surface__examples" aria-label="Try asking">
      <button
        v-for="example in suggestions"
        :key="example"
        class="pixel-chip pixel-chat__example"
        type="button"
        :disabled="busy"
        @click="handleSend(example)"
      >
        {{ example }}
      </button>
      <button
        class="pixel-link-btn pixel-chat__shuffle"
        type="button"
        :disabled="busy"
        @click="pickSuggestions()"
      >
        Shuffle
      </button>
    </div>
  </div>
</template>
