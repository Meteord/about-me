/**
 * Systematic retrieval evaluation: loads the real registry + useToolRetrieval
 * implementation in Node (transpiled with the local TypeScript, externals
 * stubbed), runs the fixtures in scripts/eval-fixtures.mjs through every
 * retrieval mode and reports Hit@K and MRR per split.
 *
 * A fail-fast pre-run gate validates split integrity + corpus hygiene
 * (eval-lib validateSplitIntegrity) before any retrieval.
 *
 * - bm25 runs without any model download.
 * - vector/hybrid lazily download the prompt-router checkpoint (~357 MB, q8)
 *   and cache it in the default transformers.js cache (~/.cache/huggingface).
 * - decide lazily downloads the GLiNER2.5-Decide checkpoint (~345 MB, q4f16).
 *   Use --modes=bm25 for the offline-only pass.
 *
 * Usage: npm run eval:retrieval [-- --modes=bm25|vector|hybrid|decide,... --topk=5]
 * Exits non-zero when a TEST-split fixture has no expected tool inside the
 * top-K (the gate). Train-split misses print as MISS but never fail the run —
 * train is the tuning reference, not the gate (FR-004).
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { validateSplitIntegrity } from './eval-lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..', 'src')
const frontendRequire = createRequire(join(here, '..', 'package.json'))

const { FIXTURES } = await import('./eval-fixtures.mjs')

/* ------------------------------------------------------------------ */
/* Module loading (transpile TS, redirect relative imports, stub vue)   */
/* ------------------------------------------------------------------ */

const tsPath = frontendRequire.resolve('typescript')
const ts = await import(tsPath)

const transpile = (file) =>
  ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText

const ref = (value) => ({ value })

/** Stub modules that pull browser-only state (window, import.meta.env). */
const AUTO_STUB = {
  '../data/siteData': {
    aboutMeMarkdown: () => '',
    aboutTopicDescription: () => '',
  },
  '../composables/useSiteLayout': {
    __esModule: true,
    useSiteLayout: () => {
      throw new Error('stub')
    },
  },
  '../composables/useLlmsContent': {
    getSiteContent: () => Promise.resolve(''),
    listContentItems: () => [
      { id: 'about', title: 'About', description: '', kind: 'section', section: 'about' },
      { id: 'projects', title: 'Projects', description: '', kind: 'page', section: 'projects' },
      { id: 'contact', title: 'Contact', description: '', kind: 'section', section: 'contact' },
      { id: 'blog', title: 'Blog', description: '', kind: 'section', section: 'blog' },
      {
        id: 'blog:chat-with-my-website',
        title: 'Chat with my website',
        description: '',
        kind: 'page',
        section: 'blog',
        slug: 'chat-with-my-website',
      },
    ],
    findContentItem: () => undefined,
    getContentById: () => Promise.resolve(''),
  },
  '../composables/useChatModel': {},
}

function module(requireFn, code) {
  const mod = { exports: {} }
  new Function('exports', 'require', 'module', code)(mod.exports, requireFn, mod)
  return mod.exports
}

function stubbedRequire(request) {
  if (request === 'vue') {
    return { ref, watch: () => {}, computed: (fn) => fn(), nextTick: (fn) => fn?.() }
  }
  if (AUTO_STUB[request]) return AUTO_STUB[request]
  return frontendRequire(request)
}

const registryPath = join(srcDir, 'tools', 'registry.ts')
const detectDevicePath = join(srcDir, 'composables', 'detectDevice.ts')
const retrievalSettingsPath = join(srcDir, 'composables', 'retrievalSettings.ts')
const useToolRetrievalPath = join(srcDir, 'composables', 'useToolRetrieval.ts')

function loadRegistry() {
  const settings = module(stubbedRequire, transpile(retrievalSettingsPath))
  const requireFn = (request) => {
    if (request === './retrievalSettings' || request === '../composables/retrievalSettings') {
      return settings
    }
    return stubbedRequire(request)
  }
  return module(requireFn, transpile(registryPath)) ?? {}
}

function loadUseToolRetrieval() {
  const settings = module(stubbedRequire, transpile(retrievalSettingsPath))
  // Node's onnxruntime has no 'wasm' device; browsers do — remap for the test.
  const detectDevice = module(stubbedRequire, transpile(detectDevicePath))
  const requireFn = (request) => {
    if (request === './retrievalSettings' || request === '../composables/retrievalSettings') {
      return settings
    }
    return stubbedRequire(request)
  }
  const registry = module(requireFn, transpile(registryPath)) ?? {}

  const retrieverRequire = (request) => {
    if (request === '../tools/registry') return registry
    if (request === './detectDevice') return detectDevice
    return requireFn(request)
  }
  const code = transpile(useToolRetrievalPath)
    .replace(/mod\.env\.useBrowserCache = true/g, 'mod.env.useBrowserCache = false')
    .replace(/device: 'wasm'/g, "device: 'cpu'")
  return module(retrieverRequire, code).useToolRetrieval()
}

/* ------------------------------------------------------------------ */
/* CLI + fail-fast integrity gate (before any retrieval)                */
/* ------------------------------------------------------------------ */

