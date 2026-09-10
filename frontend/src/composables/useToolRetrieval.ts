import { ref } from 'vue'
import type { Tensor } from '@huggingface/transformers'
import {
  TOOL_SCHEMAS,
  getToolDocs,
  pruneSchemas,
  schemaChars,
  type ToolDoc,
} from '../tools/registry'
import { detectDevice, type Device } from './detectDevice'
import { mode, topK } from './retrievalSettings'

/**
 * Zero-shot prompt router: scores the visitor's text against the tool names in
 * one bidirectional encoder pass. Port of the prompt format, byte-span
 * reconstruction and cosine head from Liquid AI's prompt-routing blueprint
 * (see kucukkanat/lfm-encoders).
 */
const MODEL_ID = 'kucukkanat/LFM2.5-Encoder-350M-Prompt-Router-ONNX'
const HEAD = {
  scale: 1.3714938163757324,
  bias: -0.2723352313041687,
  heading: 'Categories',
}

export type RetrievalMode = 'lexical' | 'vector' | 'hybrid'
export type VectorStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface VectorState {
  status: VectorStatus
  device: Device
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

const lastQuery = ref('')
const lastResult = ref<RetrieveResult | null>(null)
const vectorState = ref<VectorState>({
  status: 'idle',
  device: 'wasm',
  dtype: 'q8',
  progress: 0,
  file: '',
  error: null,
})

/* ------------------------------------------------------------------ */
/* On-device prompt router (lazy singleton)                            */
/* ------------------------------------------------------------------ */

interface TokenizerLike {
  (text: string): { input_ids: Tensor; attention_mask: Tensor }
  tokenize(text: string): string[]
  bos_token_id: number | null
}

interface ModelLike {
  (inputs: { input_ids: Tensor; attention_mask: Tensor }): Promise<{
    token_proj: Tensor
    rule_proj: Tensor
  }>
  dispose?(): Promise<unknown[]>
}

interface RouterModule {
  AutoTokenizer: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<TokenizerLike>
  }
  PreTrainedModel: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<ModelLike>
  }
  env: { allowLocalModels: boolean; useBrowserCache: boolean }
}

interface RouterInstance {
  tokenizer: TokenizerLike
  model: ModelLike
}

let instance: RouterInstance | null = null
let routerLoading: Promise<void> | null = null

function progressCallback(progress: { status?: string; file?: string; progress?: number }): void {
  if (typeof progress.progress === 'number') {
    vectorState.value.progress = Math.round(progress.progress)
  }
  if (progress.file) {
    vectorState.value.file = progress.file
  }
}

/* ------------------------------------------------------------------ */
/* Byte-offset span reconstruction (byte-level BPE; no normalizer)     */
/* ------------------------------------------------------------------ */

interface Span {
  start: number
  end: number
}

function buildByteIndex(text: string): Uint32Array {
  const bytes = new TextEncoder().encode(text).length
  const index = new Uint32Array(bytes + 1)
  let byte = 0
  for (let i = 0; i < text.length; ) {
    const codePoint = text.codePointAt(i) as number
    const width = codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4
    for (let k = 0; k < width; k++) index[byte + k] = i
    byte += width
    i += codePoint >= 0x10000 ? 2 : 1
  }
  index[bytes] = text.length
  return index
}

function tokenizeWithSpans(
  tokenizer: TokenizerLike,
  encoded: { input_ids: Tensor },
  text: string,
): Span[] {
  const ids = Array.from(encoded.input_ids.data as BigInt64Array | Int32Array, Number)
  const pieces = tokenizer.tokenize(text)
  const byteToIndex = buildByteIndex(text)
  let cursor = 0
  const pieceSpans: Span[] = pieces.map((piece) => {
    const start = cursor
    cursor += piece.length
    return { start, end: cursor }
  })
  if (cursor !== byteToIndex.length - 1) {
    throw new Error('Token/text byte mismatch — tokenizer is not byte-level BPE.')
  }
  let spans = pieceSpans.map((span) => ({
    start: byteToIndex[span.start] || 0,
    end: byteToIndex[span.end] || 0,
  }))
  if (ids.length === spans.length + 1 && ids[0] === tokenizer.bos_token_id) {
    spans = [{ start: 0, end: 0 }, ...spans]
  } else if (ids.length !== spans.length) {
    throw new Error('Cannot align token ids to character spans.')
  }
  return spans
}

