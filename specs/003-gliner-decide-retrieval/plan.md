# Implementation Plan: GLiNER2.5-Decide Retrieval Mode

**Branch**: `003-gliner-decide-retrieval` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-gliner-decide-retrieval/spec.md`

## Summary

Add a fourth retrieval mode, **`decide`**, to the on-device retriever: a GLiNER2.5-Decide decision model (`onnx-community/GLiNER2.5-Decide-mobile-ONNX`, DeBERTa-v3-large 340M, q4f16 345 MB / fp16 on WebGPU) decides which content sources a query is about. The GLiNER2 classification processor (research R-3: `( [P] task ( [L] label… ) ) [SEP_TEXT] state`, `marker_positions` int64 input, per-marker `logits` → softmax; 1024-token default, state truncated from the end) is ported into `useToolRetrieval.ts` — the same lazy `PreTrainedModel`/`AutoTokenizer` pattern as the existing prompt router (R-4), so the browser, the eval harness (`eval-retrieval.mjs`/`eval-chain.mjs`), and disposal all reuse proven machinery. Fallback, ranking, artifact, and `decideAction` semantics are unchanged (R-5/R-6); only UI copy + a mode chip are added (R-7). No new dependency, no backend, no `<style>` blocks (constitution I/II/IV). **Feasibility is proven by the `shreyask/open-jev-demo` Space** (`?model=gliner2-decide`) and its unmerged `nico-martin/open-jev#1` PR, whose `encodeGliner2Sequence()` matches this layout token-for-token (R-9) — but since that support is not in the released open-jev package, we port it in-repo.

## Technical Context

**Language/Version**: TypeScript 5.8 on Vue 3 (`<script setup lang="ts">`), Vite (`rolldown-vite`), Node `^20.19.0 || >=22.12.0`. Eval scripts are ESM `.mjs`.

**Primary Dependencies**: Existing `@huggingface/transformers` 4.2.0 only — no new runtime deps (FR-008; `open-jev` explicitly rejected, research R-1). The GLiNER processor is a self-contained port.

**Storage**: Static only. Model checkpoints cached in `~/.cache/huggingface` / browser cache (~345 MB decide model on first run). No persistence changes; `evalResults.ts` schema unchanged.

**Testing**: No test suite (constitution Principle III). Gates: `npm run lint` → `npm run build` from `frontend/`; `npm run eval:retrieval -- --modes=decide`; `npm run eval:chain -- --modes=decide --dtype=q4`. `eval:retrieval` MUST pass when retrieval modes change (constitution VI / `eval-fixtures.mjs` unchanged).

**Target Platform**: Static SPA on GitHub Pages at `/about-me/` (client-side only). The eval runs on the maintainer's Node machine / CI.

**Project Type**: Web application (frontend-only) + offline Node evaluation harness in `frontend/scripts/`.

**Performance Goals**: One DeBERTa-v3-large forward pass per decide query (~50–200 tokens) — WebGPU hundreds of ms, WASM/CPU ~1–3 s. Lazy-load on first DECIDE use; dispose on Clear. No impact on the default (hybrid) experience.

**Constraints**: No backend/secrets; `vite.config.ts` base stays `/about-me/`; all styles global in `src/assets/main.css` (reuse `tool-selector__*`, `ai-progress`, `ai-status__*`), no `<style>` blocks, no new routes/`SectionId`s; accessibility conventions preserved; `eval:retrieval` behavior unchanged for existing modes; 1024-token decide context (state-truncation rule, `contracts/decide-mode.md`).

**Scale/Scope**: 1 modified composable (`useToolRetrieval.ts` — decide loader + processor + scores), 2 modified components (`ToolSelectorPanel.vue`, `AiSection.vue`), 2 modified eval scripts (`eval-retrieval.mjs`, `eval-chain.mjs`) + a new `contracts/decide-mode.md` doc, copy in `siteData.ts` + `public/llms/blog.md` + `generate-llms-txt.mjs`, and regenerated `evalResults.ts`. No new fixtures.

## Constitution Check

*GATE: Passed before Phase 0 research. Re-checked after Phase 1 design below.*

