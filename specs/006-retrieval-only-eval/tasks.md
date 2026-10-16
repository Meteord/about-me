---

description: "Task list for Retrieval- and Action-Only Blog Evaluation"
---

# Tasks: Retrieval- and Action-Only Blog Evaluation

**Input**: Design documents from `/specs/006-retrieval-only-eval/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/eval-ui-and-artifact.md, quickstart.md

**Tests**: No test suite tasks generated (per `AGENTS.md` and `plan.md`, there is no unit test suite; verification is performed via `npm run lint`, `npm run build`, `npm run eval:retrieval`, and `npm run eval:chain`).

**Organization**: Tasks are grouped by user story (`US1`, `US2`, `US3`) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single frontend project under `frontend/` (`frontend/src/`, `frontend/scripts/`, `frontend/public/`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared latency formatting and CSS styling classes in `frontend/src/assets/main.css` used by the evaluation components.

- [x] T001 Add CSS rules for the separate average latency statistic badges and per-case latency readout (`.eval-chart__split-latency`, `.eval-case__latency`, and clean up unused `.eval-case__bars` / `.eval-bar*` rules) using `:root` `--pixel-*` and `--font-*` variables in `frontend/src/assets/main.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core evaluation data schema (`EvalResults`, `ModeAggregate`, `ModeResult`, `CaseResult`, `TraceAggregate`) in `frontend/src/data/evalResults.ts` that all user stories and the evaluation script depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Update the TypeScript interfaces (`ToolScoreRow`, `CaseResult`, `ModeAggregate`, `ModeResult`, `TraceAggregate`, `EvalResults`) and `evalResults` data shape in `frontend/src/data/evalResults.ts` to remove `StageTiming`, `AnswerScore`, `finalAnswer`, `timings`, `score`, `answerPass`, `chainPass`, `factRecall`, `faithfulness`, `hallucinationRate`, `meanTotalLatencyMs`, `answerPassRate`, `chainPassRate`, `groundedRate`, `bannedViolationRate`, `sampling`, `dtype`, and `chatModel`, and add `latencyMs: number` + `pass: boolean` on `CaseResult` (`split: 'train' | 'test'`, `appliedTheme: string | null`, `error: string | null`) and `passRate: number` (`0..1`) + `meanLatencyMs: number` on `ModeAggregate` (`config: { modes: string[]; topK: number; maxInjectChars: number; device: 'cpu'; gateSplit: 'test' }`, `traces: TraceAggregate | null`)

**Checkpoint**: Foundation ready — `frontend/src/data/evalResults.ts` exports the generation-free types and data shape so UI stories (`US1`, `US2`) and pipeline stories (`US3`) can proceed.

---

## Phase 3: User Story 1 - Blog evaluation compares retrieval and action metrics plus average latency (Priority: P1) 🎯 MVP

**Goal**: Present only retrieval and action percentage metrics (`hit@K`, `injection cover`, `action pass`) on the blog comparison chart with `hit@K` and `injection cover` active by default, display average time taken per query (`meanLatencyMs`) as a dedicated separate statistic per mode and per split (`test` and `train`), and update all blog evaluation copy and retrievable markdown (`public/llms/blog.md`) so there are zero references to `fact recall`, `faithfulness`, `grounded`, or `chain pass`.

**Independent Test**: Open `#/blog/chat-with-my-website` and verify that the metric selector chips show only `hit@5`, `injection cover`, and `action pass` (`hit@5` and `injection cover` active by default), average time taken (`avg time ...`) is rendered as a separate statistic in the mode header and in both `test` and `train` split headers, the takeaway box and runtime-traces block show only retrieval/injection/action and latency metrics, and `public/llms/blog.md` reflects the retrieval/action-only evaluation.

### Implementation for User Story 1

