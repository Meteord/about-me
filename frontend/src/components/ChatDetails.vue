<script setup lang="ts">
import { useChatSession } from '../composables/useChatSession'
import ToolSelectorPanel from './ToolSelectorPanel.vue'

const { state, detailsOpen, messages, isGenerating, saveTrace, vector, decide } = useChatSession()

function onToggle(event: Event): void {
  const target = event.currentTarget as HTMLDetailsElement | null
  if (target) detailsOpen.value = target.open
}
</script>

<template>
  <details class="chat-details" :open="detailsOpen" @toggle="onToggle">
    <summary class="chat-details__summary">Technical details</summary>
    <div class="chat-details__body">
      <ToolSelectorPanel />

      <section class="chat-details__models" aria-label="Models and devices">
        <h4 class="chat-details__heading">What is loaded</h4>
        <dl class="chat-details__facts">
          <div>
            <dt>Chat model</dt>
            <dd>LiquidAI/LFM2.5-350M-ONNX · {{ state.dtype || 'q4 / q8' }}</dd>
          </div>
          <div>
            <dt>Chat device</dt>
            <dd>
              {{
                state.device ? (state.device === 'webgpu' ? 'WebGPU' : 'WebAssembly') : 'not loaded'
              }}
            </dd>
          </div>
          <div>
            <dt>Prompt router</dt>
            <dd>
              kucukkanat/LFM2.5-Encoder-350M-Prompt-Router-ONNX · q8 ·
              {{ vector.device === 'webgpu' ? 'WebGPU' : 'WebAssembly' }}
            </dd>
          </div>
          <div>
            <dt>Decide classifier</dt>
            <dd>onnx-community/GLiNER2.5-Decide-mobile-ONNX · q4f16 · WebAssembly</dd>
          </div>
          <div v-if="decide.file || vector.file || state.file">
            <dt>Last file</dt>
            <dd>{{ decide.file || vector.file || state.file }}</dd>
          </div>
        </dl>
        <p class="chat-details__note">
          If a retrieval mode cannot run in this browser, the panel falls back to BM25 keyword
          matching automatically — answers keep working.
        </p>
        <p v-if="state.status === 'error' && state.error" class="chat-details__error">
          <strong>Last model error:</strong> {{ state.error }}
        </p>
      </section>

      <button
        class="pixel-link-btn chat-details__trace"
        type="button"
        :disabled="isGenerating || messages.length === 0"
        @click="saveTrace"
      >
        Save trace
      </button>
    </div>
  </details>
</template>