| Principle | Status | Notes |
|---|---|---|
| I. Client-Only & On-Device | ✅ PASS | Decide model runs on-device (browser) and in the local/CI eval (Node CPU). Lazy load + `disposeDecide()` on Clear. No backend, no secrets, no runtime model calls for rendering. |
| II. Static Single-Page Simplicity | ✅ PASS | A 4th mode on the existing retriever — no new views/routes/`SectionId`s, no new libraries (`open-jev` rejected). |
| III. Verify Before Ship | ✅ PASS | Lint → build remain mandatory; `eval:retrieval --modes=decide` and `eval:chain --modes=decide` are added verification tools. |
| IV. Pixel-Theme Fidelity | ✅ PASS | Reuses global `tool-selector__*`/`ai-progress` classes and `:root` variables; no `<style>` blocks, no new visuals. |
| V. Accessibility & Motion Safety | ✅ PASS | Mode chips keep `aria-pressed`; progress `role="progressbar"`; `:focus-visible`, `prefers-reduced-motion`, ≤480px preserved. |
| VI. Retrieval-Ready Content | ✅ PASS | Labels = existing `SOURCE_DEFS` (no registry/llms-content changes); fixtures unchanged; site copy (`siteData.ts` retriever card, `public/llms/blog.md`) updated to describe the decide option. |

**Gate result**: PASS — no unjustified deviations.

## Post-Design Constitution Check (after Phase 1)

Re-confirmed: the design adds no dependency, no backend, no `<style>` block, no `SectionId`, no routing, and no runtime downloads beyond the opt-in decide model (345 MB, lazily loaded, disposed on Clear). The `decide` mode reuses the existing `retrieve()` contract and `evalResults.ts` schema, so the blog/artifact code needs no changes. German-fixture underperformance in decide mode is expected (English-trained model) and surfaced by the eval, not hidden (Principle VI honesty).

## Project Structure

### Documentation (this feature)

```text
specs/003-gliner-decide-retrieval/
├── plan.md               # This file
├── spec.md               # Feature specification
├── research.md           # Phase 0 output (artifact, processor, loading, eval, UI)
├── data-model.md         # Phase 1 output (DecideState, DecidePrompt, DecideScores)
├── quickstart.md         # Phase 1 output (validation/run guide)
├── contracts/
│   └── decide-mode.md    # Phase 1 output (model, layout, I/O, fallback, stability)
└── tasks.md              # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/src/composables/useToolRetrieval.ts   # MODIFIED: 'decide' in RetrievalMode; decideState/
│                                              #   loadDecide()/disposeDecide(); DecidePrompt processor
│                                              #   + decideScores(); retrieve() decides branch + fallback
frontend/src/components/ToolSelectorPanel.vue  # MODIFIED: DECIDE chip + label + gloss, loadDecide() in
│                                              #   setMode, decide progress/error block, intro copy
frontend/src/components/AiSection.vue          # MODIFIED: MODE_GLOSS.decide, warm loadDecide() when the
│                                              #   mode is decide, disposeDecide() on Clear/unmount
frontend/src/data/siteData.ts                  # MODIFIED: retriever tech card description/tags mention GLiNER2.5
frontend/public/llms/blog.md                   # REGENERATED via npm run generate:llms
frontend/scripts/generate-llms-txt.mjs         # MODIFIED (only if it embeds retriever copy)
frontend/scripts/eval-retrieval.mjs            # MODIFIED: decide in default modes + loadDecide() gate
frontend/scripts/eval-chain.mjs                # MODIFIED: VALID_MODES += 'decide' + loadDecide() gate
frontend/src/data/evalResults.ts               # REGENERATED by npm run eval:chain (schema unchanged)
```

**Key design decision**: the GLiNER2.5-Decide loader and processor live inside the same `useToolRetrieval.ts` module as the prompt router, so (a) the singleton/state/dispose pattern, (b) the eval harness's transpile + `wasm→cpu`/`useBrowserCache` remaps, and (c) the `retrieve()` contract are all reused with zero new seams. The processor port is documented once in `contracts/decide-mode.md` (layout, special-token ids, I/O, 1024-token truncation) and is the single source of truth for browser + eval — validated against the reference `encodeGliner2Sequence()` from `nico-martin/open-jev#1`. The artifact and blog need no schema/component changes because modes are already free-form strings.