function tokensIn(spans: readonly Span[], span: Span): number[] {
  const hits: number[] = []
  for (let i = 0; i < spans.length; i++) {
    const token = spans[i]
    if (token.start < span.end && token.end > span.start && token.start !== token.end) {
      hits.push(i)
    }
  }
  return hits
}

/* ------------------------------------------------------------------ */
/* Two-tower pooling                                                   */
/* ------------------------------------------------------------------ */

function meanRows(matrix: Tensor, indices: readonly number[]): Float32Array {
  const cols = matrix.dims[2]
  const data = matrix.data as Float32Array
  const out = new Float32Array(cols)
  for (const index of indices) {
    const row = index * cols
    for (let c = 0; c < cols; c++) out[c] += data[row + c]
  }
  if (indices.length > 0) {
    for (let c = 0; c < cols; c++) out[c] /= indices.length
  }
  return out
}

function normalizeVector(vector: Float32Array): Float32Array {
  let sum = 0
  for (const value of vector) sum += value * value
  const scale = 1 / Math.max(Math.sqrt(sum), 1e-12)
  const out = new Float32Array(vector.length)
  for (let i = 0; i < vector.length; i++) out[i] = vector[i] * scale
  return out
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

function buildPrefix(labels: readonly string[]): string {
  const body = labels.map((label) => `- ${label}`).join('\n')
  return `${HEAD.heading}:\n${body}\n\nText:\n`
}

/** Character span of each label inside `buildPrefix(labels)`. */
function labelRanges(labels: readonly string[]): Span[] {
  const ranges: Span[] = []
  let position = `${HEAD.heading}:\n`.length
  for (const label of labels) {
    const start = position + 2
    const end = start + label.length
    ranges.push({ start, end })
    position = end + 1
  }
  return ranges
}

/** One pass scores the text against every label (cosine x scale + bias). */
export function routerLogitsFromPass(
  pass: { tokenProj: Tensor; ruleProj: Tensor; spans: readonly Span[] },
  text: string,
  prefix: string,
  labels: readonly string[],
): number[] {
  const textSpan: Span = { start: prefix.length, end: prefix.length + text.length }
  const query = normalizeVector(meanRows(pass.tokenProj, tokensIn(pass.spans, textSpan)))
  return labelRanges(labels).map((span) => {
    const vector = normalizeVector(meanRows(pass.ruleProj, tokensIn(pass.spans, span)))
    return dot(vector, query) * HEAD.scale + HEAD.bias
  })
}

function softmax(logits: readonly number[]): number[] {
  const max = Math.max(...logits)
  const exponentials = logits.map((value) => Math.exp(value - max))
  const total = exponentials.reduce((a, b) => a + b, 0)
  return exponentials.map((value) => value / total)
}

/** Router over the tool docs: one forward pass, softmax across all tools. */
async function vectorScores(query: string, docs: ToolDoc[]): Promise<number[]> {
  if (!instance) throw new Error('Router not loaded.')
  const labels = docs.map((doc) => doc.name.replace(/_/g, ' '))
  const prefix = buildPrefix(labels)
  const full = prefix + query
  const encoded = instance.tokenizer(full)
  const spans = tokenizeWithSpans(instance.tokenizer, encoded, full)
  const out = await instance.model({
    input_ids: encoded.input_ids,
    attention_mask: encoded.attention_mask,
  })
  return softmax(
    routerLogitsFromPass(
      { tokenProj: out.token_proj, ruleProj: out.rule_proj, spans },
      query,
      prefix,
      labels,
    ),
  )
}

/* ------------------------------------------------------------------ */
/* Encoder lifecycle                                                   */
/* ------------------------------------------------------------------ */

async function loadRouterInner(): Promise<void> {
  if (instance) return

  vectorState.value.status = 'loading'
  vectorState.value.progress = 0
  vectorState.value.file = ''
  vectorState.value.error = null

  try {
    const mod = (await import('@huggingface/transformers')) as unknown as RouterModule
    mod.env.allowLocalModels = false
    mod.env.useBrowserCache = true

    let tokenizer: TokenizerLike
    let model: ModelLike
    let device: Device = 'wasm'
    try {
      if ((await detectDevice()).device === 'webgpu') {
        tokenizer = await mod.AutoTokenizer.from_pretrained(MODEL_ID, {
          progress_callback: progressCallback,
        })
        model = await mod.PreTrainedModel.from_pretrained(MODEL_ID, {
          device: 'webgpu',
          dtype: 'q8',
          progress_callback: progressCallback,
        })
        device = 'webgpu'
      } else {
        throw new Error('no webgpu')
      }
    } catch {
      device = 'wasm'
      tokenizer = await mod.AutoTokenizer.from_pretrained(MODEL_ID, {
        progress_callback: progressCallback,
      })
      model = await mod.PreTrainedModel.from_pretrained(MODEL_ID, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: progressCallback,
      })
    }
    instance = { tokenizer, model }
    vectorState.value.device = device
    vectorState.value.dtype = 'q8'

    vectorState.value.status = 'ready'
    vectorState.value.progress = 100
  } catch (error) {
    vectorState.value.status = 'error'
    vectorState.value.error = error instanceof Error ? error.message : String(error)
    throw error
  }
}

