---

description: "Task list for feature implementation — Eval Comparison Chart"
---

# Tasks: Eval Comparison Chart

**Input**: Design documents from `/specs/004-eval-comparison-chart/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/eval-comparison.md, quickstart.md

**Tests**: No test suite exists (constitution Principle III) — the mandatory gates are `npm run lint` → `npm run build` from `frontend/` plus the `npm run eval:retrieval` regression. No test tasks are generated.

**Organization**: Tasks are grouped by user story. US1 (chart + metric switch) and US2 (grouped question list) are both implemented inside the single new `EvalComparison.vue` component (research R-4), so they share files and must be implemented sequentially; only tasks touching **different files** are marked `[P]`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Frontend web app: all code lives under `frontend/` (Vue 3 SPA, `@/` → `frontend/src/`)
- Commands run from `frontend/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm a clean baseline before any change

- [X] T001 Verify the baseline passes on branch `004-eval-comparison-chart` before any change: run `npm run lint` then `npm run build` from `frontend/` (both must pass) and record the currently committed artifact state (`frontend/src/data/evalResults.ts` holds a single `decide` mode — expected, per research R-6)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Create the component shell `frontend/src/components/EvalComparison.vue` — `<script setup lang="ts">`, `defineProps<{ results: EvalResults }>()`, importing `EvalResults` / `ModeAggregate` / `CaseResult` from `../data/evalResults`; render an empty root template for now; MUST NOT contain a `<style>` block (constitution IV)
- [X] T003 Define the `EvalMetric` interface and `EVAL_METRICS` module constant in `frontend/src/components/EvalComparison.vue` — exactly six entries mapping chip label → `ModeAggregate` key: `hit@${results.config.topK}` → `retrievalHitRate`, `injection cover` → `injectionCoverRate`, `fact recall` → `factRecall`, `faithfulness` → `faithfulness`, `action pass` → `actionPassRate`, `chain pass` → `chainPassRate`; each with a per-metric color-variant class alternating `--amber` / `--orange`; MUST exclude `meanTotalLatencyMs` (ms, not a percentage) and `hallucinationRate` (a defect rate) per data-model.md Validation rules and contracts/eval-comparison.md Metric set
- [X] T004 Move the `barClip()` and `caseReason()` helpers into `frontend/src/components/EvalComparison.vue` (verbatim from `frontend/src/components/BlogPostPage.vue` lines 10 and 15–21: `barClip` = `inset(0 ${100 - Math.round(value * 100)}% 0 0)`, `caseReason` = `retrieval missed → action misfired → expected source not injected → answer drifted → chain failed`) and add a local `pct()`; keep `pct()` in `BlogPostPage.vue` (still used by the takeaway and traces sections)

**Checkpoint**: Foundation ready — `EvalComparison.vue` exists, owns the metric definitions and bar helpers; user story implementation can now begin

---

## Phase 3: User Story 1 - One comparison bar chart for all retrieval methods, switchable metric (Priority: P1) 🎯 MVP

**Goal**: The eval section leads with one pure-CSS horizontal bar chart plotting every mode in `evalResults.modes` against a switchable set of percentage metrics, driven by a multi-select pixel-chip switch defaulting to hit@K + faithfulness (spec US1; research R-1, R-2; contracts/eval-comparison.md Metric set + Chart layout).

