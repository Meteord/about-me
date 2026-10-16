export interface TransformersEnv {
  allowLocalModels: boolean
  useBrowserCache: boolean
  backends?: {
    onnx?: {
      wasm?: { wasmPaths?: { mjs: string; wasm: string } }
      versions?: { web?: string }
    }
  }
}

/** transformers.js points its WASM binary at the non-JSEP/asyncify factory on
    jsdelivr, which the full onnxruntime bundle (vite alias) cannot dispatch
    int4 kernels against. Route it to the JSEP factory on the same CDN, before
    any wasm session. Every transformers.js loader (chat, vector, decide) must
    call this right after importing the module — the module-level env is shared
    and only configured while `wasmPaths` is still unset. */
export function useJsepWasm(env: TransformersEnv): void {
  const onnx = env.backends?.onnx
  const version = onnx?.versions?.web
  if (!version || !onnx?.wasm) return
  const prefix = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`
  onnx.wasm.wasmPaths = {
    mjs: `${prefix}ort-wasm-simd-threaded.jsep.mjs`,
    wasm: `${prefix}ort-wasm-simd-threaded.jsep.wasm`,
  }
}
