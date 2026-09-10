import { ref } from 'vue'
import type { Tensor } from '@huggingface/transformers'
import {
  TOOL_SCHEMAS,
  getToolDocs,
  pruneSchemas,
  schemaChars,
  type ToolDoc,
} from '../tools/registry'

const MODEL_ID = 'kucukkanat/LFM2.5-Encoder-350M-ONNX'

export type RetrievalMode = 'lexical' | 'neural' | 'hybrid'
export type NeuralStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface NeuralState {
  status: NeuralStatus
  device: string
  dtype: string
  progress: number
  file: string
  error: string | null
}

export interface ToolScore {
  name: string
  score: number
  rank: number
  selected: boolean
}

export interface RetrievalStats {
  total: number
  selected: number
  mode: RetrievalMode
  effective: RetrievalMode
  totalChars: number
  prunedChars: number
  latencyMs: number
}

export interface RetrieveResult {
  rows: ToolScore[]
  selectedNames: string[]
  stats: RetrievalStats
}

const mode = ref<RetrievalMode>('hybrid')
const topK = ref(5)
const lastQuery = ref('')
const lastResult = ref<RetrieveResult | null>(null)
const neuralState = ref<NeuralState>({
  status: 'idle',
  device: 'wasm',
  dtype: 'q8',
  progress: 0,
  file: '',
  error: null,
})

/* ------------------------------------------------------------------ */
/* On-device LFM2.5 encoder (lazy singleton)                           */
/* ------------------------------------------------------------------ */

interface TokenizerLike {
  (text: string): { input_ids: Tensor }
}

interface ModelLike {
  (inputs: { input_ids: Tensor; attention_mask: Tensor }): Promise<{ last_hidden_state: Tensor }>
  dispose?(): Promise<unknown[]>
}

type TensorCtor = new (type: string, data: ArrayBufferView, dims: number[]) => Tensor

interface EncoderModule {
  AutoTokenizer: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<TokenizerLike>
  }
  PreTrainedModel: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<ModelLike>
  }
  Tensor: TensorCtor
  env: { allowLocalModels: boolean; useBrowserCache: boolean }
}

interface EncoderInstance {
  tokenizer: TokenizerLike
  model: ModelLike
  tensor: TensorCtor
}

let instance: EncoderInstance | null = null
let encoderLoading: Promise<void> | null = null
let docEmbeddings: Float32Array[] | null = null

function progressCallback(progress: { status?: string; file?: string; progress?: number }): void {
  if (typeof progress.progress === 'number') {
    neuralState.value.progress = Math.round(progress.progress)
  }
  if (progress.file) {
    neuralState.value.file = progress.file
  }
}

function normalize(vector: Float32Array): Float32Array {
  let norm = 0
  for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i]
  norm = Math.sqrt(norm) || 1
  const out = new Float32Array(vector.length)
  for (let i = 0; i < vector.length; i++) out[i] = vector[i] / norm
  return out
}

async function encodeText(text: string): Promise<Float32Array> {
  if (!instance) throw new Error('Encoder not loaded.')
  const { input_ids } = instance.tokenizer(text)
  const seqLen = input_ids.dims[1]
  const attentionMask = new instance.tensor('int64', new BigInt64Array(seqLen).fill(1n), [
    1,
    seqLen,
  ])
  const out = await instance.model({ input_ids, attention_mask: attentionMask })
  const hidden = out.last_hidden_state
  const data = hidden.data as Float32Array
  const hiddenSize = hidden.dims[2]
  const pooled = new Float32Array(hiddenSize)
  for (let i = 0; i < seqLen; i++) {
    const offset = i * hiddenSize
    for (let j = 0; j < hiddenSize; j++) pooled[j] += data[offset + j]
  }
  for (let j = 0; j < hiddenSize; j++) pooled[j] /= seqLen
  return normalize(pooled)
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

async function loadNeuralInner(): Promise<void> {
  if (instance) return

  neuralState.value.status = 'loading'
  neuralState.value.progress = 0
  neuralState.value.file = ''
  neuralState.value.error = null

  try {
    const mod = (await import('@huggingface/transformers')) as unknown as EncoderModule
    mod.env.allowLocalModels = false
    mod.env.useBrowserCache = true

    const tokenizer = await mod.AutoTokenizer.from_pretrained(MODEL_ID, {
      progress_callback: progressCallback,
    })
    const model = await mod.PreTrainedModel.from_pretrained(MODEL_ID, {
      dtype: 'q8',
      progress_callback: progressCallback,
    })
    instance = { tokenizer, model, tensor: mod.Tensor }

    const docs = getToolDocs()
    docEmbeddings = []
    for (const doc of docs) {
      docEmbeddings.push(await encodeText(doc.text))
    }

    neuralState.value.status = 'ready'
    neuralState.value.progress = 100
  } catch (error) {
    neuralState.value.status = 'error'
    neuralState.value.error = error instanceof Error ? error.message : String(error)
    throw error
  }
}

export function loadNeural(): Promise<void> {
  if (!encoderLoading) {
    encoderLoading = loadNeuralInner().catch((error: unknown) => {
      encoderLoading = null
      throw error
    })
  }
  return encoderLoading
}

export function disposeNeural(): void {
  try {
    void instance?.model.dispose?.()
  } catch {
    // ignore dispose errors
  }
  instance = null
  encoderLoading = null
  docEmbeddings = null
  neuralState.value.status = 'idle'
  neuralState.value.progress = 0
  neuralState.value.file = ''
  neuralState.value.error = null
}

/* ------------------------------------------------------------------ */
/* Lexical retriever (BM25, instant, always available)                 */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'to',
  'of',
  'in',
  'on',
  'for',
  'and',
  'or',
  'is',
  'are',
  'what',
  'how',
  'can',
  'you',
  'with',
  'about',
  'this',
  'from',
  'which',
  'it',
  'be',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

function lexicalScores(query: string, docs: ToolDoc[]): number[] {
  const terms = tokenize(query)
  const docTokens = docs.map((doc) => tokenize(doc.text))
  const docFreq: Record<string, number> = {}
  for (const tokens of docTokens) {
    for (const term of new Set(tokens)) docFreq[term] = (docFreq[term] ?? 0) + 1
  }
  const avgLen =
    docTokens.reduce((sum, tokens) => sum + tokens.length, 0) / Math.max(docs.length, 1)
  const k1 = 1.2
  const b = 0.75

  return docTokens.map((tokens) => {
    const tf: Record<string, number> = {}
    for (const term of tokens) tf[term] = (tf[term] ?? 0) + 1
    let score = 0
    for (const term of terms) {
      const frequency = tf[term] ?? 0
      if (!frequency) continue
      const df = docFreq[term] ?? 1
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5))
      const denominator = frequency + k1 * (1 - b + (b * tokens.length) / Math.max(avgLen, 1))
      score += idf * ((frequency * (k1 + 1)) / denominator)
    }
    return score
  })
}