**Independent Test**: Open the blog post with a multi-mode committed artifact → the chart shows hit@K + faithfulness bars for every mode; clicking metric chips adds/removes their bars live with zero console errors. (With the currently committed single-`decide` artifact: one mode's bars render, no crash.)

### Implementation for User Story 1

- [X] T005 [US1] Add chart state in `frontend/src/components/EvalComparison.vue` — `activeMetrics` ref seeded with `['retrievalHitRate', 'faithfulness']` (the metrics the user named) and `toggleMetric(key)` that toggles membership; guard so deselecting the last active metric is a no-op (data-model.md Validation rules: "At least one `EvalMetric` is always active")
- [X] T006 [US1] Add the `compareRows` computed in `frontend/src/components/EvalComparison.vue` — one `CompareRow` per `results.modes` in artifact order, each with one `CompareBar` per **active** metric in `EVAL_METRICS` definition order; `value` read from the `ModeAggregate` field (0–1), `pct` via `pct()` (data-model.md `CompareRow`/`CompareBar`)
- [X] T007 [US1] Render the chart template in `frontend/src/components/EvalComparison.vue` — a `.eval-chart` container with one `.eval-chart__row` per mode: a fixed-width `.eval-chart__mode` label (display font, uppercase, mirroring `.eval-mode__title`) plus `.eval-chart__bars` holding one horizontal bar per active metric; each bar reuses `.tool-result__bar eval-bar__track` with an `<i>` fill sized by `:style="{ clipPath: barClip(value) }"`, a per-metric sub-label, and a numeric readout via `pct()` (contracts/eval-comparison.md Chart layout)
- [X] T008 [P] [US1] Render the metric chip switch in `frontend/src/components/EvalComparison.vue` — a `.eval-compare__chips` container `role="group"` `aria-label="Chart metric"` with one `.pixel-chip` toggle button per `EVAL_METRICS` entry, `:aria-pressed` bound to membership, active styling mirroring `tool-selector__chip--active`, `:focus-visible` outline, `@click="toggleMetric(key)"` (contracts/eval-comparison.md Metric set)
- [X] T009 [US1] Add the `.eval-chart*` + `.eval-compare__chips` styles to `frontend/src/assets/main.css` — grid-gap chart container, mode rows (label column + stacked bars), per-metric sub-labels, per-metric color variants via `:root` variables only (no hardcoded hues), reusing the `.tool-result__bar`/`.eval-bar__track` track look; add the `@media (max-width: 480px)` treatment (chips wrap, chart rows stack, no overflow) and confirm the existing `prefers-reduced-motion` `.eval-bar__track i` rule covers the new bars (research R-5)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently — the chart renders and the switch works

---

## Phase 4: User Story 2 - Results question by question, methods side-by-side (Priority: P1) 🎯 MVP

**Goal**: Below the chart, the eval section lists results grouped by `fixtureIndex` — each query rendered once with one row per mode showing PASS/FAIL marker, injected/action meta, failure reason, and fact-recall + faithfulness bars; a "show all / show fewer" toggle expands beyond a 3-question preview (spec US2; research R-3; contracts/eval-comparison.md Grouped question list).

**Independent Test**: Open the post → each fixture query appears once with one row per mode side-by-side; the "show all N questions / show fewer" toggle (keep `aria-expanded` + `aria-controls`) expands all 35 questions.

### Implementation for User Story 2

- [X] T010 [US2] Add the `questionGroups` computed in `frontend/src/components/EvalComparison.vue` — group `results.cases` by `fixtureIndex` preserving order of first appearance, each group `{ fixtureIndex, query, rows }` with rows ordered by `results.config.modes` (data-model.md Validation rules + contracts/eval-comparison.md Grouped question list)
- [X] T011 [US2] Add list-preview state in `frontend/src/components/EvalComparison.vue` — `expanded` ref (default `false`) and a `visibleGroups` computed slicing to the first 3 groups unless `expanded` (contracts: "Preview: first 3 groups shown")
- [X] T012 [US2] Render the grouped list in `frontend/src/components/EvalComparison.vue` — an `<ol id="eval-cases-list">` with one `<li>` per visible group: the query once (reuse `.eval-case__query`), then one row per mode reusing today's exact semantics — PASS/FAIL marker from `chainPass` (`.eval-case__marker--pass`/`--fail`), meta `mode` + `→ effectiveMode` when it fell back + `· action: <appliedTheme>` else `· injected: <injectedNames|none>`, `caseReason(entry)` when `!chainPass`, and fact-recall + faithfulness bars via the existing `.eval-bar` markup with `barClip` fills (contracts/eval-comparison.md Grouped question list; matches current `BlogPostPage.vue` lines 337–391 markup, now per-group)
- [X] T013 [US2] Render the show-all toggle in `frontend/src/components/EvalComparison.vue` — a `.pixel-link-btn` button shown only when `results.cases.length > 3`, with `:aria-expanded="expanded"` and `aria-controls="eval-cases-list"`, label `Show all ${groups.length} questions` / `Show fewer`, toggling `expanded` (spec US2 scenario 3)
- [X] T014 [P] [US2] Add the grouped-list layout styles to `frontend/src/assets/main.css` under `eval-compare*` naming (`.eval-compare__list` ordered-list grid, `.eval-compare__group`, `.eval-compare__row` for per-mode rows), reusing the existing `.eval-case__query` / `.eval-case__marker` / `.eval-case__meta` / `.eval-case__reason` / `.eval-bar` classes; keep the `@media (max-width: 480px)` head-stack treatment (research R-5)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently inside the component

---

## Phase 5: User Story 3 - Rendering honesty with the committed artifact (Priority: P2)

**Goal**: The chart and grouped list derive ONLY from the unchanged `evalResults` schema — render whatever modes the artifact holds (1..N), never a fixed 4-mode assumption; a single-mode artifact renders its one mode and an empty artifact (`fixtures === 0`) shows the existing empty-state note with no chart/list markup; eval scripts stay byte-unchanged (spec US3; research R-6; contracts/eval-comparison.md Rendering honesty).

**Independent Test**: Feed a single-mode artifact → chart + list render that mode; feed an empty artifact (`fixtures === 0`) → the existing `.eval-results__empty` note shows and no chart/list markup is emitted; `npm run eval:retrieval` still passes.

### Implementation for User Story 3

- [X] T015 [US3] Add the empty-artifact guard in `frontend/src/components/EvalComparison.vue` — when `results.fixtures === 0` or `results.modes.length === 0`, render no chart and no list markup (return empty template); the existing empty-state note in `BlogPostPage.vue` (`.eval-results__empty`, lines 428–432) stays as the sole empty-state (contracts/eval-comparison.md Rendering honesty)
- [X] T016 [P] [US3] Rewire `frontend/src/components/BlogPostPage.vue` — import `EvalComparison`, replace the `.eval-modes` grid (lines 289–323) and the `.eval-cases` list + show-all button (lines 337–391) with `<EvalComparison :results="evalResults" />`, keeping the meta paragraphs, legend, takeaway (`evalAggregate` + `pct` stay), traces, and footnote; remove the now-unused `casesExpanded` / `visibleCases` / `CASES_PREVIEW` / `barClip` / `caseReason` / `formatLatency` members and the now-unused `ModeAggregate`/`CaseResult` imports (plan.md Project Structure; research R-4)
- [X] T017 [P] [US3] Remove the now-unused CSS in `frontend/src/assets/main.css` — the `.eval-modes` / `.eval-mode*` blocks and the flat `.eval-cases` container + `.eval-cases__more` styles (research R-5); keep `.eval-bar`, `.eval-case__*` classes reused by the grouped list, the `prefers-reduced-motion` `.eval-bar__track i` rule, and the `@media (max-width: 480px)` eval treatments

**Checkpoint**: All user stories are complete — the page renders the committed artifact honestly in the new chart + grouped layout

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T018 Validate with the currently committed single-mode artifact (quickstart Scenario 1 + 2): `npm run dev` from `frontend/`, open the "Chat with my website" post → chart plots hit@K + faithfulness bars for `decide`, grouped list shows one row per question, chips toggle live, "Show all 35 questions" expands, zero console errors, `:focus-visible` outlines present, no layout break at ≤480px; temporarily set `evalResults.fixtures = 0` to confirm the empty-state note renders with no chart/list markup
- [X] T019 Run the full verify chain from `frontend/` (constitution Principle III): `npm run lint` then `npm run build` MUST pass; confirm `frontend/scripts/*.mjs` are byte-unchanged and `npm run eval:retrieval` still passes (spec FR-006 / SC-001; quickstart Scenario 4)
- [X] T020 [P] Regenerate the full 4-mode comparison artifact (quickstart Scenario 3 — a data step, not code): run `npm run eval:chain` from `frontend/` with default `--modes=lexical,vector,hybrid,decide` (first run downloads router ~357 MB + decide ~345 MB + chat q8 ~634 MB / q4 ~294 MB to `~/.cache/huggingface`; fast-iterate with `npm run eval:chain -- --modes=lexical --dtype=q4`); after it writes `frontend/src/data/evalResults.ts` (schema unchanged), confirm Scenario 1 renders four modes and each question shows four side-by-side rows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 → US2 are sequential (both implemented inside `EvalComparison.vue` + `main.css`)
  - US3 depends on US1 + US2 (it wires the finished component into the page and cleans up)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (same component file, implemented top-down: chart first, list below)
- **User Story 3 (P2)**: Depends on US1 + US2 (wiring + cleanup only makes sense once the component renders fully)

### Within Each User Story

- US1: state (`activeMetrics`) → `compareRows` computed → chart markup → chip markup → chart CSS
- US2: `questionGroups` computed → preview state → grouped-list markup → show-all toggle → list CSS
- US3: empty-artifact guard → page rewiring → CSS cleanup (the last three touch different files and are parallel)

### Parallel Opportunities

- `T008` (chip markup in `.vue`) ∥ `T009` (chart CSS in `main.css`)
- `T013` (show-all toggle markup in `.vue`) ∥ `T014` (grouped-list CSS in `main.css`)
- `T015` (guard in `EvalComparison.vue`) ∥ `T016` (page rewiring in `BlogPostPage.vue`) ∥ `T017` (CSS cleanup in `main.css`)
- `T020` (artifact regeneration, data step) can run at any time independent of code
- Foundational T002 → T003 → T004 are sequential (same file); US1 and US2 cannot be split across team members because they edit the same component and stylesheet

---

## Parallel Example: User Story 1

```bash
# Launch the two different-file tasks for US1 together:
Task: "T008 [P] [US1] Render the metric chip switch in frontend/src/components/EvalComparison.vue"
Task: "T009 [US1] Add the .eval-chart* + .eval-compare__chips styles to frontend/src/assets/main.css"
```

## Parallel Example: User Story 3

```bash
# All three US3 tasks touch different files and can be launched together:
Task: "T015 [US3] Empty-artifact guard in frontend/src/components/EvalComparison.vue"
Task: "T016 [P] [US3] Rewire frontend/src/components/BlogPostPage.vue"
Task: "T017 [P] [US3] Remove unused eval CSS in frontend/src/assets/main.css"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 — both P1)

1. Complete Phase 1: Setup (baseline verify)
2. Complete Phase 2: Foundational (component shell + metric definitions + helpers)
3. Complete Phase 3: User Story 1 (chart + metric switch) → check independently
4. Complete Phase 4: User Story 2 (grouped question list + show-all) → check independently
5. **STOP and VALIDATE**: run T018 (browser check with the committed single-mode artifact) + T019 (lint/build)
6. Complete Phase 5: User Story 3 (honesty guard + page rewiring + CSS cleanup) — required before shipping
7. Deploy/demo (GitHub Pages deploy on push to `main`)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → chart + switch → verify independently
3. US2 → grouped list → verify independently
4. US3 → wire into the page, remove old markup/CSS → the eval section is the new comparison view
5. Polish → full verify chain, then (optional heavy data step) regenerate the 4-mode artifact

### Parallel Team Strategy

- The feature is deliberately a single component (research R-4), so the strong parallelism is **per-task-file**, not per-story:
  - While one implementer writes component markup in `EvalComparison.vue`, another can write the matching CSS in `main.css` (T008∥T009, T013∥T014, T015∥T016∥T017)
- `T020` (eval regeneration) is independent of all code and can run on any machine with the checkpoints cached

---

## Notes

- `[P]` tasks = different files, no dependencies
- `[Story]` label maps task to the specific user story for traceability
- The currently committed artifact holds only `decide` (research R-6) — this is expected and MUST render honestly (US3); the full 4-mode comparison is a regeneration step (T020), not a code change
- No `<style>` blocks, no new runtime dependency, no `SectionId`, no routing (constitution II/IV)
- Commit after each task or logical group; stop at any checkpoint to validate the story independently