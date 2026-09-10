/**
 * Systematic retrieval evaluation: loads the real registry + useToolRetrieval
 * implementation in Node (transpiled with the local TypeScript, externals
 * stubbed), runs the fixtures in scripts/eval-fixtures.mjs through every
 * retrieval mode and reports Hit@K and MRR.
 *
 * - lexical runs without any model download.
 * - vector/hybrid lazily download the prompt-router checkpoint (~357 MB, q8)
 *   and cache it in the default transformers.js cache (~/.cache/huggingface).
 *   Use --modes=lexical for the offline-only pass.
 *
 * Usage: npm run eval:retrieval [-- --modes=lexical|vector|hybrid,... --topk=5]
 * Exits non-zero when any fixture has no expected tool inside the top-K.
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

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
  '../composables/useLlmsContent': { getSiteContent: () => Promise.resolve('') },
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
    .replace('mod.env.useBrowserCache = true', 'mod.env.useBrowserCache = false')
    .replace(/device: 'wasm'/g, "device: 'cpu'")
  return module(retrieverRequire, code).useToolRetrieval()
}

/* ------------------------------------------------------------------ */
/* Metrics                                                              */
/* ------------------------------------------------------------------ */

function hitAtK(selectedNames, expected, k) {
  return selectedNames.slice(0, k).some((name) => expected.includes(name)) ? 1 : 0
}

function mrr(rows, expected) {
  const ranks = rows
    .filter((row) => row.selected && expected.includes(row.name))
    .map((row) => row.rank + 1)
  return ranks.length > 0 ? 1 / Math.min(...ranks) : 0
}

/* ------------------------------------------------------------------ */
/* Run                                                                  */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const hit = args.find((value) => value.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=').split(',') : fallback
}

const modesArg = arg('modes', ['lexical', 'vector', 'hybrid'])
const topK = Number(arg('topk', ['5'])[0]) || 5

const retriever = loadUseToolRetrieval()
const results = []
let failures = 0

if (modesArg.includes('vector') || modesArg.includes('hybrid')) {
  process.stderr.write('initializing prompt-router (downloads on first run)…\n')
  await retriever.loadVector()
  console.log(
    `router: ${retriever.vector.value.status} · ${retriever.vector.value.device} · ${retriever.vector.value.dtype}`,
  )
}

for (const mode of modesArg) {
  if (mode === 'lexical' || mode === 'vector' || mode === 'hybrid') {
    console.log(`\n=== mode: ${mode} (top ${topK}) ===`)
    const headerHit = []
    const headerMrr = []
    const headerLatencyMs = []
    for (const { query, expected } of FIXTURES) {
      const result = await retriever.retrieve(query, { mode, topK })
      const hit = hitAtK(result.selectedNames, expected, topK)
      const rank = mrr(result.rows, expected)
      failures += hit === 0 ? 1 : 0
      headerHit.push(hit)
      headerMrr.push(rank)
      headerLatencyMs.push(result.stats.latencyMs)
      const marker = hit ? 'ok  ' : 'MISS'
      console.log(
        `[${marker}] ${query} → ${result.selectedNames.slice(0, topK).join(', ') || '(none)'} ` +
          `(mrr ${rank.toFixed(2)}, ${result.stats.latencyMs}ms)`,
      )
    }
    const n = FIXTURES.length
    results.push({
      mode,
      hitRate: headerHit.reduce((a, b) => a + b, 0) / n,
      mrr: headerMrr.reduce((a, b) => a + b, 0) / n,
      totalLatencyMs: headerLatencyMs.reduce((a, b) => a + b, 0),
    })
  }
}

for (const r of results) {
  console.log(
    `${r.mode}: hit@${topK} = ${(r.hitRate * 100).toFixed(0)}% · MRR = ${r.mrr.toFixed(3)} · mean latency ${Math.round(r.totalLatencyMs / FIXTURES.length)}ms`,
  )
}

if (failures > 0) {
  console.error(
    `\n${failures}/${FIXTURES.length * results.length} fixtures missed the expected tools`,
  )
  process.exitCode = 1
}
