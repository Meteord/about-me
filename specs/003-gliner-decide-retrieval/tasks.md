---

description: "Task list template for feature implementation"
---

# Tasks: GLiNER2.5-Decide Retrieval Mode

**Input**: Design documents from `/specs/003-gliner-decide-retrieval/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/decide-mode.md, quickstart.md

**Tests**: No test suite exists in this project (constitution Principle III). The mandatory gates are `npm run lint` → `npm run build` from `frontend/`, plus the eval suites (`npm run eval:retrieval`, `npm run eval:chain`). No TDD tasks are generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/scripts/` (single frontend repo, no backend)
- Source of truth for the mode semantics: `specs/003-gliner-decide-retrieval/contracts/decide-mode.md` (layout, special-token ids, tensor I/O, truncation, fallback). A scoring number or layout step that deviates from it is a bug.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the baseline is green and the no-new-dependency constraint holds before any code changes.

- [X] T001 Verify the baseline is green before starting: run `npm run lint` then `npm run build` from `frontend/` and confirm both pass (constitution Principle III). No source changes.
- [X] T002 [P] Confirm FR-008 holds: inspect `frontend/package.json` and verify no new runtime dependency is added for this feature (existing pinned `@huggingface/transformers` only) and that `open-jev` is NOT used — the GLiNER2 processor is ported in-repo. If a dependency would be needed, stop and flag it.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `decide` core in `frontend/src/composables/useToolRetrieval.ts` — loader, GLiNER2 processor port, scoring, fallback, and `retrieve()` branch. This BLOCKS both US1 (browser UI) and US2 (eval) because both consume the exported `decide` state / `loadDecide()` / `disposeDecide()` / the `'decide'` branch of `retrieve()`.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add the `'decide'` value to the `RetrievalMode` union in `frontend/src/composables/useToolRetrieval.ts:26` so it becomes `'lexical' | 'vector' | 'hybrid' | 'decide'` (flows into `RetrievalStats.mode`/`effective` automatically). Add a `decideState` ref (the `DecideState` entity) mirroring `vectorState` at `frontend/src/composables/useToolRetrieval.ts:63`: fields `status: 'idle' | 'loading' | 'ready' | 'error'`, `device: 'webgpu' | 'wasm'`, `dtype: string`, `progress: number`, `file: string`, `error: string | null`. State transitions per data-model.md: "idle → loading → ready (success), loading → error (failure, loadDecide() re-enterable), any → idle on disposeDecide()."
- [X] T004 Add the decide-model constants at the top of `frontend/src/composables/useToolRetrieval.ts` (near `MODEL_ID` at line 19): `DECIDE_MODEL_ID = 'onnx-community/GLiNER2.5-Decide-mobile-ONNX'`, the task prompt text (e.g. "Which content source answers this question?"), and the GLiNER2 special-token ids table verbatim from `contracts/decide-mode.md`: `[SEP_STRUCT]`=128001, `[SEP_TEXT]`=128002, `[P]`=128003, `[C]`=128004, `[E]`=128005, `[R]`=128006, `[L]`=128007, `[EXAMPLE]`=128008, `[OUTPUT]`=128009, `[DESCRIPTION]`=128010.
- [X] T005 Port the GLiNER2 processor into `frontend/src/composables/useToolRetrieval.ts` as a pure function building the `DecidePrompt` tensors. Layout MUST reproduce `contracts/decide-mode.md` exactly: `( [P] <task text> ( [L] label_1 [L] label_2 … ) ) [SEP_TEXT] <state>`. Rules (contract): prompt and labels keep their case and are tokenized **as whole strings**; optional per-label hints appended as `[DESCRIPTION] label: description`; the state is lowercased, split with a word regex, given a terminal `.` if it has none, and tokenized **one word at a time** with `add_special_tokens: false`; `(` and `)` are standalone words; **no `[CLS]`/`[SEP]`**. Labels = the existing `SOURCE_DEFS` names in registry order (imported from `../tools/registry`, includes `set_theme`); marker order == label order. Outputs: `input_ids` [1, seq], `attention_mask` [1, seq] (all ones), `marker_positions` [1, markers] as int64 = the token index of every `[L]` token. Validation per data-model.md: "Marker count == label count; marker_positions values must be valid indices into input_ids."
- [X] T006 Add the 1024-token context budget to the processor in `frontend/src/composables/useToolRetrieval.ts`. Verbatim from `contracts/decide-mode.md`: "DeBERTa-v3 uses **relative positions only**, so the export's declared `max_len: 512` is **not** a hard model limit; … Use a 1024-token default; truncation is applied to the **state only**, from the end (`budget = maxLength − schema`), never the schema." Implement state truncation from the end to fit `maxLength − schema`.
- [X] T007 Implement `decideScores(query, docs)` in `frontend/src/composables/useToolRetrieval.ts` (parallel to `vectorScores` at line 255): call the model session with `{ input_ids, attention_mask, marker_positions }` and softmax the per-marker `logits` (single question → one group). Scoring per `contracts/decide-mode.md`: "`probabilities = softmax(logits)` over all markers (single question → one group). `score_i = probabilities_i / max(probabilities)` (normalized to a top score of 1.0, matching the other modes' display contract)." Return the normalized per-source score array (order = `SOURCE_DEFS` order via `docs`).
- [X] T008 Implement `loadDecide()` + inner loader in `frontend/src/composables/useToolRetrieval.ts` mirroring `loadRouterInner` at line 280 (dynamic `import('@huggingface/transformers')`, `env.allowLocalModels = false`, `env.useBrowserCache = true`, progress via a `decide` progress callback updating `decideState.progress`/`decideState.file`). WebGPU attempted first: `device: 'webgpu', dtype: 'fp16'`; on failure fall back to `device: 'wasm', dtype: 'q4f16'` (FR-001 / `contracts/decide-mode.md` Loading). Hold a lazy singleton `{ tokenizer, model }` and a `decideLoading` promise guard. **IMPORTANT**: keep the literal string `device: 'wasm'` in the WASM fallback so the eval harness remaps at `frontend/scripts/eval-lib.mjs:154` (`.replace(/device: 'wasm'/g, "device: 'cpu'")`) apply — the eval runs CPU q4f16. On failure set `decideState.status = 'error'` with a humanized message and rethrow; `loadDecide()` must be re-enterable after an error.
- [X] T009 Implement `disposeDecide()` in `frontend/src/composables/useToolRetrieval.ts` mirroring `disposeVector` at line 344: `model.dispose()` (guard against errors), null the singleton + loading promise, reset `decideState` to `status: 'idle'`, `device: 'wasm'`, `dtype: 'q4f16'`, `progress: 0`, `file: ''`, `error: null`.
- [X] T010 Wire the `decide` branch into `retrieve()` at `frontend/src/composables/useToolRetrieval.ts:454`. Per data-model.md retrieve flow: (1) `retrieve(query, { mode: 'decide' })`; (2) "If `decideState.status !== 'ready'` → run lexical, `effective = 'lexical'`"; (3) else build `DecidePrompt` → run model → `DecideScores` → rank → `rows`/`selectedNames`, `effective = 'decide'`; (4) "On any model error → lexical fallback, `effective = 'lexical'`." Verbatim data-model rule: "A `decide` query with the model not `ready` must not throw — it degrades to lexical (effective mode recorded)." Also add `decide`, `loadDecide`, `disposeDecide` to the `useToolRetrieval()` return object at `frontend/src/composables/useToolRetrieval.ts:531`.

