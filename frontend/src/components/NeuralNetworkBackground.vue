<template>
  <div class="absolute inset-0 z-0 pointer-events-none">
    <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="none" class="w-full h-full">
      <rect width="1200" height="800" fill="url(#pixel-grid)" opacity="0.35" />

      <g class="pixel-links">
        <line x1="1060" y1="400" x2="900" y2="320" />
        <line x1="1060" y1="400" x2="900" y2="480" />
        <line x1="900" y1="320" x2="620" y2="400" />
        <line x1="900" y1="480" x2="620" y2="400" />
        <line x1="620" y1="400" x2="320" y2="280" />
        <line x1="620" y1="400" x2="320" y2="520" />
        <line x1="320" y1="280" x2="170" y2="400" />
        <line x1="320" y1="520" x2="170" y2="400" />
      </g>

      <g class="pixel-nodes">
        <rect x="1038" y="378" width="44" height="44" class="node-white">
          <animate attributeName="opacity" values="0.75;0.45;0.75" dur="1.2s" repeatCount="indefinite" />
        </rect>
        <rect x="882" y="302" width="36" height="36" class="node-cyan">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.1s" repeatCount="indefinite" begin="0.2s" />
        </rect>
        <rect x="882" y="462" width="36" height="36" class="node-violet">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.1s" repeatCount="indefinite" begin="0.5s" />
        </rect>
        <rect x="594" y="374" width="52" height="52" class="node-amber">
          <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.3s" repeatCount="indefinite" begin="0.3s" />
        </rect>
        <rect x="304" y="264" width="32" height="32" class="node-cyan">
          <animate attributeName="opacity" values="0.75;0.35;0.75" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
        </rect>
        <rect x="304" y="504" width="32" height="32" class="node-violet">
          <animate attributeName="opacity" values="0.75;0.35;0.75" dur="1.2s" repeatCount="indefinite" begin="0.1s" />
        </rect>
        <rect x="152" y="382" width="36" height="36" class="node-white">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.4s" repeatCount="indefinite" begin="0.7s" />
        </rect>
      </g>

      <g class="pixel-signals">
        <rect width="14" height="14" class="signal-cyan">
          <animateMotion dur="1.5s" repeatCount="indefinite" calcMode="discrete" path="M1060,400 L900,320" />
        </rect>
        <rect width="14" height="14" class="signal-violet">
          <animateMotion dur="1.5s" repeatCount="indefinite" calcMode="discrete" begin="0.7s" path="M1060,400 L900,480" />
        </rect>
        <rect width="12" height="12" class="signal-amber">
          <animateMotion dur="1.7s" repeatCount="indefinite" calcMode="discrete" path="M900,320 L620,400" />
        </rect>
        <rect width="12" height="12" class="signal-amber">
          <animateMotion dur="1.7s" repeatCount="indefinite" calcMode="discrete" begin="0.8s" path="M900,480 L620,400" />
        </rect>
      </g>

      <defs>
        <pattern id="pixel-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#020617" />
          <rect width="8" height="8" fill="#0b1120" />
          <rect x="8" y="8" width="8" height="8" fill="#0b1120" />
          <rect x="0" y="8" width="8" height="8" fill="#111827" opacity="0.7" />
          <rect x="8" y="0" width="8" height="8" fill="#111827" opacity="0.7" />
        </pattern>
      </defs>
    </svg>
  </div>
</template>

<script setup lang="ts">
// No logic needed, purely presentational
</script>

<style scoped>
.pixel-links line {
  stroke: #334155;
  stroke-width: 4;
  stroke-linecap: square;
  opacity: 0.65;
}

.node-white {
  fill: #e2e8f0;
}

.node-cyan {
  fill: #22d3ee;
}

.node-violet {
  fill: #818cf8;
}

.node-amber {
  fill: #f59e0b;
}

.signal-cyan {
  fill: #22d3ee;
  opacity: 0.9;
}

.signal-violet {
  fill: #818cf8;
  opacity: 0.9;
}

.signal-amber {
  fill: #f59e0b;
  opacity: 0.9;
}

@media (prefers-reduced-motion: reduce) {
  .pixel-signals {
    display: none;
  }
}
</style>


