<script setup lang="ts">
import VoxtralDemo from "./components/VoxtralDemo.vue";
import { ref } from 'vue'
import AboutSection from './components/AboutSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import ContactSection from './components/ContactSection.vue'
import NeuralNetworkBackground from './components/NeuralNetworkBackground.vue'

const isReduced = ref(false)
function toggleVersion() {
  isReduced.value = !isReduced.value
}
</script>

<template>
  <div>
    <button
      @click="toggleVersion"
      class="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg bg-white/80 text-slate-900 font-semibold hover:bg-blue-100 transition-all"
    >
      {{ isReduced ? 'Show Full Version' : 'Show Reduced Version' }}
    </button>
    <main
      v-if="!isReduced"
      class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 px-4 py-6 relative overflow-hidden pt-8"
    >
      <transition name="ai-loader-fade">
        <div
          v-if="showLoader"
          class="fixed bottom-0 left-0 w-full flex justify-center items-end z-50 pointer-events-none"
        >
          <div class="ai-loader-container">
            <svg
              width="120"
              height="60"
              viewBox="0 0 120 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="20" cy="40" r="8" fill="#38bdf8" opacity="0.7">
                <animate attributeName="cy" values="40;20;40" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="60" cy="40" r="8" fill="#a78bfa" opacity="0.7">
                <animate
                  attributeName="cy"
                  values="40;20;40"
                  dur="1.2s"
                  begin="0.4s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="100" cy="40" r="8" fill="#f472b6" opacity="0.7">
                <animate
                  attributeName="cy"
                  values="40;20;40"
                  dur="1.2s"
                  begin="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
              <polyline points="20,40 60,20 100,40" stroke="#fff" stroke-width="2" opacity="0.5" />
            </svg>
            <span class="ai-loader-text">Loading AI magic...</span>
          </div>
        </div>
      </transition>
      <div
        class="absolute inset-0 -z-10 animate-gradient bg-gradient-to-r from-blue-900 via-purple-900 to-slate-900 opacity-30 blur-lg"
      ></div>
      <NeuralNetworkBackground />
      <AboutSection />
      <ProjectsSection />
      <ContactSection />
        <VoxtralDemo />
    </main>
    <main
      v-else
      class="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gray-50"
    >
      <AboutSection reduced />
      <ProjectsSection reduced />
      <ContactSection reduced />
    </main>
  </div>
</template>