**Checkpoint**: Foundation ready — `retrieve(query, { mode: 'decide' })` compiles and returns ranked rows with a `lexical` effective fallback when the model is not loaded. User story implementation can now begin.

---

## Phase 3: User Story 1 - New `decide` retrieval mode (Priority: P1) 🎯 MVP

**Goal**: The dock exposes a DECIDE mode chip; selecting it lazily loads GLiNER2.5-Decide, shows download progress, ranks the sources via the decision model, and the chat answers from the injected top-K with the effective mode recorded. The model is disposed on Clear. Decide is never forced by the chat loop.

**Independent Test**: Open the dock → Model settings → select **DECIDE** → the model downloads once (345 MB, cached) → the tool-selector ranks the sources and the chat answers from the injected top-K; with the model unavailable or a failing pass, the panel reports the effective `lexical` fallback and the chat still answers.

### Implementation for User Story 1

- [X] T011 [US1] In `frontend/src/components/ToolSelectorPanel.vue`: add `'decide'` to the `MODES: RetrievalMode[]` array (line 15) and add `MODE_LABEL.decide = 'DECIDE'` to the label record (line 16).
- [X] T012 [US1] In `frontend/src/components/ToolSelectorPanel.vue`: extend the mode gloss at line 242-244 from `keyword · meaning · both` to `keyword · meaning · both · decision` (FR-004).
- [X] T013 [US1] In `frontend/src/components/ToolSelectorPanel.vue`: destructure `decide`, `loadDecide` from `useToolRetrieval()` (line 12) and extend `setMode` (line 63): when `next === 'decide'`, call `void loadDecide()` unless `decide.status` is already `'ready'` or `'loading'` (mirror the existing vector/hybrid branch).
- [X] T014 [US1] In `frontend/src/components/ToolSelectorPanel.vue`: add a decide-model loading progress block + error/Retry block in the "Content retriever" section mirroring the vector ones at lines 270-289: when `decide.status === 'loading'` render the `.ai-progress`/`tool-selector__progress` bar with `role="progressbar"` + `aria-valuemin/aria-valuemax/aria-valuenow` and the current `decide.file`; when `decide.status === 'error'` render a `tool-selector__error` line ("Decide retriever failed to load — falling back to lexical scores.") with a Retry button wired to `loadDecide`. Reuse existing global classes only; no `<style>` block (constitution IV).
- [X] T015 [P] [US1] In `frontend/src/components/AiSection.vue`: add `MODE_GLOSS.decide = 'decision model'` (lines 80-84) and destructure `loadDecide`, `disposeDecide` from `useToolRetrieval()` (lines 61-68).
- [X] T016 [US1] In `frontend/src/components/AiSection.vue`: warm `loadDecide()` in `handleSend` exactly like the vector block at lines 296-302 — when `retrievalMode.value === 'decide'` and `decide.status !== 'ready'` and `!== 'loading'`, `void loadDecide().catch(() => {})` (never force; FR-003). Call `disposeDecide()` in `clearChat` (lines 358-364) alongside `disposeVector()`, and add an `onBeforeUnmount` lifecycle hook (import from `vue`) that also calls `disposeDecide()` + `disposeVector()` (research R-7; FR-005).

