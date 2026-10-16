# Phase 1 Data Model: Retrieval- and Action-Only Blog Evaluation

## 1. `ToolScoreRow`

Represents a single candidate source or action ranked by the retriever for a query.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Source or action identifier from `SOURCE_DEFS` (e.g., `'projects'`, `'set_theme'`, `'blog:chat-with-my-website'`). |
| `score` | `number` | Raw or fused retriever score. |
| `rank` | `number` | 0-based rank position in the retriever output. |
| `selected` | `boolean` | Whether this candidate fell within the selected top-K window. |

## 2. `CaseResult`

Represents a single fixture evaluated under a single retrieval mode.

| Field | Type | Description |
|-------|------|-------------|
| `fixtureIndex` | `number` | 0-based index into `FIXTURES` (`scripts/eval-fixtures.mjs`). |
| `query` | `string` | User prompt text. |
| `split` | `'train' \| 'test'` | Author-assigned evaluation split (`'test'` is the pass/fail gate; `'train'` is the tuning reference). |
| `mode` | `string` | Requested retrieval mode (`'bm25' \| 'vector' \| 'hybrid' \| 'decide'`). |
| `effectiveMode` | `string` | Actual mode used after any fallback (e.g., `'bm25'` if neural model unavailable). |
| `selectedNames` | `string[]` | Candidate names selected in top-K by the retriever. |
| `injectedNames` | `string[]` | Content source names that fit within `MAX_INJECT_CHARS` via `buildContextText(selectedNames)` (empty when an action fired or no sources selected). |
| `rows` | `ToolScoreRow[]` | Full ranked candidate list returned by the retriever. |
| `appliedTheme` | `string \| null` | Theme name returned by `decideAction(query, rows, currentTheme)` (`'amber' \| 'orange' \| 'red'`), or `null` if no theme action fired. |
| `latencyMs` | `number` | Execution time in milliseconds covering retrieval + action decision / context-budget construction. |
| `retrievalPass` | `boolean` | `true` when `expected.length === 0` or at least one expected name is in `selectedNames.slice(0, topK)`. |
| `injectionPass` | `boolean` | `true` when `expectAction` is true, `expected.length === 0`, or at least one expected source name is in `injectedNames`. |
| `actionPass` | `boolean` | For `expectAction: true`: `appliedTheme !== null` and matches `expectedArgs.set_theme.theme` (if specified). For non-action fixtures: `appliedTheme === null` (no action misfire). |
| `pass` | `boolean` | Overall fixture pass: `retrievalPass && injectionPass && actionPass && error === null`. |
| `error` | `string \| null` | Runtime error message if retrieval or context construction threw, otherwise `null`. |

### Validation & State Rules (`FR-004`, `FR-005`)

- **Theme-action fixture (`expectAction: true`)**:
  - `retrievalPass`: `'set_theme'` is in `selectedNames.slice(0, topK)`.
  - `actionPass`: `appliedTheme` equals `expectedArgs?.set_theme?.theme` (or any valid theme if unspecified).
  - `injectionPass`: `true` (no content injection expected).
  - `pass`: `retrievalPass && actionPass && !error`.
- **No-selection / smalltalk fixture (`expected: []`, `!expectAction`)**:
  - `retrievalPass`: `true`.
  - `actionPass`: `appliedTheme === null`.
  - `injectionPass`: `true`.
  - `pass`: `actionPass && !error`.
- **Content-retrieval fixture (`expected.length > 0`, `!expectAction`)**:
  - `retrievalPass`: `expected.some(name => selectedNames.slice(0, topK).includes(name))`.
  - `actionPass`: `appliedTheme === null`.
  - `injectionPass`: `expected.some(name => injectedNames.includes(name))`.
  - `pass`: `retrievalPass && injectionPass && actionPass && !error`.
- **Failure Reason Derivation (`caseReason(entry)`)**:
  1. `!entry.retrievalPass` → `'retrieval missed'`
  2. `!entry.actionPass` → `'action misfired'`
  3. `!entry.injectionPass` → `'expected source not injected'`

## 3. `ModeAggregate` & `ModeResult`

Summary statistics for a retrieval mode across all fixtures or within a specific split (`test` or `train`).

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `string` | Retrieval mode identifier (`'bm25'`, `'vector'`, `'hybrid'`, `'decide'`). |
| `n` | `number` | Number of fixture cases in this aggregate. |
| `retrievalHitRate` | `number` | Mean of `retrievalPass ? 1 : 0` across cases in the group (`0..1`). |
| `retrievalMRR` | `number` | Mean Reciprocal Rank of the best-ranked expected candidate across cases (`0..1`). |
| `injectionCoverRate` | `number` | Mean of `injectionPass ? 1 : 0` across content-retrieval cases (or all cases where `injectionPass` is evaluated) (`0..1`). |
| `actionPassRate` | `number` | Mean of `actionPass ? 1 : 0` across theme-action fixtures (`expectAction: true`) (`0..1`). |
| `passRate` | `number` | Mean of `pass ? 1 : 0` across all cases in the group (`0..1`). |
| `meanLatencyMs` | `number` | Arithmetic mean of `latencyMs` across all cases in the group (milliseconds). |

`ModeResult` extends `ModeAggregate` with per-split breakdowns:

```ts
export interface ModeResult extends ModeAggregate {
  splits: {
    test: ModeAggregate
    train: ModeAggregate
  }
}
```

## 4. `TraceAggregate`

Summary of recorded STS-format runtime sessions (`traces/*.jsonl`) scored historically for retrieval and action validity.

| Field | Type | Description |
|-------|------|-------------|
| `count` | `number` | Number of valid runtime trace sessions evaluated. |
| `sources` | `string[]` | Distinct trace file paths or URLs loaded. |
| `mode` | `string` | Retrieval mode used to re-verify historical traces. |
| `topK` | `number` | Top-K cutoff used during trace verification. |
| `retrievalCoverRate` | `number` | Fraction of traces whose recorded `injectedNames` are all retrieved within top-K (`0..1`). |
| `actionValidRate` | `number` | Fraction of traces with a valid recorded theme action (`0..1`). |
| `passRate` | `number` | Fraction of traces where `retrievalCovered || actionValid` holds (`0..1`). |

## 5. `EvalResults`

Top-level committed artifact exported from `frontend/src/data/evalResults.ts`.

| Field | Type | Description |
|-------|------|-------------|
| `generatedAt` | `string` | ISO-8601 timestamp when `npm run eval:chain` wrote the artifact. |
| `config` | `{ modes: string[]; topK: number; maxInjectChars: number; device: 'cpu'; gateSplit: 'test' }` | Evaluation configuration parameters. |
| `fixtures` | `{ total: number; train: number; test: number }` | Fixture counts per split. |
| `modes` | `ModeResult[]` | Per-mode (and per-split) summary aggregates. |
| `cases` | `CaseResult[]` | Per-fixture, per-mode results. |
| `traces` | `TraceAggregate \| null` | Historical runtime trace summary, or `null` when no traces are present. |
