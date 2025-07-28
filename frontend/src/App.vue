<script setup lang="ts">
import { ref } from 'vue';

const showAbout = ref(true);
const showProjects = ref(false);
const showContact = ref(false);
</script>

<template>
  <div>
    <transition name="ai-loader-fade">
      <div v-if="showLoader" class="fixed bottom-0 left-0 w-full flex justify-center items-end z-50 pointer-events-none">
        <div class="ai-loader-container">
          <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="40" r="8" fill="#38bdf8" opacity="0.7">
              <animate attributeName="cy" values="40;20;40" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="60" cy="40" r="8" fill="#a78bfa" opacity="0.7">
              <animate attributeName="cy" values="40;20;40" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="40" r="8" fill="#f472b6" opacity="0.7">
              <animate attributeName="cy" values="40;20;40" dur="1.2s" begin="0.8s" repeatCount="indefinite" />
            </circle>
            <polyline points="20,40 60,20 100,40" stroke="#fff" stroke-width="2" opacity="0.5" />
          </svg>
          <span class="ai-loader-text">Loading AI magic...</span>
        </div>
      </div>
    </transition>
    <!-- Navigation bar removed as requested -->
    <main class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 px-4 py-6 relative overflow-hidden pt-8">
    <!-- Animated gradient background -->
    <div class="absolute inset-0 -z-10 animate-gradient bg-gradient-to-r from-blue-900 via-purple-900 to-slate-900 opacity-30 blur-lg"></div>
    <!-- Backpropagation neural network animation (z-0, visible) -->
    <div class="absolute inset-0 z-0 pointer-events-none">
      <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="none" class="w-full h-full">
        <!-- Neurons (stars) -->
        <g>
            <circle cx="200" cy="400" r="12" fill="#fff" opacity="1" filter="url(#glow)">
            <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;1;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="300" cy="300" r="10" fill="#38bdf8" opacity="0.95" filter="url(#glow)">
            <animate attributeName="r" values="10;16;10" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="300" cy="500" r="10" fill="#a78bfa" opacity="0.95" filter="url(#glow)">
            <animate attributeName="r" values="10;16;10" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="600" cy="400" r="16" fill="#f472b6" opacity="1" filter="url(#glow)">
            <animate attributeName="r" values="16;22;16" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="950" cy="350" r="12" fill="#38bdf8" opacity="0.95" filter="url(#glow)">
            <animate attributeName="r" values="12;18;12" dur="2.1s" repeatCount="indefinite" />
          </circle>
          <circle cx="950" cy="450" r="12" fill="#a78bfa" opacity="0.95" filter="url(#glow)">
            <animate attributeName="r" values="12;18;12" dur="2.1s" repeatCount="indefinite" />
          </circle>
          <circle cx="1100" cy="400" r="18" fill="#fff" opacity="1" filter="url(#glow)">
            <animate attributeName="r" values="18;24;18" dur="2.3s" repeatCount="indefinite" />
          </circle>
        </g>
        <!-- Connections (backpropagation arrows, animated) -->
        <g>
          <!-- Output to hidden -->
          <polyline points="1100,400 950,350" stroke="#38bdf8" stroke-width="3" opacity="0.5" marker-end="url(#arrow)" >
            <animate attributeName="stroke" values="#38bdf8;#a78bfa;#38bdf8" dur="2s" repeatCount="indefinite" />
          </polyline>
          <polyline points="1100,400 950,450" stroke="#a78bfa" stroke-width="3" opacity="0.5" marker-end="url(#arrow)" >
            <animate attributeName="stroke" values="#a78bfa;#f472b6;#a78bfa" dur="2s" repeatCount="indefinite" />
          </polyline>
          <!-- Hidden to middle -->
          <polyline points="950,350 600,400" stroke="#f472b6" stroke-width="2" opacity="0.4" marker-end="url(#arrow)" >
            <animate attributeName="stroke" values="#f472b6;#38bdf8;#f472b6" dur="2.2s" repeatCount="indefinite" />
          </polyline>
          <polyline points="950,450 600,400" stroke="#a78bfa" stroke-width="2" opacity="0.4" marker-end="url(#arrow)" >
            <animate attributeName="stroke" values="#a78bfa;#38bdf8;#a78bfa" dur="2.2s" repeatCount="indefinite" />
          </polyline>
          <!-- Middle to input -->
          <polyline points="600,400 300,300" stroke="#38bdf8" stroke-width="2" opacity="0.3" marker-end="url(#arrow)" >
            <animate attributeName="stroke" values="#38bdf8;#f472b6;#38bdf8" dur="2.4s" repeatCount="indefinite" />
          </polyline>
          <polyline points="600,400 300,500" stroke="#f472b6" stroke-width="2" opacity="0.3" marker-end="url(#arrow)" >
            <animate attributeName="stroke" values="#f472b6;#a78bfa;#f472b6" dur="2.4s" repeatCount="indefinite" />
          </polyline>
          <!-- Input to far left -->
          <polyline points="300,300 200,400" stroke="#fff" stroke-width="2" opacity="0.2" marker-end="url(#arrow)" >
            <animate attributeName="stroke" values="#fff;#38bdf8;#fff" dur="2.6s" repeatCount="indefinite" />
          </polyline>
          <polyline points="300,500 200,400" stroke="#fff" stroke-width="2" opacity="0.2" marker-end="url(#arrow)" >
            <animate attributeName="stroke" values="#fff;#a78bfa;#fff" dur="2.6s" repeatCount="indefinite" />
          </polyline>
        </g>
        <!-- Propagation animation: signals moving along connections -->
        <g>
          <!-- Output to hidden -->
          <circle r="18" fill="#38bdf8" opacity="0.8" filter="url(#glow)">
            <animateMotion dur="2.2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
              <mpath xlink:href="#path1" />
            </animateMotion>
          </circle>
          <circle r="18" fill="#a78bfa" opacity="0.8" filter="url(#glow)">
            <animateMotion dur="2.2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.1s">
              <mpath xlink:href="#path2" />
            </animateMotion>
          </circle>
          <!-- Hidden to middle -->
          <circle r="14" fill="#f472b6" opacity="0.7" filter="url(#glow)">
            <animateMotion dur="2.4s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
              <mpath xlink:href="#path3" />
            </animateMotion>
          </circle>
          <circle r="14" fill="#a78bfa" opacity="0.7" filter="url(#glow)">
            <animateMotion dur="2.4s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.2s">
              <mpath xlink:href="#path4" />
            </animateMotion>
          </circle>
          <!-- Middle to input -->
          <circle r="12" fill="#38bdf8" opacity="0.6" filter="url(#glow)">
            <animateMotion dur="2.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
              <mpath xlink:href="#path5" />
            </animateMotion>
          </circle>
          <circle r="12" fill="#f472b6" opacity="0.6" filter="url(#glow)">
            <animateMotion dur="2.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.3s">
              <mpath xlink:href="#path6" />
            </animateMotion>
          </circle>
          <!-- Input to far left -->
          <circle r="10" fill="#fff" opacity="0.5" filter="url(#glow)">
            <animateMotion dur="2.8s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
              <mpath xlink:href="#path7" />
            </animateMotion>
          </circle>
          <circle r="10" fill="#a78bfa" opacity="0.5" filter="url(#glow)">
            <animateMotion dur="2.8s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.4s">
              <mpath xlink:href="#path8" />
            </animateMotion>
          </circle>
        </g>
        <!-- Arrow marker, glow filter, and connection paths for propagation -->
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,4 L0,8" fill="#fff" opacity="0.9" />
          </marker>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <!-- Connection paths for animateMotion -->
          <path id="path1" d="M1100,400 L950,350" />
          <path id="path2" d="M1100,400 L950,450" />
          <path id="path3" d="M950,350 L600,400" />
          <path id="path4" d="M950,450 L600,400" />
          <path id="path5" d="M600,400 L300,300" />
          <path id="path6" d="M600,400 L300,500" />
          <path id="path7" d="M300,300 L200,400" />
          <path id="path8" d="M300,500 L200,400" />
        </defs>
      </svg>
    </div>
    <section class="w-full max-w-2xl backdrop-blur-lg bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-0 flex flex-col items-center text-center fade-in-section" id="about">
      <button @click="showAbout = !showAbout" class="w-full flex justify-between items-center px-8 py-4 focus:outline-none bg-transparent">
        <span class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg">About</span>
        <span class="text-xl">{{ showAbout ? '−' : '+' }}</span>
      </button>
      <transition name="fade">
        <div v-if="showAbout" class="w-full px-8 pb-8 flex flex-col items-center">
          <img src="/mj.jpg" alt="Michael Jaumann" class="w-28 h-28 rounded-full border-4 border-blue-400 shadow-2xl mb-4 object-cover transition-all duration-300 hover:shadow-blue-400/50 hover:scale-105" />
          <h1 class="text-5xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 drop-shadow-xl animate-pulse">Michael Jaumann</h1>
          <p class="text-xl text-slate-200 mb-4">Hi, I'm Michael Jaumann. I live in Munich and work for the <span class="font-semibold text-blue-400">KICC</span> (KI-Competence Center der Landeshauptstadt München).</p>
          <div class="flex gap-4 mt-4">
            <span class="px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold shadow-lg animate-fade-in">AI Enthusiast</span>
            <span class="px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold shadow-lg animate-fade-in">Tech Innovator</span>
            <span class="px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold shadow-lg animate-fade-in">Munich Citizen</span>
          </div>
        </div>
      </transition>
    </section>

    <section class="w-full max-w-2xl mt-10 backdrop-blur-lg bg-white/5 border border-white/20 rounded-2xl shadow-xl p-0 fade-in-section" id="projects">
      <button @click="showProjects = !showProjects" class="w-full flex justify-between items-center px-8 py-4 focus:outline-none bg-transparent">
        <span class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg">Projects</span>
        <span class="text-xl">{{ showProjects ? '−' : '+' }}</span>
      </button>
      <transition name="fade">
        <div v-if="showProjects" class="w-full px-8 pb-8">
          <h2 class="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg">About</h2>
          <p class="text-slate-200 mb-4 leading-relaxed">I'm passionate about <span class="font-semibold text-cyan-400">AI</span>, technology, and public service.<br>At <span class="font-semibold text-blue-400">KICC</span>, I help drive innovation for the city of Munich.<br>I enjoy collaborating on meaningful projects and learning new things.</p>
          <h2 class="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg">Projects</h2>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <li class="relative bg-gradient-to-br from-blue-800/80 to-purple-800/80 p-6 rounded-2xl shadow-xl border border-blue-500/30 hover:scale-105 hover:shadow-2xl hover:border-blue-400/50 transition-all duration-300 group">
              <div class="absolute top-2 right-2 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              <h3 class="text-lg font-bold text-blue-300 mb-1">AI for City Services</h3>
              <p class="text-slate-200 mb-4">Developing AI-powered solutions to improve public services in Munich.</p>
              <a href="https://github.com/mjaumann/ai-city-services" target="_blank" rel="noopener" class="inline-block px-4 py-2 rounded-full bg-blue-500 text-white font-semibold shadow-lg hover:bg-blue-600 transition-colors group-hover:scale-105">View on GitHub</a>
            </li>
            <li class="relative bg-gradient-to-br from-purple-800/80 to-blue-800/80 p-6 rounded-2xl shadow-xl border border-purple-500/30 hover:scale-105 hover:shadow-2xl hover:border-purple-400/50 transition-all duration-300 group">
              <div class="absolute top-2 right-2 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              <h3 class="text-lg font-bold text-purple-300 mb-1">Open Data Platform</h3>
              <p class="text-slate-200 mb-4">Building a platform to make city data accessible and useful for citizens and developers.</p>
              <a href="https://github.com/mjaumann/open-data-platform" target="_blank" rel="noopener" class="inline-block px-4 py-2 rounded-full bg-purple-500 text-white font-semibold shadow-lg hover:bg-purple-600 transition-colors group-hover:scale-105">View on GitHub</a>
            </li>
            <!-- Add more projects here -->
          </ul>
        </div>
      </transition>
    </section>
    <section class="w-full max-w-2xl mt-10 mb-10 backdrop-blur-lg bg-white/5 border border-white/20 rounded-2xl shadow-xl p-0 fade-in-section" id="contact">
      <button @click="showContact = !showContact" class="w-full flex justify-between items-center px-8 py-4 focus:outline-none bg-transparent">
        <span class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg">Contact</span>
        <span class="text-xl">{{ showContact ? '−' : '+' }}</span>
      </button>
      <transition name="fade">
        <div v-if="showContact" class="w-full px-8 pb-8 flex flex-col items-center gap-4">
          <a href="mailto:michael.jaumann@email.com" class="flex items-center gap-2 text-slate-200 hover:text-blue-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12l-4-4-4 4m0 0v8m8-8v8" /></svg>
            Email
          </a>
          <a href="https://www.linkedin.com/in/michaeljaumann" target="_blank" rel="noopener" class="flex items-center gap-2 text-slate-200 hover:text-cyan-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.026-3.063-1.867-3.063-1.868 0-2.156 1.459-2.156 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.381-1.563 2.841-1.563 3.039 0 3.6 2.001 3.6 4.601v5.595z"/></svg>
            LinkedIn
          </a>
          <a href="https://github.com/mjaumann" target="_blank" rel="noopener" class="flex items-center gap-2 text-slate-200 hover:text-purple-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.757-1.333-1.757-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.371.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12z"/></svg>
            GitHub
          </a>
        </div>
      </transition>
    </section>
    </main>
  </div>
