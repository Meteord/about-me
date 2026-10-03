# Feature Specification: GLiNER2.5-Decide Retrieval Mode

**Feature Branch**: `003-gliner-decide-retrieval`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "i want additionally to to lfm2.5 prompt router a decision model like https://huggingface.co/fastino/GLiNER2.5-Decide to decide which content to retrieve. can you add this as another option?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New `decide` retrieval mode using an on-device decision model (Priority: P1)

Mini-Michi gains a fourth retrieval mode, `decide`, that uses the **GLiNER2.5-Decide** decision model (DeBERTa-v3-large, 340M, Apache-2.0) to decide which content sources to retrieve. Given the visitor's query as the "state" and the site's content sources as the candidate labels, the model returns one probability per source; the top-K become the retrieved context exactly like the vector mode. It is a pure on-device classifier — no generation, no tool-call syntax — and the chat loop never forces it: when the model is not loaded (or a pass fails) the retriever falls back to lexical, exactly like vector mode. Because `fastino/GLiNER2.5-Decide` publishes no ONNX weights, the official `onnx-community/GLiNER2.5-Decide-mobile-ONNX` export (345 MB, q4f16, phone-safe) is used via transformers.js, with the GLiNER2 classification processor ported into the codebase (the site already ports the LFM2.5 prompt-router format).

**Why this priority**: This is the core of the request — "a decision model … to decide which content to retrieve … as another option". It makes the "which source is the visitor asking about?" decision an explicit, trained classification step instead of an embedding-scoring heuristic, and it rides the existing lazy-load/fallback machinery so it never regresses the default experience.

**Independent Test**: Open the dock → Model settings → select **DECIDE** → the model downloads once (345 MB, cached) → the tool-selector ranks the sources and the chat answers from the injected top-K; with the model unavailable or a failing pass, the panel reports the effective `lexical` fallback.

**Acceptance Scenarios**:

1. **Given** the dock is open, **When** the visitor selects the `decide` mode and sends a query, **Then** the retriever loads the GLiNER2.5-Decide model lazily (one-time download, progress surfaced in the panel), runs one forward pass, and the top-K sources are injected into the chat context.
2. **Given** the `decide` mode is selected, **When** the model is not yet loaded (or a pass throws), **Then** the retriever returns lexical scores and `stats.effective === 'lexical'` (recorded in the transcript + tool selector), never crashing the chat.
3. **Given** a theme request, **When** `decide` mode runs, **Then** `set_theme` is one of the candidate labels, so `decideAction` still fires on a top-ranked `set_theme` row (unchanged heuristic).
4. **Given** the visitor clears the chat, **When** the dispose path runs, **Then** the GLiNER model session is disposed (`disposeDecide()`), freeing memory (constitution Principle I).
5. **Given** `detectDevice` reports WebGPU, **When** the decide model loads, **Then** WebGPU is attempted first with a WASM fallback (same pattern as the prompt router); the reported device/dtype is shown in the panel.

---

### User Story 2 - Eval coverage: `decide` in the retrieval + chain suites (Priority: P1)

Both eval scripts accept `--modes=…,decide`: `eval:retrieval` reports Hit@K/MRR for the decision model over the existing 35 fixtures, and `eval:chain` runs the whole chain (retrieve → context → LFM2.5-350M → answer) in `decide` mode, aggregating into the committed `evalResults.ts` artifact the blog renders. The GLiNER model runs on CPU q4f16 in Node (via the same transpile + `wasm→cpu` remap the harness already applies), is deterministic (a classifier — no sampling), and its per-case effective-mode fallback is recorded.

