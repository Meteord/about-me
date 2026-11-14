import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), vueDevTools()],
  base: '/about-me/',
  // Build-time constant: the only time input for the statistics band
  // (src/data/siteStats.ts). Baked in at build, never read in the browser.
  define: {
    __BUILD_YEAR__: new Date().getFullYear(),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // transformers.js imports `onnxruntime-web/webgpu`, which resolves to the
      // webgpu-optimized bundle that omits the int4 WASM kernels (GatherBlockQuantized /
      // MatMulNBits). Route it to the full bundle instead: it registers those kernels
      // AND the WebGPU EP, so vector/chat keep WebGPU while DECIDE runs on WASM q4f16.
      'onnxruntime-web/webgpu': fileURLToPath(
        new URL('./node_modules/onnxruntime-web/dist/ort.bundle.min.mjs', import.meta.url),
      ),
    },
  },
})
