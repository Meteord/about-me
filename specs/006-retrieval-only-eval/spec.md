# Feature Specification: Retrieval- and Action-Only Blog Evaluation

**Feature Branch**: `006-retrieval-only-eval`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "i want in the blog section that only the retrieval/actions but not the final generation of the llm. can we remove that part of the metrics (faithfullness and fact recall and chain pass)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Blog evaluation compares retrieval and action metrics plus average latency (Priority: P1)

As a blog reader or site maintainer viewing the "Chat with my website" article, I want the evaluation section to present only retrieval and action performance across retrieval modes — without LLM answer-generation metrics (`fact recall`, `faithfulness`, and `chain pass`) — and to display the average time taken (latency) as a separate statistic, so the evaluation focuses cleanly on whether the right content sources are retrieved/injected, whether theme actions fire accurately, and how fast each retrieval approach runs.

**Why this priority**: This directly delivers the user's primary goal of scoping the blog evaluation to retrieval and actions, removing noisy LLM generation metrics, and surfacing average execution time as its own clear statistic.

**Independent Test**: Open the blog post and verify that the metric selector, comparison chart, legend, and takeaway text display only retrieval and action metrics (`hit@K`, `injection cover`, `action pass`), surface average time taken as a dedicated statistic per mode/split, and contain no references to `fact recall`, `faithfulness`, or `chain pass`.

**Acceptance Scenarios**:

1. **Given** the blog post evaluation section is rendered with evaluation results, **When** a visitor views the comparison chart and metric selector chips, **Then** only retrieval and action metrics (`hit@K`, `injection cover`, `action pass`) are available to toggle on the percentage chart, with retrieval and injection cover active by default.
2. **Given** the blog post evaluation section is rendered, **When** a visitor views the evaluation statistics, **Then** the average time taken per query (mean retrieval/action latency in ms/s) is displayed as a separate statistic alongside each mode (and per split) so speed can be compared directly across modes.
3. **Given** the blog post evaluation section is rendered, **When** a visitor reads the section heading, introductory description, metric legend, takeaway summary, and footnote, **Then** the text describes evaluating retrieval, context injection, direct theme actions, and average retrieval latency, and makes no mention of `fact recall`, `faithfulness`, or `chain pass`.
4. **Given** runtime traces are present in the evaluation results, **When** the runtime traces block renders, **Then** it displays only retrieval coverage, action validity, and overall retrieval/action pass rate (without answer-grounding metrics).

---

### User Story 2 - Per-question breakdown reflects retrieval and action outcomes (Priority: P1)

As a blog reader inspecting the per-question results below the comparison chart, I want each question's per-mode row to show whether retrieval/injection or the expected action succeeded, without `fact recall` or `faithfulness` bars or answer-drift failure reasons, so I can compare how each retrieval mode handles individual prompts.

**Why this priority**: The per-fixture list is the second half of the blog's evaluation view and currently hardcodes `fact recall` and `faithfulness` bars plus `chainPass` markers on every row.

**Independent Test**: Inspect the "Per fixture" list in the blog post and confirm each mode row shows its pass/fail status based on retrieval/injection/action outcome, lists the injected sources or applied action, reports only retrieval/injection/action failure reasons when a case fails, and renders no `fact recall` or `faithfulness` bars.

**Acceptance Scenarios**:

1. **Given** a content-retrieval fixture in the per-question list, **When** a mode retrieves and injects at least one expected source without misfiring a theme action, **Then** the row is marked `PASS`; otherwise it is marked `FAIL` with the corresponding retrieval, injection, or action-misfire reason.
2. **Given** a theme-action fixture in the per-question list, **When** a mode triggers the expected theme action, **Then** the row is marked `PASS`; otherwise it is marked `FAIL` with an action failure reason.
3. **Given** any fixture row in the per-question list, **When** it renders, **Then** no `fact recall` or `faithfulness` progress bars are shown.

---

### User Story 3 - Fast, generation-free evaluation runs (Priority: P2)

As the site maintainer refreshing the committed evaluation results for the blog, I want the evaluation run to execute only the retrieval, context-budget injection, and theme-action decision steps without loading or running the chat language model, so refreshing the blog's evaluation artifact is fast, deterministic, and independent of LLM text generation.

**Why this priority**: Since the blog only evaluates retrieval and actions, running the 350M chat model across every fixture × mode is unnecessary overhead (hundreds of megabytes of model weights and minutes of CPU generation) and couples the pass/fail gate to LLM answer phrasing.

**Independent Test**: Run the evaluation command to regenerate the artifact and verify it completes without loading the chat language model, records retrieval/injection/action results for all fixtures and splits, and gates the exit code solely on held-out test-split retrieval/injection/action outcomes.

**Acceptance Scenarios**:

1. **Given** the maintainer runs the evaluation to update the blog artifact, **When** the run executes across the selected retrieval modes, **Then** it evaluates retrieval ranking, context-window injection, and theme-action decisions for every fixture without invoking LLM text generation.
2. **Given** all held-out test-split fixtures pass their retrieval, injection, and action checks, **When** the evaluation finishes, **Then** it writes the updated evaluation artifact and exits with code 0.
3. **Given** a held-out test-split fixture fails retrieval, injection, or action matching, **When** the evaluation finishes, **Then** it exits with a non-zero status code and reports the failing test cases.

---

### Edge Cases