/* ------------------------------------------------------------------ */
/* Neural retriever (LFM2.5 encoder, cosine over mean-pooled vectors)  */
/* ------------------------------------------------------------------ */

async function neuralScores(query: string): Promise<number[]> {
  if (!instance || !docEmbeddings) {
    await loadNeural()
  }
  if (!instance || !docEmbeddings) {
    throw new Error('Neural retriever unavailable.')
  }
  const queryEmbedding = await encodeText(query)
  return docEmbeddings.map((embedding) => dot(queryEmbedding, embedding))
}

function hybridScores(lexical: number[], neural: number[]): number[] {
  const maxLexical = Math.max(...lexical, 1e-9)
  const maxNeural = Math.max(...neural, 1e-9)
  return lexical.map(
    (score, index) => 0.5 * (score / maxLexical) + 0.5 * (neural[index] / maxNeural),
  )
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function retrieve(
  query: string,
  opts?: { topK?: number; mode?: RetrievalMode },
): Promise<RetrieveResult> {
  const selectedMode = opts?.mode ?? mode.value
  const k = opts?.topK ?? topK.value
  const start = performance.now()
  const docs = getToolDocs()
  const totalChars = schemaChars(TOOL_SCHEMAS)

  if (!query.trim()) {
    return {
      rows: [],
      selectedNames: [],
      stats: {
        total: docs.length,
        selected: 0,
        mode: selectedMode,
        effective: 'lexical',
        totalChars,
        prunedChars: 0,
        latencyMs: 0,
      },
    }
  }

  const neuralReady = neuralState.value.status === 'ready'
  const needsNeural = selectedMode === 'neural' || selectedMode === 'hybrid'
  const effective = needsNeural && !neuralReady ? 'lexical' : selectedMode

  let scores: number[]
  if (selectedMode === 'lexical' || !neuralReady) {
    scores = lexicalScores(query, docs)
  } else if (selectedMode === 'neural') {
    scores = await neuralScores(query)
  } else {
    scores = hybridScores(lexicalScores(query, docs), await neuralScores(query))
  }

  const order = scores.map((_, index) => index).sort((a, b) => scores[b] - scores[a])
  const maxScore = Math.max(...scores, 1e-9)

  const rows = order.map((index, rank) => {
    const score = scores[index] / maxScore
    return {
      name: docs[index].name,
      score,
      rank,
      selected: rank < k && score > 0,
    }
  })

  const selectedNames = rows.filter((row) => row.selected).map((row) => row.name)
  const prunedChars = totalChars - schemaChars(pruneSchemas(selectedNames))

  lastQuery.value = query
  lastResult.value = {
    rows,
    selectedNames,
    stats: {
      total: docs.length,
      selected: selectedNames.length,
      mode: selectedMode,
      effective,
      totalChars,
      prunedChars,
      latencyMs: Math.round(performance.now() - start),
    },
  }
  return lastResult.value
}

export function useToolRetrieval() {
  return {
    mode,
    topK,
    lastQuery,
    lastResult,
    neural: neuralState,
    retrieve,
    loadNeural,
    disposeNeural,
  }
}
