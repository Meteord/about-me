<template>
  <section :class="sectionClass" id="contact">
    <button @click="showContact = !showContact" :class="buttonClass">
      <span :class="titleClass">Contact</span>
      <span class="text-xl">{{ showContact ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="showContact" :class="contentClass">
        <div :class="linksClass">
          <a href="mailto:michael.jaumann@email.com" :class="emailClass">Email</a>
          <a
            href="https://www.linkedin.com/in/michaeljaumann"
            target="_blank"
            rel="noopener"
            :class="linkedinClass"
            >LinkedIn</a
          >
          <a href="https://github.com/mjaumann" target="_blank" rel="noopener" :class="githubClass"
            >GitHub</a
          >
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
const props = defineProps<{ reduced?: boolean }>()
const showContact = ref(false)
const sectionClass = computed(() =>
  props.reduced
    ? 'w-full max-w-lg bg-white border border-gray-300 rounded-xl p-8 text-center'
    : 'w-full max-w-2xl mt-10 mb-10 backdrop-blur-lg bg-white/5 border border-white/20 rounded-2xl shadow-xl p-0 fade-in-section',
)
const buttonClass = computed(() =>
  props.reduced
    ? 'w-full flex justify-between items-center mb-6 px-0 py-2 bg-transparent'
    : 'w-full flex justify-between items-center px-8 py-4 focus:outline-none bg-transparent',
)
const titleClass = computed(() =>
  props.reduced
    ? 'text-2xl font-bold text-blue-800'
    : 'text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg',
)
const contentClass = computed(() =>
  props.reduced
    ? 'w-full flex flex-col gap-3 items-center mt-4'
    : 'w-full px-8 pb-8 flex flex-col items-center gap-4',
)
const linksClass = computed(() =>
  props.reduced ? 'flex flex-col gap-3 items-center' : 'flex flex-col gap-2 items-center',
)
const emailClass = computed(() =>
  props.reduced
    ? 'text-blue-700 underline text-base'
    : 'flex items-center gap-2 text-slate-200 hover:text-blue-400 transition-colors',
)
const linkedinClass = computed(() =>
  props.reduced
    ? 'text-cyan-700 underline text-base'
    : 'flex items-center gap-2 text-slate-200 hover:text-cyan-400 transition-colors',
)
const githubClass = computed(() =>
  props.reduced
    ? 'text-purple-700 underline text-base'
    : 'flex items-center gap-2 text-slate-200 hover:text-purple-400 transition-colors',
)

</script>