**Checkpoint**: At this point, User Story 1 should be fully functional — quickstart.md Scenario 1 passes (select DECIDE → progress → ranked sources → chat answers; fallback → `lexical (fallback)` reported; Clear → model disposed).

---

## Phase 4: User Story 2 - Eval coverage: `decide` in the retrieval + chain suites (Priority: P1)

**Goal**: Both eval scripts accept and default to `decide`: `eval:retrieval` reports Hit@K/MRR for the real GLiNER2.5-Decide model over the existing 35 fixtures (CPU q4f16), and `eval:chain` runs the whole chain in `decide` mode and regenerates the committed `evalResults.ts` artifact with the `decide` aggregate + per-case `effectiveMode`. Deterministic (classifier, no sampling).

**Independent Test**: `npm run eval:retrieval -- --modes=decide` downloads the model (first run), reports per-fixture + aggregate Hit@K/MRR and exits non-zero on misses; `npm run eval:chain -- --modes=decide --dtype=q4` writes a `decide` mode aggregate into `frontend/src/data/evalResults.ts`; re-runs with default settings are byte-identical.

### Implementation for User Story 2

- [X] T017 [P] [US2] In `frontend/scripts/eval-retrieval.mjs`: add `'decide'` to the default modes list (line 143) and to the mode-loop guard `if (mode === 'lexical' || mode === 'vector' || mode === 'hybrid')` (line 159). Add a decide init gate mirroring lines 150-156: when `modesArg.includes('decide')`, print `initializing GLiNER2.5-Decide (downloads on first run)…`, `await retriever.loadDecide()`, and log `decide: ${retriever.decide.value.status} · ${retriever.decide.value.device} · ${retriever.decide.value.dtype}`. The existing transpile remaps (`useBrowserCache = false`, `device: 'wasm' → 'cpu'` at lines 112-113) apply automatically because the loader lives in `useToolRetrieval.ts` (FR-006).
- [X] T018 [P] [US2] In `frontend/scripts/eval-chain.mjs`: add `'decide'` to `VALID_MODES` (line 35). Extend the vector/hybrid init gate at lines 126-136 to also load the decide model when `modes.some((mode) => mode === 'decide')`: print the init line, `await retriever.loadDecide()` with a try/catch that reports "decide unavailable (…) — decide falls back to lexical", and log `decide: ${retriever.decide.value.status} · ${retriever.decide.value.device} · ${retriever.decide.value.dtype}`. Per-case `effectiveMode` already flows from `retrieve().stats.effective` (line 259) — no other change needed.
- [X] T019 [US2] Run `npm run eval:retrieval -- --modes=decide --topk=5` from `frontend/`: confirm the decide init line, one line per fixture (`[ok|MISS] <query> → <selected names> (mrr …)`), and the aggregate `decide: hit@5 = …% · MRR = … · mean latency …ms`; exit code 0 iff English fixtures all hit (German fixtures may score lower — expected, per research R-2). Re-run once to confirm byte-identical metrics (deterministic classifier).
- [X] T020 [US2] Regenerate the committed artifact: run `npm run eval:chain -- --modes=decide --dtype=q4` from `frontend/` (chat model `LiquidAI/LFM2.5-350M-ONNX · cpu · q4`, decide `cpu · q4f16`). Confirm `frontend/src/data/evalResults.ts` now contains `decide` in `config.modes` and a `decide` entry in `modes[]` with hit@K, MRR, factRecall, faithfulness, chainPassRate, and per-case `effectiveMode` (schema unchanged — FR-007). Confirm `BlogPostPage.vue` renders it without edits. Re-run with identical flags and diff to confirm determinism.

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently — the eval suites measure the real model and the artifact reflects it.

