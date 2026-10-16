/**
 * Shared Node harness for the retrieval/action eval and the runtime-trace eval.
 *
 * Reuses the module-loading pattern of eval-retrieval.mjs (transpile TS with the
 * local TypeScript, stub browser-only externals) and adds:
 *   - a `window` shim so `window.location.hash` writes are no-ops
 *   - a disk-backed `../composables/useLlmsContent` stub that reads the real
 *     `frontend/public/llms/*.md` files (CONTENT_IDS must match production)
 *   - loaders for the real registry and retriever (CPU)
 *   - split-integrity and corpus-hygiene validation
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

export const here = dirname(fileURLToPath(import.meta.url))
export const srcDir = join(here, '..', 'src')
export const frontendRequire = createRequire(join(here, '..', 'package.json'))

const tsPath = frontendRequire.resolve('typescript')
const ts = await import(tsPath)

export const transpile = (file) =>
  ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText

export const ref = (value) => ({ value })

export function module(requireFn, code) {
  const mod = { exports: {} }
  new Function('exports', 'require', 'module', code)(mod.exports, requireFn, mod)
  return mod.exports
}

/* ------------------------------------------------------------------ */
/* Browser stubs                                                       */
/* ------------------------------------------------------------------ */

export function installWindowShim() {
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = { location: { hash: '' } }
  }
}

const SECTION_ITEMS = [
  { id: 'about', title: 'About', description: 'Bio, education, skills and hobbies', kind: 'section', section: 'about' },
  { id: 'projects', title: 'Projects', description: 'Open-source projects like MUCGPT, on their own page', kind: 'page', section: 'projects' },
  { id: 'contact', title: 'Contact', description: 'LinkedIn and GitHub links', kind: 'section', section: 'contact' },
  { id: 'blog', title: 'Blog', description: 'Blog articles about this site and the models that power it', kind: 'section', section: 'blog' },
]

const FILE_BY_ID = { about: 'about.md', projects: 'projects.md', contact: 'contact.md', blog: 'blog.md' }
const LLMS_FILES = ['about.md', 'projects.md', 'contact.md', 'blog.md']

export function createStubbedRequire({ siteData }) {
  const llmsDir = join(here, '..', 'public', 'llms')
  const readMd = (file) => readFileSync(join(llmsDir, file), 'utf8')

  const listContentItems = () => {
    const posts = (siteData.blog ?? []).map((post) => ({
      id: `blog:${post.slug}`,
      title: post.title,
      description: post.teaser,
      kind: 'page',
      section: 'blog',
      slug: post.slug,
    }))
    return [...SECTION_ITEMS, ...posts]
  }
  const findContentItem = (id) => listContentItems().find((item) => item.id === id)
  const getContentById = (id) => {
    const item = findContentItem(id)
    if (!item) return Promise.reject(new Error(`Unknown content id: ${id}`))
    return Promise.resolve(readMd(item.slug ? FILE_BY_ID.blog : (FILE_BY_ID[item.id] ?? 'about.md')))
  }

  const AUTO_STUB = {
    '../composables/useSiteLayout': {
      __esModule: true,
      useSiteLayout: () => ({
        state: { sections: [], theme: 'amber' },
        setVisible: () => {},
        setExpanded: () => {},
        focusSection: () => {},
        setTheme: () => {},
      }),
    },
    '../composables/useLlmsContent': {
      getSiteContent: () => Promise.resolve(LLMS_FILES.map((file) => readMd(file)).join('\n\n')),
      listContentItems,
      findContentItem,
      getContentById,
    },
  }

  return (request) => {
    if (request === 'vue') {
      return { ref, watch: () => {}, computed: (fn) => fn(), nextTick: (fn) => fn?.() }
    }
    if (request === '../data/siteData') {
      return { siteData, aboutMeMarkdown: siteDataModule.aboutMeMarkdown, aboutTopicDescription: siteDataModule.aboutTopicDescription }
    }
    if (AUTO_STUB[request]) return AUTO_STUB[request]
    return frontendRequire(request)
  }
}

const siteDataPath = join(srcDir, 'data', 'siteData.ts')
const siteDataModule = module(frontendRequire, transpile(siteDataPath))
const registryPath = join(srcDir, 'tools', 'registry.ts')
const detectDevicePath = join(srcDir, 'composables', 'detectDevice.ts')
const retrievalSettingsPath = join(srcDir, 'composables', 'retrievalSettings.ts')
const useToolRetrievalPath = join(srcDir, 'composables', 'useToolRetrieval.ts')
const useJsepWasmPath = join(srcDir, 'composables', 'useJsepWasm.ts')

export function loadSiteData() {
  return module(frontendRequire, transpile(siteDataPath)).siteData
}

export function loadRegistry() {
  const siteData = loadSiteData()
  const stubbedRequire = createStubbedRequire({ siteData })
  return module(stubbedRequire, transpile(registryPath)) ?? {}
}

export function loadRetrievalSettings() {
  return module(frontendRequire, transpile(retrievalSettingsPath))
}

export function loadUseToolRetrieval() {
  const siteData = loadSiteData()
  const stubbedRequire = createStubbedRequire({ siteData })
  const settings = module(stubbedRequire, transpile(retrievalSettingsPath))
  const detectDevice = module(stubbedRequire, transpile(detectDevicePath))
  const useJsepWasm = module(stubbedRequire, transpile(useJsepWasmPath))
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
    if (request === './useJsepWasm') return useJsepWasm
    return requireFn(request)
  }
  const code = transpile(useToolRetrievalPath)
    .replace(/mod\.env\.useBrowserCache = true/g, 'mod.env.useBrowserCache = false')
    .replace(/device: 'wasm'/g, "device: 'cpu'")
  return module(retrieverRequire, code).useToolRetrieval()
}

