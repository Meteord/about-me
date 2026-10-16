import { ref } from 'vue'
import type { Tensor } from '@huggingface/transformers'
import { detectDevice } from './detectDevice'
import { useJsepWasm, type TransformersEnv } from './useJsepWasm'
import { sampling } from './retrievalSettings'

const MODEL_ID = 'LiquidAI/LFM2.5-350M-ONNX'

export class CancelledError extends Error {
  constructor() {
    super('Generation cancelled')
    this.name = 'CancelledError'
  }
}

let cancelled = false

function cancelGeneration(): void {
  cancelled = true
}

function resetCancel(): void {
  cancelled = false
}

export type ModelDevice = 'webgpu' | 'wasm'
export type ModelStatus = 'idle' | 'checking' | 'loading' | 'ready' | 'error'

export const MODEL_STATUS_LABEL: Record<ModelStatus, string> = {
  idle: 'OFF',
  checking: 'PREPARING',
  loading: 'DOWNLOADING',
  ready: 'READY',
  error: 'FAILED',
}

export function humanizeModelError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('abort')) {
    return 'The model download failed — check your connection and try again.'
  }
  if (lower.includes('webgpu') || lower.includes('gpu') || lower.includes('device')) {
    return 'The browser could not start the model engine — reload the page to retry, or use a browser where WebGPU works.'
  }
  return 'Mini-Michi could not start — please try again.'
}

export interface ChatModelState {
  status: ModelStatus
  device: ModelDevice | null
  dtype: string
  progress: number
  file: string
  error: string | null
}

interface TokenizerLike {
  apply_chat_template(
    messages: { role: string; content: string }[],
    options: {
      add_generation_prompt?: boolean
      return_dict?: boolean
    },
  ): { input_ids: Tensor; attention_mask: Tensor }
  batch_decode(batch: Tensor | number[][], args: { skip_special_tokens?: boolean }): string[]
}

interface ModelLike {
  generate(options: Record<string, unknown>): Promise<unknown>
  dispose?(): Promise<unknown[]>
}

interface TransformerModule {
  AutoModelForCausalLM: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<ModelLike>
  }
  AutoTokenizer: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<TokenizerLike>
  }
  TextStreamer: new (tokenizer: TokenizerLike, options: Record<string, unknown>) => unknown
  env: { allowLocalModels: boolean; useBrowserCache: boolean }
}

interface ModelInstance {
  tokenizer: TokenizerLike
  model: ModelLike
  module: TransformerModule
}

const state = ref<ChatModelState>({
  status: 'idle',
  device: null,
  dtype: '',
  progress: 0,
  file: '',
  error: null,
})

let instance: ModelInstance | null = null
let tokenizerPromise: Promise<void> | null = null

function progressCallback(progress: { status?: string; file?: string; progress?: number }): void {
  if (typeof progress.progress === 'number') {
    state.value.progress = Math.round(progress.progress)
  }
  if (progress.file) {
    state.value.file = progress.file
  }
}

async function detectChatDevice(): Promise<ModelDevice> {
  const { gpu } = await detectDevice()
  return gpu ? 'webgpu' : 'wasm'
}

async function loadTransformers(): Promise<TransformerModule> {
  const mod = await import('@huggingface/transformers')
  mod.env.allowLocalModels = false
  mod.env.useBrowserCache = true
  // The vite alias routes transformers' ORT import to the full bundle, whose
  // int4 kernels only dispatch against the JSEP wasm factory — point the wasm
  // binary there before any session (chat, vector or decide) is created.
  useJsepWasm(mod.env as unknown as TransformersEnv)
  return mod as unknown as TransformerModule
}

/** One download + session-creation attempt; enables the state machine's
    `loading` UI and reports the device only once it actually succeeds. */
async function attemptLoad(
  module: TransformerModule,
  engine: { device: ModelDevice; dtype: 'q4' | 'q8' },
): Promise<void> {
  state.value.status = 'loading'
  state.value.progress = 0
  state.value.file = ''
  state.value.dtype = engine.dtype

  const tokenizer = await module.AutoTokenizer.from_pretrained(MODEL_ID, {
    progress_callback: progressCallback,
  })
  const model = await module.AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    ...engine,
    progress_callback: progressCallback,
  })

  instance = { tokenizer, model, module }
  state.value.device = engine.device
}

async function loadModelInner(): Promise<void> {
  if (instance) return

  state.value.status = 'checking'
  state.value.progress = 0
  state.value.file = ''
  state.value.error = null

  try {
    const module = await loadTransformers()
    const device = await detectChatDevice()

    if (device === 'webgpu') {
      try {
        await attemptLoad(module, { device: 'webgpu', dtype: 'q4' })
      } catch {
        // Fall through to the WASM engine below. transformers.js chains session
        // creations through a module promise that is never reset after a
        // rejection, so this fallback only completes when the WebGPU attempt
        // failed before any session was created (e.g. a failed q4 download) —
        // otherwise the page needs a reload, whose detection then picks WASM.
        instance = null
      }
    }
    if (!instance) {
      await attemptLoad(module, { device: 'wasm', dtype: 'q8' })
    }

    state.value.status = 'ready'
    state.value.progress = 100
  } catch (error) {
    instance = null
    state.value.status = 'error'
    state.value.error = error instanceof Error ? error.message : String(error)
    throw error
  }
}

export function useChatModel() {
  async function loadModel(): Promise<void> {
    if (!tokenizerPromise) {
      tokenizerPromise = loadModelInner().catch((error: unknown) => {
        tokenizerPromise = null
        throw error
      })
    }
    await tokenizerPromise
  }

  async function generate(
    messages: { role: string; content: string }[],
    onToken: (token: string) => void,
  ): Promise<string> {
    if (!instance) {
      await loadModel()
    }
    if (!instance) {
      throw new Error('Model not loaded.')
    }

    const { tokenizer, model, module } = instance

    const inputs = tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      return_dict: true,
    })

    const streamer = new module.TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        if (cancelled) throw new CancelledError()
        onToken(text)
      },
    })

    const output = (await model.generate({
      ...inputs,
      max_new_tokens: 256,
      do_sample: sampling.value,
      temperature: 0.8,
      top_p: 0.9,
      repetition_penalty: 1.15,
      streamer,
    })) as Tensor

    const inputLength = inputs.input_ids.dims.at(-1) ?? 0
    const sequenceLength = output.dims[1] ?? inputLength
    const generated = output.slice([0, 1], [inputLength, sequenceLength])
    const decoded = tokenizer.batch_decode(generated, { skip_special_tokens: false })
    return decoded[0] ?? ''
  }

  function dispose(): void {
    try {
      void instance?.model.dispose?.()
    } catch {
      // ignore dispose errors
    }
    instance = null
    tokenizerPromise = null
    state.value.status = 'idle'
    state.value.progress = 0
    state.value.file = ''
    state.value.error = null
  }

  return { state, loadModel, generate, dispose, cancel: cancelGeneration, resetCancel }
}