---

## Phase 5: User Story 3 - Documentation & copy for the decision model (Priority: P3)

**Goal**: On-site copy that explains the retriever (tool-selector intro, `siteData.ts` retriever card, `public/llms/blog.md`) truthfully mentions the DECIDE option, and the mode design stays documented in `specs/003-gliner-decide-retrieval/contracts/decide-mode.md` (already the shared source of truth). No new `SectionId`, routes, or styles.

**Independent Test**: Select DECIDE in the dock, open the blog post's retriever card, and re-run `npm run generate:llms` → all copy mentions the decision model; `npm run build` passes.

### Implementation for User Story 3

- [X] T021 [US3] In `frontend/src/components/ToolSelectorPanel.vue`: extend the retriever intro copy — the `tool-selector__intro--tech` paragraph (lines 204-207) — with one truthful sentence noting the DECIDE option (an on-device GLiNER2.5-Decide decision classifier that decides which content source a query is about) without inventing claims (FR-009).
- [X] T022 [P] [US3] In `frontend/src/data/siteData.ts`: update the "Content retriever — LFM2.5 prompt router" tech card (lines 121-127) — extend `name`, `description`, and `tags` so the copy mentions the on-device GLiNER2.5-Decide decision-model option alongside BM25 / prompt router / RRF, without inventing claims (FR-009).
- [X] T023 [US3] In `frontend/scripts/generate-llms-txt.mjs`: add a `GLiNER2.5-Decide-ONNX` bullet to the `blogMd` Models section (after the prompt-router bullet at lines 72-73) describing the decide option truthfully. Then run `npm run generate:llms` from `frontend/` to regenerate `frontend/public/llms/blog.md` and `frontend/public/llms.txt` (FR-009).
- [X] T024 [US3] Verify no fixture regressions from the copy change: run `npm run eval:retrieval -- --modes=lexical --topk=5` from `frontend/` and confirm it passes unchanged (fixtures untouched; constitution VI).

**Checkpoint**: All user stories are now independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and the final verification gates.

- [X] T025 [P] Update `AGENTS.md` so the repo's operational docs match the new reality: the "Modes:" description in the retrieval section gains `decide` (GLiNER2.5-Decide, CPU q4f16 / WebGPU fp16, lazy + disposed), and the eval flags in the `eval:retrieval` / `eval:chain` notes mention `decide`. Keep it consistent with the constitution (Principle VI).
- [X] T026 Run the full verify chain (constitution Principle III / SC-005): `npm run lint` then `npm run build` from `frontend/`. Review the lint auto-fix diffs before committing.
- [X] T027 [P] Browser smoke test per quickstart.md Scenario 1 (SC-003/SC-004/SC-006): select DECIDE → progress shown → answer from injected top-K → fallback reports `lexical (fallback)` when the model is blocked → Clear disposes the model with no console errors. Verify `:focus-visible` outlines, `aria-pressed` on chips, `role="progressbar"` on progress, no layout break at ≤480px, and `prefers-reduced-motion` preserved.
- [X] T028 Full eval regression to confirm no existing-mode regressions: run `npm run eval:retrieval` from `frontend/` (default modes now include `decide`); confirm `lexical`/`vector`/`hybrid` aggregates are unchanged vs the baseline and only documented/expected decide-mode misses appear. Also confirm `npm run eval:chain -- --modes=decide --dtype=q4` still writes a byte-identical artifact on a repeat run (SC-002 determinism).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories (the `decide` core in `useToolRetrieval.ts` is consumed by US1's UI and US2's eval harness).
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - US1 (Phase 3) and US2 (Phase 4) can proceed in parallel after Foundational (different files; US1 touches `components/*.vue`, US2 touches `scripts/*.mjs`).
  - US3 (Phase 5) can start in parallel once Foundational is done (copy only, but keep `ToolSelectorPanel.vue` intro edit separate from US1's functional edits in the same file to avoid conflicts — run US3's T021 after T011-T014 if done by one implementer).
  - Polish (Phase 6) depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - depends on `loadDecide()`/`disposeDecide()`/`decide` state/`retrieve('decide')` branch. No dependency on US2/US3.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - depends on `loadDecide()` + the `retrieve()` decide branch (the eval scripts call the same transpiled `useToolRetrieval.ts`). Independently testable via `--modes=decide`.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2); copy-only, but shares `ToolSelectorPanel.vue` with US1 (sequence T011-T014 → T021 in that file to avoid conflicts).

