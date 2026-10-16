# Implementation Plan: Retrieval- and Action-Only Blog Evaluation

**Branch**: `006-retrieval-only-eval` | **Date**: 2026-10-16 | **Spec**: [`specs/006-retrieval-only-eval/spec.md`](./spec.md)

**Input**: Feature specification from `/specs/006-retrieval-only-eval/spec.md`

## Summary

Scope the "Chat with my website" blog evaluation section (`BlogPostPage.vue` + `EvalComparison.vue`) and its evaluation pipeline (`scripts/eval-chain.mjs`, `scripts/trace-lib.mjs`, and committed artifact `src/data/evalResults.ts`) exclusively to retrieval ranking, context-window source injection, and direct theme-action decisions. Remove all LLM answer-generation metrics (`fact recall`, `faithfulness`, `chain pass`, `grounded`) and chat-model execution from the evaluation pipeline, and surface average time taken per query (`meanLatencyMs`) as a dedicated, separate statistic alongside the 0–100% percentage metrics per mode and per split (`test` vs `train`).

## Technical Context

**Language/Version**: TypeScript ~5.9, Vue 3.5 (`<script setup lang="ts">`), Node.js `^20.19.0 || >=22.12.0` (ESM `.mjs` evaluation scripts)

**Primary Dependencies**: Vue 3, Vite (`rolldown-vite`), `@huggingface/transformers` (used only by neural retrieval modes `vector`/`hybrid`/`decide` in the eval runner; chat LLM removed from eval runner)

**Storage**: Static committed TypeScript artifact (`frontend/src/data/evalResults.ts`) and generated markdown (`frontend/public/llms/blog.md`)

**Testing**: `npm run lint` (`oxlint --fix` + `eslint --fix`), `npm run build` (`vue-tsc --build` + `vite build`), `npm run eval:retrieval -- --modes=bm25`, and `npm run eval:chain -- --modes=bm25`

**Target Platform**: Browser (static GitHub Pages SPA) + Node.js CLI for offline evaluation artifact generation

**Project Type**: Single-page web application (`frontend/`) with Node.js evaluation scripts (`frontend/scripts/`)

**Performance Goals**: Regenerating `src/data/evalResults.ts` for the `bm25` baseline completes in < 5 seconds locally with zero chat-model downloads (`SC-004`).

**Constraints**: Client-only SPA, global styling in `frontend/src/assets/main.css` (no `<style>` blocks in `.vue` files), retro pixel-art CRT aesthetic (`--pixel-*` variables, `border-radius <= 2px`, `steps(2, end)` transitions), strict test/train split discipline.

**Scale/Scope**: 5 files in `frontend/` (`src/data/evalResults.ts`, `src/components/EvalComparison.vue`, `src/components/BlogPostPage.vue`, `src/assets/main.css`, `scripts/eval-chain.mjs`, `scripts/trace-lib.mjs`, `scripts/generate-llms-txt.mjs`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Client-Only & On-Device (NON-NEGOTIABLE)**: PASS — No backend or external API introduced; the browser app renders the static committed `evalResults.ts` artifact, and on-device Mini-Michi chat in the dock is untouched.
- **II. Static Single-Page Simplicity**: PASS — Modifies existing `BlogPostPage.vue` and `EvalComparison.vue` components in place without adding routes or dependencies.
- **III. Verify Before Ship (NON-NEGOTIABLE)**: PASS — Verification workflow includes `npm run lint` and `npm run build` (which runs `vue-tsc --build` + `vite build`).
- **IV. Pixel-Theme Fidelity**: PASS — Any styling additions for the separate latency statistic badge live globally in `frontend/src/assets/main.css` using `--pixel-*` and `--font-*` variables; no `<style>` blocks in `.vue` components.
- **V. Accessibility & Motion Safety**: PASS — Metric selector chip buttons retain `aria-pressed` and keyboard focus styles; responsive layout at `@media (max-width: 480px)` is preserved.
- **VI. Retrieval-Ready Content**: PASS — `scripts/generate-llms-txt.mjs` and `public/llms/blog.md` are updated in sync with the blog evaluation copy (`FR-006`), and `npm run eval:retrieval` remains 100% passing.

*Post-Phase 1 Design Re-check*: All 6 constitutional principles remain satisfied. No complexity violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-retrieval-only-eval/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── eval-ui-and-artifact.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── public/
│   └── llms/
│       └── blog.md                        # Regenerated via npm run generate:llms
├── scripts/
│   ├── eval-chain.mjs                     # Retrieval + context-injection + action eval runner (writes evalResults.ts)
│   ├── eval-fixtures.mjs                  # Held-out test + train fixtures (unchanged queries/splits)
│   ├── eval-lib.mjs                       # Shared Node harness for transpiling TS modules
│   ├── eval-retrieval.mjs                 # Standalone retrieval-only check
│   ├── generate-llms-txt.mjs              # Generator for public/llms/*.md and public/llms.txt
│   └── trace-lib.mjs                      # Historical STS trace loader & retrieval/action scorer
└── src/
    ├── assets/
    │   └── main.css                       # Global retro pixel-CRT styles (eval-* classes)
    ├── components/
    │   ├── BlogPostPage.vue               # "Chat with my website" blog post & eval narrative/traces
    │   └── EvalComparison.vue             # Metric chips, split comparison chart, latency stats, per-fixture list
    └── data/
        └── evalResults.ts                 # Co-located TypeScript interfaces + committed eval artifact
```

**Structure Decision**: Existing single-project `frontend/` layout is preserved; changes are scoped to the evaluation runner scripts, the committed `evalResults.ts` artifact, the two blog evaluation Vue components, global CSS in `main.css`, and `generate-llms-txt.mjs`.

## Complexity Tracking

> No Constitution Check violations.
