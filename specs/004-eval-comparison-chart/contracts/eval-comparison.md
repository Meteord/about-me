# Contract: Eval Comparison Chart

**Feature**: `/specs/004-eval-comparison-chart/spec.md` · Date: 2026-10-04

Defines the exact chart layout, metric set, grouping rule, and rendering semantics the implementer and the evaluator share. The chart reads **only** from the existing `EvalResults` artifact (`src/data/evalResults.ts`) — no schema, eval-script, or fixture change.

## Metric set (the switch)

Six switchable percentage metrics, each a `ModeAggregate` field:

| Chip label | `ModeAggregate` key | Notes |
|---|---|---|
| hit@K | `retrievalHitRate` | Default active. `K` = `evalResults.config.topK`. |
| injection cover | `injectionCoverRate` | |
| fact recall | `factRecall` | Default active. |
| faithfulness | `faithfulness` | |
| action pass | `actionPassRate` | |
| chain pass | `chainPassRate` | |

**Excluded** by contract: `meanTotalLatencyMs` (ms — would break the uniform 0–100% scale) and `hallucinationRate` (a defect rate, not a success metric). Default active set = **hit@K + faithfulness** (the metrics the user named). At least one metric is always active (deselecting the last one is a no-op).

## Chart layout

- One **row per mode** (`evalResults.modes` order, which equals `evalResults.config.modes` order), in a `.eval-chart` container.
- Each row: fixed-width mode label (display font, uppercase — mirrors `.eval-mode__title`), then **one horizontal bar per active metric**, in metric-definition order.
- Each bar uses the existing `.tool-result__bar` / `.eval-bar__track` track with an `<i>` fill sized by `clip-path: inset(0 ${100 - Math.round(value * 100)}% 0 0)` (existing `barClip()` helper) and the existing amber/orange striped gradient; a per-metric color variant class distinguishes metrics.
- Each bar carries a numeric readout via the existing `pct()` (`${Math.round(value * 100)}%`).
- Metric chips: `role="group"`, `aria-label="Chart metric"`, each a `.pixel-chip` button with `:aria-pressed` and `:focus-visible` outline (reuses the `tool-selector__chip` pattern).

## Grouped question list

- Group `evalResults.cases` by `fixtureIndex`, preserving order of first appearance; within a group, order rows by `evalResults.config.modes` order.
- Each group renders the query once (`.eval-case__query`) + one row per mode. Each mode row keeps today's semantics exactly:
  - PASS/FAIL marker from `chainPass` (`eval-case__marker--pass`/`--fail`).
  - Meta: `mode` (+ `→ effectiveMode` when it fell back), then `· action: <theme>` if `appliedTheme`, else `· injected: <names|none>`.
  - Failure reason via the existing `caseReason()` (retrieval missed → action misfired → expected source not injected → answer drifted → chain failed).
  - Fact-recall + faithfulness bars (existing `.eval-bar` markup).
- Preview: first 3 groups shown; "Show all N questions / Show fewer" toggle keeps `aria-expanded` + `aria-controls` on the ordered-list container.

## Rendering honesty

- Render **exactly** the modes present in `evalResults.modes` — never assume 4 modes, never synthesize a mode.
- `evalResults.fixtures === 0` → emit no chart/list; `BlogPostPage.vue` shows the existing empty-state note.
- A stale single-mode artifact (e.g. only `decide`) renders that one mode's bars/rows — visible staleness via `generatedAt`, as today (AGENTS.md).

## Data dependency

The artifact is regenerated **only** by `npm run eval:chain` (never by prebuild). A full 4-mode comparison requires that command with default `--modes`; first run downloads the router (~357 MB), decide (~345 MB), and chat (q8 ~634 MB / q4 ~294 MB) checkpoints to `~/.cache/huggingface`. The chart renders whatever the artifact holds in the meantime.

## Accessibility & theme

- No `<style>` blocks; new classes are `eval-chart*` / `eval-compare*` in `src/assets/main.css` using `:root` variables only.
- `prefers-reduced-motion`: no bar-fill transition (existing `.eval-bar__track i` rule covers the new chart because it reuses the same track classes).
- `@media (max-width: 480px)`: chips wrap; chart rows stack; no overflow.