</template>

<style scoped>
@keyframes gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.animate-gradient {
  background-size: 200% 200%;
  animation: gradient 8s ease-in-out infinite;
}
/* Neural network background animation styles */
.neural-bg {
  pointer-events: none;
  z-index: 0;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 1s ease-in;
}
.fade-in-section {
  opacity: 0;
  transform: translateY(20px);
  animation: fade-in 1s ease-in forwards;
}
/* Collapsible fade transition for sections */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s, max-height 0.5s;
  overflow: hidden;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  max-height: 0;
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  max-height: 1000px;
}
.ai-loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(90deg, #0ea5e9 0%, #a78bfa 50%, #f472b6 100%);
  border-radius: 2rem 2rem 0 0;
  box-shadow: 0 -4px 32px 0 #0ea5e933, 0 -2px 8px 0 #a78bfa33;
  padding: 1.5rem 2.5rem 1rem 2.5rem;
  margin-bottom: 0.5rem;
  animation: ai-loader-slideup 2.2s cubic-bezier(.4,0,.2,1);
}
.ai-loader-text {
  color: #fff;
  font-size: 1.1rem;
  font-weight: 500;
  margin-top: 0.5rem;
  text-shadow: 0 2px 8px #0ea5e988;
  letter-spacing: 0.05em;
}
.ai-loader-fade-enter-active, .ai-loader-fade-leave-active {
  transition: opacity 0.7s, transform 0.7s;
}
.ai-loader-fade-enter-from, .ai-loader-fade-leave-to {
  opacity: 0;
  transform: translateY(40px);
}
.ai-loader-fade-leave-active {
  transition: opacity 0.7s, transform 0.7s;
}
.ai-loader-fade-leave-to {
  opacity: 0;
  transform: translateY(-40px);
}
@keyframes ai-loader-slideup {
  0% { transform: translateY(60px); opacity: 0; }
  30% { opacity: 1; }
  100% { transform: translateY(0); opacity: 1; }
}
</style>
