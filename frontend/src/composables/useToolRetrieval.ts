import { ref } from 'vue'
import type { Tensor } from '@huggingface/transformers'
import {
  SOURCE_DEFS,
  getSourceDocs,
  filterSources,
  sourceChars,
  type SourceDoc,
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

/**
 * Decision classifier (GLiNER2.5-Decide, DeBERTa-v3-large): decides which
 * content source a query is about. Port of the GLiNER2 classification
 * processor (contract specs/003-gliner-decide-retrieval/contracts/decide-mode.md).
 */
const DECIDE_MODEL_ID = 'onnx-community/GLiNER2.5-Decide-mobile-ONNX'
const DECIDE_PROMPT = 'Which content source answers this question?'
/** GLiNER2 special-token ids, fixed in the export's vocab (contract table). */
const DECIDE_TOKEN_IDS = {
  SEP_STRUCT: 128001,
  SEP_TEXT: 128002,
  P: 128003,
  C: 128004,
  E: 128005,
  R: 128006,
  L: 128007,
  EXAMPLE: 128008,
  OUTPUT: 128009,
  DESCRIPTION: 128010,
} as const
/** 1024-token context; DeBERTa-v3 uses relative positions only, so the
    export's max_len: 512 is not a hard limit. The state is cut from the end. */
const DECIDE_MAX_LENGTH = 1024
const DECIDE_MAX_STATE_TOKENS = 896

export type RetrievalMode = 'lexical' | 'vector' | 'hybrid' | 'decide'
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
const decideState = ref<VectorState>({
  status: 'idle',
  device: 'wasm',
  dtype: 'q4f16',
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

interface TransformersEnv {
  allowLocalModels: boolean
  useBrowserCache: boolean
  backends?: {
    onnx?: {
      wasm?: { wasmPaths?: { mjs: string; wasm: string } }
      versions?: { web?: string }
    }
  }
}

/** transformers.js points its WASM binary at the non-JSEP factory on jsdelivr,
    which the full onnxruntime bundle (vite alias) cannot dispatch int4 kernels
    against. Route it to the JSEP factory on the same CDN, before any wasm session. */
function useJsepWasm(env: TransformersEnv): void {
  const onnx = env.backends?.onnx
  const version = onnx?.versions?.web
  if (!version || !onnx?.wasm) return
  const prefix = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`
  onnx.wasm.wasmPaths = {
    mjs: `${prefix}ort-wasm-simd-threaded.jsep.mjs`,
    wasm: `${prefix}ort-wasm-simd-threaded.jsep.wasm`,
  }
}

interface RouterModule {
  AutoTokenizer: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<TokenizerLike>
  }
  PreTrainedModel: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<ModelLike>
  }
  env: TransformersEnv
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

/** Router over the source docs: one forward pass, softmax across all candidates. */
async function vectorScores(query: string, docs: SourceDoc[]): Promise<number[]> {
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
    useJsepWasm(mod.env)

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
/* GLiNER2.5-Decide decision classifier (lazy singleton)               */
/* ------------------------------------------------------------------ */

interface DecideTokenizerLike {
  (
    text: string,
    options?: { add_special_tokens?: boolean },
  ): {
    input_ids: Tensor
    attention_mask: Tensor
  }
}

interface DecideModelLike {
  (inputs: {
    input_ids: Tensor
    attention_mask: Tensor
    marker_positions: Tensor
  }): Promise<{ logits: Tensor }>
  dispose?(): Promise<unknown[]>
}

interface DecideModule {
  AutoTokenizer: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<DecideTokenizerLike>
  }
  PreTrainedModel: {
    from_pretrained(modelId: string, options: Record<string, unknown>): Promise<DecideModelLike>
  }
  env: TransformersEnv
  Tensor: new (type: string, data: unknown, dims: number[]) => Tensor
}

interface DecideInstance {
  tokenizer: DecideTokenizerLike
  model: DecideModelLike
}

type TensorCtor = DecideModule['Tensor']

let decideInstance: DecideInstance | null = null
let decideLoading: Promise<void> | null = null
let decideTensor: TensorCtor | null = null

function decideProgress(progress: { status?: string; file?: string; progress?: number }): void {
  if (typeof progress.progress === 'number') {
    decideState.value.progress = Math.round(progress.progress)
  }
  if (progress.file) {
    decideState.value.file = progress.file
  }
}

/* ------------------------------------------------------------------ */
/* GLiNER2 processor port (contract decide-mode.md)                    */
/* ------------------------------------------------------------------ */

/** Word splitter of the GLiNER2 processor (`WhitespaceTokenSplitter`),
    with `\w` widened to Unicode letters, marks and digits. */
const GLINER2_WORD_PATTERN =
  /(?:https?:\/\/[^\s]+|www\.[^\s]+)|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|@[a-z0-9_]+|[\p{L}\p{M}\p{N}_]+(?:[-_][\p{L}\p{M}\p{N}_]+)*|\S/giu

function splitStateWords(state: string): string[] {
  let text = state.trim()
  text = text === '' ? '.' : /[.!?]$/.test(text) ? text : `${text}.`
  return text.match(GLINER2_WORD_PATTERN) ?? []
}

/**
 * Build the decide prompt tensors: `( [P] prompt ( [L] label_1 [L] label_2 … ) )
 * [SEP_TEXT] state`. Prompt and labels keep their case and are tokenized as
 * whole strings; the state is lowercased, word-split and tokenized one word at
 * a time (no special tokens, no [CLS]/[SEP]); `(` / `)` are standalone words;
 * marker_positions is the index of every [L] token. The state is truncated
 * from the end to fit `maxLength − schema`.
 */
function buildDecidePrompt(
  tokenizer: DecideTokenizerLike,
  TensorCtor: TensorCtor,
  query: string,
  labels: readonly string[],
): { input_ids: Tensor; attention_mask: Tensor; marker_positions: Tensor } {
  const encodeText = (text: string): number[] => {
    const encoded = tokenizer(text, { add_special_tokens: false })
    return Array.from(encoded.input_ids.data as BigInt64Array | Int32Array, Number)
  }

  const inputIds: number[] = []
  const markerPositions: number[] = []

  inputIds.push(...encodeText('('), DECIDE_TOKEN_IDS.P)
  inputIds.push(...encodeText(DECIDE_PROMPT))
  inputIds.push(...encodeText('('))
  for (const label of labels) {
    markerPositions.push(inputIds.length)
    inputIds.push(DECIDE_TOKEN_IDS.L, ...encodeText(label))
  }
  inputIds.push(...encodeText(')'), ...encodeText(')'))
  inputIds.push(DECIDE_TOKEN_IDS.SEP_TEXT)

  if (markerPositions.length !== labels.length) {
    throw new Error('Decide prompt marker/label count mismatch.')
  }

  const stateBudget = Math.min(DECIDE_MAX_STATE_TOKENS, DECIDE_MAX_LENGTH - inputIds.length)
  const stateIds: number[] = []
  for (const word of splitStateWords(query)) {
    stateIds.push(...encodeText(word.toLowerCase()))
  }
  inputIds.push(...stateIds.slice(0, Math.max(stateBudget, 0)))

  const dims = [1, inputIds.length] as const
  return {
    input_ids: new TensorCtor('int64', inputIds, [...dims]),
    attention_mask: new TensorCtor(
      'int64',
      Array.from({ length: inputIds.length }, () => 1),
      [...dims],
    ),
    marker_positions: new TensorCtor('int64', markerPositions, [1, markerPositions.length]),
  }
}

/** One forward pass; softmax over the per-marker logits, normalized to a top
    score of 1.0 (matching the other modes' display contract). */
async function decideScores(query: string, docs: SourceDoc[]): Promise<number[]> {
  if (!decideInstance || !decideTensor) throw new Error('Decide model not loaded.')
  const labels = docs.map((doc) => doc.name)
  const prompt = buildDecidePrompt(decideInstance.tokenizer, decideTensor, query, labels)
  const out = await decideInstance.model({
    input_ids: prompt.input_ids,
    attention_mask: prompt.attention_mask,
    marker_positions: prompt.marker_positions,
  })
  const logits = Array.from(out.logits.data as Float32Array | BigInt64Array, Number)
  const probabilities = softmax(logits)
  const max = Math.max(...probabilities, 1e-9)
  return probabilities.map((probability) => probability / max)
}

/* ------------------------------------------------------------------ */
/* Decide lifecycle                                                    */
/* ------------------------------------------------------------------ */

async function loadDecideInner(): Promise<void> {
  if (decideInstance) return

  decideState.value.status = 'loading'
  decideState.value.progress = 0
  decideState.value.file = ''
  decideState.value.error = null

  try {
    const mod = (await import('@huggingface/transformers')) as unknown as DecideModule
    mod.env.allowLocalModels = false
    mod.env.useBrowserCache = true
    useJsepWasm(mod.env)

    // This repo only ships `model_q4f16.onnx`, and ORT's WebGPU EP has no
    // GatherBlockQuantized kernel, so a WebGPU attempt is guaranteed to fail.
    // transformers.js chains every browser session creation through a module
    // promise that is never reset after a rejection, so a failed WebGPU pass
    // would also kill the WASM fallback (and poison later vector/chat loads).
    const tokenizer = await mod.AutoTokenizer.from_pretrained(DECIDE_MODEL_ID, {
      progress_callback: decideProgress,
    })
    const model = await mod.PreTrainedModel.from_pretrained(DECIDE_MODEL_ID, {
      device: 'wasm',
      dtype: 'q4f16',
      progress_callback: decideProgress,
    })
    decideTensor = mod.Tensor
    decideInstance = { tokenizer, model }
    decideState.value.device = 'wasm'
    decideState.value.dtype = 'q4f16'
    decideState.value.status = 'ready'
    decideState.value.progress = 100
  } catch (error) {
    decideState.value.status = 'error'
    decideState.value.error = error instanceof Error ? error.message : String(error)
    throw error
  }
}

export function loadDecide(): Promise<void> {
  if (!decideLoading) {
    decideLoading = loadDecideInner().catch((error: unknown) => {
      decideLoading = null
      throw error
    })
  }
  return decideLoading
}

export function disposeDecide(): void {
  try {
    void decideInstance?.model.dispose?.()
  } catch {
    // ignore dispose errors
  }
  decideInstance = null
  decideTensor = null
  decideLoading = null
  decideState.value.status = 'idle'
  decideState.value.device = 'wasm'
  decideState.value.dtype = 'q4f16'
  decideState.value.progress = 0
  decideState.value.file = ''
  decideState.value.error = null
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

function lexicalScores(query: string, docs: SourceDoc[]): number[] {
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
  const docs = getSourceDocs()
  const totalChars = sourceChars(SOURCE_DEFS)

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
  const decideReady = decideState.value.status === 'ready'
  const needsVector = selectedMode === 'vector' || selectedMode === 'hybrid'
  const needsDecide = selectedMode === 'decide'
  let effective: RetrievalMode =
    needsVector && !vectorReady ? 'lexical' : needsDecide && !decideReady ? 'lexical' : selectedMode

  let scores: number[]
  try {
    if (
      selectedMode === 'lexical' ||
      (needsVector && !vectorReady) ||
      (needsDecide && !decideReady)
    ) {
      scores = lexicalScores(query, docs)
    } else if (selectedMode === 'vector') {
      scores = await vectorScores(query, docs)
    } else if (selectedMode === 'hybrid') {
      scores = hybridScores(lexicalScores(query, docs), await vectorScores(query, docs))
    } else {
      scores = await decideScores(query, docs)
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
  const prunedChars = totalChars - sourceChars(filterSources(selectedNames))

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
    decide: decideState,
    retrieve,
    loadVector,
    disposeVector,
    loadDecide,
    disposeDecide,
  }
}