export function loadVector(): Promise<void> {
  if (!routerLoading) {
    routerLoading = loadRouterInner().catch((error: unknown) => {
      routerLoading = null
      throw error
    })
  }
  return routerLoading
}

export function disposeVector(): void {
  try {
    void instance?.model.dispose?.()
  } catch {
    // ignore dispose errors
  }
  instance = null
  routerLoading = null
  vectorState.value.status = 'idle'
  vectorState.value.device = 'wasm'
  vectorState.value.dtype = 'q8'
  vectorState.value.progress = 0
  vectorState.value.file = ''
  vectorState.value.error = null
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
/* Hybrid fusion (Reciprocal Rank Fusion)                              */
/* ------------------------------------------------------------------ */

const RRF_K = 60

function hybridScores(lexical: number[], vector: number[]): number[] {
  const rankOf = (scores: number[]): number[] => {
    const order = scores.map((score, index) => [score, index] as const)
    order.sort((a, b) => b[0] - a[0])
    const ranks = Array.from({ length: scores.length }, () => 0)
    order.forEach(([, index], rank) => {
      ranks[index] = rank
    })
    return ranks
  }
  const lexRanks = rankOf(lexical)
  const vectorRanks = rankOf(vector)
  const fused = lexical.map(
    (_, index) => 1 / (RRF_K + lexRanks[index] + 1) + 1 / (RRF_K + vectorRanks[index] + 1),
  )
  const max = Math.max(...fused, 1e-9)
  return fused.map((score) => score / max)
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

  const vectorReady = vectorState.value.status === 'ready'
  const needsVector = selectedMode === 'vector' || selectedMode === 'hybrid'
  let effective = needsVector && !vectorReady ? 'lexical' : selectedMode

  let scores: number[]
  try {
    if (selectedMode === 'lexical' || !vectorReady) {
      scores = lexicalScores(query, docs)
    } else if (selectedMode === 'vector') {
      scores = await vectorScores(query, docs)
    } else {
      scores = hybridScores(lexicalScores(query, docs), await vectorScores(query, docs))
    }
  } catch {
    scores = lexicalScores(query, docs)
    effective = 'lexical'
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
      effective: effective as RetrievalMode,
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
    vector: vectorState,
    retrieve,
    loadVector,
    disposeVector,
  }
}
