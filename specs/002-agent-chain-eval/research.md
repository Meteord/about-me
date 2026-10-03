# Research: End-to-End Agent Chain Evaluation

Feature: `/specs/002-agent-chain-eval/spec.md` · Date: 2026-10-03

## Context

The site already has `scripts/eval-retrieval.mjs` (`npm run eval:retrieval`) which loads the real registry + retriever into Node (TypeScript transpiled with the local compiler, browser externals stubbed) and scores only the *retrieval stage* (Hit@K / MRR) over 27 fixtures. The user wants the **whole chain** evaluated — retrieval → pruned schemas → SLM generation → tool calls → tool execution → final answer — with results surfaced in the blog section (they chose: extend the existing "Chat with my website" post, all 3 retrieval modes, deterministic answer metrics with a pluggable judge for a later LLM judge).

Verified locally: `npm run eval:retrieval -- --modes=lexical` runs offline and passes (hit@5 = 100%, MRR = 1.000). The Node module-loading harness (transpile + `vue`/browser stubs + `wasm→cpu` remap) is proven. `frontend/package.json` pins `@huggingface/transformers ^4.2.0` (resolved 4.2.0), which bundles `onnxruntime-node@1.24.3` as a hard dependency — Node CPU inference is supported with no extra install. The HuggingFace cache (`~/.cache/huggingface/hub`) currently holds only `models--openbmb--MiniCPM5-1B`, so the first `eval:chain` run will download the chat model and (for vector/hybrid) the prompt router.

## R-1: Running the real chat model in Node

**Context**: FR-001/SC-002 require the suite to run the actual SLM, not a stub.

**Decision**: Load `LiquidAI/LFM2.5-350M-ONNX` with the real `@huggingface/transformers` module inside Node: `device: 'cpu'` (the `wasm→cpu` remap the existing eval already uses), `dtype: 'q8'` to mirror the browser WASM path, `env.allowLocalModels = false`, `env.useBrowserCache = false`. Generate with `tokenizer.apply_chat_template(messages, { tools, add_generation_prompt: true, return_dict: true })` → `model.generate({ ...inputs, max_new_tokens: 256, do_sample: <false for determinism>, temperature: 0.8, top_p: 0.9, repetition_penalty: 1.15 })` → slice `output.slice([0, 1], [inputLength, sequenceLength])` → `batch_decode(..., { skip_special_tokens: false })` so the raw `<|tool_call_start|>…<|tool_call_end|>` markers survive. This is byte-for-byte the browser pattern in `useChatModel.generate()`; research confirmed the chat template consumes `tools` natively (Jinja `tojson` is implemented in transformers.js v4) and that `generate` + `TextStreamer`/slice are supported in Node.

**Rationale**: Identical code paths to the production chat loop = the eval measures what the site actually does. No `TextStreamer` needed in Node (we capture the decoded tail directly; streaming is only for the UI).

**Alternatives considered**:
- A stub/mock chat model — SC-002 explicitly forbids it; would measure nothing.
- `dtype: 'q4'` — q4 is ~294 MB vs q8 ~634 MB and ~2.3× faster, but q8 matches the browser WASM default; keep q8 as default with a `--dtype` flag for faster smoke runs.

## R-2: Download/run budget

**Context**: The user chose all 3 modes by default; vector/hybrid need the prompt router.

**Decision**: First `eval:chain` run downloads the chat model q8 (~634 MB) and, for vector/hybrid, the prompt router q8 (~357 MB), both cached in `~/.cache/huggingface`. CPU decode is estimated ~10–40 tok/s (no public transformers.js-Node benchmark for this model), so a 256-token greedy generation is roughly 6–30 s per fixture per round. With 27 fixtures × 3 modes × up to 3 rounds, a full run is minutes-to-tens-of-minutes. Support `--modes=lexical` (offline) and `--dtype=q4` for fast validation; the blog artifact is generated from whatever modes actually ran.

**Rationale**: Heavy but matches the user's explicit "all 3 modes" choice; flag-based escape hatches keep iteration cheap.

