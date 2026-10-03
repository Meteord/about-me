# Research: GLiNER2.5-Decide Retrieval Mode

Feature: `/specs/003-gliner-decide-retrieval/spec.md` · Date: 2026-10-03

## Context

The site's retriever (002 feature) already has three modes: `lexical` (BM25), `vector` (LFM2.5 prompt router, kucukkanat ONNX), and `hybrid` (RRF fusion). The user wants an additional option: a **decision model** like `fastino/GLiNER2.5-Decide` that *decides which content to retrieve* rather than scoring embeddings. This research resolves the model-artifact choice, the processor port, the transformers.js integration, and the eval/browser wiring.

## R-1: Model artifact — the original ships no ONNX; use the official ONNX export

**Context**: FR-001/FR-008 require an on-device model runnable in transformers.js (browser + Node CPU) with no new runtime dependency.

**Decision**: Use **`onnx-community/GLiNER2.5-Decide-mobile-ONNX`** (Apache-2.0, 345 MB, `onnx/model_q4f16.onnx`) as the default artifact. It is the official ONNX export of the *classification path* of `fastino/GLiNER2.5-Decide` (DeBERTa-v3-large encoder, 340M) with the 128k-token embedding table quantized (4-bit, block 32) so no tensor exceeds ~70 MB and the whole file is 345 MB instead of 523 MB — phone-safe and CPU-verified (max probability difference 0.028 vs the reference q4f16 on ONNX Runtime CPU). Documented alternative: `onnx-community/GLiNER2.5-Decide-ONNX` (q4f16 523 MB / q4 888 MB / fp16 872 MB / fp32 1.74 GB).

**Rationale**: `fastino/GLiNER2.5-Decide` itself publishes **only** `model.safetensors` (1.95 GB) + a `tokenizer.json` — no ONNX weights, so transformers.js cannot load it directly. The onnx-community repo exists precisely to package the classification path for Transformers.js (`library: transformers.js` tag; card says "Use with Transformers.js: `pipeline('text-classification', …)`"). The mobile variant is the smallest download consistent with the site's existing model budget (router q8 ~357 MB) and with the "loads in a phone tab" goal.

**Alternatives considered**:
- Loading `fastino/GLiNER2.5-Decide` safetensors directly — impossible in transformers.js (no ONNX; no auto-conversion).
- The `onnx-community/GLiNER2.5-Decide-ONNX` fp16/fp32 — bigger downloads with no fidelity gain needed for a retrieval ranking.
- **`open-jev` npm wrapper** — rejected as a *dependency*: the released `open-jev@0.1.2` `detectFamily()` only accepts configs carrying an `open_jev` or `kev` section, and this model's `config.json` carries a `gliner2` section, so it throws "Unsupported model". GLiNER2.5-Decide support exists only in an **open, unmerged PR** (`nico-martin/open-jev#1`, the `gliner2-family` branch) that the demo is built from (R-9). Pinning a dependency to an unmerged branch is fragile and adds a dep the site doesn't need (constitution Principle II). The PR is nevertheless the **reference implementation** for our in-repo port (R-3).
- `onnx-community/GLiNER2.5-Decide-ONNX` via the `text-classification` **pipeline** — the model is a classification graph, but the pipeline path doesn't expose the GLiNER2 `marker_positions` input; the site's established pattern is direct `PreTrainedModel` calls (see R-3), so a pipeline is both unnecessary and insufficient.

## R-2: What GLiNER2.5-Decide is — and what it is not

**Context**: FR-002 — the feature must use the model "to decide which content to retrieve".

**Decision**: Treat it as a **single-label multi-class classifier**: the visitor's query is the *state*, the site's `SOURCE_DEFS` names are the *labels*, and the model's per-marker logits (softmaxed) are the per-source probabilities we rank. This maps 1:1 onto the existing `retrieve()` contract (`rows`/`selectedNames`/`score`).

**Rationale**: GLiNER2.5-Decide is explicitly "a specialist for operational decisions: … routing, …" — pass any label set at call time, get a decision in one forward pass, no generated tokens. That is exactly "decide which content source this query is about". It is NOT a general-purpose model (no reasoning/explanation) and it is **English-trained** (the multi-lingual sibling is `GLiNER2.5-multi-Decide`), so German fixtures may underperform — expected and visible in the eval, not a defect.

**Alternatives considered**: Using it only for the `set_theme` action decision — too narrow; the user wants the content decision.

## R-3: The exact processor layout + tensor I/O to port

**Context**: FR-002 requires a faithful port of the GLiNER2 classification processor.

**Decision**: The model card + conversion artifacts (export script, gliner2 `_transform_schema`/`SchemaTransformer`, and the gliner25-rs port) pin the layout precisely:

