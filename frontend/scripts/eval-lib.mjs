/**
 * Shared Node harness for the end-to-end chain eval and the runtime-trace eval.
 *
 * Reuses the module-loading pattern of eval-retrieval.mjs (transpile TS with the
 * local TypeScript, stub browser-only externals) and adds:
 *   - a `window` shim so tool executors' `window.location.hash` writes are no-ops
 *   - a disk-backed `../composables/useLlmsContent` stub that reads the real
 *     `frontend/public/llms/*.md` files (CONTENT_IDS must match production)
 *   - loaders for the real retriever and the real chat model (CPU)
 *
 * Also exports the deterministic answer judge (contracts/eval-metrics.md + judge.md).
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
const useChatModelPath = join(srcDir, 'composables', 'useChatModel.ts')

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

export function loadUseChatModel(dtype = 'q8', opts = {}) {
  const siteData = loadSiteData()
  const stubbedRequire = createStubbedRequire({ siteData })
  const settings = module(stubbedRequire, transpile(retrievalSettingsPath))
  settings.sampling.value = opts.sampling ?? false
  const detectDevice = module(stubbedRequire, transpile(detectDevicePath))
  const requireFn = (request) => {
    if (request === './retrievalSettings' || request === '../composables/retrievalSettings') {
      return settings
    }
    return stubbedRequire(request)
  }
  const registry = module(requireFn, transpile(registryPath)) ?? {}

  const chatRequire = (request) => {
    if (request === '../tools/registry') return registry
    if (request === './detectDevice') return detectDevice
    return requireFn(request)
  }
  let code = transpile(useChatModelPath)
  code = code.replace(/mod\.env\.useBrowserCache = true/g, 'mod.env.useBrowserCache = false')
  code = code.replace(
    "device: 'wasm', dtype: 'q8'",
    `device: 'cpu', dtype: '${dtype}'`,
  )
  code = code.replace(
    'return { state, loadModel, generate, dispose, cancel: cancelGeneration, resetCancel }',
    'return { state, loadModel, generate, dispose, cancel: cancelGeneration, resetCancel, _getInstance: () => instance }',
  )
  return module(chatRequire, code).useChatModel()
}

/** Fetch the text of every content source (for judge grounding). */
export async function loadAllSourceTexts(registry) {
  const texts = {}
  const defs = registry.SOURCE_DEFS ?? []
  for (const def of defs) {
    if (def.kind !== 'content') continue
    try {
      texts[def.name] = String(await registry.getSourceContent(def.name) ?? '')
    } catch {
      texts[def.name] = ''
    }
  }
  return texts
}

/* ------------------------------------------------------------------ */
/* Deterministic answer judge (contracts/eval-metrics.md, judge.md)    */
/* ------------------------------------------------------------------ */

