import { ref } from 'vue'
import type { Tensor } from '@huggingface/transformers'
import type { ToolSchema } from '../tools/registry'

const MODEL_ID = 'LiquidAI/LFM2.5-350M-ONNX'

export type ModelDevice = 'webgpu' | 'wasm'
export type ModelStatus = 'idle' | 'checking' | 'loading' | 'ready' | 'error'

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
      tools?: ToolSchema[]
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

async function detectDevice(): Promise<{ device: ModelDevice; dtype: 'q4' | 'q8' }> {
  try {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) {
        return { device: 'webgpu', dtype: 'q4' }
      }
    }
  } catch {
    // WebGPU present but unavailable — fall through to WASM
  }
  return { device: 'wasm', dtype: 'q8' }
}

async function loadTransformers(): Promise<TransformerModule> {
  const mod = await import('@huggingface/transformers')
  mod.env.allowLocalModels = false
  mod.env.useBrowserCache = true
  return mod as unknown as TransformerModule
}

async function loadModelInner(): Promise<void> {
  if (instance) return

  state.value.status = 'checking'
  state.value.progress = 0
  state.value.file = ''
  state.value.error = null

  try {
    const module = await loadTransformers()
    const { device, dtype } = await detectDevice()
    state.value.device = device
    state.value.dtype = dtype

    state.value.status = 'loading'
    const tokenizer = await module.AutoTokenizer.from_pretrained(MODEL_ID, {
      progress_callback: progressCallback,
    })
    const model = await module.AutoModelForCausalLM.from_pretrained(MODEL_ID, {
      device,
      dtype,
      progress_callback: progressCallback,
    })

    instance = { tokenizer, model, module }
    state.value.status = 'ready'
    state.value.progress = 100
  } catch (error) {
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
    tools: ToolSchema[],
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
      tools,
      add_generation_prompt: true,
      return_dict: true,
    })

    const streamer = new module.TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: onToken,
    })

    const output = (await model.generate({
      ...inputs,
      max_new_tokens: 256,
      do_sample: false,
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

  return { state, loadModel, generate, dispose }
}
