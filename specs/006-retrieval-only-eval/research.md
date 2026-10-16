# Phase 0 Research: Retrieval- and Action-Only Blog Evaluation

## Decision 1: Scope of the Evaluation Pipeline (`scripts/eval-chain.mjs` & `scripts/trace-lib.mjs`)

- **Decision**: Keep the `npm run eval:chain` command name for CLI backwards-compatibility, but strip all LLM answer-generation (`useChatModel`, `--dtype`, `--sampling`, `--judge`) and answer-judging steps from the evaluation run and trace scoring.
- **Rationale**:
  - FR-007 requires the evaluation pipeline that generates `frontend/src/data/evalResults.ts` to evaluate retrieval, context injection, and theme-action decisions without loading or running the chat language model or answer judge.
  - SC-004 requires regenerating the BM25 baseline artifact in under 5 seconds with zero chat-model downloads.
  - Keeping the script entry point (`npm run eval:chain` -> `scripts/eval-chain.mjs`) avoids breaking existing developer muscle memory while refocusing its execution on the retrieval -> action/context-injection pipeline.
- **Alternatives considered**:
  - *Keep running the LLM in `eval-chain.mjs` and only hide metrics in the UI*: Rejected because it violates User Story 3, FR-007, and SC-004 (which explicitly require not loading/running the chat model and completing BM25 artifact generation in < 5s).
  - *Merge `eval-chain.mjs` into `eval-retrieval.mjs`*: Rejected because `eval-retrieval.mjs` is a lightweight read-only check that does not write `src/data/evalResults.ts` or score runtime traces, and SC-005 explicitly verifies `npm run eval:retrieval` continues to pass alongside the artifact generator.

## Decision 2: Overall Pass/Fail Rules for Fixtures (`FR-004` & `FR-005`)

