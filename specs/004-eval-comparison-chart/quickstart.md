# Quickstart: Eval Comparison Chart

**Feature**: `/specs/004-eval-comparison-chart/spec.md` · Date: 2026-10-04

Validation guide — proves the feature works end-to-end. Implementation details live in `tasks.md`; chart/metric/grouping semantics in `contracts/eval-comparison.md`; entities in `data-model.md`.

## Prerequisites

- Node `^20.19.0 || >=22.12.0`, deps installed (`cd frontend && npm install`).
- A committed `src/data/evalResults.ts`. The **currently committed artifact holds only `decide`** (stale single-mode run) — the feature renders it honestly (US3). To see the full 4-mode comparison, regenerate (Scenario 3).
- No new runtime dependencies.

## Scenario 1 — Browser: chart + switch + grouped questions (SC-002 / SC-003)

```bash
cd frontend && npm run dev
```

Open the "Chat with my website" blog post and scroll to **The eval**.

1. One bar chart plots **hit@K + faithfulness** bars for every mode in the artifact (today: `decide` only).
2. Toggle metric chips (`role="group"`): activating a metric adds its bars to the chart, deactivating removes them; deselecting the last active chip is a no-op; `aria-pressed` tracks state.
3. Below the chart, the list is grouped **question by question**: each query once, one row per mode with PASS/FAIL marker, injected/action meta, reason, and fact-recall + faithfulness bars.
4. "Show all N questions / Show fewer" expands/collapses the list (`aria-expanded` + `aria-controls`).
5. `prefers-reduced-motion`: no bar-fill transitions. At ≤480px: chips wrap, chart rows stack, no overflow.

**Expected**: zero console errors; `:focus-visible` outlines on chips and the toggle; no layout break at ≤480px.

## Scenario 2 — Single-mode + empty artifact robustness (SC-004)

- With the current `decide`-only artifact: the chart shows one mode, the list one row per question — no crash, no invented modes.
- Temporarily set `evalResults.fixtures = 0` (or check a checkout without the artifact): the section shows the existing "run `npm run eval:chain`" empty note and no chart/list markup.

**Expected**: no errors in either state.

## Scenario 3 — Regenerate a full 4-mode comparison (data step, not code)

```bash
cd frontend && npm run eval:chain
```

- Default `--modes=lexical,vector,hybrid,decide`; first run downloads the router (~357 MB), decide (~345 MB), and chat (q8 ~634 MB / q4 ~294 MB) checkpoints to `~/.cache/huggingface`. Fast iteration: `npm run eval:chain -- --modes=lexical --dtype=q4`.
- Writes `src/data/evalResults.ts` (schema unchanged) with all four modes in `config.modes`/`modes[]` and one `case` per mode × fixture.

**Expected**: after this, Scenario 1's chart plots four modes and each question shows four side-by-side rows. Exit code non-zero on any chain failure (normal, not a feature bug).

## Scenario 4 — Full verify chain (SC-001 / SC-005)

```bash
cd frontend && npm run lint && npm run build
```

**Expected**: both pass. `npm run build` runs `type-check` + `build-only`. `npm run eval:retrieval` also still passes (eval scripts are byte-unchanged).

## References

- Chart/metric/grouping contract: `contracts/eval-comparison.md`
- Entities: `data-model.md`
- Eval/metrics definitions: `specs/002-agent-chain-eval/contracts/eval-metrics.md`, `artifact.md`