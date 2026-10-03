# Contract: Eval Artifact (`evalResults.ts`)

**Feature**: `/specs/002-agent-chain-eval/spec.md` · Date: 2026-10-03

The committed, machine-readable results module that the blog renders. Single source of truth for "the numbers".

## Location & ownership

- **Path**: `frontend/src/data/evalResults.ts` (generated; committed to the repo).
- **Generator**: `scripts/eval-chain.mjs` (`npm run eval:chain`), which writes the file atomically (temp file + rename) and prettier-compliant (no semicolons, single quotes, 2-space indent, `printWidth 100`).
- **Consumers**: `BlogPostPage.vue` (renders `modes` + `cases`). No other app code reads it.
- **Never generated at build time**: `prebuild` does NOT run the eval. Stale artifact is a normal, visible state (the section shows `generatedAt`).

## Schema (also declared as the exported interface in the same file)

```ts
export interface EvalResults {
  generatedAt: string
  config: {
    modes: string[]
    topK: number
    maxRounds: number
    sampling: boolean
    device: 'cpu'
    dtype: 'q8' | 'q4'
    chatModel: string
  }
  fixtures: number
  modes: ModeAggregate[]
  cases: CaseResult[]
  traces: TraceAggregate | null   // null when no traces were scored
}

export const evalResults: EvalResults = { /* generated data */ }
```

`ModeAggregate`, `CaseResult`, `ToolCallRecord`, `StageTiming`, `AnswerScore` as defined in `data-model.md`; metric semantics as defined in `contracts/eval-metrics.md`. `TraceAggregate` (`count`, `sources`, `mode`, `topK`, `retrievalCoverRate`, `toolValidRate`, `groundedRate`, `bannedViolationRate`, `passRate`) as defined in `data-model.md`; per-trace details live in the eval report only (raw traces are never embedded — keeps the artifact small and privacy-safe, `contracts/traces.md`).

## Guarantees

1. **Type/data co-located** — the interface and the value are generated together, so drift is impossible by construction.
2. **Graceful empty state** — a fresh checkout without a committed artifact, or `fixtures === 0`, renders the "run `npm run eval:chain`" note in the blog (no broken layout).
3. **Ordering** — `modes` in the order they were run; `cases` grouped by mode then fixture index (stable for diffs).
4. **Numbers are raw** — the blog formats (percentages, `toFixed`, latency) and the evaluator reports may round differently; the artifact stores full precision (e.g. `0.9933`, `12345`), so re-rendering never changes stored values.

## Stability rules

- Field names/meanings are contract; adding fields is allowed, renaming/removing is a breaking change (bump the `config` in a future feature).
- The `Judge` swap (`contracts/judge.md`) may change *values*, never the schema.