const VALID_MODES = ['bm25', 'vector', 'hybrid', 'decide']

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const hit = args.find((value) => value.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=').split(',') : fallback
}

const modesArg = arg('modes', VALID_MODES)
const topK = Number(arg('topk', ['5'])[0]) || 5

const invalidModes = modesArg.filter((mode) => !VALID_MODES.includes(mode))
if (invalidModes.length > 0) {
  console.error(
    `no valid retrieval modes requested (${modesArg.join(',')}) — valid modes: ${VALID_MODES.join(', ')}`,
  )
  process.exit(1)
}

const integrityErrors = validateSplitIntegrity({
  fixtures: FIXTURES,
  docs: loadRegistry().getSourceDocs(),
})
if (integrityErrors.length > 0) {
  console.error('split integrity check failed:')
  for (const error of integrityErrors) console.error(`  - ${error}`)
  process.exit(1)
}

/* ------------------------------------------------------------------ */
/* Metrics                                                              */
/* ------------------------------------------------------------------ */

function hitAtK(selectedNames, expected, k) {
  if (expected.length === 0) return 1
  return selectedNames.slice(0, k).some((name) => expected.includes(name)) ? 1 : 0
}

function mrr(rows, expected) {
  const ranks = rows
    .filter((row) => row.selected && expected.includes(row.name))
    .map((row) => row.rank + 1)
  return ranks.length > 0 ? 1 / Math.min(...ranks) : 0
}

/* ------------------------------------------------------------------ */
/* Run (split-aware; the gate is the TEST split only)                   */
/* ------------------------------------------------------------------ */

const retriever = loadUseToolRetrieval()
const bySplit = {
  train: FIXTURES.filter((fixture) => fixture.split === 'train'),
  test: FIXTURES.filter((fixture) => fixture.split === 'test'),
}

if (modesArg.includes('vector') || modesArg.includes('hybrid')) {
  process.stderr.write('initializing prompt-router (downloads on first run)…\n')
  await retriever.loadVector()
  console.log(
    `router: ${retriever.vector.value.status} · ${retriever.vector.value.device} · ${retriever.vector.value.dtype}`,
  )
}

if (modesArg.includes('decide')) {
  process.stderr.write('initializing GLiNER2.5-Decide (downloads on first run)…\n')
  await retriever.loadDecide()
  console.log(
    `decide: ${retriever.decide.value.status} · ${retriever.decide.value.device} · ${retriever.decide.value.dtype}`,
  )
}

const results = []
const missedTest = []
let trainMisses = 0

for (const mode of modesArg) {
  console.log(`\n=== mode: ${mode} (top ${topK}) ===`)
  const perSplit = {
    train: { hit: [], mrr: [], latencyMs: [] },
    test: { hit: [], mrr: [], latencyMs: [] },
  }
  for (const { query, expected, split } of FIXTURES) {
    const result = await retriever.retrieve(query, { mode, topK })
    const hit = hitAtK(result.selectedNames, expected, topK)
    const rank = mrr(result.rows, expected)
    perSplit[split].hit.push(hit)
    perSplit[split].mrr.push(rank)
    perSplit[split].latencyMs.push(result.stats.latencyMs)
    if (!hit) {
      if (split === 'test') missedTest.push({ mode, query })
      else trainMisses++
    }
    const marker = hit ? 'ok  ' : 'MISS'
    console.log(
      `[${marker}] [${split}] ${query} → ${result.selectedNames.slice(0, topK).join(', ') || '(none)'} ` +
        `(mrr ${rank.toFixed(2)}, ${result.stats.latencyMs}ms)`,
    )
  }
  const summarize = (split) => ({
    hitRate: perSplit[split].hit.reduce((a, b) => a + b, 0) / bySplit[split].length,
    mrr: perSplit[split].mrr.reduce((a, b) => a + b, 0) / bySplit[split].length,
    meanLatencyMs:
      perSplit[split].latencyMs.reduce((a, b) => a + b, 0) / perSplit[split].latencyMs.length,
  })
  results.push({ mode, test: summarize('test'), train: summarize('train') })

  console.log(
    `test:  hit@${topK} = ${(results.at(-1).test.hitRate * 100).toFixed(0)}% · MRR = ${results.at(-1).test.mrr.toFixed(3)} · mean latency ${Math.round(results.at(-1).test.meanLatencyMs)}ms`,
  )
  console.log(
    `train (tuning reference — not the gate): hit@${topK} = ${(results.at(-1).train.hitRate * 100).toFixed(0)}% · MRR = ${results.at(-1).train.mrr.toFixed(3)} · mean latency ${Math.round(results.at(-1).train.meanLatencyMs)}ms`,
  )
}

if (trainMisses > 0) {
  console.log(`\ntrain misses (tuning reference — not the gate): ${trainMisses}`)
}

if (missedTest.length > 0) {
  console.error(
    `\n${missedTest.length} test fixture(s) missed the expected tools (top ${topK}) — the gate:`,
  )
  for (const miss of missedTest) console.error(`  - [${miss.mode}] ${miss.query}`)
  process.exitCode = 1
}