- **Layout**: `( [P] prompt ( [L] label_1 [L] label_2 … ) ) [SEP_STRUCT] ( [P] … ) [SEP_TEXT] word word … .`
  - Single classification group for retrieval: `( [P] <task text> ( [L] label_1 [L] label_2 … ) ) [SEP_TEXT] <state>`.
  - Prompt/labels keep their case and are tokenized **as whole strings**; the state is lowercased, split with the processor's word regex, given a terminal `.` if it has none, and tokenized **one word at a time** with no special tokens; `(` / `)` are standalone tokens; **no `[CLS]`/`[SEP]`**.
  - Optional per-label hints appended to the prompt as `[DESCRIPTION] label: description`.
- **Special-token ids** (from `special_tokens_map.json` / gliner2.5 vocab): `[SEP_STRUCT]`=128001, `[SEP_TEXT]`=128002, `[P]`=128003, `[C]`=128004, `[E]`=128005, `[R]`=128006, `[L]`=128007, `[EXAMPLE]`=128008, `[OUTPUT]`=128009, `[DESCRIPTION]`=128010.
- **Inputs**: `input_ids` [1, seq], `attention_mask` [1, seq], `marker_positions` [1, markers] (int64; **index of every `[L]` token** in `input_ids`).
- **Output**: `logits` [1, markers] — one logit per label; **softmax within each question's markers** gives the distribution.
- **Limits**: the export config declares `max_len` **512**, but DeBERTa-v3 uses **relative positions only**, so that value is not a hard model limit — the gliner2 Python library does not truncate by default, and open-jev's gliner2 family defaults to a **1024-token context** (state budget 896). Long *states* are cut from the end (never the schema); temperature 1.0.

**Reference implementation confirmed**: the `gliner2-family` branch of `nico-martin/open-jev` PR #1 ships `encodeGliner2Sequence()`, which builds exactly this layout — `( [P] instructions ( [L] opt… ) )` with `[SEP_STRUCT]` between question groups, `[SEP_TEXT]` then the state, `marker_positions` = the index of each `[L]`, and state truncation from the end (`maxLength - schema`). It matches this contract token-for-token, and its Node/CPU verification (fp32/fp16/q4f16 identical argmax vs the Python `gliner2`) plus the WebGPU demo (R-9) de-risk the port.

**Rationale**: With the marker positions known, ranking is `softmax(logits)` → probability per source → normalize by max → reuse the existing `ToolScore`/`selectedNames`/`filterSources` pipeline. The processor is ~60–100 lines of TS (string layout + per-word tokenization), mirroring the byte-span port already in `useToolRetrieval.ts` for the prompt router — consistent, reviewable, no dependency.