- **Decision**: Compute per-case booleans and overall `pass` as follows:
  - `retrievalPass`: `hitAtK(selectedNames, fixture.expected, topK) === 1` (true when `expected.length === 0` or at least one expected source/action is in `selectedNames.slice(0, topK)`).
  - `actionPass`:
    - When `fixture.expectAction === true`: `appliedTheme !== null && (expectedTheme === undefined || appliedTheme === expectedTheme)`.
    - When `fixture.expectAction` is falsy: `appliedTheme === null` (no action misfire).
  - `injectionPass`:
    - When `fixture.expectAction === true` or `fixture.expected.length === 0`: `true` (vacuously satisfied; no content source is expected to be injected).
    - When `fixture.expected.length > 0` and `!fixture.expectAction`: `fixture.expected.some((name) => injectedNames.includes(name))`.
  - Overall `pass`: `retrievalPass && injectionPass && actionPass && !error`.
  - Failure reason (`caseReason(entry)`):
    1. If `!entry.retrievalPass` -> `'retrieval missed'`
    2. If `!entry.actionPass` -> `entry.appliedTheme ? 'action misfired' : 'action missed'` (or `'action misfired'` when an unexpected theme fired / `'retrieval missed'` when `set_theme` wasn't retrieved; see note below)
    3. If `!entry.injectionPass` -> `'expected source not injected'`
    - Note on FR-005: FR-005 specifies `retrieval missed`, `action misfired`, or `expected source not injected`. For a theme-action fixture where `set_theme` was not in top-K, `!entry.retrievalPass` is true so it reports `retrieval missed`; if `set_theme` was in top-K but `decideAction` applied the wrong theme or failed to fire, `!entry.actionPass` reports `action misfired`.
- **Rationale**: Directly satisfies FR-004, FR-005, and all Edge Cases (including no-selection smalltalk fixtures with `expected: []` and context-budget truncation).
- **Alternatives considered**:
  - *Keep ` injectionPass = false` on `expected: []` fixtures*: Rejected because smalltalk fixtures (`what time is it?`, `hello!`) have `expected: []` and expect no content source; marking `injectionPass: false` on them previously artificially lowered `injectionCoverRate` to ~92% even when every content fixture injected its expected source. Note: For `injectionCoverRate` aggregate, we should either compute across content-retrieval fixtures (`expected.length > 0 && !expectAction`) or treat vacuous cases as passing; computing `injectionPass = true` when no content source is expected (or averaging over content fixtures) ensures `injectionCoverRate` accurately reflects whether expected sources fit into the context budget.

## Decision 3: Dedicated Average Latency Statistic (`FR-008` & `SC-003`)

- **Decision**:
  - Record `latencyMs` (the retrieval + action/injection execution time in ms) on each `CaseResult`, and `meanLatencyMs` on each `ModeAggregate` (overall mode, `splits.test`, and `splits.train`).
  - In `EvalComparison.vue`:
    - Render average time taken (`avg time` / `meanLatencyMs`) as a dedicated, separate statistic badge/readout both in the mode header and per split (`test` and `train` split headers), distinct from the 0–100% percentage bars.
    - Render the individual query's `latencyMs` in each per-fixture row header/meta line.
  - Format latency cleanly: sub-millisecond or small ms values (e.g. BM25 `< 1ms` or `1.2ms` vs neural `120ms` / `1.4s`) formatted with `formatLatency(ms)` (`< 1ms` when `< 0.5`, `${ms.toFixed(1)}ms` when `< 10`, `${Math.round(ms)}ms` when `< 1000`, `${(ms / 1000).toFixed(2)}s` when `>= 1000`).
- **Rationale**: FR-008 requires displaying average time taken per query as a dedicated, separate statistic for each evaluated mode and split, and showing individual query retrieval/action time on per-fixture rows. Because BM25 runs in ~0.1–1ms in Node while neural modes take hundreds of milliseconds, sub-10ms precision prevents BM25 from displaying as `0ms`.
- **Alternatives considered**:
  - *Include latency as a bar in the 0–100% chart*: Rejected by FR-008 ("as a dedicated, separate statistic (distinct from the 0–100% percentage bars)").
  - *Round all latencies with `Math.round(ms)`*: Rejected because pure BM25 in Node takes ~0.1–0.4ms per query and rounding to integer `0ms` looks broken or simulated.

## Decision 4: Artifact Schema (`src/data/evalResults.ts`)

- **Decision**: Cleanly update the TypeScript interfaces and generated artifact in `frontend/src/data/evalResults.ts` to remove LLM generation fields (`AnswerScore`, `StageTiming.generationMs`/`tokensGenerated`, `finalAnswer`, `score`, `answerPass`, `chainPass`, `factRecall`, `faithfulness`, `hallucinationRate`, `answerPassRate`, `chainPassRate`, `groundedRate`, `bannedViolationRate`, `chatModel`, `sampling`, `dtype`).
- **Rationale**: `src/data/evalResults.ts` co-locates the TypeScript interfaces and the generated data consumed only by `BlogPostPage.vue` and `EvalComparison.vue`. Removing unused generation-only fields enforces SC-001 and SC-002 at the type level (`vue-tsc` will catch any lingering reference).
- **Alternatives considered**:
  - *Keep dead dummy fields (`factRecall: 0`, `finalAnswer: ''`) in `evalResults.ts`*: Rejected because it pollutes the committed artifact and violates the spirit of removing those metrics from the blog evaluation.

## Decision 5: Runtime Traces Scoring (`scripts/trace-lib.mjs` & `BlogPostPage.vue`)

- **Decision**: Update `scoreTrace` in `scripts/trace-lib.mjs` and `TraceAggregate` in `src/data/evalResults.ts` so historical traces are scored solely on retrieval coverage (`retrievalCovered`) and action validity (`actionValid`), with `pass = retrievalCovered || actionValid` (or for traces with neither injected sources nor action, whether retrieval also selects no action). Remove `judge` and `groundedRate` / `bannedViolationRate` from trace scoring and from the `BlogPostPage.vue` runtime traces UI block.
- **Rationale**: Directly required by User Story 1 Acceptance Scenario 4, FR-006, FR-007, and Key Entities (`TraceAggregate`).
- **Alternatives considered**:
  - *Keep running the answer judge on traces*: Rejected by FR-006 ("runtime-traces block... without referencing LLM answer generation, `fact recall`, `faithfulness`, `grounded`, or `chain pass`") and FR-007 ("without loading or running the chat language model or answer judge").