**Alternatives considered**: Defaulting to lexical-only would undercut the "whole chain" ask and the blog's mode comparison.

## R-3: Chain harness structure (mirror `AiSection.handleSend`)

**Context**: FR-001 — the loop must match the browser's agent loop (`MAX_ROUNDS = 3`).

**Decision**: New `scripts/eval-chain.mjs` reuses the eval harness pattern but adds a shared helper `scripts/eval-lib.mjs` for transpile + stub + loader boilerplate. Per fixture: `retrieve(query, {mode, topK})` → `pruneSchemas(selectedNames)` → `buildSystemPrompt(selectedNames)` → loop ≤ MAX_ROUNDS: `generate([system, ...history], toolSchemas, ...)` → `extractToolCalls(response)` → `executeToolCall(call)` for each → push `{role:'tool', content: JSON.stringify(results)}` → repeat; stop when a round emits no calls. Record per-stage latencies and generated-token counts.

**Rationale**: Reusing `extractToolCalls`/`executeToolCall`/`buildSystemPrompt`/`pruneSchemas` verbatim (transpiled from `src/tools/registry.ts`) guarantees the eval exercises the shipped parsers and executors, not reimplementations.

**Browser side-effects in executors**: `get_content` writes `window.location.hash` and calls `useSiteLayout()` (`state.sections` mutations, `focusSection`, `nextTick`). In Node these are stubbed: a `window` shim (`{ location: { hash: '' } }`), a `useSiteLayout` stub exposing a no-op `state`/`setVisible`/`setExpanded`/`focusSection`, and the existing `vue` stub. The **textual** tool result (`getContentById(id)` content, `listContents` text, `set_theme` message) is preserved exactly — that is what the model reads and the judge scores against.

**Content must be real**: Unlike `eval-retrieval.mjs`'s empty-content stub, the chain eval stubs `../composables/useLlmsContent` with a disk-backed implementation that reads `frontend/public/llms/*.md` (same `FILE_BY_ID` mapping as `useLlmsContent.ts`) and keeps the static `listContentItems` list so `CONTENT_IDS` (the `get_content.id` enum) matches the app. `../data/siteData` is loaded **for real** (it is pure data + pure functions). Without real content the model could not answer and groundedness scoring would be meaningless.

## R-4: Deterministic answer-quality metrics

