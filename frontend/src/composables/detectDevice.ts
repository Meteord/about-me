export type Device = 'webgpu' | 'wasm'

export interface DeviceInfo {
  device: Device
  gpu: boolean
}

/**
 * Probe WebGPU the way ORT's WebGPU backend actually does when it creates a
 * session (`WebGpuBackend.initialize` in onnxruntime-web): request the adapter
 * with transformers.js' pinned `powerPreference: 'high-performance'`, then
 * build a device from that adapter. A plain `navigator.gpu.requestAdapter()`
 * succeeding says nothing about that init — a browser (notably Firefox with
 * WebGPU enabled) can hand out a default adapter and still return null or fail
 * at `requestDevice` under ORT's exact call shape. If that happened, the
 * doomed session creation would run anyway and — via transformers.js'
 * `webInitChain`, which is never reset after a rejection — permanently break
 * every later model load (chat, vector, decide) for the page lifetime. So the
 * webgpu/wasm verdict must be made here, before any session exists.
 */
export async function detectDevice(): Promise<DeviceInfo> {
  try {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      // Mirrors ORT's adapter request: transformers.js sets
      // `env.webgpu.powerPreference = 'high-performance'`, so this is the
      // exact call a WebGPU session will make.
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
      if (adapter) {
        // Mirrors ORT's device setup: it requires only limits/features the
        // adapter itself reports, so a plain requestDevice proves the browser
        // completes the whole JSEP init. The throwaway device is released as
        // soon as it is garbage-collected; every session makes its own.
        await adapter.requestDevice()
        return { device: 'webgpu', gpu: true }
      }
    }
  } catch {
    // WebGPU present but unusable — fall through to WASM
  }
  return { device: 'wasm', gpu: false }
}
