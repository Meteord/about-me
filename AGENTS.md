# AGENTS.md

## Project

Personal "about me" page. Vue 3 single-page app (no router) living entirely in `frontend/`, built with Vite (`rolldown-vite`) + TypeScript, deployed to GitHub Pages. No backend.

## Commands (run from `frontend/`)

- `npm run dev` — dev server
- `npm run build` — runs `type-check` and `build-only` in parallel (`run-p`); this is the full verify step
- `npm run type-check` — `vue-tsc --build`
- `npm run lint` — oxlint then eslint, **both with `--fix`** (will modify files)
- `npm run format` — `prettier --write src/`
- `npm run generate:llms` — regenerates `public/llms/*.md` + `public/llms.txt` (also run automatically by `predev`/`prebuild`)

Verify order: `lint` → `build`. There is no test suite (`src/**/__tests__/*` is excluded from tsconfig).

- `npm run eval:retrieval` — systematic retrieval evaluation (`scripts/eval-retrieval.mjs`): loads the real registry + retriever in Node (TS transpiled with the local `typescript`, browser-only externals stubbed) and runs the fixtures in `scripts/eval-fixtures.mjs` through the retrieval modes, reporting Hit@K/MRR per mode; exits non-zero on misses. Flags: `--modes=lexical,vector,hybrid` (default all), `--topk=5`. `lexical` is offline; `vector`/`hybrid` download the prompt-router checkpoint (~357 MB, cached in `~/.cache/huggingface`). Extend `eval-fixtures.mjs` when adding new sources or actions.
- `npm run eval:chain` — end-to-end chain evaluation (`scripts/eval-chain.mjs`): runs the WHOLE chain exactly as the browser does (retrieve() → `decideAction` (heuristic theme actions, no LLM call syntax) or `buildContextText` → `buildSystemPrompt` → real `LiquidAI/LFM2.5-350M` on CPU → final answer, single pass) over every fixture × mode, scores answers with a deterministic judge (facts gated on the holding source being injected, faithfulness vs the injected text), reports stage metrics, writes the committed artifact `src/data/evalResults.ts`, and exits non-zero on failures. Reuses the shipped modules via `scripts/eval-lib.mjs` (transpile + browser stubs incl. disk-backed `useLlmsContent`); the browser never runs it. Flags: `--modes=lexical,vector,hybrid` (default all), `--topk=5`, `--dtype=q8|q4` (default q8; q4 halves the download), `--sampling` (greedy default), `--judge=deterministic|stub`, `--traces=<file|dir|url>` (repeatable). Fast iteration: `npm run eval:chain -- --modes=lexical --dtype=q4`. Chat model q8 ~634 MB / q4 ~294 MB downloaded on first run (cached in `~/.cache/huggingface`).
- Runtime traces: the dock's **Save trace** button (`src/composables/useTraceRecorder.ts`) downloads a finished session as STS-format JSONL (`harness: "about-me.mini-michi"`, opens in the HF trace viewer). Drop it into `frontend/traces/` (gitignored except its README) and the default eval scores it historically — re-runs retrieval to check the recorded injected sources are still in top-k (or the recorded action is valid), judges the recorded answer (`scripts/trace-lib.mjs`). `traces/*.jsonl` is never committed.
- Artifact: `src/data/evalResults.ts` is a **generated, committed** module (interface + data co-located) that the "Chat with my website" blog post renders (`BlogPostPage.vue`). It is regenerated ONLY by `npm run eval:chain` — `prebuild` never runs the eval. A stale artifact is normal and visible (the section shows `generatedAt`).

## AI chat & content system (on-device)

The site is also an on-device AI demo. Mini-Michi (the chat in the left dock) runs a real SLM in the browser. Before each reply a retriever ranks the site's content sources, the top ones are injected into the context, and the model answers in a single pass; theme changes are applied directly by the retriever — the model never emits a tool call. Everything runs client-side — no backend, no API keys.

