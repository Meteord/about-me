# Contract: Decide Mode (GLiNER2.5-Decide retrieval)

**Feature**: `/specs/003-gliner-decide-retrieval/spec.md` · Date: 2026-10-03

Defines the exact model artifact, processor layout, tensor I/O, and fallback semantics shared by the browser retriever and the eval harness. A scoring number or layout step without this definition is a bug.

## Model artifact

- **Default repo**: `onnx-community/GLiNER2.5-Decide-mobile-ONNX` — official ONNX export of the *classification path* of `fastino/GLiNER2.5-Decide` (DeBERTa-v3-large encoder, 340M, Apache-2.0), 4-bit-quantized embeddings, **345 MB** (`onnx/model_q4f16.onnx`), CPU-verified (max prob diff 0.028 vs reference q4f16).
- **Documented alternatives**: `onnx-community/GLiNER2.5-Decide-ONNX` (q4f16 523 MB / q4 888 MB / fp16 872 MB / fp32 1.74 GB).
- **Dtype**: `q4f16` on WASM/CPU; **`fp16` on WebGPU** — the DeBERTa graph runs fastest at fp16 (q4f16 dequantize adds dispatch overhead on WebGPU), verified by the open-jev demo (`shreyask/open-jev-demo`, `?model=gliner2-decide`).
- **License**: Apache-2.0.

## Graph I/O

- **Inputs**: `input_ids` [batch, sequence], `attention_mask` [batch, sequence], `marker_positions` [batch, markers] (int64; **index of every `[L]` token** in `input_ids`).
- **Output**: `logits` [batch, markers] — one logit per label from the 1024→2048→1 head.
- **Distribution**: softmax *within each question's markers*.

## Processor layout (must be reproduced exactly)

Single classification group for retrieval:

```text
( [P] <task text> ( [L] label_1 [L] label_2 … ) ) [SEP_TEXT] <state>
```

Rules:

1. **Prompt and labels** keep their case and are tokenized **as whole strings**.
2. Optional per-label hints are appended to the prompt as `[DESCRIPTION] label: description`.
3. **State** (the visitor query) is lowercased, split with the processor's word regex, given a terminal `.` if it has none, and tokenized **one word at a time** with `add_special_tokens: false`.
4. `(` and `)` are tokenized as standalone words. **No `[CLS]`/`[SEP]`** (the schema is not wrapped).
5. `marker_positions` = the token index of every `[L]` token, in label order.

### Special-token ids (fixed in the export's vocab)

| Token | Id |
|---|---|
| `[SEP_STRUCT]` | 128001 |
| `[SEP_TEXT]` | 128002 |
| `[P]` | 128003 |
| `[C]` | 128004 |
| `[E]` | 128005 |
| `[R]` | 128006 |
| `[L]` | 128007 |
| `[EXAMPLE]` | 128008 |
| `[OUTPUT]` | 128009 |
| `[DESCRIPTION]` | 128010 |

## Context budget

- DeBERTa-v3 uses **relative positions only**, so the export's declared `max_len: 512` is **not** a hard model limit; the gliner2 Python library does not truncate by default, and open-jev's gliner2 family defaults to **1024 tokens** (state budget 896). Use a 1024-token default; truncation is applied to the **state only**, from the end (`budget = maxLength − schema`), never the schema.
- Labels = the existing `SOURCE_DEFS` names in registry order (content sources + the `set_theme` action), so the retrieval mapping needs no new label→source table.

## Scoring

1. `probabilities = softmax(logits)` over all markers (single question → one group).
2. `score_i = probabilities_i / max(probabilities)` (normalized to a top score of 1.0, matching the other modes' display contract).
3. Rank descending; `selected` = `rank < topK && score > 0` (unchanged `retrieve()` semantics).

## Fallback semantics

- `decide` is **never forced** by the chat loop.
- If `decideState.status !== 'ready'` or any model pass throws → lexical scores are used and `stats.effective = 'lexical'` (per case).
- The eval records `effectiveMode` from `retrieve().stats.effective`.

## Loading (browser)

- `loadDecide()`: dynamic `import('@huggingface/transformers')`; `env.allowLocalModels = false`; `env.useBrowserCache = true`; WebGPU attempted first (`device: 'webgpu', dtype: 'fp16'`), WASM fallback (`dtype: 'q4f16'`); progress via `progress_callback`.
- `disposeDecide()`: `model.dispose()`, reset state to `idle`.
- In the eval harness, the existing transpile remaps apply: `env.useBrowserCache = true → false`, `device: 'wasm' → 'cpu'`, `dtype: 'q4f16'` (CPU; the eval never runs fp16).

## Stability rules

- The layout, special-token ids, tensor names, and fallback rule are contract. Changing the model repo/dtype is a config change (documented in `research.md` R-1/R-4/R-8/R-9), never a schema change.
- No new runtime dependency: the processor is ported in-repo. `open-jev` is not a dependency — GLiNER2.5-Decide support exists only in the unmerged `nico-martin/open-jev#1` PR; our port mirrors its `encodeGliner2Sequence()` (verified token-for-token against Python `gliner2`), and `shreyask/open-jev-demo` (`?model=gliner2-decide`) is the browser reference.