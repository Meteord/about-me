# Feature Specification: Eval Comparison Chart

**Feature Branch**: `004-eval-comparison-chart`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "i want to compare the statistics of the different approaches. i want one diagramm that shows retrieval/faithfullness in a bar chart for all methods. and then i can switch and below should be the results question by question"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One comparison bar chart for all retrieval methods, switchable metric (Priority: P1)

The "Chat with my website" blog post's eval section leads with **one diagram**: a bar chart that plots every retrieval method (`lexical`, `vector`, `hybrid`, `decide`) against a selectable percentage metric. A pixel-chip **switch** (multi-select, `retrieval` + `faithfulness` active by default) picks which metrics are plotted; each active metric renders one bar per method, colored and labeled by metric. The chart is pure CSS (pixel bars, `clip-path` fills) — no charting library.

**Why this priority**: This is the literal core of the request — "one diagram that shows retrieval/faithfulness in a bar chart for all methods … and then i can switch". It turns the current per-mode stat-card grid into a single comparable diagram.

**Independent Test**: Open the blog post with a multi-mode committed artifact → the chart shows retrieval + faithfulness bars for every method; clicking metric chips adds/removes their bars live; zero console errors.

**Acceptance Scenarios**:

1. **Given** a committed artifact with N modes, **When** the post renders, **Then** the chart shows one grouped row per mode with a bar for each selected metric, colored and labeled by metric, with the numeric percentage alongside.
2. **Given** the default selection, **When** rendered, **Then** retrieval + faithfulness are the active metrics; toggling chips adds/removes their bars without reloading.
3. **Given** an artifact holding a single mode (stale `--modes=decide` run), **When** rendered, **Then** the chart shows that one mode's bars without any error or empty state.

---

### User Story 2 - Results question by question, methods side-by-side (Priority: P1)

Below the chart, the eval section lists the results **question by question**: every fixture query appears once, and under it one row per method shows that method's PASS/FAIL marker, its fact-recall + faithfulness bars, its injected-sources / applied-theme meta, and its failure reason. The flat per-case list (one entry per mode × fixture) is regrouped so methods are compared directly per question.

**Why this priority**: The second half of the request — "below should be the results question by question" — is the detail view that makes the chart's aggregate numbers concrete and comparable.

**Independent Test**: Open the post → each fixture shows one row per method side-by-side; the "show all" toggle expands all 35 questions.

**Acceptance Scenarios**:

1. **Given** the committed artifact, **When** the list renders, **Then** cases are grouped by `fixtureIndex` (each query shown once) and each method's row shows its fact-recall + faithfulness bars and a PASS/FAIL marker.
2. **Given** a fallback case (`effectiveMode !== mode`, e.g. `decide → lexical`), **When** its row renders, **Then** the meta shows `mode → effective` (unchanged from today).
3. **Given** more than 3 questions, **When** rendered, **Then** only 3 are shown with an `aria-expanded`/`aria-controls` "show all" button.

---

### User Story 3 - Rendering honesty with the committed artifact (Priority: P2)

The chart and grouped list derive **only** from the existing, unchanged `evalResults` schema — no new fields, no schema change, no eval-script change. A stale or single-mode artifact still renders (whatever modes are present); a missing/empty artifact keeps the existing "run `npm run eval:chain`" note. The maintainer regenerates a multi-mode artifact with `npm run eval:chain` (all modes default) — a data step, not a code change.

**Why this priority**: Constitution VI — the blog must render exactly what the committed artifact holds and never invent numbers; the feature must not regress the current honest rendering when only one mode was evaluated.

**Independent Test**: Temporarily feed a single-mode artifact → chart + list render that mode; feed an empty artifact (`fixtures === 0`) → the existing empty-state note shows.

**Acceptance Scenarios**:

1. **Given** `evalResults.modes` has 1..N entries, **When** rendered, **Then** every mode present is charted and listed (no fixed 4-mode assumption).
2. **Given** `evalResults.fixtures === 0` (empty artifact), **When** rendered, **Then** the existing empty-state note shows and no chart/list markup is emitted.
3. **Given** the eval scripts, **When** the feature ships, **Then** they are byte-unchanged and `eval:retrieval` still passes (constitution VI).

---

