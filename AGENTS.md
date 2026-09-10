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

## AI chat & tool system (on-device)

The site is also an on-device AI demo. Mini-Michi (the chat in the left dock) runs a real SLM in the browser and calls tools to retrieve info about Michael or rearrange the page. Everything runs client-side — no backend, no API keys.

- Chat model: `LiquidAI/LFM2.5-350M-ONNX` via `@huggingface/transformers`, loaded lazily in `src/composables/useChatModel.ts` (q4 on WebGPU, q8 on WASM), streamed token-by-token. Loaded on first send; disposed on Clear.
- Tool registry: `src/tools/registry.ts` — `TOOL_SCHEMAS` (OpenAI-style), `buildSystemPrompt(selectedNames)`, `executeToolCall`, `parsePythonicCalls`, plus retrieval helpers `getToolDocs()`, `pruneSchemas()`, `schemaChars()`. The model emits calls wrapped in `<|tool_call_start|>about_me(topic="skills")<|tool_call_end|>`.
- Tool retrieval (`src/composables/useToolRetrieval.ts`): before every reply the chat retrieves the top-k most relevant tools and passes **only** those schemas to the SLM (`pruneSchemas` + `buildSystemPrompt`). Modes: `lexical` (BM25, instant, always available), `neural` (`kucukkanat/LFM2.5-Encoder-350M-ONNX`, q8, lazy ~425MB download; mean-pooled `last_hidden_state` + cosine), `hybrid` (50/50 blend). Neural is never forced — it falls back to lexical unless already loaded. Tracked via shared `mode`/`topK`/`lastQuery`/`lastResult`/`neural` refs.
- Visual panel: `src/components/ToolSelectorPanel.vue` (in the dock, collapsed by default) shows ranked tools, score bars, `IN CONTEXT` tags and a pruned-% stat; it shares `lastQuery`/`lastResult` with the chat. The chat transcript shows an expandable "retrieved N/M → tools" step per turn (`src/components/AiSection.vue`).
- Retrievable content: `about_site` fetches `public/llms/*.md` via `src/composables/useLlmsContent.ts`; `about_me` uses `aboutMeMarkdown(topic)` from `src/data/siteData.ts`. Topic→section mapping lives in `TOPIC_SECTION` (registry.ts) and `SECTION_LABEL` (AiSection.vue).
- Both models are disposed on Clear to free memory (`dispose()` + `disposeNeural()`).

### Adding a new pixel-window section (e.g. a new `SectionId`)

New sections touch many places — grep for the existing ids (`about`, `projects`, `contact`, `tech`) to find them all:
- `SectionId` union + `DEFAULT_SECTIONS` in `src/composables/useSiteLayout.ts`
- `components` map in `src/App.vue`
- new section component in `src/components/` (copy the `.pixel-window` skeleton from `ProjectsSection.vue`)
- `TOPIC_SECTION` + tool `enum`s (topic and `target`) + `TOOL_GUIDE` in `src/tools/registry.ts`
- `SECTION_LABEL` in `src/components/AiSection.vue`
- a new `public/llms/<id>.md` (add to `scripts/generate-llms-txt.mjs`), include it in `LLMS_FILES` in `src/composables/useLlmsContent.ts`, and link it in `llms.txt` — this makes it retrievable via `about_site`.

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