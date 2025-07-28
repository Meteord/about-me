<template>
  <section :class="sectionClass" id="about">
    <button @click="showAbout = !showAbout" :class="buttonClass">
      <span :class="titleClass">About</span>
      <span class="text-xl">{{ showAbout ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="showAbout" :class="contentClass">
        <img src="/mj.jpg" alt="Michael Jaumann" :class="imgClass" />
        <h1 :class="nameClass">Michael Jaumann</h1>
        <p :class="descClass">Hi, I'm Michael Jaumann. I live in Munich and work for the <span class="font-semibold text-blue-400">KICC</span> (KI-Competence Center der Landeshauptstadt München).</p>
        <div :class="tagsClass">
          <span :class="tag1Class">AI Enthusiast</span>
          <span :class="tag2Class">Tech Innovator</span>
          <span :class="tag3Class">Munich Citizen</span>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
const props = defineProps<{ reduced?: boolean }>();
const showAbout = ref(true);
const sectionClass = computed(() => props.reduced
  ? 'w-full max-w-lg bg-white border border-gray-300 rounded-xl p-8 mb-10 text-center'
  : 'w-full max-w-2xl backdrop-blur-lg bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-0 flex flex-col items-center text-center fade-in-section');
const buttonClass = computed(() => props.reduced
  ? 'w-full flex justify-between items-center mb-6 px-0 py-2 bg-transparent'
  : 'w-full flex justify-between items-center px-8 py-4 focus:outline-none bg-transparent');
const titleClass = computed(() => props.reduced
  ? 'text-2xl font-bold text-blue-800'
  : 'text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg');
const contentClass = computed(() => props.reduced
  ? 'w-full flex flex-col items-center'
  : 'w-full px-8 pb-8 flex flex-col items-center');
const imgClass = computed(() => props.reduced
  ? 'w-24 h-24 rounded-full border-2 border-blue-500 mb-6 object-cover mx-auto'
  : 'w-28 h-28 rounded-full border-4 border-blue-400 shadow-2xl mb-4 object-cover transition-all duration-300 hover:shadow-blue-400/50 hover:scale-105');
const nameClass = computed(() => props.reduced
  ? 'text-3xl font-extrabold mb-3 text-blue-800'
  : 'text-5xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 drop-shadow-xl animate-pulse');
const descClass = computed(() => props.reduced
  ? 'text-lg text-gray-800 mb-5 leading-relaxed'
  : 'text-xl text-slate-200 mb-4');
const tagsClass = computed(() => props.reduced
  ? 'flex gap-3 justify-center mt-3'
  : 'flex gap-4 mt-4');
const tag1Class = computed(() => props.reduced
  ? 'px-3 py-1 rounded bg-blue-100 text-blue-800 text-sm font-semibold'
  : 'px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold shadow-lg animate-fade-in');
const tag2Class = computed(() => props.reduced
  ? 'px-3 py-1 rounded bg-cyan-100 text-cyan-800 text-sm font-semibold'
  : 'px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold shadow-lg animate-fade-in');
const tag3Class = computed(() => props.reduced
  ? 'px-3 py-1 rounded bg-purple-100 text-purple-800 text-sm font-semibold'
  : 'px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold shadow-lg animate-fade-in');
</script>

