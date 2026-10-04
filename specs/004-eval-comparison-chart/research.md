# Research: Eval Comparison Chart

Feature: `/specs/004-eval-comparison-chart/spec.md` · Date: 2026-10-04

## Context

The "Chat with my website" blog post renders the committed `evalResults.ts` artifact. Today its eval section shows (a) a per-mode stat-card grid (`eval-modes`, one card per mode with a `<dl>` of hit@K / injection cover / fact recall / faithfulness / latency / action pass / chain pass), (b) an aggregate takeaway, and (c) a **flat** per-fixture list (`eval-cases`) where each entry is one `mode × fixture` case. The user wants to *compare approaches*: one diagram showing retrieval/faithfulness as a bar chart for all methods, a switch to change which metric the chart plots, and below it the results question by question. This research resolves the chart implementation, the switch semantics, the regrouping, the component boundary, and the CSS approach.

## R-1: Chart implementation — pure CSS bars, no dependency

**Context**: FR-001/FR-004 — "one diagram … bar chart", no new dependency (constitution II), pixel theme (constitution IV).

**Decision**: Render the chart as **pure CSS horizontal bars** reusing the existing `.tool-result__bar` / `.eval-bar__track` pattern (`clip-path: inset(0 X% 0 0)` fill via the existing `barClip()` helper). Each mode gets a row: a fixed-width mode label, one `.eval-bar__track` with an `<i>` fill sized by the metric value, and a percentage readout. When multiple metrics are active, each mode row shows one bar **per active metric**, each bar using the existing amber/orange stripe gradient or a per-metric color variant.

**Rationale**: The blog already ships this exact visual language (`.eval-bar`, `tool-result__bar`, `barClip`, `pct`); a pixel bar chart is a direct composition of it. Zero new bytes for a library (mermaid is already used for the flow diagram, but a bar chart doesn't need an engine), crisp at any width, and trivially accessible (each bar's `%` value is real text). The striped gradient fill reads "retro" and matches the theme's hard-edged look. Vertical SVG bars would need bespoke axes/ticks and diverge from the theme's blocky horizontal-bar idiom.

**Alternatives considered**: an SVG `<rect>` bar chart — more code, awkward to animate with `steps()`, no accessibility benefit over labeled horizontal bars; a charting library (Chart.js/ECharts) — violates constitution II for a 4-row chart; a `<table>` — semantically correct but visually a table, not the "diagram" the user asked for.

## R-2: The switch — multi-select pixel chips, aria-pressed

**Context**: FR-001 — "then i can switch".

**Decision**: A chip group (`role="group"`, `aria-label="Chart metric"`) of six toggle buttons, one per percentage metric: **hit@K**, **injection cover**, **fact recall**, **faithfulness**, **action pass**, **chain pass**. Chips use the existing `pixel-chip` + `tool-selector__chip`/`--active` styling, each with `:aria-pressed`. Default active: **retrieval (hit@K) + faithfulness** (the two metrics the user named). Selecting a metric adds its bars to the chart; deselecting removes them; at least one metric is always active (guard so the chart never shows an empty state from user action). Metrics map to `ModeAggregate` keys: `retrievalHitRate`, `injectionCoverRate`, `factRecall`, `faithfulness`, `actionPassRate`, `chainPassRate`.

**Rationale**: The user's phrasing "retrieval/faithfulness in a bar chart … and then i can switch" reads as: show those two, and let me switch/expand which metrics are plotted. Multi-select toggles match the request better than a single-select radio (the user listed two metrics to *see together*, not to choose between). `aria-pressed` chips are the established pattern (`ToolSelectorPanel.vue` retriever modes) and the theme already styles them. Latency is deliberately excluded (it's ms, not a percentage) and `hallucinationRate` is a defect rate, not a success metric — both would break the uniform 0–100% bar scale.

**Alternatives considered**: a single-select radio switch (one metric at a time) — loses the "retrieval AND faithfulness together" default; a `<select>` dropdown — hidden affordance, not a diagram; keeping latency — mixes units in one chart.

## R-3: Per-question regrouping — group by fixtureIndex, one row per mode

**Context**: FR-003 — "below should be the results question by question".

**Decision**: Replace the flat `eval-cases` list with a **grouped list**: `evalResults.cases` grouped by `fixtureIndex` (order preserved), each group rendering the query once plus one row per mode. Each mode row shows: the mode label (with `→ effectiveMode` when it fell back), the PASS/FAIL marker (from `chainPass`), the injected-sources / applied-theme meta, the failure reason (existing `caseReason`), and the fact-recall + faithfulness bars (existing `.eval-bar` markup). The "show all / show fewer" toggle now expands *questions* (groups), defaulting to 3.

**Rationale**: The current flat list interleaves all modes, making per-question comparison tedious (mode × fixture = 140 rows worst case). Grouping by `fixtureIndex` gives exactly "results question by question", with methods side-by-side per question. All per-row data already exists in `CaseResult` — no artifact change. The query + reason semantics stay byte-identical to today's rendering.