- [x] T003 [US1] Restrict `MetricKey` and `EVAL_METRICS` to `'retrievalHitRate' | 'injectionCoverRate' | 'actionPassRate'` with default `activeMetrics = ref<MetricKey[]>(['retrievalHitRate', 'injectionCoverRate'])` (enforcing at least 1 active chip) and update the chip helper note in `frontend/src/components/EvalComparison.vue`
- [x] T004 [US1] Implement `formatLatency(ms)` (`< 1ms` when `< 0.5`, `${ms.toFixed(1)}ms` when `< 10`, `${Math.round(ms)}ms` when `< 1000`, `${(ms / 1000).toFixed(2)}s` when `>= 1000`), include `meanLatencyMs` on `SplitBars` and `CompareRow`, and render `avg time {{ formatLatency(...) }}` as a separate statistic in the mode header and in both the `test` and `train` split labels in `frontend/src/components/EvalComparison.vue`
- [x] T005 [P] [US1] Update `evalAggregate`, the evaluation section heading/question, metadata line, metric legend, `What this tells us` takeaway summary, runtime-traces block (rendering only `retrieval covered`, `action valid`, and `pass`), footnote, and empty state to describe retrieval, context injection, direct theme actions, and average latency without referencing `chatModel`, `dtype`, `sampling`, `fact recall`, `faithfulness`, `grounded`, or `chain pass` in `frontend/src/components/BlogPostPage.vue`
- [x] T006 [P] [US1] Update `blogMd` in `frontend/scripts/generate-llms-txt.mjs` and run `npm run generate:llms` from `frontend/` so `frontend/public/llms/blog.md` describes evaluating retrieval ranking, context injection, direct theme actions, and average latency without referencing LLM answer generation, `fact recall`, `faithfulness`, or `chain pass`

**Checkpoint**: User Story 1 is complete and independently testable in the blog post view.

---

## Phase 4: User Story 2 - Per-question breakdown reflects retrieval and action outcomes (Priority: P1)

**Goal**: Make each question's per-mode row in the "Per fixture" breakdown display its pass/fail marker (`entry.pass`), individual query latency (`entry.latencyMs`), injected sources or applied action, and retrieval/injection/action-only failure reasons (`retrieval missed`, `action misfired`, `expected source not injected`), with no `fact recall` or `faithfulness` progress bars.

**Independent Test**: Inspect the "Per fixture" list in `#/blog/chat-with-my-website` and confirm the failure summary line and every fixture row use `entry.pass`, show individual query latency (`formatLatency(entry.latencyMs)`), report only `retrieval missed`, `action misfired`, or `expected source not injected` on failures, and render zero `fact recall` or `faithfulness` bars.

### Implementation for User Story 2

- [x] T007 [US2] Update `caseReason(entry)` (returning `'retrieval missed'` when `!entry.retrievalPass`, `'action misfired'` when `!entry.actionPass`, and `'expected source not injected'` when `!entry.injectionPass`) and `failureSummary` (counting `entry.pass` instead of `entry.chainPass`) in `frontend/src/components/EvalComparison.vue`
- [x] T008 [US2] Update the `.eval-compare__row` template in `frontend/src/components/EvalComparison.vue` to display `entry.mode`, `entry.split`, individual query latency (`formatLatency(entry.latencyMs)`), `PASS`/`FAIL` badge bound to `entry.pass`, failure reason when `!entry.pass`, and remove the `.eval-case__bars` (`fact recall` and `faithfulness`) block

**Checkpoint**: User Stories 1 AND 2 are complete — the entire blog evaluation UI renders purely retrieval, injection, action, and latency statistics and per-fixture outcomes.

---

## Phase 5: User Story 3 - Fast, generation-free evaluation runs (Priority: P2)

**Goal**: Execute `npm run eval:chain` across retrieval modes without loading or running the chat language model (`LFM2.5-350M-ONNX`) or answer judge, score fixtures and historical runtime traces solely on retrieval, context injection, and theme-action outcomes, write the updated `frontend/src/data/evalResults.ts` artifact, and gate the exit code on held-out `test`-split `pass` results.

**Independent Test**: Run `npm run eval:chain -- --modes=bm25` from `frontend/` and verify it finishes in under 5 seconds without loading the chat model, writes `frontend/src/data/evalResults.ts`, and exits with code 0 when all held-out `test`-split fixtures pass.

### Implementation for User Story 3

- [x] T009 [P] [US3] Update `scoreTrace` in `frontend/scripts/trace-lib.mjs` to remove `judge`, `sourceTexts`, `BANNED_TRACE_FACTS`, `groundedness`, and `bannedViolation`, and compute `pass` from retrieval coverage (`retrievalCovered`) and action validity (`actionValid`) (passing when `retrievalCovered || actionValid`, or when a trace recorded neither injected sources nor a theme action and retrieval did not misfire an action)
- [x] T010 [US3] Refactor `frontend/scripts/eval-chain.mjs` to remove `loadUseChatModel`, `createJudge`, `loadAllSourceTexts`, `--dtype`, `--sampling`, and `--judge`, measure `latencyMs` across `retriever.retrieve` + `registry.decideAction` / `registry.buildContextText`, compute `retrievalPass`, `injectionPass` (`true` when `expectAction` is true, `expected.length === 0`, or an expected source is in `injectedNames`), `actionPass` (`appliedTheme !== null && (!expectedTheme || appliedTheme === expectedTheme)` when `expectAction` is true, else `appliedTheme === null`), and `pass = retrievalPass && injectionPass && actionPass && error === null`, update `INTERFACE_TEXT` and aggregates (`passRate`, `meanLatencyMs`), and gate exit status on held-out `test`-split `pass` failures plus trace failures
- [x] T011 [US3] Run `npm run eval:chain` from `frontend/` to regenerate and format the committed `frontend/src/data/evalResults.ts` artifact with real retrieval, context-injection, action, and latency measurements

