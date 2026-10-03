# Implementation Plan: End-to-End Agent Chain Evaluation

**Branch**: `002-agent-chain-eval` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-agent-chain-eval/spec.md`

## Summary

Add an end-to-end evaluation suite (`npm run eval:chain`) that runs the *whole* on-device agent chain exactly as the site does — retrieval → pruned schemas → LFM2.5-350M generation → tool-call parsing/execution → final answer — over the existing 27 fixtures, extended with answer-fact expectations. It reports retrieval, tool-call, answer-quality (deterministic `Judge`, pluggable for a later on-device LLM judge), and latency metrics per mode (lexical/vector/hybrid), exits non-zero on failures, and writes a committed `frontend/src/data/evalResults.ts` artifact that the existing "Chat with my website" blog post renders in a new "How well does the whole chain actually work?" section. The browser pattern transfers 1:1 to Node CPU (research R-1): the same `apply_chat_template`/`generate`/slice/decode calls, `device:'cpu'`, `dtype:'q8'`.

**Extensibility (US4/R-8)**: the suite is also a **runtime-trace** evaluator. A "Save trace" control in the dock exports finished sessions in the HuggingFace **STS-format** JSONL (`harness: "about-me.mini-michi"` — interops with the HF trace viewer/datasets); dropping files into `frontend/traces/` (or `--traces=<file|dir|url>`) scores each real session historically — re-run retrieval for coverage of the tools the session used, validate the recorded calls against the current registry, and judge the recorded answer (groundedness + site-wide banned facts). Trace loading is behind a `TraceSource` interface (`file`/`dir`/`url` loaders), so new sources (e.g. an HF dataset) are a one-loader change (FR-012/SC-008). Trace aggregates render as a "runtime traces" block in the same blog section.

## Technical Context

**Language/Version**: TypeScript 5.8 on Vue 3 (`<script setup lang="ts">`), Vite (`rolldown-vite`), Node `^20.19.0 || >=22.12.0`. Eval scripts are ESM `.mjs` (mirroring `eval-retrieval.mjs`).

**Primary Dependencies**: `@huggingface/transformers` 4.2.0 (bundles `onnxruntime-node@1.24.3` — Node CPU inference, no extra install), the existing `typescript` transpiler, plus `mermaid` already used by the blog post (unchanged). No new runtime deps.

**Storage**: Static only. Generated artifact `frontend/src/data/evalResults.ts` is committed; model checkpoints cached in `~/.cache/huggingface` (chat q8 ~634 MB, router q8 ~357 MB, first-run downloads).

**Testing**: No test suite (constitution Principle III). Gates: `npm run lint` → `npm run build` from `frontend/`; `npm run eval:retrieval` when tool docs/fixtures change; the new `npm run eval:chain` is itself a verification tool (deterministic greedy default; exit 0 iff all fixtures pass the chain gate — `contracts/eval-metrics.md`).

**Target Platform**: Static single-page app on GitHub Pages at base `/about-me/` (client-side only). The eval runs on the maintainer's Node machine / CI — never in the visitor's browser.

**Project Type**: Web application (frontend-only) + offline Node evaluation harness in `frontend/scripts/`.

**Performance Goals**: Eval harness: greedy generation of ≤256 new tokens per round, CPU q8. Practical budget: ~6–30 s per fixture-round; full 27-fixture × 3-mode run is minutes-to-tens-of-minutes (documented in quickstart; `--modes=lexical --dtype=q4` for fast iteration). No runtime performance impact on the site.

**Constraints**: No backend, no secrets, no runtime model calls for rendering; `vite.config.ts` base stays `/about-me/`; all styles global in `src/assets/main.css` with `pixel-*`/`tool-*`/`eval-*` naming, no `<style>` blocks, no `border-radius` > 2px, stepped easing; accessibility conventions preserved; `eval:retrieval` behavior unchanged.

**Scale/Scope**: 3 new scripts (`eval-lib.mjs`, `eval-chain.mjs`, `trace-lib.mjs`), 1 extended fixtures module, 1 generated artifact, 1 new browser composable (`useTraceRecorder.ts`) + a "Save trace" control in `AiSection.vue`, 1 modified component (`BlogPostPage.vue`), global CSS additions, `package.json` script, a `frontend/traces/` directory + README, and llms/blog copy sync. No new sections, routes, `SectionId`s, or dependencies.

## Constitution Check

*GATE: Passed before Phase 0 research. Re-checked after Phase 1 design below.*

| Principle | Status | Notes |
|---|---|---|
| I. Client-Only & On-Device | ✅ PASS | Eval runs only as a local/CI Node tool; the site statically consumes the committed artifact. Judge is deterministic/offline by default; a future LLM judge stays on-device (contract). No backend, no secrets, no runtime model calls for rendering. |
| II. Static Single-Page Simplicity | ✅ PASS | No new views/routes/`SectionId`s. The blog section is an extension of the existing `BlogPostPage.vue`. No new frameworks or state libraries. |
| III. Verify Before Ship | ✅ PASS | Lint → build remain the mandatory gates; `eval:chain` adds a new verification tool, not a replacement. Quickstart defines the order and manual scenarios. |
| IV. Pixel-Theme Fidelity | ✅ PASS | New eval UI uses global classes only (new `eval-*` in `main.css`), `:root` variables, existing building blocks (`pixel-chip`, `tool-result__bar`), no `<style>` blocks, no rounded/glossy surfaces. |
| V. Accessibility & Motion Safety | ✅ PASS | Results section keeps `:focus-visible`, `aria-*`, `prefers-reduced-motion` handling and the ≤480px breakpoint; keyboard- and screen-reader-friendly. |
| VI. Retrieval-Ready Content | ✅ PASS | `eval-fixtures.mjs` extended (facts are test expectations, not site content); `public/llms/blog.md` + `generate-llms-txt.mjs` updated so `about_site` describes the new eval section; no `SectionId`/`TOPIC_SECTION`/`SECTION_LABEL` changes needed. |

**Gate result**: PASS — no unjustified deviations.

## Post-Design Constitution Check (after Phase 1)

Re-confirmed: design adds no dependencies, no backend, no `<style>` blocks, no `SectionId`, no routing, and no runtime downloads. The `evalResults.ts` artifact is committed static data rendered by the existing post; the eval tooling lives in `frontend/scripts/` and never ships in the browser bundle. Determinism (greedy default, FR-006) and the `Judge` seam (FR-005) keep the tool honest and future-proof while honoring "no secrets / client-only" (Principle I).

**Trace extensibility (US4/FR-009–012) re-check**: the browser recorder exports a **download only** — the static site never uploads anything (Principle I holds). `TraceSource` `url` loading is confined to the local/CI eval tool (Node `fetch`), never in the browser bundle. The new dock control keeps `:focus-visible`/`aria-*` and reduced-motion conventions (Principle V). The "Save trace" control adds no state, no routing, and no library (Principle II).

## Project Structure

### Documentation (this feature)

```text
specs/002-agent-chain-eval/
├── plan.md               # This file
├── spec.md               # Feature specification
├── research.md           # Phase 0 output (Node model execution, metrics, artifact, traces)
├── data-model.md         # Phase 1 output (EvalCase, CaseResult, TraceSession, EvalArtifact, …)
├── quickstart.md         # Phase 1 output (validation/run guide)
├── contracts/
│   ├── eval-metrics.md   # Metric formulas, normalization, thresholds, gates (fixtures + traces)
│   ├── judge.md          # Judge interface + selection (deterministic now, LLM later)
│   ├── artifact.md       # evalResults.ts schema + stability rules
│   └── traces.md         # STS-format trace schema, recorder + ingestion + TraceSource seam
└── tasks.md              # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/scripts/
├── eval-lib.mjs          # NEW: shared Node harness (transpile, browser stubs incl. window shim,
│                         #      disk-backed llms-content stub, retriever + chat-model loaders)
├── trace-lib.mjs         # NEW: STS-format parser/validator, TraceSource loaders (file/dir/url),
│                         #      TraceSession normalization + per-trace scoring helpers
├── eval-chain.mjs        # NEW: end-to-end chain eval (npm run eval:chain) — fixture loop,
│                         #      MAX_ROUNDS=3 mirror of AiSection.handleSend, deterministic judge,
│                         #      per-mode aggregates + trace scoring, writes src/data/evalResults.ts,
│                         #      exit code
├── eval-fixtures.mjs     # MODIFIED: each fixture gains expectedAnswerFacts[] + bannedFacts[]
│                         #      (+ optional expectedArgs); BANNED_TRACE_FACTS site-wide list
└── eval-retrieval.mjs    # UNCHANGED: retrieval-only eval keeps working (validated offline)