**Alternatives considered**: keep the flat list and only add the chart — the user explicitly asked for the question-by-question view below; filter by a selected single mode — the user wants all methods compared, not one at a time.

## R-4: Component boundary — new `EvalComparison.vue`

**Context**: FR-001/FR-003/FR-004 — keep `BlogPostPage.vue` readable.

**Decision**: Extract a new `<script setup lang="ts">` component `EvalComparison.vue` in `src/components/` that owns the chart state (active metrics, expanded questions) and renders: the chart + metric chips, the grouped question list, and the show-all toggle. It receives `evalResults` as a prop and imports the `EvalResults`/`CaseResult`/`ModeAggregate` types from `src/data/evalResults.ts`. `BlogPostPage.vue` keeps the meta paragraphs, legend, takeaway, traces, and footnote, and replaces the `eval-modes` grid + `eval-cases` list with `<EvalComparison :results="evalResults" />`. No `<style>` block in the component (constitution IV).

**Rationale**: The blog post component is already ~460 lines; the chart + switch + grouped list logic (two computed groupings, chip state, guard logic) would push it past 550 and mix concerns. A dedicated component mirrors the codebase's existing component split (`ToolSelectorPanel.vue`, `AiSection.vue`) and keeps the eval-section state local. Props-only data flow keeps it a pure function of the committed artifact.

**Alternatives considered**: inline in `BlogPostPage.vue` — simpler diff but bloats the file and couples chart state to page mount/unmount logic; a composable (`useEvalComparison`) + template in the page — splits related markup/state across two files for no gain at this size.

## R-5: CSS — new `eval-chart`/`eval-compare` classes, reuse existing primitives

**Context**: FR-004 — global CSS, `eval-*` naming, no `<style>` blocks.

**Decision**: Add to `src/assets/main.css` a small `eval-chart` block: `.eval-chart` (grid gap container), `.eval-chart__row` (mode row: label grid-column + bars), `.eval-chart__mode` (mode label, `var(--font-display)` like `.eval-mode__title`), `.eval-chart__bars` (stack of `.eval-bar`-style tracks per active metric), `.eval-chart__metric` (per-metric sub-label), plus `.eval-compare__chips` (chip group) and a per-metric color variant (amber/orange accent alternation via the existing `--pixel-*` variables). Reuse `.tool-result__bar`/`.eval-bar__track` for the tracks and the existing `barClip` clip-path. Include the `prefers-reduced-motion` and `@media (max-width: 480px)` treatments (chips wrap, chart rows stack).

**Rationale**: The theme's rule is global CSS with `eval-*` naming and `:root` variables only. Reusing `.eval-bar`/`.tool-result__bar` means the bar *look* is already shipped and accessible; the new classes only arrange rows, mode labels, metric sub-labels, and chips. The existing `.eval-mode`/`.eval-modes`/`.eval-cases` classes are removed along with the markup that used them (replaced by the chart + grouped list), keeping the stylesheet honest.

**Alternatives considered**: an `.eval-chart__bar--<metric>` color per metric with hardcoded hues — rejected, must use `:root` variables; a `<style>` block in the component — explicitly forbidden by constitution IV.

## R-6: Data pipeline — artifact unchanged; regeneration is a run step

**Context**: FR-002/FR-006 and US3 — no schema change, honest rendering.

**Decision**: `evalResults.ts` (schema), `eval-chain.mjs`, `eval-retrieval.mjs`, `eval-lib.mjs`, and `trace-lib.mjs` are **unchanged**. The committed artifact currently holds **only `decide`** (last run was `npm run eval:chain -- --modes=decide --dtype=q4`), so the chart/list render one mode today; to display the full comparison the maintainer runs `npm run eval:chain` (default `--modes=lexical,vector,hybrid,decide`), which downloads the router, decide, and chat checkpoints on first run (cached). This is documented in the quickstart, not implemented in code. The `generatedAt` staleness note (AGENTS.md: "A stale artifact is normal and visible") applies unchanged.

**Rationale**: The mode comparison is exactly the promise of FR-007/003-spec — a committed, regenerable artifact. The UI must render whatever the artifact holds (single or multiple modes) and never special-case 4 modes.

**Alternatives considered**: hard-coding the four modes / defaulting a fake multi-mode view — violates constitution VI honesty; auto-running the eval at build time — forbidden (prebuild never runs the eval, AGENTS.md).

## Open items resolved from spec

All NEEDS CLARIFICATION markers resolved: chart implementation (R-1), switch semantics (R-2), regrouping (R-3), component boundary (R-4), CSS approach (R-5), data pipeline (R-6). Two product decisions were confirmed with the user: **all percentage metrics** in the switch (R-2) and **group-by-question with methods side-by-side** for the list (R-3).