- **No-selection / smalltalk fixtures (`expected: []`, no action expected)**: When a fixture expects no specific content source and no theme action (e.g., greetings or off-topic questions), it passes as long as retrieval does not misfire a theme action; context injection is not required to match an expected source.
- **Single-mode or empty evaluation data**: If the committed artifact contains only a single mode or zero fixtures, the blog section continues to render that single mode cleanly or display the empty-state message without errors.
- **Fallback retrieval mode (`effectiveMode !== mode`)**: When a neural retrieval mode falls back to BM25, the per-question row continues to indicate `→ bm25` alongside the injected sources or applied action.
- **Context budget truncation**: When an expected source is retrieved in top-K (`retrievalPass: true`) but dropped by the character budget during context construction (`injectionPass: false`), the case is marked `FAIL` with the reason `expected source not injected`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The blog evaluation comparison chart and metric selector MUST expose only retrieval and action percentage metrics (`hit@K`, `injection cover`, and `action pass`), removing `fact recall`, `faithfulness`, and `chain pass`.
- **FR-002**: By default, the comparison chart metric selector MUST have `hit@K` and `injection cover` selected on initial render, while still requiring at least one metric chip to remain active at all times.
- **FR-003**: Per-fixture rows in the blog evaluation section MUST NOT render `fact recall` or `faithfulness` bars; each row MUST display the mode name, split badge (`train` / `test`), `PASS` / `FAIL` marker, effective-mode fallback indicator (if applicable), injected sources or applied theme action, and failure reason when failing.
- **FR-004**: A fixture case MUST pass overall when:
  - For theme-action fixtures (`expectAction: true`): the retriever selects `set_theme` and `decideAction` produces the expected theme.
  - For no-selection fixtures (`expected: []` and `expectAction` not set): `decideAction` does not misfire a theme action.
  - For content-retrieval fixtures (`expected` non-empty and `expectAction` not set): at least one expected source is retrieved in top-K, at least one expected source fits within the injected context budget, and `decideAction` does not misfire a theme action.
- **FR-005**: Per-fixture failure reasons MUST report only retrieval, injection, or action failures (`retrieval missed`, `action misfired`, or `expected source not injected`) and MUST NOT report `answer drifted` or `chain failed`.
- **FR-006**: The blog post's evaluation heading, intro copy, legend, takeaway box, runtime-traces block, footnote, and retrievable markdown summary (`public/llms/blog.md`) MUST describe retrieval, context injection, theme-action evaluation, and average latency only, without referencing LLM answer generation, `fact recall`, `faithfulness`, `grounded`, or `chain pass`.
- **FR-007**: The evaluation pipeline that generates the committed blog artifact MUST evaluate retrieval, context injection, and theme-action decisions without loading or running the chat language model or answer judge, and MUST gate its exit status on held-out `test`-split retrieval/injection/action pass rates (plus runtime trace retrieval/action validity when traces are present).
- **FR-008**: The blog evaluation section MUST display the average time taken per query (mean latency across fixtures, formatted in milliseconds or seconds) as a dedicated, separate statistic (distinct from the 0–100% percentage bars) for each evaluated mode and split, and per-fixture rows MUST show the individual query's retrieval/action time.

### Key Entities *(include if feature involves data)*

- **ModeAggregate**: Per-mode (and per-split) summary statistics for the blog evaluation: sample count (`n`), `retrievalHitRate` (Hit@K), `retrievalMRR`, `injectionCoverRate`, `actionPassRate`, overall retrieval/action `passRate`, and `meanRetrievalLatencyMs` (or `meanTotalLatencyMs` measuring retrieval + action/injection).
- **CaseResult**: Per-fixture, per-mode evaluation record containing `fixtureIndex`, `query`, `split`, `mode`, `effectiveMode`, `selectedNames`, `injectedNames`, `rows`, `appliedTheme`, `retrievalMs`, `retrievalPass`, `injectionPass`, `actionPass`, `pass`, and `error`.
- **TraceAggregate**: Summary of recorded runtime traces evaluated historically for retrieval coverage (`retrievalCoverRate`), action validity (`actionValidRate`), and overall retrieval/action pass rate (`passRate`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 occurrences of the labels `fact recall`, `faithfulness`, `chain pass`, or `answer drifted` appear in the rendered blog evaluation section or its comparison component.
- **SC-002**: 100% of metrics shown in the blog comparison chart and per-question list derive exclusively from retrieval ranking, context-window source injection, theme-action selection, and retrieval/action execution time.
- **SC-003**: Average time taken (mean latency per query) is visibly rendered as a separate statistic alongside the percentage metrics in the blog evaluation section.
- **SC-004**: Regenerating the evaluation artifact for the BM25 baseline completes in under 5 seconds locally with zero chat-model downloads.
- **SC-005**: Static verification (`npm run lint` and `npm run build` from `frontend/`) and retrieval evaluation (`npm run eval:retrieval`) pass with zero errors.

## Assumptions

- Visitors can still chat with Mini-Michi (`LiquidAI/LFM2.5-350M-ONNX`) in the left dock as before; "The flow" and "The models" sections of the blog post continue to explain how the full on-device chat works, while "The eval" section specifically measures the retriever and action step.
- Removing LLM answer generation from the evaluation artifact also means the evaluation runner no longer needs to load or run the chat model (`LFM2.5-350M`) or the answer-faithfulness judge when generating `evalResults.ts`, making evaluation runs much faster and purely focused on retrieval + actions.
- In `EvalComparison.vue`, the default active chart metrics become `hit@K` (`retrievalHitRate`) and `injection cover` (`injectionCoverRate`), replacing the removed `factRecall` and `faithfulness` defaults.
