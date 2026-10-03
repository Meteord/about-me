---

description: "Task list template for feature implementation"
---

# Tasks: End-to-End Agent Chain Evaluation

**Input**: Design documents from `/specs/002-agent-chain-eval/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/ (eval-metrics.md, judge.md, artifact.md, traces.md)

**Tests**: No test suite exists (constitution Principle III). The eval suite itself is the verification tool (`npm run eval:chain`), and `npm run lint` → `npm run build` are the mandatory gates. No test tasks are included.

**Organization**: Tasks are grouped by user story (US1 P1, US2 P2, US4 P2, US3 P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Web app: eval tooling lives in `frontend/scripts/`, app code in `frontend/src/`, generated artifact in `frontend/src/data/`.
- The browser never runs the eval; `frontend/scripts/*.mjs` are Node-only (local/CI).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization — npm script, traces drop-in directory, privacy guard.

- [X] T001 Add `"eval:chain": "node scripts/eval-chain.mjs"` to the `scripts` object in `frontend/package.json` (next to the existing `"eval:retrieval"` entry, line 11). No other scripts change.
- [X] T002 [P] Create `frontend/traces/README.md` documenting the STS-format drop-in flow: a visitor saves a session from Mini-Michi ("Save trace") and drops the `.jsonl` here; the default `npm run eval:chain -- --traces=frontend/traces` picks them up with no flags; include HF-style privacy guidance (traces may contain prompts/personal data — review and redact before publishing; nothing is uploaded automatically, mirroring HuggingFace guidance per `contracts/traces.md`). Keep the directory committed even while empty of traces.
- [X] T003 [P] Add `traces/*.jsonl` to `frontend/.gitignore` so user-collected runtime traces (personal chat data) are never committed; `frontend/traces/README.md` stays tracked.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared harness + fixture metadata that BOTH the chain eval (US1) and trace scoring (US4) depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create `frontend/scripts/eval-lib.mjs` — the shared Node harness (research R-3):
  - Reuse the transpile + `vue`-stub + module-loading pattern from `frontend/scripts/eval-retrieval.mjs` (lines 31–115), exporting `transpile`, `stubbedRequire`, and the module loader.
  - Add a `window` shim (`{ location: { hash: '' } }`) so the `get_content` executor's `window.location.hash` writes are no-ops.
  - Stub `../composables/useSiteLayout` with no-op `state`/`setVisible`/`setExpanded`/`focusSection` (same stub shape as `eval-retrieval.mjs`).
  - Stub `../composables/useLlmsContent` with a **disk-backed** implementation that reads `frontend/public/llms/*.md` using the same `FILE_BY_ID` mapping as `src/composables/useLlmsContent.ts` (`about`→`about.md`, `projects`→`projects.md`, `contact`→`contact.md`, `blog`→`blog.md`) and keeps `listContentItems()` matching the app so `CONTENT_IDS` (the `get_content.id` enum in `src/tools/registry.ts`) matches production. Content MUST be real — without it the model cannot answer and groundedness scoring is meaningless (R-3).
  - Load `../data/siteData` **for real** (it is pure data + pure functions).
  - Export `loadUseToolRetrieval()` (wasm→cpu remap + `mod.env.useBrowserCache = false`, mirroring `eval-retrieval.mjs` lines 94–115) and `loadUseChatModel(dtype)` loading `src/composables/useChatModel.ts` with `env.allowLocalModels = false`, `env.useBrowserCache = false`, `device: 'cpu'`, `dtype: 'q8' | 'q4'`.
  - The textual tool result the model reads must be preserved exactly (only URL/layout/scroll side-effects are stubbed, never the returned text).
- [X] T005 [P] Extend `frontend/scripts/eval-fixtures.mjs`: every one of the 27 fixtures gains `expectedAnswerFacts: string[]` (atomic claims the final answer MUST contain, drawn from real site content in `frontend/src/data/siteData.ts` / `frontend/public/llms/*.md` — e.g. `['Hochschule München']`, `['MUCGPT']`, `['Munich']`, `['KIES']`) and `bannedFacts: string[]` (may be empty; contradictory claims the answer MUST NOT contain). Add optional `expectedArgs` for `set_theme` fixtures (e.g. `{ set_theme: { theme: 'red' } }` for the red-themed fixtures). Validation rules (data-model.md): facts MUST be atomic (one claim each); every fixture gets at least `expectedAnswerFacts`; banned facts phrased as the contradictory claim (negation-safe). Do NOT change `query`/`expected` — retrieval metrics stay comparable. Also export a site-wide `BANNED_TRACE_FACTS` array (e.g. `['works for MUCGPT']` — Michael works for KIES, `contracts/traces.md`). Verify `npm run eval:retrieval -- --modes=lexical` still exits 0.

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - End-to-end chain evaluation suite (Priority: P1) 🎯 MVP

**Goal**: `npm run eval:chain` runs the *entire* agent chain exactly as `AiSection.handleSend` does (retrieval → pruned schemas → LFM2.5-350M generation → tool-call parsing/execution → final answer) over the 27 fixtures × 3 modes, reports stage-level metrics, writes the artifact, and exits non-zero on failures.

**Independent Test**: `npm run eval:chain -- --modes=lexical --dtype=q4` from `frontend/` → downloads/caches the chat model, runs every fixture through the real chain, prints per-fixture + aggregate report, writes `frontend/src/data/evalResults.ts`, exits 0 when all fixtures pass.

### Implementation for User Story 1

- [X] T006 [US1] Implement the answer-quality core in `frontend/scripts/eval-lib.mjs` (contracts/eval-metrics.md + judge.md): SQuAD-style `normalize()` (lowercase, strip punctuation, collapse whitespace; remove articles `a`/`an`/`the` for **overlap/grounding only**, never for fact matching; keep stopwords for fact matching); two-mode `factMatches()` — strict substring on normalized text **OR** token-F1 ≥ 0.8 (short numeric/date/enum facts match strictly only); `computeFaithfulness()` — sentence split, a sentence is supported if its max token-overlap against any sentence of the concatenated tool results ≥ **0.35** AND every capitalized/number token appears in the tool results (entity-consistency probe), `faithfulness = supported/total` (0 when no sentences); `DeterministicJudge.assess(case, transcript) → AnswerScore` (`factRecall`, `factsMissedDueToToolMiss`, `bannedViolation`, `faithfulness`, `unsupportedSentences`, `pass = factRecall === 1 ∧ !bannedViolation ∧ faithfulness ≥ 0.8`); `createJudge(name)` returning the judge with `'deterministic'` as the default. Facts whose supporting tool was never called are recorded in `factsMissedDueToToolMiss`, never counted as `factRecall` misses (attribution rule). Pure functions — no network, no randomness, no Vue types.
- [X] T007 [US1] Implement the chain loop in `frontend/scripts/eval-chain.mjs` mirroring `AiSection.handleSend` (`frontend/src/components/AiSection.vue` lines 310–387): CLI parsing (`--modes=lexical,vector,hybrid` — default all three, `--topk=5`, `--dtype=q8|q4`, `--sampling`, plus `--judge`/`--traces` flag parsing reserved for US2/US4); per fixture × mode: `retrieve(query, { mode, topK })` (real retriever from `eval-lib`; vector never forced — falls back to lexical with `effectiveMode` recorded per case when the router is unavailable, FR-008) → `pruneSchemas(selectedNames)` → `buildSystemPrompt(selectedNames)` → loop ≤ MAX_ROUNDS (3): `generate([{ role: 'system', content: buildSystemPrompt(...) }, ...history], toolSchemas, noop)` (real `LiquidAI/LFM2.5-350M-ONNX`, device `'cpu'`, dtype from flag, `do_sample: false` default matching the site's greedy default, `temperature: 0.8`, `top_p: 0.9`, `repetition_penalty: 1.15`, `max_new_tokens: 256`) → `extractToolCalls(response)` → `executeToolCall(call)` for each (browser side-effects stubbed; real textual result preserved) → push `{ role: 'tool', content: JSON.stringify(results.map((r) => r.result ?? r.error ?? null)) }`; stop when a round emits no calls. Reuse the shipped `pruneSchemas`/`buildSystemPrompt`/`extractToolCalls`/`executeToolCall` from `frontend/src/tools/registry.ts` verbatim — never reimplement. Collect `ToolCallRecord[]` (round, raw, name, args, valid, expectedArgHit, result, error) and `StageTiming` (retrievalMs, roundsMs[], totalMs, tokensGenerated) per case (data-model.md).
- [X] T008 [US1] Implement metrics, report and exit code in `frontend/scripts/eval-chain.mjs`: per case compute `retrievalPass` (hit@K — any `expected` tool inside `selectedNames.slice(0, topK)`), `toolsPass` (strict gate: `toolRecall == 1 ∧ argValidityRate == 1 ∧` no calls to tools outside `TOOL_SCHEMAS`; a call is valid if name ∈ `TOOL_SCHEMAS` and args valid — `get_content.id` ∈ `CONTENT_IDS`, `set_theme.theme` ∈ `{amber, orange, red}`; `expectedArgHit` when `expectedArgs[name]` is defined and args match, case/whitespace normalized; extra **valid** chained calls like `list_contents → get_content` allowed and only reported), `answerPass` (`score.pass` from the judge via `createJudge('deterministic')`), `chainPass` (`toolsPass ∧ answerPass`); per-mode aggregates `retrievalHitRate`, `retrievalMRR`, `toolRecall`, `toolF1`, `argValidityRate`, `factRecall`, `faithfulness`, `hallucinationRate`, `meanRounds`, `meanTotalLatencyMs`, `toolPassRate`, `answerPassRate`, `chainPassRate` (contracts/eval-metrics.md). Print a model header line (`chat model: LiquidAI/LFM2.5-350M-ONNX · cpu · q8`), per-case `[PASS]/[FAIL]` lines (query → tools called · factRecall · faithfulness · rounds · latency), and per-mode aggregates. Exit non-zero iff any run case has `chainPass == false` or an uncaught error; per-case model errors reported and the run continues, partially produced results still written (spec edge cases).
- [X] T009 [US1] Implement the artifact writer in `frontend/scripts/eval-chain.mjs` (contracts/artifact.md): write `frontend/src/data/evalResults.ts` atomically (temp file then rename) containing the `EvalResults` interface AND `export const evalResults: EvalResults = { ... }` in one generated module — `generatedAt` ISO, `config` (`modes`, `topK`, `maxRounds: 3`, `sampling`, `device: 'cpu'`, `dtype`, `chatModel: 'LiquidAI/LFM2.5-350M-ONNX'`), `fixtures` count, `modes: ModeAggregate[]` (order run), `cases: CaseResult[]` (flat, grouped by mode then fixture index — stable for diffs), `traces: null` (no traces until US4). Prettier-compliant (no semicolons, single quotes, 2-space indent, printWidth 100); full-precision raw values (e.g. `0.9933`, `12345`); raw traces never embedded.

**Checkpoint**: `npm run eval:chain -- --modes=lexical --dtype=q4` runs all 27 fixtures, prints the report, writes `frontend/src/data/evalResults.ts`, and exits 0 (or flags failing fixtures). US1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Pluggable answer judge (Priority: P2)

**Goal**: Answer-quality scoring is isolated behind the `Judge` contract with a documented selection seam, so a stronger judge (on-device LLM, NLI model) can be swapped in without restructuring the chain or fixtures (FR-005).

**Independent Test**: Run `npm run eval:chain -- --modes=lexical --judge=stub` → the report consumes the stub's scores; retrieval/tool-call metrics and exit logic are unchanged. Then default runs are byte-identical to pre-seam runs.

### Implementation for User Story 2

- [X] T010 [US2] Wire the `--judge=<name>` CLI flag in `frontend/scripts/eval-chain.mjs` through `createJudge(name)` (already defined in `eval-lib.mjs`); register a `'stub'` judge implementation in `createJudge` that returns a constant `AnswerScore` (e.g. `{ factRecall: 0.5, factsMissedDueToToolMiss: [], bannedViolation: false, faithfulness: 0.5, unsupportedSentences: [], pass: true }`). Ensure ALL answer scoring goes through the single judge entry point — never ad-hoc scoring scattered across the script. Unknown judge name → error at startup, before model downloads (contracts/judge.md).
- [X] T011 [US2] Verify the seam (SC-005): run `npm run eval:chain -- --modes=lexical --judge=stub` → answer sub-scores come from the stub, retrieval/tool-call metrics and exit logic unchanged; then re-run with the default judge and confirm aggregate metrics match the pre-seam run. Revert any temporary changes.

**Checkpoint**: Judge swap changes only answer-quality scores. US1 AND US2 work independently.

---

## Phase 5: User Story 4 - Runtime trace extensibility (Priority: P2)

**Goal**: Finished chat sessions can be saved as STS-format traces (`harness: "about-me.mini-michi"`), dropped into `frontend/traces/` (or pointed at via `--traces=<file|dir|url>`), and scored historically as regression cases. Trace loading sits behind a documented `TraceSource` interface so new sources never touch scoring (FR-012/SC-008).

**Independent Test**: Chat with Mini-Michi → "Save trace" downloads an STS JSONL; drop it into `frontend/traces/` → `npm run eval:chain` scores it and `evalResults.ts` gains a `traces` section.

### Implementation for User Story 4

- [X] T012 [US4] Create `frontend/scripts/trace-lib.mjs` — STS-format parser/validator + loaders (single source of truth = `contracts/traces.md`): line 1 header `{ "type": "session", "harness": "about-me.mini-michi", "id", "name"? }` (extra metadata allowed and ignored), remaining lines `{ "type": "message", "message": { role, content, toolCalls?, toolCallId?, model?, timestamp? } }` (the STS message object has no extra fields); per-line validation with errors collected into `errors: string[]` (a bad line → that trace skipped, run continues — SC-007); missing final assistant message → malformed. `TraceSource` loaders implementing `loadTraceSource(spec) → { traces: TraceSession[], errors: string[] }`: `file` (`*.jsonl`), `dir` (every `*.jsonl`, non-recursive, skip non-JSONL), `url` (`https://…`, Node global `fetch` — local/CI only, never the browser). Normalize to `TraceSession` (`source`, `id`, `name`, `userQuery` = first `user` message, `retrievalSummary` best-effort, `turns`, `calledTools`, `toolResults`, `finalAnswer`) per data-model.md.
- [X] T013 [US4] Implement per-trace scoring in `frontend/scripts/trace-lib.mjs` (historical — judges the recorded session, no re-execution, FR-010): re-run `retrieve(userQuery, { mode, topK })` and set `retrievalCovered` = every called tool ∈ current top-K (retrieval-drift signal); re-`parsePythonicCalls` each recorded call and set `toolValid` = name ∈ `TOOL_SCHEMAS` ∧ args valid (`get_content.id` ∈ `CONTENT_IDS`, `set_theme.theme` ∈ enum); score the recorded `finalAnswer` via the shared judge against the trace's **own** `toolResults` (faithfulness thresholds 0.35/0.8 from contracts/eval-metrics.md) plus the site-wide `BANNED_TRACE_FACTS` from `eval-fixtures.mjs`; produce `TraceCaseResult` with the pass gate `toolValid ∧ retrievalCovered ∧ groundedness ≥ 0.8 ∧ !bannedViolation` and an `error` field for malformed traces (data-model.md).
- [X] T014 [US4] Wire traces into `frontend/scripts/eval-chain.mjs`: `--traces=<file|dir|url>` (repeatable; default `frontend/traces/` — empty or missing → no traces, no error, `traces: null`); load via `loadTraceSource`, score each trace, print per-trace lines (retrievalCovered, toolValid, groundedness, bannedViolation, pass) and a `runtime traces` aggregate block; aggregate `TraceAggregate` (`count`, `sources`, `mode`, `topK`, `retrievalCoverRate`, `toolValidRate`, `groundedRate`, `bannedViolationRate`, `passRate`) into the artifact's `traces` section (FR-011); exit code reflects only scored-trace failures (malformed traces reported and skipped without failing the run — SC-007).
- [X] T015 [P] [US4] Create `frontend/src/composables/useTraceRecorder.ts` — maps the chat transcript (`messages` ref in `AiSection.vue`) into STS-format JSONL (contracts/traces.md): `user` → `{ role: "user", content }`; `retrieval` → `{ role: "system", content: "retrieval · top {selected}/{total} · effective {mode} · {latencyMs}ms · selected: {name, name, …}" }` (deterministic grammar; the STS message object allows no extra fields, so the summary stays in `content`); tool-call → `{ role: "assistant", content: "", toolCalls: [{ id: "tc{round}-{i}", function: { name, arguments } }] }` — `name`/`arguments` from `parsePythonicCalls` (`unknown_*` name and `"{}"` arguments when unparsable), `arguments` is a JSON string; tool-result → one `{ role: "tool", toolCallId, content: JSON.stringify(result.result ?? result.error ?? null), model: "LiquidAI/LFM2.5-350M" }` per result, content exactly what the model saw; final assistant text → `{ role: "assistant", content, model: "LiquidAI/LFM2.5-350M" }`. Export a `downloadTrace()` helper producing `mini-michi-{YYYYMMDD-HHMMSS}.jsonl` via a client-side Blob download — pure client-side, nothing is uploaded (Principle I).
- [X] T016 [P] [US4] Add a "Save trace" control to `frontend/src/components/AiSection.vue` in the dock (banner bar, next to the "New chat" button ~line 444): a `pixel-link-btn` button enabled when the transcript is non-empty and not generating (`messages.length > 0 && !isGenerating`), wired to `useTraceRecorder`'s download helper; keep existing accessibility conventions (`:focus-visible` outlines, `aria-*`, `prefers-reduced-motion`, ≤480px breakpoint).

**Checkpoint**: Chat → "Save trace" downloads a `.jsonl`; dropping it into `frontend/traces/` and running `npm run eval:chain -- --modes=lexical --traces=frontend/traces` scores it and populates `traces` in the artifact. US1, US2 AND US4 work independently.

---

## Phase 6: User Story 3 - Results shown in the blog section (Priority: P3)

**Goal**: The "Chat with my website" post (`BlogPostPage.vue`) gains a "How well does the whole chain actually work?" section rendering the committed artifact — per-mode aggregates, per-case breakdown with score bars, and a runtime-traces block — matching the pixel theme and accessibility conventions, degrading gracefully when the artifact is empty (FR-007).

**Independent Test**: Open `#/blog/chat-with-my-website` → the eval-results section renders the persisted numbers (not placeholders); zero console errors; no regression at ≤480px or with reduced motion.

### Implementation for User Story 3

- [X] T017 [P] [US3] Add `eval-*` global classes to `frontend/src/assets/main.css` for the blog eval-results section: mode-comparison cards/table, per-case score bars (reuse the `tool-result__bar` building block from `AiSection.vue`/`ToolSelectorPanel.vue`), and a runtime-traces block. Colors/fonts ONLY from `:root` variables (`--pixel-*`, `--shadow-*`, `--font-*`), pixel notched corners via `clip-path`, no `border-radius` > 2px, stepped `steps(2, end)` easing, `:focus-visible` outlines, `prefers-reduced-motion` handling, and `@media (max-width: 480px)` sizing overrides (constitution IV/V). No `<style>` blocks in components.
- [X] T018 [US3] Generate and commit `frontend/src/data/evalResults.ts` by running `npm run eval:chain -- --modes=lexical --dtype=q4` from `frontend/` (requires US1/T009; a full 3-mode q8 run may be committed later). If the run is not feasible in the dev environment, write a schema-compliant placeholder (`fixtures: 0`, `modes: []`, `cases: []`, `traces: null`) so `vue-tsc` passes, and regenerate with real numbers before the final commit. The interface and data are generated as one module — never hand-write them separately (contracts/artifact.md).
- [X] T019 [US3] Add the "How well does the whole chain actually work?" section to `frontend/src/components/BlogPostPage.vue` (after the existing "Links" section, ~line 220): import `{ evalResults, type EvalResults }` from `../data/evalResults`; render per-mode aggregate comparison (hit@K, tool recall, answer quality/fact recall, faithfulness, mean latency, rounds, pass rate), a per-case breakdown with score bars, a runtime-traces block when `evalResults.traces` is present (FR-011), and the `generatedAt` note; when `fixtures === 0` show a visible "run `npm run eval:chain`" note with intact layout (graceful degradation — quickstart FR-007 step 3); use existing `pixel-*`/`tool-*`/`model-*` classes plus the new `eval-*` classes; no `<style>` block; keep `:focus-visible`/reduced-motion/≤480px accessibility; show `generatedAt` and a note that numbers come from a real on-device run.
- [X] T020 [US3] Update the blog copy in `frontend/scripts/generate-llms-txt.mjs` (`blogMd`, lines 60–77) to mention the new eval-results section in the "Chat with my website" post so `about_site` stays truthful (constitution VI); run `npm run generate:llms` to regenerate `frontend/public/llms/*.md` + `llms.txt`; confirm `npm run eval:retrieval -- --modes=lexical` still exits 0 (fixtures' `query`/`expected` unchanged).

**Checkpoint**: All user stories are now independently functional; the blog renders the committed artifact.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, docs consistency, and end-to-end verification across all stories.

- [X] T021 [P] Run the full verify chain from `frontend/`: `npm run lint` (oxlint + eslint, auto-fixes — review diff) then `npm run build` (type-check `vue-tsc` + production build in parallel); fix any issues introduced by this feature; confirm `dist/` stays uncommitted (constitution III).
- [X] T022 [P] Update `AGENTS.md` (repo root): document `npm run eval:chain` in the Commands section (fast-run hint `--modes=lexical --dtype=q4`, `--traces=` flags, `--judge=`), the new `frontend/traces/` drop-in workflow, and the generated committed artifact `frontend/src/data/evalResults.ts` (regenerated only by `npm run eval:chain`, not by `prebuild`); keep it consistent with the constitution.
- [X] T023 Verify the quickstart scenarios end-to-end from `frontend/`: SC-003 (run `npm run eval:chain -- --modes=lexical` twice → byte-identical aggregates and identical `evalResults.ts`), SC-004 (blog walkthrough: keyboard/reduced-motion/≤480px, zero console errors), SC-006/SC-007 (trace save → score → malformed-line tolerance), and FR-008 (a `--modes=vector` run with the router unavailable records `effectiveMode: 'lexical'`); update `specs/002-agent-chain-eval/quickstart.md` if the walkthrough reveals gaps.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (eval-lib is imported by US1's `eval-chain.mjs` and US4's `trace-lib.mjs`; fixtures carry the answer facts every story scores).
- **User Stories (Phase 3+)**: All depend on Foundational.
  - **US1 (P1)**: No dependencies on other stories — MVP.
  - **US2 (P2)**: Depends on US1 (adds the `--judge` flag + stub to the existing `eval-chain.mjs`/`createJudge`).
  - **US4 (P2)**: Depends on US1 (reuses `createJudge` + shared metrics) and Foundational (`trace-lib.mjs` imports `eval-lib.mjs` + `BANNED_TRACE_FACTS`). Does NOT depend on US2.
  - **US3 (P3)**: Depends on US1 (the artifact `evalResults.ts` must exist for `BlogPostPage.vue` to import it and type-check).
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependencies on other stories.
- **US2 (P2)**: Can start after US1 — independently testable via the `--judge=stub` swap.
- **US4 (P2)**: Can start after US1 — the browser recorder (T015/T016) is fully parallel with the Node scoring (T012–T014).
- **US3 (P3)**: Can start after US1 — its two UI files (CSS, blog section) are independent of US2/US4; the traces block renders gracefully while `traces` is still null.

### Within Each User Story

- US1: judge core (T006) before chain loop (T007) before report/exit (T008) before artifact writer (T009).
- US2: seam (T010) before verification (T011).
- US4: parser/loaders (T012) before scoring (T013) before eval-chain wiring (T014); recorder (T015) + dock control (T016) run in parallel with T012–T014.
- US3: CSS (T017) is parallel; artifact (T018) before the blog section (T019) so the import type-checks; copy sync (T020) last.

### Parallel Opportunities

- Setup: T002 and T003 are [P] (both parallel with T001).
- Foundational: T004 and T005 are [P] (different files; T005 needs only the existing fixtures).
- US4: T015 (recorder composable) and T016 (dock control) run fully in parallel with T012–T014 (browser vs Node, no shared files).
- US3: T017 (CSS) runs in parallel with T018/T019 (different files).
- Polish: T021 and T022 are [P].

---

## Parallel Example: User Story 4

```bash
# Browser side (independent of the Node scoring pipeline):
Task: "Create frontend/src/composables/useTraceRecorder.ts"
Task: "Add 'Save trace' control to frontend/src/components/AiSection.vue"

# Node side (sequence):
Task: "Create frontend/scripts/trace-lib.mjs (parser + loaders)"
Task: "Implement per-trace scoring in frontend/scripts/trace-lib.mjs"
Task: "Wire --traces into frontend/scripts/eval-chain.mjs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: US1 (chain eval, deterministic judge, artifact, exit code).
4. **STOP and VALIDATE**: `npm run eval:chain -- --modes=lexical --dtype=q4` passes independently.
5. Commit the MVP artifact and demo before continuing.

### Incremental Delivery

1. Complete Setup + Foundational → foundation ready.
2. Add US1 → `npm run eval:chain` works end-to-end → commit artifact (MVP!).
3. Add US2 → judge seam verified via `--judge=stub` → no regression in default runs.
4. Add US4 → Save trace → score traces → artifact `traces` section.
5. Add US3 → blog renders the numbers → `npm run lint` + `npm run build` green.
6. Polish → full verify chain + quickstart walkthrough.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: US1 (then US2).
   - Developer B: US4 browser side (T015/T016) once US1's recorder contract is stable; Node side (T012–T014) after US1's judge exists.
   - Developer C: US3 (needs US1's artifact; can prepare CSS + blog skeleton early using a `fixtures: 0` placeholder).
3. Stories integrate and verify independently.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps the task to a specific user story for traceability.
- Each user story is independently completable and testable.
- Verify `npm run eval:retrieval` stays green after fixture changes (existing gate).
- Commit after each task or logical group; the generated artifact and `public/llms/*.md` are committed, `dist/` and `traces/*.jsonl` are not.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence (e.g. US3's blog must render while `traces` is still null).

---

## Phase 8: Convergence

- [X] T024 Make the chain pass gate reachable for layout-only tool results per SC-001/FR-003 (partial): the deterministic judge's lexical-faithfulness gate (contracts/eval-metrics.md — 0.35 support / 0.8 pass) is structurally unsatisfiable when the only tool result is a layout payload with no natural-language text. `set_theme`'s executor returns `{ kind: 'layout', theme }` (frontend/src/tools/registry.ts:358), so a natural-language final answer can never reach 0.35 sentence overlap — the committed `frontend/src/data/evalResults.ts` shows `Switch the theme to red` with toolsPass=true, factRecall=1.0, faithfulness=0.0, chainPass=false, and all 5 `set_theme` fixtures fail this way (27/27 cases fail chainPass). Give `set_theme` a textual result alongside the layout payload (identical in browser and eval), or exempt layout-only tool results from the faithfulness gate (judge/contract change), so SC-001's "exit 0 iff no fixture misses" is achievable and the faithfulness metric carries signal for these cases.