**Checkpoint**: All user stories (`US1`, `US2`, `US3`) are independently functional and backed by a freshly generated `frontend/src/data/evalResults.ts`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation consistency and full verification across lint, type-check, build, and retrieval evaluation gates.

- [x] T012 [P] Update the `npm run eval:chain` description in `AGENTS.md` to reflect that `eval:chain` evaluates retrieval, context injection, direct theme actions, and latency without loading the chat language model or answer judge
- [x] T013 Run `npm run eval:retrieval -- --modes=bm25`, `npm run lint`, and `npm run build` in `frontend/` and validate all checks in `specs/006-retrieval-only-eval/quickstart.md` pass with zero errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately (`T001`).
- **Foundational (Phase 2)**: Depends on Setup — updates `frontend/src/data/evalResults.ts` interfaces and data (`T002`), which BLOCKS all user stories.
- **User Story 1 (Phase 3, P1)**: Depends on Foundational (`T002`). `T003`→`T004` touch `EvalComparison.vue`; `T005` (`BlogPostPage.vue`) and `T006` (`generate-llms-txt.mjs`) can run in parallel with `T003`/`T004`.
- **User Story 2 (Phase 4, P1)**: Depends on Foundational (`T002`) and shares `EvalComparison.vue` with `T003`/`T004` (`T007`→`T008`).
- **User Story 3 (Phase 5, P2)**: Depends on Foundational (`T002`) and can run in parallel with `US1`/`US2` (`T009` → `T010` → `T011`).
- **Polish (Phase 6)**: Depends on all user stories completing (`T012`, `T013`).

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2 (`T002`) — independent of US2 and US3.
- **User Story 2 (P1)**: Starts after Phase 2 (`T002`) — independent of US3; modifies the per-fixture section of `EvalComparison.vue` after US1's chart updates (`T003`–`T004`).
- **User Story 3 (P2)**: Starts after Phase 2 (`T002`) — touches `frontend/scripts/trace-lib.mjs` and `frontend/scripts/eval-chain.mjs`, completely independent of the Vue component changes in US1 and US2.

### Parallel Opportunities

- After `T002` completes:
  - `T003` (`EvalComparison.vue`), `T005` (`BlogPostPage.vue`), `T006` (`generate-llms-txt.mjs`), and `T009` (`trace-lib.mjs`) touch completely different files and can be executed in parallel.

---

## Parallel Example: User Story 1 & User Story 3

```bash
# Once Phase 2 (T002) is complete, launch independent file updates in parallel:
Task: "T003 [US1] Restrict MetricKey and EVAL_METRICS in frontend/src/components/EvalComparison.vue"
Task: "T005 [P] [US1] Update evaluation copy, takeaway, and traces block in frontend/src/components/BlogPostPage.vue"
Task: "T006 [P] [US1] Update blogMd in frontend/scripts/generate-llms-txt.mjs and regenerate frontend/public/llms/blog.md"
Task: "T009 [P] [US3] Update scoreTrace in frontend/scripts/trace-lib.mjs"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1: Setup (`T001` in `frontend/src/assets/main.css`)
2. Complete Phase 2: Foundational (`T002` in `frontend/src/data/evalResults.ts`)
3. Complete Phase 3: User Story 1 (`T003`–`T006`)
4. Complete Phase 4: User Story 2 (`T007`–`T008`)
5. **STOP and VALIDATE**: Verify the blog evaluation UI (`BlogPostPage.vue` + `EvalComparison.vue`) renders only retrieval, injection, action, and latency metrics and passes `vue-tsc`.

### Incremental Delivery

1. Setup + Foundational (`T001`–`T002`) → Schema & CSS ready.
2. User Story 1 (`T003`–`T006`) → Comparison chart, separate latency statistic, blog narrative, and `public/llms/blog.md` updated.
3. User Story 2 (`T007`–`T008`) → Per-fixture list updated to retrieval/action pass/fail and latency.
4. User Story 3 (`T009`–`T011`) → Fast generation-free `npm run eval:chain` pipeline and regenerated `evalResults.ts`.
5. Polish (`T012`–`T013`) → Documentation sync + full lint, build, and eval verification.