/* ------------------------------------------------------------------ */
/* Split integrity + corpus hygiene (data-model §1 V1–V7, FR-006/SC-004)*/
/* ------------------------------------------------------------------ */

/** German marker tokens (function/content words unambiguous in query position)
    used by the V4 language-parity check. */
const GERMAN_MARKERS = new Set([
  'und', 'ist', 'sind', 'wie', 'wo', 'wer', 'ich', 'mich', 'mir', 'nicht', 'kann',
  'kannst', 'seine', 'seiner', 'seinem', 'ihre', 'ihren', 'ihrem', 'für', 'über',
  'macht', 'machen', 'arbeite', 'arbeitet', 'wohnt', 'wohne', 'studiert', 'freizeit',
  'kontaktieren', 'fähigkeiten', 'ausbildung', 'münchen', 'hochschule',
])

function isGermanQuery(query) {
  return (String(query).toLowerCase().match(/[\p{L}]+/gu) ?? []).some((token) =>
    GERMAN_MARKERS.has(token),
  )
}

/** Trivial-reorder key (FR-006): the normalized query's tokens, sorted. */
export function reorderKey(text) {
  return normalize(text)
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ')
}

/**
 * Validate the fixture list against the split-integrity rules (data-model §1
 * V1–V7) and the FR-006/SC-004 corpus-hygiene rule. Parameterized by the fixture
 * list and the corpus docs from getSourceDocs(); runs fully offline, before any
 * retrieval. Returns an array of hard-error strings (empty = valid) — callers
 * exit non-zero and print every entry.
 */
export function validateSplitIntegrity({ fixtures, docs }) {
  const errors = []
  const report = (message) => errors.push(message)

  // V1 — a valid `split` on every fixture; V7 — `note` on every test fixture.
  for (const fixture of fixtures) {
    const label = JSON.stringify(fixture.query)
    if (fixture.split !== 'train' && fixture.split !== 'test') {
      report(`V1: fixture ${label} has no valid split field (expected 'train' | 'test')`)
      continue
    }
    if (fixture.split === 'test' && !String(fixture.note ?? '').trim()) {
      report(`V7: test fixture ${label} is missing its note provenance marker`)
    }
  }

  const train = fixtures.filter((fixture) => fixture.split === 'train')
  const test = fixtures.filter((fixture) => fixture.split === 'test')

  // V2 — test split ≥ ⌈N/3⌉ of ALL fixtures and ≥ 10.
  const minTest = Math.max(Math.ceil(fixtures.length / 3), 10)
  if (test.length < minTest) {
    report(
      `V2: test split too small — ${test.length} of ${fixtures.length} fixtures (need ≥ ${minTest})`,
    )
  }

  // V3 — every SOURCE_DEFS name (content sources + set_theme) is covered by
  // some test fixture's expected set.
  const testExpected = new Set(test.flatMap((fixture) => fixture.expected))
  for (const doc of docs) {
    if (!testExpected.has(doc.name)) {
      report(`V3: source/action "${doc.name}" never appears in a test fixture's expected`)
    }
  }

  // V4 — ≥ 2 German queries per split, from ≥ 2 different expected sources.
  for (const [name, split] of [
    ['train', train],
    ['test', test],
  ]) {
    const german = split.filter((fixture) => isGermanQuery(fixture.query))
    const germanSources = new Set(german.flatMap((fixture) => fixture.expected))
    if (german.length < 2 || germanSources.size < 2) {
      report(
        `V4: ${name} split needs ≥ 2 German queries from ≥ 2 different sources (found ${german.length} from ${germanSources.size})`,
      )
    }
  }

  // V5 — "no selection" (expected: []) fixtures in both splits.
  for (const [name, split] of [
    ['train', train],
    ['test', test],
  ]) {
    if (!split.some((fixture) => Array.isArray(fixture.expected) && fixture.expected.length === 0)) {
      report(`V5: ${name} split has no "no selection" (expected: []) fixture`)
    }
  }

  // V6 — every test-expected source is also covered by ≥ 1 train fixture.
  const trainExpected = new Set(train.flatMap((fixture) => fixture.expected))
  for (const name of [...testExpected].sort()) {
    if (!trainExpected.has(name)) {
      report(`V6: source/action "${name}" is expected by a test fixture but has no train fixture`)
    }
  }

  // FR-006/SC-004 — no test query (verbatim or trivially reordered) may appear
  // in the retrieval corpus text. Train-split queries are ignored (aliases
  // duplicating train wording are the legitimate tuning lever).
  const corpus = docs.map((doc) => ({
    name: doc.name,
    normalized: normalize(doc.text),
    sorted: reorderKey(doc.text),
  }))
  for (const fixture of test) {
    const verbatim = normalize(fixture.query)
    const reordered = reorderKey(fixture.query)
    if (reordered.split(' ').length < 2) continue
    for (const doc of corpus) {
      if (doc.normalized.includes(verbatim)) {
        report(
          `FR-006: test query ${JSON.stringify(fixture.query)} appears verbatim in corpus doc "${doc.name}" — rename the alias/entry`,
        )
      } else if (doc.sorted.includes(reordered)) {
        report(
          `FR-006: test query ${JSON.stringify(fixture.query)} appears trivially reordered in corpus doc "${doc.name}" — rename the alias/entry`,
        )
      }
    }
  }

  return errors
}

export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}