frontend/traces/
├── README.md             # NEW: drop .jsonl traces here; privacy guidance (mirrors HF)
└── <session>.jsonl       # USER-ADDED runtime traces (gitignore optional)

frontend/src/
├── composables/
│   └── useTraceRecorder.ts  # NEW: maps the chat transcript to STS-format JSONL + download helper
├── components/
│   ├── AiSection.vue        # MODIFIED: "Save trace" control in the dock (enabled when transcript
│   │                        #      non-empty and idle)
│   └── BlogPostPage.vue     # MODIFIED: new "How well does the whole chain actually work?" section
│                            #      rendering modes[] + cases[] + traces block from evalResults.ts,
│                            #      graceful when empty
├── data/
│   └── evalResults.ts       # GENERATED (committed): EvalResults interface + const (contracts/artifact.md)
└── assets/main.css          # MODIFIED: eval-* classes (mode comparison + per-case bars + trace block)

frontend/scripts/generate-llms-txt.mjs  # MODIFIED: blog.md copy mentions the eval-results section
frontend/public/llms/blog.md            # REGENERATED via npm run generate:llms

frontend/package.json     # MODIFIED: add "eval:chain": "node scripts/eval-chain.mjs"
```

**Key design decision**: the harness reuses the *shipped* modules (`registry.ts` → `buildSystemPrompt`/`pruneSchemas`/`extractToolCalls`/`executeToolCall`, `useToolRetrieval.retrieve`, `useChatModel.generate`) transpiled into Node, with browser side-effects (`window.location.hash`, `useSiteLayout`) stubbed so only the textual tool result reaches the model — the eval therefore measures the production chain, not a reimplementation. Results are committed as a `.ts` module (type + data co-located) so the blog renders the exact numbers without ever running a model in the browser. **Runtime traces** are first-class inputs: the same STS format the browser exports and the HF Hub renders (`contracts/traces.md`) is parsed by `trace-lib.mjs`, scored historically via the same `Judge`/thresholds, and loaded through a `TraceSource` table so adding a new origin never touches scoring (FR-012/SC-008).