export function normalize(text, { removeArticles = false } = {}) {
  let s = String(text).toLowerCase()
  if (removeArticles) s = s.replace(/\b(a|an|the)\b/g, ' ')
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

export function tokenizeNorm(text) {
  return (String(text).toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? []).filter(Boolean)
}

const THEME_ENUMS = new Set(['amber', 'orange', 'red'])

function isStrictOnlyFact(normFact) {
  const tokens = tokenizeNorm(normFact)
  if (tokens.length === 0) return true
  if (tokens.every((t) => /^\d+$/.test(t))) return true
  return tokens.length === 1 && THEME_ENUMS.has(tokens[0])
}

function tokenF1(aNorm, bNorm) {
  const a = tokenizeNorm(aNorm)
  const b = tokenizeNorm(bNorm)
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let inter = 0
  for (const token of setA) if (setB.has(token)) inter++
  if (inter === 0) return 0
  const precision = inter / setB.size
  const recall = inter / setA.size
  return (2 * precision * recall) / (precision + recall)
}

export function factMatches(fact, answer) {
  const normFact = normalize(fact)
  const normAnswer = normalize(answer)
  if (!normAnswer) return false
  if (isStrictOnlyFact(normFact)) return normAnswer.includes(normFact)
  if (normAnswer.includes(normFact)) return true
  return tokenF1(normFact, normAnswer) >= 0.8
}

function splitSentences(text) {
  const mask = String.fromCharCode(0)
  const masked = String(text).replace(/\b([BM]\.Sc\.)/g, (match) => match.replace(/\./g, mask))
  return masked
    .split(/(?<=[.!?])\s+|[\r\n]+/)
    .map((sentence) => sentence.split(mask).join('.'))
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

const CAPITALIZED_FUNCTION_WORDS = new Set([
  'i', 'a', 'an', 'the', 'my', 'me', 'we', 'us', 'you', 'your', 'it', 'its', 'this', 'that',
  'these', 'those', 'there', 'they', 'them', 'their', 'he', 'him', 'his', 'she', 'her', 'our',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'and', 'or', 'but', 'so', 'for', 'to',
  'of', 'in', 'on', 'at', 'by', 'with', 'from', 'as', 'if', 'then', 'than', 'too', 'not', 'no',
  'yes', 'ok', 'okay', 'done', 'here', 'hi', 'hey', 'oh', 'ah', 'sure', 'now',
])

/** Whether a tool result carries natural-language text the answer could be
    lexically grounded in. Pure layout side-effects (e.g. `set_theme` →
    `{ kind: 'layout', theme }`) carry none. */
function hasGroundingText(result) {
  if (typeof result === 'string') return result.trim() !== ''
  if (result && typeof result === 'object') {
    return typeof result.text === 'string' && result.text.trim() !== ''
  }
  return false
}

export function computeFaithfulness(answer, toolResults) {
  const sentences = splitSentences(answer)
  if (sentences.length === 0) return { faithfulness: 0, unsupportedSentences: [] }

  // Layout-only tool results (contracts/eval-metrics.md): tools were executed
  // but produced no textual grounding material (e.g. a theme switch). A
  // natural-language answer cannot be lexically grounded in a layout payload,
  // so the faithfulness gate is vacuous — the signal for these cases is carried
  // by factRecall, bannedFacts and the tool-call validity gate (which validates
  // the executed action). Vacuously satisfied so the gate stays reachable.
  if (toolResults.length > 0 && !toolResults.some(hasGroundingText)) {
    return { faithfulness: 1, unsupportedSentences: [] }
  }

  const toolText = toolResults
    .map((result) => {
      if (typeof result === 'string') return result
      return JSON.stringify(result).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r')
    })
    .join('\n')
  const toolTokens = new Set(tokenizeNorm(normalize(toolText)))
  const toolLines = toolText
    .split('\n')
    .map((line) => new Set(tokenizeNorm(normalize(line, { removeArticles: true }))))
    .filter((set) => set.size > 0)

  const supported = []
  const unsupported = []
  for (const sentence of sentences) {
    const norm = normalize(sentence, { removeArticles: true })
    const tokens = tokenizeNorm(norm)
    if (tokens.length === 0) {
      unsupported.push(sentence)
      continue
    }

    const rawTokens = sentence.match(/[\p{L}\p{N}_]+/gu) ?? []
    const entityTokens = rawTokens
      .filter((token) => /[A-Z0-9]/.test(token))
      .map((token) => token.toLowerCase())
      .filter((token) => !CAPITALIZED_FUNCTION_WORDS.has(token))
    const entityOk = entityTokens.every((token) => toolTokens.has(token))

    const answerSet = new Set(tokens)
    let maxOverlap = 0
    for (const lineTokens of toolLines) {
      let inter = 0
      for (const token of answerSet) if (lineTokens.has(token)) inter++
      const overlap = inter / tokens.length
      if (overlap > maxOverlap) maxOverlap = overlap
    }

    if (maxOverlap >= 0.35 && entityOk) supported.push(sentence)
    else unsupported.push(sentence)
  }

  return { faithfulness: supported.length / sentences.length, unsupportedSentences: unsupported }
}

export function deterministicAssess(case_, transcript) {
  const {
    expectAction = false,
    expectedArgs = {},
    expectedAnswerFacts = [],
    bannedFacts = [],
  } = case_
  const {
    finalAnswer,
    injectedNames = [],
    injectedText = '',
    appliedTheme = null,
    sourceTexts = {},
  } = transcript

  const bannedViolation = bannedFacts.some((fact) => factMatches(fact, finalAnswer))

  // Action fixtures: the heuristic applied the right theme; faithfulness is
  // vacuous because no content was injected (layout-only, contracts/eval-metrics.md).
  if (expectAction) {
    const expectedTheme = expectedArgs?.set_theme?.theme
    const actionMatched =
      appliedTheme !== null && (expectedTheme === undefined || appliedTheme === expectedTheme)
    let matched = 0
    for (const fact of expectedAnswerFacts) {
      if (factMatches(fact, finalAnswer)) matched++
    }
    const factRecall = expectedAnswerFacts.length ? matched / expectedAnswerFacts.length : 1
    const pass = actionMatched && factRecall === 1 && !bannedViolation
    return {
      factRecall,
      factsMissedDueToRetrievalMiss: [],
      bannedViolation,
      faithfulness: 1,
      unsupportedSentences: [],
      pass,
      appliedActionMatched: actionMatched,
    }
  }

  // Content fixtures: a fact is scorable only when the source that holds it was
  // actually injected — retrieval misses are reported, not blamed on the answer.
  const available = (fact) => Object.values(sourceTexts).some((text) => factMatches(fact, text))
  const factsMissedDueToRetrievalMiss = []
  let scorable = 0
  let matched = 0
  for (const fact of expectedAnswerFacts) {
    if (!available(fact)) continue
    scorable++
    if (!injectedNames.some((name) => factMatches(fact, sourceTexts[name] ?? ''))) {
      factsMissedDueToRetrievalMiss.push(fact)
      continue
    }
    if (factMatches(fact, finalAnswer)) matched++
  }
  const factRecall = scorable > 0 ? matched / scorable : 1

  const hasInjected = Boolean(injectedText?.trim())
  const { faithfulness, unsupportedSentences } = computeFaithfulness(
    finalAnswer,
    hasInjected ? [injectedText] : [],
  )
  // Nothing was injected and nothing was expected (e.g. greetings, smalltalk):
  // the faithfulness gate is vacuous — the guard is that no action misfired.
  const vacuous = scorable === 0 && !hasInjected
  const unexpectedAction = appliedTheme !== null
  const effectiveFaithfulness = vacuous ? 1 : faithfulness
  const pass =
    factRecall === 1 && !bannedViolation && effectiveFaithfulness >= 0.8 && !unexpectedAction

  return {
    factRecall,
    factsMissedDueToRetrievalMiss,
    bannedViolation,
    faithfulness: effectiveFaithfulness,
    unsupportedSentences: vacuous ? [] : unsupportedSentences,
    pass,
    appliedActionMatched: false,
  }
}

const STUB_SCORE = {
  factRecall: 0.5,
  factsMissedDueToRetrievalMiss: [],
  bannedViolation: false,
  faithfulness: 0.5,
  unsupportedSentences: [],
  pass: true,
  appliedActionMatched: false,
}

export function createJudge(name = 'deterministic') {
  if (name === 'deterministic') {
    return { name, assess: (case_, transcript) => deterministicAssess(case_, transcript) }
  }
  if (name === 'stub') {
    return { name, assess: () => ({ ...STUB_SCORE }) }
  }
  throw new Error(`Unknown judge "${name}". Available judges: deterministic, stub.`)
}