### Edge Cases

- **Artifact holds only `decide`** (stale single-mode run): the chart shows one mode, the grouped list shows one row per question — no crash, no invented modes.
- **All-zero metric values**: the switch excludes non-percentage fields (`meanTotalLatencyMs`) and `hallucinationRate` (a defect rate, not a success metric); a metric with all-zero bars still renders (0% bars are honest).
- **Fallback `effectiveMode`**: shown per row as `mode → effective`, exactly as today.
- **Long lists**: 35 fixtures × 4 modes = 140 rows worst case; keep the 3-question preview + "show all" toggle.
- **≤480px**: metric chips wrap; bars keep their grid; no overflow (existing `eval-*` breakpoint conventions).
- **`prefers-reduced-motion`**: no bar `clip-path` transition (existing rule already covers `.eval-bar__track i`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `BlogPostPage.vue` MUST render a single comparison bar chart plotting all `evalResults.modes` against selectable percentage metrics, driven by a multi-select pixel-chip switch (`role="group"`, `aria-pressed`), defaulting to retrieval + faithfulness active.
- **FR-002**: The chart MUST read bars exclusively from `ModeAggregate` fields (`retrievalHitRate`, `injectionCoverRate`, `factRecall`, `faithfulness`, `actionPassRate`, `chainPassRate`) — no `evalResults.ts` schema change, no eval-script change.
- **FR-003**: Below the chart, cases MUST be grouped by `fixtureIndex` (query rendered once) with one row per mode; each row MUST show fact-recall + faithfulness bars, PASS/FAIL marker, injected/action meta, and failure reason (reusing today's `caseReason` semantics).
- **FR-004**: No new runtime dependency, no `<style>` block; new classes follow `eval-*` naming in `src/assets/main.css`; `:focus-visible`, `prefers-reduced-motion`, and the `@media (max-width: 480px)` overrides MUST be preserved; the "show all" toggle keeps `aria-expanded` + `aria-controls`.
- **FR-005**: Single-mode and empty artifacts MUST render without errors (graceful degradation); the empty-state note is unchanged.
- **FR-006**: `npm run lint` → `npm run build` MUST pass from `frontend/` (constitution Principle III).

### Key Entities *(include if feature involves data)*

- **EvalMetric**: a switchable chart metric — `key` (a `ModeAggregate` percentage field), `label`, and a color variant class.
- **CompareRow**: one method's chart row — `mode`, plus one bar per active `EvalMetric`.
- **QuestionGroup**: one fixture's grouped view — `fixtureIndex`, `query`, and one `ModeCaseRow` per mode (PASS/FAIL marker, fact-recall/faithfulness bars, meta, reason).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run lint` → `npm run build` pass from `frontend/`.
- **SC-002**: With a multi-mode committed artifact, the blog renders one chart plotting all methods, and toggling metric chips live-adds/removes bars with zero console errors.
- **SC-003**: The per-question list groups by question with methods side-by-side, and the "show all" toggle reveals all 35 questions.
- **SC-004**: A single-mode artifact and an empty artifact both render without errors (chart / existing empty note).
- **SC-005**: No ≤480px or `prefers-reduced-motion` regression; chips and toggle remain keyboard-accessible (`:focus-visible`, `aria-pressed`, `aria-expanded`).

## Assumptions

- The committed artifact may hold 1..N modes; the full comparison requires re-running `npm run eval:chain` (default all modes) — heavy model downloads on first run (router ~357 MB + decide ~345 MB + chat q8 ~634 MB / q4 ~294 MB), cached. This is a regeneration step documented in the quickstart, not a code change.
- The chart is pure CSS (pixel bars with `clip-path` fills, mirroring `.tool-result__bar` / `.eval-bar__track`) — no charting dependency (constitution II).
- Default chart selection is **retrieval + faithfulness** (the metrics the user named); the switch exposes all six percentage metrics.
- The eval section's per-mode stat-card grid (`eval-modes`) is **replaced** by the single chart; latency/MRR are not in the user's requested metric set and are dropped from the comparison view (the switch offers the six percentage metrics only).
- A small dedicated component (`EvalComparison.vue`) isolates the section's new state (active metrics, expanded) and keeps `BlogPostPage.vue` readable.