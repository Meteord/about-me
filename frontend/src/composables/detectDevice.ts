export type Device = 'webgpu' | 'wasm'

export interface DeviceInfo {
  device: Device
  gpu: boolean
}

export async function detectDevice(): Promise<DeviceInfo> {
  try {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) return { device: 'webgpu', gpu: true }
    }
  } catch {
    // WebGPU present but unavailable — fall through to WASM
  }
  return { device: 'wasm', gpu: false }
}
