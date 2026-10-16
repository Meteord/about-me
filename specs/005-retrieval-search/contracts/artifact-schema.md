# Contract: Generated evaluation artifact (`frontend/src/data/evalResults.ts`)

Regenerated **only** by `npm run eval:chain` (prebuild never runs it). Rendered
by `EvalComparison.vue` via `BlogPostPage.vue`. Committed; a stale `generatedAt`
is expected and visible on the blog page. Contract consumers:
`src/components/EvalComparison.vue`, `src/components/BlogPostPage.vue`.

## Schema (TypeScript, generated as today, plus the split dimension)

```ts
export interface CaseResult {
  // … all existing fields …
  split: 'train' | 'test'          // NEW — copied from the fixture
  mode: string                     // 'bm25' | 'vector' | 'hybrid' | 'decide' (never 'lexical')
  effectiveMode: string            // fallback self-reports 'bm25'
}

export interface ModeAggregate {
  mode: string
  n: number                        // case count covered by this aggregate
  // existing fields unchanged …
}

export interface EvalResults {
  generatedAt: string
  config: {
    modes: string[]
    topK: number
    maxInjectChars: number
    sampling: boolean
    device: 'cpu'
    dtype: 'q8' | 'q4'
    chatModel: string
    gateSplit: 'test'              // NEW — which split decided pass/fail (FR-011)
  }
  fixtures: { total: number; train: number; test: number }   // CHANGED shape
  modes: Array<{
    mode: string
    n: number                      // total cases across both splits
    // … existing aggregate fields (computed over both splits) …
    splits: {
      test: ModeAggregate          // the gate split — headline numbers
      train: ModeAggregate         // tuning reference
    }
  }>
  cases: CaseResult[]
  traces: TraceAggregate | null    // test-side data; trace.mode reads 'bm25'
}
```

## Rules

- FR-011: per-split metrics per mode + a recorded gate split are mandatory in
  every generated artifact.
- FR-008: the string `lexical` must not appear in any generated artifact
  (historical artifacts are regenerated, not patched).
- `EvalComparison.vue` renders the train/test distinction so the
  generalization gap is visible; train rows are labeled "tuning reference".
- Composition of the file (interfaces + `export const evalResults`) and the
  prettier pass stay as implemented in `writeArtifact`.
