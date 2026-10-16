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
import { useJsepWasm, type TransformersEnv } from './useJsepWasm'
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

export type RetrievalMode = 'bm25' | 'vector' | 'hybrid' | 'decide'
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
/* BM25 retriever (pure BM25, instant, always available)                */
/* ------------------------------------------------------------------ */

/**
 * Stopwords: the union of two verbatim, cited published constants (FR-007;
 * research R1). Both are famous reference constants copied WITHOUT
 * modification — no term was added or removed because of any fixture — and the
 * scoring function below is untouched textbook Okapi BM25 (k1 = 1.2, b = 0.75).
 */
/** Lucene `_english_` default stop set (StandardAnalyzer's
    ENGLISH_STOP_WORDS_SET, as shipped by Lucene and Elasticsearch's
    `_english_` stop token filter). */
const LUCENE_ENGLISH_STOPWORDS = `
a an and are as at be but by for if in into is it no not of on or such that the
their then there these they this to was will with
`
  .split(/\s+/)
  .filter(Boolean)

/** Lucene `_german_` predefined stop set — verbatim from
    lucene/analysis/common/src/resources/org/apache/lucene/analysis/snowball/german_stop.txt
    (the Snowball German stop list; Lucene's GermanAnalyzer.getDefaultStopSet()
    and Elasticsearch's `_german_` stop token filter load exactly this file —
    its own artifacts like "daß", "anderr" and "unse" included). */
const LUCENE_GERMAN_STOPWORDS = `
aber alle allem allen aller alles als also am an
ander andere anderem anderen anderer anderes anderm andern anderr anders
auch auf aus bei bin bis bist da damit dann
der den des dem die das daß
derselbe derselben denselben desselben demselben dieselbe dieselben dasselbe
dazu
dein deine deinem deinen deiner deines
denn derer dessen
dich dir du
dies diese diesem diesen dieser dieses
doch dort
durch
ein eine einem einen einer eines
einig einige einigem einigen einiger einiges
einmal
er ihn ihm
es etwas
euer eure eurem euren eurer eures
für gegen gewesen
hab habe haben hat hatte hatten
hier hin hinter
ich mich mir
ihr ihre ihrem ihren ihrer ihres euch
im in indem ins ist
jede jedem jeden jeder jedes
jene jenem jenen jener jenes
jetzt kann
kein keine keinem keinen keiner keines
können könnte machen man
manche manchem manchen mancher manches
mein meinem meinen meiner meines meine
mit muss musste nach nicht nichts noch nun nur ob oder ohne sehr
sein seinem seinen seiner seines seine
selbst sich
sie ihnen
sind so
solche solchem solchen solcher solches
soll sollte sondern sonst
über um und
uns unse unsem unsen unser unses
unter viel
vom von vor
während war waren warst was
weg weil weiter
welche welchem welchen welcher welches
wenn werde werden wie wieder
will wir wird wirst
wo
wollen wollte
würde würden
zu zum zur
zwar zwischen
`
  .split(/\s+/)
  .filter(Boolean)

const STOPWORDS = new Set([...LUCENE_ENGLISH_STOPWORDS, ...LUCENE_GERMAN_STOPWORDS])

/** Standard letter/digit tokenizer: lowercase, split on every character that
    is not a Unicode letter or digit (mirrors a Lucene letter-or-digit
    tokenizer — keeps `mucgpt`, `blog`, digits; drops punctuation), then drop
    the published stop words. No length filter, no fixture-derived terms. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token !== '' && !STOPWORDS.has(token))
}

function bm25Scores(query: string, docs: SourceDoc[]): number[] {
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

function hybridScores(bm25: number[], vector: number[]): number[] {
  const rankOf = (scores: number[]): number[] => {
    const order = scores.map((score, index) => [score, index] as const)
    // score descending, tie-broken by original index (stable + engine-proof)
    order.sort((a, b) => b[0] - a[0] || a[1] - b[1])
    const ranks = Array.from({ length: scores.length }, () => 0)
    order.forEach(([, index], rank) => {
      ranks[index] = rank
    })
    return ranks
  }
  const bm25Ranks = rankOf(bm25)
  const vectorRanks = rankOf(vector)
  const fused = bm25.map(
    (_, index) => 1 / (RRF_K + bm25Ranks[index] + 1) + 1 / (RRF_K + vectorRanks[index] + 1),
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
        effective: 'bm25',
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
    needsVector && !vectorReady ? 'bm25' : needsDecide && !decideReady ? 'bm25' : selectedMode

  let scores: number[]
  try {
    if (selectedMode === 'bm25' || (needsVector && !vectorReady) || (needsDecide && !decideReady)) {
      scores = bm25Scores(query, docs)
    } else if (selectedMode === 'vector') {
      scores = await vectorScores(query, docs)
    } else if (selectedMode === 'hybrid') {
      scores = hybridScores(bm25Scores(query, docs), await vectorScores(query, docs))
    } else {
      scores = await decideScores(query, docs)
    }
  } catch {
    scores = bm25Scores(query, docs)
    effective = 'bm25'
  }

  // Deterministic ordering (Edge case 5): score descending, tie-broken by
  // candidate name ascending (then original index) — equal BM25 scores can
  // never re-rank across runs.
  const order = scores
    .map((score, index) => ({ score, name: docs[index].name, index }))
    .sort(
      (a, b) =>
        b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : a.index - b.index),
    )
    .map((entry) => entry.index)
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