### Within Each User Story

- Core implementation before integration.
- US1: loader/state (Foundational) → panel UI → chat-loop wiring → disposal.
- US2: script mode/flag changes → real eval runs → artifact regeneration.
- US3: component copy → data-card copy → llms generation → regression check.
- Story complete before moving to next priority.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- Foundational T003-T010 are the same file (`useToolRetrieval.ts`) — run sequentially; only split on clean seams.
- US1 vs US2 run fully in parallel (different files: `src/components/*.vue` vs `scripts/*.mjs`).
- T015 [P] [US1] (`AiSection.vue`) is parallel-safe with T011-T014 (`ToolSelectorPanel.vue`).
- T017 [P] [US2] and T018 [P] [US2] run in parallel (two scripts).
- T022 [P] [US3] (`siteData.ts`) is parallel-safe with T021 (`ToolSelectorPanel.vue`) and T023 (`generate-llms-txt.mjs`).

---

## Parallel Example: User Story 1 + 2

```bash
# US1 — two parallel component tracks (different files):
Task: "T015 [P] [US1] AiSection.vue gloss + destructure loadDecide/disposeDecide"
Task: "T011 [US1] ToolSelectorPanel.vue MODES + MODE_LABEL.decide"

# US2 — both eval scripts in parallel:
Task: "T017 [P] [US2] eval-retrieval.mjs decide gate"
Task: "T018 [P] [US2] eval-chain.mjs decide gate"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (baseline green, no new dep).
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories; the `decide` core in `useToolRetrieval.ts`).
3. Complete Phase 3: User Story 1 (DECIDE chip, lazy load, progress, fallback, dispose).
4. **STOP and VALIDATE**: quickstart.md Scenario 1 (browser) + `npm run lint` → `npm run build`.
5. Deploy/demo if ready.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (`retrieve('decide')` works with lexical fallback).
2. Add User Story 1 → Test independently (browser DECIDE) → Deploy/Demo (MVP!).
3. Add User Story 2 → Test independently (`eval:retrieval --modes=decide`, `eval:chain --modes=decide`) → artifact regenerated.
4. Add User Story 3 → Test independently (copy + `npm run generate:llms`) → Deploy/Demo.
5. Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (single file — pair on it).
2. Once Foundational is done:
   - Developer A: User Story 1 (components) + User Story 3 copy.
   - Developer B: User Story 2 (eval scripts + artifact runs).
3. Stories complete and integrate independently; final lint/build + full eval regression closes the feature.

---

## Notes

- [P] tasks = different files, no dependencies. Same-file tasks (all of Foundational, plus T011-T014 in `ToolSelectorPanel.vue`) MUST run sequentially.
- [Story] label maps task to specific user story for traceability.
- Each user story is independently completable and testable.
- Verify gates: `npm run lint` → `npm run build` from `frontend/` (constitution III); `npm run eval:retrieval` MUST pass (constitution VI) and fixtures must stay untouched.
- Follow the existing code style: prettier no semicolons, single quotes, printWidth 100; run `npm run format` if needed.
- The GLiNER2 processor is a contract (`contracts/decide-mode.md`): layout, special-token ids, tensor names, 1024-token truncation, and the lexical-fallback rule. Do not improvise scoring.
- Keep the literal `device: 'wasm'` string in the WASM fallback so the eval harness remap (`eval-lib.mjs:154`) produces CPU q4f16.
- Commit after each task or logical group; stop at checkpoints to validate each story independently.