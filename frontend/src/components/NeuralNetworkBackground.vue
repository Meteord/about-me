<template>
  <div class="absolute inset-0 z-0 pointer-events-none">
    <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="none" class="w-full h-full">
      <!-- Neurons (stars) -->
      <g>
        <circle cx="200" cy="400" r="12" fill="#fff" opacity="0.35" filter="url(#glow-subtle)">
          <animate attributeName="r" values="12;15;12" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="300" cy="300" r="10" fill="#38bdf8" opacity="0.25" filter="url(#glow-subtle)">
          <animate attributeName="r" values="10;13;10" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="300" cy="500" r="10" fill="#a78bfa" opacity="0.25" filter="url(#glow-subtle)">
          <animate attributeName="r" values="10;13;10" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="600" cy="400" r="16" fill="#f472b6" opacity="0.3" filter="url(#glow-subtle)">
          <animate attributeName="r" values="16;19;16" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="950" cy="350" r="12" fill="#38bdf8" opacity="0.25" filter="url(#glow-subtle)">
          <animate attributeName="r" values="12;15;12" dur="2.1s" repeatCount="indefinite" />
        </circle>
        <circle cx="950" cy="450" r="12" fill="#a78bfa" opacity="0.25" filter="url(#glow-subtle)">
          <animate attributeName="r" values="12;15;12" dur="2.1s" repeatCount="indefinite" />
        </circle>
        <circle cx="1100" cy="400" r="18" fill="#fff" opacity="0.35" filter="url(#glow-subtle)">
          <animate attributeName="r" values="18;21;18" dur="2.3s" repeatCount="indefinite" />
        </circle>
      </g>
      <!-- Connections (backpropagation arrows, animated) -->
      <g>
        <polyline points="1100,400 950,350" stroke="#38bdf8" stroke-width="2" opacity="0.18" marker-end="url(#arrow)" >
          <animate attributeName="stroke" values="#38bdf8;#a78bfa;#38bdf8" dur="2s" repeatCount="indefinite" />
        </polyline>
        <polyline points="1100,400 950,450" stroke="#a78bfa" stroke-width="2" opacity="0.18" marker-end="url(#arrow)" >
          <animate attributeName="stroke" values="#a78bfa;#f472b6;#a78bfa" dur="2s" repeatCount="indefinite" />
        </polyline>
        <polyline points="950,350 600,400" stroke="#f472b6" stroke-width="1.5" opacity="0.13" marker-end="url(#arrow)" >
          <animate attributeName="stroke" values="#f472b6;#38bdf8;#f472b6" dur="2.2s" repeatCount="indefinite" />
        </polyline>
        <polyline points="950,450 600,400" stroke="#a78bfa" stroke-width="1.5" opacity="0.13" marker-end="url(#arrow)" >
          <animate attributeName="stroke" values="#a78bfa;#38bdf8;#a78bfa" dur="2.2s" repeatCount="indefinite" />
        </polyline>
        <polyline points="600,400 300,300" stroke="#38bdf8" stroke-width="1.2" opacity="0.09" marker-end="url(#arrow)" >
          <animate attributeName="stroke" values="#38bdf8;#f472b6;#38bdf8" dur="2.4s" repeatCount="indefinite" />
        </polyline>
        <polyline points="600,400 300,500" stroke="#f472b6" stroke-width="1.2" opacity="0.09" marker-end="url(#arrow)" >
          <animate attributeName="stroke" values="#f472b6;#a78bfa;#f472b6" dur="2.4s" repeatCount="indefinite" />
        </polyline>
        <polyline points="300,300 200,400" stroke="#fff" stroke-width="1" opacity="0.07" marker-end="url(#arrow)" >
          <animate attributeName="stroke" values="#fff;#38bdf8;#fff" dur="2.6s" repeatCount="indefinite" />
        </polyline>
        <polyline points="300,500 200,400" stroke="#fff" stroke-width="1" opacity="0.07" marker-end="url(#arrow)" >
          <animate attributeName="stroke" values="#fff;#a78bfa;#fff" dur="2.6s" repeatCount="indefinite" />
        </polyline>
      </g>
      <!-- Propagation animation: signals moving along connections -->
      <g>
        <circle r="18" fill="#38bdf8" opacity="0.13" filter="url(#glow-subtle)">
          <animateMotion dur="2.2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath xlink:href="#path1" />
          </animateMotion>
        </circle>
        <circle r="18" fill="#a78bfa" opacity="0.13" filter="url(#glow-subtle)">
          <animateMotion dur="2.2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.1s">
            <mpath xlink:href="#path2" />
          </animateMotion>
        </circle>
        <circle r="14" fill="#f472b6" opacity="0.11" filter="url(#glow-subtle)">
          <animateMotion dur="2.4s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath xlink:href="#path3" />
          </animateMotion>
        </circle>
        <circle r="14" fill="#a78bfa" opacity="0.11" filter="url(#glow-subtle)">
          <animateMotion dur="2.4s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.2s">
            <mpath xlink:href="#path4" />
          </animateMotion>
        </circle>
        <circle r="12" fill="#38bdf8" opacity="0.09" filter="url(#glow-subtle)">
          <animateMotion dur="2.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath xlink:href="#path5" />
          </animateMotion>
        </circle>
        <circle r="12" fill="#f472b6" opacity="0.09" filter="url(#glow-subtle)">
          <animateMotion dur="2.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.3s">
            <mpath xlink:href="#path6" />
          </animateMotion>
        </circle>
        <circle r="10" fill="#fff" opacity="0.07" filter="url(#glow-subtle)">
          <animateMotion dur="2.8s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath xlink:href="#path7" />
          </animateMotion>
        </circle>
        <circle r="10" fill="#a78bfa" opacity="0.07" filter="url(#glow-subtle)">
          <animateMotion dur="2.8s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.4s">
            <mpath xlink:href="#path8" />
          </animateMotion>
        </circle>
      </g>
      <!-- Arrow marker, glow filter, and connection paths for propagation -->
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8" fill="#fff" opacity="0.5" />
        </marker>
        <filter id="glow-subtle" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
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
</template>

<script setup lang="ts">
// No logic needed, purely presentational
</script>


