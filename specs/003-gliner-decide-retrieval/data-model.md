# Data Model: GLiNER2.5-Decide Retrieval Mode

Feature: `/specs/003-gliner-decide-retrieval/spec.md` · Date: 2026-10-03

This feature adds a fourth retrieval mode without changing any existing persistence schema. It introduces one new runtime lifecycle entity (`DecideState`), one processor entity (`DecidePrompt`), and one scoring entity (`DecideScores`); the existing `ToolScore`/`RetrieveResult`/`CaseResult`/`EvalResults` contracts are reused as-is.

## Entities

### DecideState

The load lifecycle of the GLiNER2.5-Decide model. Same shape as `vectorState`.

| Field | Type | Notes |
|---|---|---|
| `status` | `'idle' \| 'loading' \| 'ready' \| 'error'` | Reuses `VectorStatus`. |
| `device` | `'webgpu' \| 'wasm'` (`Device`) | `'cpu'` after the eval harness remap; reported from the loader. |
| `dtype` | `string` | `'fp16'` on WebGPU, `'q4f16'` on WASM/CPU. |
| `progress` | `number` | 0–100 download progress. |
| `file` | `string` | Current file being downloaded. |
| `error` | `string \| null` | Human-readable failure message. |

**State transitions**: `idle → loading → ready` (success), `loading → error` (failure, `loadDecide()` re-enterable), any → `idle` on `disposeDecide()`.

### DecidePrompt

The ported GLiNER2 processor input (see `contracts/decide-mode.md` for the exact layout).

| Field | Type | Notes |
|---|---|---|
| `prompt` | `string` | The task text (e.g. "Which content source answers this question?"), plus optional `[DESCRIPTION] label: description` hints. |
| `labels` | `string[]` | `SOURCE_DEFS` names in registry order (includes `set_theme`). Marker order == label order. |
| `state` | `string` | The visitor query; lowercased, word-split, terminal `.` appended if absent. |
| `input_ids` | `Tensor` | `[1, seq]` — concatenation of per-piece tokenizations, `add_special_tokens: false`. |
| `attention_mask` | `Tensor` | `[1, seq]`, all ones. |
| `marker_positions` | `Tensor` | `[1, markers]`, int64; index of each `[L]` token within `input_ids`. |

### DecideScores

| Field | Type | Notes |
|---|---|---|
| `logits` | `number[]` | Raw per-marker logits from the graph. |
| `probabilities` | `number[]` | `softmax(logits)` over all markers (single question). |
| `scores` | `number[]` | `probabilities / max(probabilities)` — the normalized scores fed to `retrieve()`'s ranking. |

## Relationships

- `DecideState` is owned by `useToolRetrieval.ts` (singleton refs, exported via `useToolRetrieval()`).
- `DecidePrompt` → `DecideScores` → existing `ToolScore[]` (name/score/rank/selected) → `RetrieveResult` (unchanged) → `filterSources`/`buildContextText`/`decideAction` (unchanged).
- Per-case eval entries reuse `CaseResult` (`mode: 'decide'`, `effectiveMode`); aggregates reuse `ModeAggregate`; artifact schema unchanged (`EvalResults`).

## Validation rules

- Marker count == label count; `marker_positions` values must be valid indices into `input_ids`.
- Context ≤ 1024 tokens default (DeBERTa-v3 uses relative positions only; the export's `max_len: 512` is not a hard limit). The *state* is truncated from the end to fit `maxLength − schema`, never the schema.
- A `decide` query with the model not `ready` must not throw — it degrades to lexical (effective mode recorded).

## State transitions (retrieve flow)

1. `retrieve(query, { mode: 'decide' })`
2. If `decideState.status !== 'ready'` → run lexical, `effective = 'lexical'`.
3. Else build `DecidePrompt` → run model → `DecideScores` → rank → `rows`/`selectedNames`, `effective = 'decide'`.
4. On any model error → lexical fallback, `effective = 'lexical'`.