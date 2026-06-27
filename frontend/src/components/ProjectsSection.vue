<template>
  <section :class="sectionClass" id="projects">
    <button
      @click="showProjects = !showProjects"
      :class="buttonClass"
      type="button"
      aria-controls="projects-content"
      :aria-expanded="showProjects"
    >
      <span :class="titleClass">Projects</span>
      <span class="text-xl">{{ showProjects ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="showProjects" id="projects-content" :class="contentClass">
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
  : 'w-full max-w-2xl mt-10 pixel-panel p-0 fade-in-section');
const buttonClass = computed(() => props.reduced
  ? 'w-full flex justify-between items-center mb-6 px-0 py-2 bg-transparent'
  : 'w-full flex justify-between items-center px-6 py-4 focus:outline-none pixel-btn text-slate-100');
const titleClass = computed(() => props.reduced
  ? 'text-2xl font-bold text-blue-800'
  : 'pixel-title text-base sm:text-lg text-cyan-300');
const contentClass = computed(() => props.reduced
  ? 'w-full'
  : 'w-full px-8 pb-8');
const project1Class = computed(() => props.reduced
  ? 'border border-blue-100 rounded-lg p-5 bg-blue-50'
  : 'relative bg-slate-900/85 p-6 rounded-pixel shadow-pixel border border-slate-600 hover:scale-[1.01] transition-all duration-150 group');
const projectTitle1Class = computed(() => props.reduced
  ? 'font-semibold text-blue-800 mb-2 text-lg'
  : 'text-base font-bold text-cyan-300 mb-1 pixel-title');
const projectDescClass = computed(() => props.reduced
  ? 'text-gray-800 text-base mb-2'
  : 'text-slate-200 mb-4 pixel-text text-lg');
const projectLink1Class = computed(() => props.reduced
  ? 'text-blue-700 underline'
  : 'inline-block px-4 py-2 rounded-pixel border border-cyan-400 bg-slate-800 text-cyan-200 font-semibold shadow-pixelSoft pixel-text transition-colors');
</script>


