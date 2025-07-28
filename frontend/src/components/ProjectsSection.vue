<template>
  <section :class="sectionClass" id="projects">
    <button @click="showProjects = !showProjects" :class="buttonClass">
      <span :class="titleClass">Projects</span>
      <span class="text-xl">{{ showProjects ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="showProjects" :class="contentClass">
        <div class="w-full flex flex-col md:flex-row gap-8 items-stretch">
          <div :class="project1Class + ' flex flex-col justify-between w-full md:w-2/3'">
            <h3 :class="projectTitle1Class + ' text-3xl mb-4'">MUCGPT</h3>
            <p :class="projectDescClass + ' text-lg mb-6'">
              MUCGPT is Munich's open-source AI chatbot for citizens, enabling secure and customizable interactions with large language models. Users can create and share their own assistants, with roles and rights managed via Single Sign-On. The platform is designed for extensibility, privacy, and ease of use in public sector applications.
            </p>
            <div class="mt-auto pt-4 flex justify-end">
              <a href="https://github.com/it-at-m/mucgpt" target="_blank" rel="noopener" :class="projectLink1Class + ' text-lg'">View on GitHub</a>
            </div>
          </div>
          <div class="flex flex-col justify-center w-full md:w-1/3">
            <span class="font-semibold text-blue-400 mb-2">Technology Stack:</span>
            <div class="grid grid-cols-1 gap-4">
              <div class="bg-blue-900/40 rounded-lg p-4">
                <span class="font-bold text-blue-300">Frontend</span>
                <ul class="list-disc ml-5 text-blue-100 text-base mt-1">
                  <li>React</li>
                  <li>Typescript</li>
                  <li>Javascript</li>
                </ul>
              </div>
              <div class="bg-purple-900/40 rounded-lg p-4">
                <span class="font-bold text-purple-300">Backend</span>
                <ul class="list-disc ml-5 text-purple-100 text-base mt-1">
                  <li>FastAPI</li>
                  <li>LangGraph</li>
                  <li>Python</li>
                </ul>
              </div>
              <div class="bg-slate-900/40 rounded-lg p-4">
                <span class="font-bold text-slate-300">Deployment</span>
                <ul class="list-disc ml-5 text-slate-100 text-base mt-1">
                  <li>Docker</li>
                  <li>API Gateway</li>
                  <li>PostgresDB</li>
                  <li>Keycloak</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
const props = defineProps<{ reduced?: boolean }>();
const showProjects = ref(false);
const sectionClass = computed(() => props.reduced
  ? 'w-full max-w-lg bg-white border border-gray-300 rounded-xl p-8 mb-10'
  : 'w-full max-w-2xl mt-10 backdrop-blur-lg bg-white/5 border border-white/20 rounded-2xl shadow-xl p-0 fade-in-section');
const buttonClass = computed(() => props.reduced
  ? 'w-full flex justify-between items-center mb-6 px-0 py-2 bg-transparent'
  : 'w-full flex justify-between items-center px-8 py-4 focus:outline-none bg-transparent');
const titleClass = computed(() => props.reduced
  ? 'text-2xl font-bold text-blue-800'
  : 'text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg');
const contentClass = computed(() => props.reduced
  ? 'w-full'
  : 'w-full px-8 pb-8');
const subtitleClass = computed(() => props.reduced
  ? 'text-2xl font-bold mb-4 text-blue-800'
  : 'text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg');
const descClass = computed(() => props.reduced
  ? 'text-gray-800 mb-5 leading-relaxed text-lg'
  : 'text-slate-200 mb-4 leading-relaxed');
const listClass = computed(() => props.reduced
  ? 'space-y-6'
  : 'grid grid-cols-1 md:grid-cols-2 gap-6');
const project1Class = computed(() => props.reduced
  ? 'border border-blue-100 rounded-lg p-5 bg-blue-50'
  : 'relative bg-gradient-to-br from-blue-800/80 to-purple-800/80 p-6 rounded-2xl shadow-xl border border-blue-500/30 hover:scale-105 hover:shadow-2xl hover:border-blue-400/50 transition-all duration-300 group');
const project2Class = computed(() => props.reduced
  ? 'border border-purple-100 rounded-lg p-5 bg-purple-50'
  : 'relative bg-gradient-to-br from-purple-800/80 to-blue-800/80 p-6 rounded-2xl shadow-xl border border-purple-500/30 hover:scale-105 hover:shadow-2xl hover:border-purple-400/50 transition-all duration-300 group');
const projectTitle1Class = computed(() => props.reduced
  ? 'font-semibold text-blue-800 mb-2 text-lg'
  : 'text-lg font-bold text-blue-300 mb-1');
const projectTitle2Class = computed(() => props.reduced
  ? 'font-semibold text-purple-800 mb-2 text-lg'
  : 'text-lg font-bold text-purple-300 mb-1');
const projectDescClass = computed(() => props.reduced
  ? 'text-gray-800 text-base mb-2'
  : 'text-slate-200 mb-4');
const projectLink1Class = computed(() => props.reduced
  ? 'text-blue-700 underline'
  : 'inline-block px-4 py-2 rounded-full bg-blue-500 text-white font-semibold shadow-lg hover:bg-blue-600 transition-colors group-hover:scale-105');
const projectLink2Class = computed(() => props.reduced
  ? 'text-purple-700 underline'
  : 'inline-block px-4 py-2 rounded-full bg-purple-500 text-white font-semibold shadow-lg hover:bg-purple-600 transition-colors group-hover:scale-105');
</script>