**Why this priority**: The whole point of adding an "option" is to compare it. The eval must measure how often the decision model retrieves the right source so the mode comparison (and the blog's eval section) is honest.

**Independent Test**: `npm run eval:retrieval -- --modes=decide` downloads the model (first run), reports per-fixture + aggregate Hit@K/MRR and exits non-zero on misses; `npm run eval:chain -- --modes=decide` writes a `decide` mode aggregate into `evalResults.ts`.

**Acceptance Scenarios**:

1. **Given** the repo, **When** the maintainer runs `npm run eval:retrieval -- --modes=decide`, **Then** every fixture is scored by the real GLiNER2.5-Decide model on CPU q4f16 and the report prints `decide: hit@K = …% · MRR = …`.
2. **Given** `eval:chain` with `decide` in `--modes`, **When** it finishes, **Then** the artifact's `modes[]` contains a `decide` aggregate (hit@K, MRR, factRecall, faithfulness, chainPassRate…) and the blog's eval section renders it.
3. **Given** the decide model fails to load in the harness, **When** a case runs, **Then** it is scored with lexical scores and `effectiveMode: 'lexical'` (mirroring the router failure path), and the run still completes.
4. **Given** repeated runs with default (greedy) settings, **When** the decide cases are compared, **Then** scores are byte-identical (deterministic classifier, FR-006 analog).
5. **Given** the harness stubs, **When** the decide loader transpiles, **Then** the existing `wasm→cpu` / `useBrowserCache` remaps apply unchanged (the loader lives in `useToolRetrieval.ts`, same as the router).

---

### User Story 3 - Documentation & copy for the decision model (Priority: P3)

The on-site copy that explains the retriever (tool-selector intro/gloss, `AiSection` mode gloss, the "Chat with my website" blog post, `siteData.ts` retriever card, `public/llms/blog.md`) mentions the new `decide` option, and the design of the mode — model, layout, fallback — is documented in `contracts/decide-mode.md`. No new `SectionId`, routes, or styles are introduced.

**Why this priority**: Constitution VI requires the site's own content to stay truthful about the AI demo; the mode selector UI and the blog must describe what DECIDE actually is so visitors aren't misled.

**Independent Test**: Select DECIDE in the dock, open the blog post's retriever card, and re-run `npm run generate:llms` → all copy mentions the decision model; `npm run build` passes.

**Acceptance Scenarios**:

1. **Given** the dock's retriever panel, **When** the visitor reads the mode selector and gloss, **Then** DECIDE is listed with a truthful one-line gloss (e.g. "decision model") and the intro mentions the on-device classifier.
2. **Given** the "Chat with my website" post, **When** rendered, **Then** its retriever section/card describes BM25, the prompt router, **and** the GLiNER2.5-Decide decision option without inventing claims.
3. **Given** a regenerated `public/llms/blog.md`, **When** the eval fixtures are run, **Then** no fixture regressions are introduced by the copy change (fixtures unchanged).

---

### Edge Cases

- What happens when the GLiNER download fails mid-run? → `loadDecide()` sets `decide.status = 'error'` with a humanized message; `retrieve()` falls back to lexical for the mode; the panel shows Retry (mirroring the vector path).
- What happens when the query is empty? → `retrieve()` returns the empty result before any model pass (same guard as today).
- What happens when the query + labels exceed the token context? → The processor truncates the **state** (the query) from the end, never the schema (labels/markers), mirroring the reference `encodeGliner2Sequence()`; the default context is 1024 tokens (DeBERTa-v3 uses relative positions only — the export's `max_len: 512` is not a hard limit). The contract documents the budget.
- What happens on a theme query in decide mode? → `set_theme` is a candidate label; `decideAction` (score ≥ 0.6 + rank 0 + explicit color/cycle) is unchanged.
- What happens if the GLiNER logits are all near-zero / the decision is flat? → Scores are still normalized and ranked like other modes; no special-casing (the eval exposes whether the mode is useful).
- What about German queries? → GLiNER2.5-Decide is English-trained; German fixtures may underperform in decide mode. This is expected and visible in the eval comparison (documented in research R-2).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `useToolRetrieval.ts` MUST add a fourth `RetrievalMode` value `'decide'` and a lazy, disposable GLiNER2.5-Decide loader (`loadDecide()` / `disposeDecide()`, parallel to `loadVector()` / `disposeVector()`) using `onnx-community/GLiNER2.5-Decide-mobile-ONNX`, dtype `fp16` on WebGPU and `q4f16` on WASM (CPU q4f16 in the eval), WebGPU-first with WASM fallback, `env.allowLocalModels = false`, `env.useBrowserCache = true` in the browser.
- **FR-002**: `retrieve()` MUST score a `decide` query with the ported GLiNER2 classification processor (contract `contracts/decide-mode.md`): build the `( [P] prompt ( [L] label_1 [L] label_2 … ) ) [SEP_TEXT] state` layout from the decision prompt + source labels + query, tokenize with `add_special_tokens: false`, run the ONNX graph with `input_ids`/`attention_mask`/`marker_positions` (int64), and softmax the per-marker `logits` into per-source probabilities that rank into the same `rows`/`selectedNames` contract as the other modes.
- **FR-003**: Fallback semantics MUST match vector mode: `decide` is never forced by the chat loop; when the model is not `ready` or a pass throws, lexical scores are used and `stats.effective` records `'lexical'`.
- **FR-004**: `decide` MUST be surfaced in the dock UI (`ToolSelectorPanel.vue`): a DECIDE chip in the mode group, its gloss, a loading progress bar + error/Retry for the decide model, and truthful intro copy.
- **FR-005**: `AiSection.vue` MUST include `decide` in `MODE_GLOSS`, warm `loadDecide()` exactly like `loadVector()` (only when the mode is decide; never force), and call `disposeDecide()` alongside `disposeVector()` on Clear.
- **FR-006**: `scripts/eval-retrieval.mjs` and `scripts/eval-chain.mjs` MUST accept `decide` in `--modes` (and include it in the default modes list), load the model via the existing harness (transpile + `wasm→cpu` remap; CPU q4f16), and record `effectiveMode` per case. `eval:retrieval` reuses the existing 35 fixtures unchanged.
- **FR-007**: The generated artifact `frontend/src/data/evalResults.ts` MUST include `decide` in `config.modes` and `modes[]` aggregates when it runs (schema unchanged — modes are already free-form strings); `BlogPostPage.vue` renders it without changes.
- **FR-008**: No new runtime npm dependency: the GLiNER processor is ported in-repo (like the prompt-router port), reusing the pinned `@huggingface/transformers`. `open-jev` is explicitly NOT used (its `detectFamily` rejects this model's `gliner2` config section).
- **FR-009**: Copy that describes the retriever MUST mention the decision-model option: `ToolSelectorPanel.vue` intro, `AiSection.vue` `MODE_GLOSS`, the retriever tech card in `src/data/siteData.ts`, `public/llms/blog.md` (regenerated via `npm run generate:llms`, and `scripts/generate-llms-txt.mjs` if it embeds retriever copy).
- **FR-010**: `contracts/decide-mode.md` MUST document the model (repo, dtype, sizes, license), the exact GLiNER2 processor layout + special-token ids, the tensor I/O, the truncation rule, and the fallback semantics — the single source of truth the implementer and evaluator share.

### Key Entities *(include if feature involves data)*

- **DecideState**: the load lifecycle of the GLiNER model (`status`/`device`/`dtype`/`progress`/`file`/`error`), the same shape as `vectorState` (shared `VectorState` interface or a generalized alias).
- **DecidePrompt**: the ported GLiNER2 processor input — decision prompt, ordered labels (one per `SOURCE_DEFS` entry, including `set_theme`), optional `[DESCRIPTION]` per-label hints, and the tokenized `input_ids`/`attention_mask`/`marker_positions` tensors.
- **DecideScores**: the per-source probability array from softmax over the per-marker `logits`, ranked into the existing `ToolScore[]`/`selectedNames` contract.
- **DecideRunResult**: per-case eval entry (`mode: 'decide'`, `effectiveMode`, rows, selected names, latency) flowing into the existing `CaseResult` — no schema change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run eval:retrieval -- --modes=decide` runs all 35 fixtures against the real model with no uncaught errors; exit code reflects retrieval misses.
- **SC-002**: `npm run eval:chain -- --modes=decide` completes and writes a `decide` mode aggregate + `effectiveMode` values into `evalResults.ts`; repeated runs with default settings are byte-identical.
- **SC-003**: In the browser, selecting DECIDE loads the model (progress shown), answers a query from the injected top-K, and clears/disposes the model on Clear with no console errors.
- **SC-004**: With the decide model unavailable or a failing pass, `retrieve()` returns lexical scores with `effective: 'lexical'` and the chat still answers.
- **SC-005**: `npm run lint` → `npm run build` pass from `frontend/` (constitution Principle III).
- **SC-006**: The blog's eval section and the retriever card render the `decide` mode/copy with zero console errors and no ≤480px regression.

## Assumptions

- The GLiNER model runs fully on-device in the browser and on CPU in the eval harness; no backend, no API keys (constitution Principle I).
- `onnx-community/GLiNER2.5-Decide-mobile-ONNX` (345 MB q4f16) is the default artifact: smallest download, phone-safe, CPU-verified (max prob diff 0.028 vs the reference q4f16). dtype is `fp16` on WebGPU and `q4f16` on WASM/CPU (the demo `shreyask/open-jev-demo` confirms fp16 is the fast WebGPU default for this DeBERTa graph). The non-mobile `onnx-community/GLiNER2.5-Decide-ONNX` q4f16 (523 MB) remains a documented alternative.
- The GLiNER2 processor port matches the reference `encodeGliner2Sequence()` from the open (unmerged) `nico-martin/open-jev#1` PR token-for-token; `shreyask/open-jev-demo` (`?model=gliner2-decide`) proves the export runs on WebGPU in the browser and on Node CPU.
- transformers.js can load the export: the graph is a standard DeBERTa-v2 encoder + trained label head; transformers.js supports `deberta-v2`, and the site already calls custom graphs through `PreTrainedModel.from_pretrained` (the prompt router) with custom inputs/outputs — the GLiNER graph is the same shape (`input_ids`/`attention_mask`/`marker_positions` → `logits`).
- The decision labels are exactly the existing `SOURCE_DEFS` names (about_bio, about_education, …, site_index, set_theme), so the retriever's `rows`/`selectedNames` contract and `decideAction` need no new mapping logic.
- GLiNER2.5-Decide is English-trained; German-language fixtures may score worse in `decide` mode — an expected, visible outcome of the eval, not a defect.
- The existing 35 fixtures are reused unchanged (mode-agnostic); no fixture edits are required.