**Context**: No backend / no API keys (constitution Principle I). Research surveyed deterministic, offline agent-eval practice (SQuAD F1/EM normalization, Ragas faithfulness-as-claim-support, FActScore atomic-fact style, ToolCallAccuracy/F1, Apple's ToolsAllPass/ToolsPercentagePass split, hallucination proxy via unsupported sentences).

**Decision**: Per fixture, `expectedAnswerFacts: string[]` (atomic claims) and `bannedFacts: string[]` (contradictory claims the model must not emit), scored by a `DeterministicJudge`:

- **Fact recall**: `|expectedFacts matched| / |expectedFacts|`, where a fact matches via **strict substring** (normalized: lowercase, strip punctuation, collapse whitespace — SQuAD recipe; keep stopwords, facts carry content) **or** **token-F1 ≥ 0.8** (SQuAD bag-of-tokens) to absorb paraphrase. Short numeric/date/enum facts are matched strictly only (avoid false positives like `3` matching `3 tools`).
- **No-hallucination gate**: any `bannedFacts` match (same two-mode match) → `bannedViolation = false`.
- **Faithfulness (lexical grounding)**: split the final answer into sentences; a sentence is *supported* if its max token-overlap against any sentence of the concatenated tool results ≥ 0.35; `faithfulness = supported / total`. Entity-consistency flag: capitalized/number tokens in the answer with zero appearance in the tool results mark the sentence unsupported (cheap no-model entity probe).
- **Chain pass gate** (mirrors the "coverage gate first, LLM judge later" pattern): `pass = factRecall == 1 && no banned hit && faithfulness ≥ 0.8`. A fixture fails the run if any gate fails.

**Tool-call metrics** (research §c conventions): `toolRecall` = `|expected ∩ called| / |expected|`, `toolPrecision` = `|expected ∩ called| / |called|`, `toolF1`; `argValidityRate` = fraction of calls with valid name + valid args (`get_content.id` ∈ `CONTENT_IDS`, `set_theme.theme` ∈ enum and matching the fixture's expected args when specified); strict `toolsPass` = all expected called ∧ all args valid ∧ no unknown-tool calls (extra *valid* chained calls like `list_contents → get_content` are allowed and only reported).

**Error attribution**: a fact is *not* counted as a miss when the supporting tool was never called — record `factsMissedDueToToolMiss` separately so retrieval→tool→answer failure attribution is visible (research §c pitfall).

**Alternatives considered**:
- On-device NLI model (`cross-encoder/nli-deberta-v3-xsmall`, ~45 MB q8) for entailment-based faithfulness — feasible but heavy for a CI loop and out of v1; documented as the natural future upgrade inside the `Judge` contract (R-5).
- Whole-answer ROUGE/F1 — too coarse for short answers and gamed by stopwords; used only as a reported secondary signal if a full reference answer exists.

## R-5: Pluggable `Judge` contract

**Context**: FR-005 / user choice "deterministic first, LLM judge later".

**Decision**: Define `Judge` as `assess(case, transcript) → AnswerScore` where `transcript` is the neutral record of the run (final answer + tool results + retrieval rows + timings — no Vue types). `DeterministicJudge` (R-4) is the default. A future `LLMJudge` (e.g. a larger on-device model, or an opt-in judge behind a flag — still no backend) plugs in by implementing the same interface; chain/retrieval/fixture code does not change. The `Judge` selection is a single exported function (`createJudge(name)`) documented in the contract.

**Rationale**: User explicitly deferred the LLM judge; the interface is the deliverable now, the implementation later. NLI-based faithfulness is the most promising on-device upgrade and slots into the same `Judge` seam.

## R-6: Results artifact + blog rendering

**Context**: FR-004/FR-007 — committed, machine-readable results consumed by the blog post.

**Decision**: The script writes `frontend/src/data/evalResults.ts` containing the `EvalResults` interface **and** `export const evalResults: EvalResults = {...}` (prettier-compliant: no semicolons, single quotes, 2-space indent), so type and data can never drift. `tsconfig.app.json` already extends `@vue/tsconfig` which sets `resolveJsonModule` — but a `.ts` module is simpler and gives the interface for free; no tsconfig change. The blog renders it in a new "How well does the whole chain actually work?" section in `BlogPostPage.vue` (existing post), using `pixel-*` / `tool-*` building blocks plus new `eval-*` classes added globally to `main.css` (no `<style>` blocks, per constitution IV). Graceful degradation: if the artifact is missing/empty the section shows a "run `npm run eval:chain`" note.

**Rationale**: Static site must not evaluate at runtime; committing the generated artifact is the only pattern consistent with GitHub Pages + Principle I. `.ts` (vs `.json`) avoids JSON-import typing friction and keeps the schema in one owned file.

## R-7: Determinism

**Context**: FR-006/SC-003 — reproducible results.

**Decision**: Default run uses greedy decoding (`do_sample: false`) exactly like the site default (`retrievalSettings.sampling = false`). A `--sampling` flag enables `do_sample` for exploring variance; the artifact records the sampling flag used. Aggregates are computed over the fixtures that ran; repeated greedy runs are byte-identical.

## R-8: Runtime-trace extensibility (STS-format traces as first-class eval inputs)

**Context**: FR-009/FR-010/FR-012 and US4 — the user asked to make the suite extensible so **runtime traces** (real sessions) can be added, citing the HuggingFace Hub agent-trace feature.

**Decision**: Align with the HuggingFace **Session Trace Simple Format (STS-Format)** (verified against `huggingface.co/docs/hub/session-traces-format`): a JSONL file whose first line is `{ "type": "session", "harness", "id", "name"?, … }` and whose remaining lines are message envelopes `{ "type": "message", "message": { "role": "user"|"assistant"|"system"|"tool", "content", "toolCalls"?: [{ "id", "function": { "name", "arguments" } }], "toolCallId"?, "timestamp"?, "model"? } }`. Tool results are `role:"tool"` messages linked to a call via `toolCallId`. Use `harness: "about-me.mini-michi"`.

Three cooperating pieces:

1. **Browser recorder** (`src/composables/useTraceRecorder.ts` + a "Save trace" control in `AiSection.vue`): serializes a finished session into STS JSONL from the existing transcript (`messages` ref) and downloads it as `<id>.jsonl`. Mapping: `user` → `role:"user"`; `retrieval` → `role:"system"` with a deterministic human-readable summary (`retrieval · top 5/31 · effective hybrid · 12ms · selected: get_content, list_contents`) — the STS message object allows no extra fields, so the summary stays in `content`; `tool-call` → `role:"assistant"` with `content:""` and `toolCalls[]` (ids `tc<round>-<i>`, `arguments` = `JSON.stringify` of the parsed args); `tool-result` → one `role:"tool"` message per result with `toolCallId` and `content` = the result payload as the model saw it; final `assistant` text → `role:"assistant"` with `model: "LiquidAI/LFM2.5-350M"`. Pure client-side download — no backend (Principle I).

2. **Ingestion/scoring in the eval** (`scripts/trace-lib.mjs` + `--traces` in `eval-chain.mjs`): `--traces=<file|dir|url>`, default `frontend/traces/`. A `TraceSource` loader interface with `file`, `dir`, and `url` (Node global `fetch`) implementations turns a spec into `TraceSession[]` (per-line validation, errors reported and the trace skipped). Each trace is scored **historically** (judges the recorded session, no re-execution):
   - **Retrieval coverage**: re-run `retrieve(userQuery, {mode, topK})` and check every tool the session *called* is in the current top-K — detects retrieval drift without needing to parse the recorded summary.
   - **Tool validity**: each recorded call re-parsed (`parsePythonicCalls`) and validated against current `TOOL_SCHEMAS`/`CONTENT_IDS` — catches registry drift.
   - **Answer**: `DeterministicJudge`-style scoring on the recorded final answer: faithfulness (lexical grounding vs the trace's own tool results), banned-fact gate against a small site-wide list, and a pass gate.
   - Aggregates (`groundedRate`, `toolValidRate`, `retrievalCoverRate`, `bannedViolationRate`, `passRate`, `count`, `sources`) go into the artifact's `traces` section and the blog block.

3. **Extensibility seam**: adding a trace origin (e.g. a HF dataset/bucket API) = one `TraceSource` loader implementing `load(spec) → TraceSession[]`; scoring/metrics/artifact/blog code never changes (FR-012/SC-008).

**Rationale**: STS-format is the interoperable, viewer-ready choice the user pointed at — a saved session is immediately useful on the Hub and in the eval. Historical scoring (vs re-running the model) keeps the suite fast, offline, deterministic, and measures what *actually happened* in production, complementing the generative fixture loop.

**Alternatives considered**:
- Custom JSON trace format — rejects interop with the HF viewer/datasets the user referenced.
- Re-running each trace through the model — slower, non-deterministic, and measures the *current* chain, not the recorded session; relegated to the `--traces-as-fixtures` future seam (trace → `EvalCase` adapter, documented in `contracts/traces.md`, not in v1).
- Auto-uploading traces from the browser — violates Principle I (static site pushes nothing). Manual download only.

## Open items resolved from spec

- All NEEDS CLARIFICATION markers from the plan's Technical Context draft were resolved above: Node SLM execution (R-1), model sizes/budget (R-2), harness shape (R-3), metric definitions (R-4), judge seam (R-5), artifact/blog mechanism (R-6), determinism (R-7), runtime-trace extensibility (R-8).