- Chat model: `LiquidAI/LFM2.5-350M-ONNX` via `@huggingface/transformers`, loaded lazily in `src/composables/useChatModel.ts` (q4 on WebGPU, q8 on WASM), streamed token-by-token. Loaded on first send; disposed on Clear.
- Registry: `src/tools/registry.ts` — `SOURCE_DEFS` (granular content sources `about_bio`/`about_education`/`about_skills`/`about_hobbies`/`projects`/`contact`/`blog`/`blog:<slug>`/`site_index` + the `set_theme` action), retrieval helpers `getSourceDocs()`/`filterSources()`/`sourceChars()`, `getSourceContent()`/`buildContextText()` (fetch + char-budgeted injection, `MAX_INJECT_CHARS`), `buildSystemPrompt(contextText)`, and the deterministic `decideAction(query, rows, currentTheme)` (set_theme must rank first above `ACTION_MIN_SCORE`; explicit color wins, else the theme cycles). No tool-call parsing or executors.
- Retrieval (`src/composables/useToolRetrieval.ts`): before every reply the chat retrieves the top-k most relevant candidates and injects **only** those content sources into the context. Modes: `lexical` (BM25 over the alias-enriched source docs, instant, always available), `vector` (one pass of the zero-shot prompt-router checkpoint `kucukkanat/LFM2.5-Encoder-350M-Prompt-Router-ONNX`, q8, lazy ~357MB download: the query and all candidate names go into a single "Categories:\n- …\n\nText:\n…" prompt, with the trained cosine head (scale/bias from the model's `config.json`) and byte-level-BPE span pooling done in JS; WebGPU is attempted first with WASM fallback), `hybrid` (Reciprocal Rank Fusion of BM25 + vector-search scores). Vector search is never forced by the chat loop (AiSection only warms the loader via `loadVector`) — it falls back to lexical unless already loaded or if a pass fails. Tracked via shared `mode`/`topK`/`lastQuery`/`lastResult`/`vector` refs.
- Visual panel: `src/components/ToolSelectorPanel.vue` (in the dock, collapsed by default) shows ranked candidates, score bars, `IN CONTEXT` tags and a pruned-% stat; it shares `lastQuery`/`lastResult` with the chat. The chat transcript shows an expandable "retrieved N/M → sources" step per turn and a compact `action` note for theme changes / navigation (`src/components/AiSection.vue`).
- Retrievable content: content sources map to `public/llms/*.md` via `src/composables/useLlmsContent.ts` (sections, projects, blog) and to `aboutMeMarkdown(topic)` from `src/data/siteData.ts` (the four about topics). `site_index` is generated from `listContentItems()`. Page side-effects (expand/spotlight/navigate) are driven by the top retrieved source in `AiSection.vue`; `SECTION_LABEL` lives there too.
- The chat and vector models are disposed on Clear to free memory (`dispose()` + `disposeVector()`).

### Adding a new pixel-window section (e.g. a new `SectionId`)

New sections touch many places — grep for the existing ids (`about`, `projects`, `contact`, `tech`) to find them all:
- `SectionId` union + `DEFAULT_SECTIONS` in `src/composables/useSiteLayout.ts`
- `components` map in `src/App.vue`
- new section component in `src/components/` (copy the `.pixel-window` skeleton from `ProjectsSection.vue`)
- a new content source in `SOURCE_DEFS` (`src/tools/registry.ts`) with `section` (+ `slug`/`topic`/`spotlight`), so the retriever can find and inject it
- `SECTION_LABEL` in `src/components/AiSection.vue`
- a new `public/llms/<id>.md` (add to `scripts/generate-llms-txt.mjs`), include it in `LLMS_FILES` in `src/composables/useLlmsContent.ts`, and link it in `llms.txt` — this makes it retrievable.
- add a fixture to `scripts/eval-fixtures.mjs` when adding a source or action.

## Conventions

- Prettier: no semicolons, single quotes, printWidth 100 (`.prettierrc.json`). Eslint uses the prettier `skipFormatting` rule, so run `npm run format` to fix style.
- `@/` alias maps to `src/` (vite.config.ts, tsconfig.app.json).
- Components use `<script setup lang="ts">`. The site is styled as collapsible "pixel-window" sections — reuse the existing `pixel-*` CSS naming in `src/assets/main.css`.
- Node engine: `^20.19.0 || >=22.12.0`.

## Design guidelines (retro pixel-art CRT theme)

The look is retro pixel-art desktop meets CRT screen: a warm dark palette (near-black browns + amber/orange accents), chunky hard-edged UI with notched "pixel" corners and offset block shadows, a scanline overlay on the body, a blinking cursor after the name, and the display font `Bungee Spice` for headings. Everything should feel crisp, blocky, and slightly chunky — never glossy, rounded, or soft.

All styling lives globally in `src/assets/main.css` (components carry no `<style>` block); add new classes there with the existing `pixel-*` / `tech-*` / `project-*` naming (plus `model-*`, `tool-*` for the "How it works" cards and the tool-selector panel).

- Use the CSS variables in `:root` (`--pixel-*` colors, `--shadow-hard`/`--shadow-soft`, `--font-display`/`--font-body`) — never hardcode colors or fonts. Fonts are loaded via the Google Fonts import in `main.css`, no local assets.
- Aesthetic rules: warm dark palette, hard 2px+ offset shadows (`drop-shadow` or `--shadow-*`), pixel corners via `clip-path: polygon(...)` (4–8px notches), **no `border-radius` above 2px**, and stepped easing — use `steps(2, end)` transitions/animations, never smooth `ease`.
- Section chrome: each collapsible section is a `.pixel-window` with a `.pixel-window__bar` toggle button (must keep `aria-controls` + `:aria-expanded`), three `.pixel-window__chrome` squares, and a `.pixel-window__toggle` (`−`/`+`). Content fades in via the `fade` `<transition>`.
- Reuse building blocks instead of restyling: `.pixel-chip` (with `--amber`/`--orange`/`--red` variants), `.pixel-card`, `.pixel-list`, `.pixel-link`, `.pixel-link-btn`, `.pixel-contact__link`. Headings that need the display font get `.pixel-title`/`.pixel-section-title`/`.project-card__title`/`.model-card__title`.
- Respect the accessibility conventions already in place: `:focus-visible` outlines, `prefers-reduced-motion` handling, `text-wrap: pretty`, and the `@media (max-width: 480px)` sizing overrides.

## Deployment gotchas

- GitHub Pages workflow (`.github/workflows/gh-pages.yml`) deploys `frontend/dist` on push to `main`.
- `vite.config.ts` sets `base: '/about-me/'` — do not change it; the site lives at that path on GitHub Pages.
- `dist/` is gitignored — never commit build output.
- `public/mj.jpg` is referenced as root-absolute `/mj.jpg`; Vite rewrites it against `base` at build time.