**Alternatives considered**: Reimplementing open-jev's `[STATE]/[Q]/[OPT]` layout — that is a *different* family's format (open-jev's own DeBERTa-v3 export), not the GLiNER2.5-Decide graph; using it would feed the wrong input layout.

## R-4: transformers.js loading — the prompt-router pattern transfers 1:1

**Context**: FR-001/FR-003 — lazy load on first use, WebGPU-first with WASM fallback, disposable.

**Decision**: Mirror `loadVectorInner()` exactly: dynamic `import('@huggingface/transformers')`, `env.allowLocalModels = false`, `env.useBrowserCache = true`, `AutoTokenizer.from_pretrained(modelId)` + `PreTrainedModel.from_pretrained(modelId, { device, dtype, progress_callback })` where dtype is `fp16` on WebGPU and `q4f16` on WASM/CPU (the demo confirms fp16 is the fast WebGPU default for this DeBERTa graph, R-9), WebGPU attempted first then WASM; hold a singleton `{ tokenizer, model }`; `disposeDecide()` calls `model.dispose()`. In the eval harness the existing transpile remaps (`useBrowserCache = true → false`, `device: 'wasm' → 'cpu'`, `dtype` pinned to `q4f16`) apply automatically because the loader lives in the same transpiled file.

**Rationale**: transformers.js supports `deberta-v2` (the export's `model_type`), and the site already calls a custom I/O graph (`token_proj`/`rule_proj`) through `PreTrainedModel.from_pretrained` — the GLiNER graph (`input_ids`/`attention_mask`/`marker_positions` → `logits`) is the same shape. The eval harness (`eval-lib.mjs`) needs no new stub beyond the existing `loadUseToolRetrieval()` path. Node CPU q4f16 is supported (mobile card verifies ONNX Runtime CPU).

**Alternatives considered**: `AutoModelForSequenceClassification`/pipeline — not used; the site's direct-session pattern is proven and exposes `marker_positions`.

## R-5: Retrieval semantics & fallback

**Context**: FR-002/FR-003 — same `retrieve()` contract as today.

**Decision**: In `retrieve(query, { mode: 'decide' })`: if `decide.status !== 'ready'` → effective `lexical` (like vector); else compute `decideScores(query, docs)` = `softmax(logits)` over the `SOURCE_DEFS`-ordered labels → normalize by max → build `rows`/`selectedNames`/`stats.effective = 'decide'`. `decideAction` consumes the same `rows`, so `set_theme` decision behavior is unchanged.

**Rationale**: Zero new mapping logic — labels are the existing `SOURCE_DEFS` names, so `filterSources(selectedNames)` / `buildContextText` / `decideAction` work untouched.

## R-6: Eval integration

**Context**: FR-006 — `decide` in both eval scripts, deterministic, artifact-compatible.

**Decision**: Add `'decide'` to `VALID_MODES`/default modes in `eval-retrieval.mjs` and `eval-chain.mjs`; gate `loadDecide()` when `decide` is requested (same `if (modes.some(...))` block as vector/hybrid). The harness's transpile remaps already convert the loader to CPU; per-case `effectiveMode` is recorded from `retrieve().stats.effective`. The artifact schema is unchanged (`modes: string[]`), so `BlogPostPage.vue` renders the new mode with no edits.

**Rationale**: Reuses the proven 002 harness; determinism holds (classifier, greedy-only).

## R-7: UI & copy

**Context**: FR-004/FR-005/FR-009.

**Decision**: `ToolSelectorPanel.vue`: `MODES = ['lexical','vector','hybrid','decide']`, `MODE_LABEL.decide = 'DECIDE'`, gloss "keyword · meaning · both · decision"; `setMode` triggers `loadDecide()`; a decide-model progress bar + error/Retry block mirrors the vector one; intro copy gains one sentence. `AiSection.vue`: `MODE_GLOSS.decide = 'decision model'`, warm `loadDecide()` in the chat loop when the mode is decide (never force), `disposeDecide()` in `clearChat`/`onBeforeUnmount` (line ~362 alongside `disposeVector()`). Copy: retriever tech card in `siteData.ts`, `public/llms/blog.md` (regenerate), `generate-llms-txt.mjs` if it embeds retriever copy.

**Rationale**: Keeps the pixel theme untouched (no new `<style>` blocks, reuses `tool-selector__*`/`ai-progress`), honors accessibility conventions (chips already `aria-pressed`; progress `role="progressbar"`), and satisfies constitution VI.

## R-8: Performance & download budget

**Context**: FR-001 — a second on-device model.

**Decision**: The decide model downloads once (~345 MB, cached in `~/.cache/huggingface` and the browser cache), loaded lazily only when DECIDE is selected or warmed by the chat loop. A DeBERTa-v3-large forward pass on ~50 tokens is a few hundred ms on WebGPU and ~1–3 s on WASM/CPU (same ballpark as the prompt router). The chat model remains the dominant cost; decide mode is opt-in.

**Rationale**: The user explicitly asked for the option; lazy loading + disposal keep the default experience unchanged (constitution Principle II).

## R-9: Existing demo — `shreyask/open-jev-demo`

**Context**: The user asked "isn't there a demo for this?" pointing at `huggingface.co/spaces/shreyask/open-jev-demo`.

**Decision**: Yes — that Space **is** a browser demo of GLiNER2.5-Decide (`?model=gliner2-decide`, listed alongside Kev 0.6B/4B, open-jev, Julia-1), with a benchmark page over the `typed-decisions` test split. It proves the ONNX export runs on **WebGPU in-browser** (fp16 default, ~100–170 ms per state, no ORT warnings / no WASM fallback) and on Node CPU (the PR verification: identical argmax vs Python `gliner2`). **However**, the demo is a preview built from **unmerged PRs** — `nico-martin/open-jev#1` (gliner2 family) + `nico-martin/open-jev-demo#1` — so the *published* `open-jev@0.1.2` still cannot load this model. Our approach therefore stays: port `encodeGliner2Sequence`'s layout in-repo (R-3) rather than depending on open-jev. The demo and PR also confirm dtype behavior: fp16 is the right WebGPU default for the DeBERTa graph (q4f16 dequantize adds dispatch overhead there), while q4f16 is the CPU/phone-friendly option — informing our loader's webgpu→fp16 / wasm→q4f16 split (R-4/R-8).

**Alternatives considered**: Reusing open-jev's branch as a pinned git dependency — rejected (unmerged upstream, new runtime dep, violates principle II; the ~100-line port is self-contained).

## Open items resolved from spec

All NEEDS CLARIFICATION markers resolved: artifact choice (R-1), model semantics (R-2), processor layout/I-O (R-3), transformers.js loading (R-4), retrieval mapping (R-5), eval (R-6), UI/copy (R-7), budget (R-8), demo/reference (R-9).