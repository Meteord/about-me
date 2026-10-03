# Quickstart: GLiNER2.5-Decide Retrieval Mode

**Feature**: `/specs/003-gliner-decide-retrieval/spec.md` · Date: 2026-10-03

Validation guide — proves the feature works end-to-end. Implementation details live in `tasks.md`; model/processor/fallback semantics in `contracts/decide-mode.md`; entities in `data-model.md`.

## Prerequisites

- Node `^20.19.0 || >=22.12.0`, deps installed (`cd frontend && npm install`).
- First `decide` run downloads `onnx-community/GLiNER2.5-Decide-mobile-ONNX` q4f16 (~345 MB) into `~/.cache/huggingface` (browser runs use the in-browser cache). Reuse the existing fixtures — they are mode-agnostic.
- **Reference demo**: `shreyask/open-jev-demo` (`?model=gliner2-decide`) proves the same export runs on WebGPU in-browser and matches Python `gliner2` on Node CPU (research R-9 / `contracts/decide-mode.md`).

## Scenario 1 — Browser: DECIDE mode + fallback (SC-003 / SC-004)

```bash
cd frontend && npm run dev
```

1. Open the dock → **Model settings** → the retriever mode chips now show `LEX · VECTOR · HYBRID · DECIDE`.
2. Select **DECIDE**. The loading progress bar appears (model downloads once; progress + file shown).
3. Send "Tell me about MUCGPT" → the transcript's retrieval step shows `decide` (or `lexical (fallback)`), the top-K sources are injected, and Mini-Michi answers from them.
4. **Fallback**: with the model failed/blocked (e.g. DevTools offline during load), send a query → the panel and transcript report the `lexical` fallback; the chat still answers.
5. **Dispose**: Clear the chat → the decide model is disposed (no console errors; a second send re-downloads/reloads from cache).

**Expected**: no console errors; `:focus-visible` outlines and `aria-pressed` on chips; no layout break at ≤480px.

## Scenario 2 — Retrieval eval with the decision model (SC-001)

```bash
cd frontend && npm run eval:retrieval -- --modes=decide --topk=5
```

**Expected**:

- Prints `initializing GLiNER2.5-Decide (downloads on first run)…` then `decide: cpu · q4f16`.
- One line per fixture: `[ok|MISS] <query> → <selected names> (mrr …)`.
- Aggregate line: `decide: hit@5 = …% · MRR = … · mean latency …ms`.
- Exit code 0 iff no fixture misses its expected source. (English fixtures are the reference; German fixtures may score lower — visible, expected.)

Fast check with all modes offline-only: `npm run eval:retrieval -- --modes=lexical` (unchanged, no download).

## Scenario 3 — Chain eval + artifact (SC-002)

```bash
cd frontend && npm run eval:chain -- --modes=decide --dtype=q4
```

**Expected**:

- `chat model: LiquidAI/LFM2.5-350M-ONNX · cpu · q4` and `decide: cpu · q4f16`.
- Per-fixture `[PASS|FAIL]` lines; aggregate block for `decide` (hit@K, MRR, factRecall, faithfulness, chainPassRate, latency).
- Writes `src/data/evalResults.ts` containing a `decide` entry in `config.modes` and `modes[]` (schema unchanged — see `contracts/decide-mode.md`).
- Exit code 0 iff all decide cases pass.

**Determinism**: re-run with identical flags → identical aggregate metrics (the GLiNER classifier has no sampling).

## Scenario 4 — Full verify chain (SC-005)

```bash
cd frontend && npm run lint && npm run build
```

**Expected**: both pass. `npm run build` runs `type-check` + `build-only`.

## Scenario 5 — Blog + copy (SC-006)

```bash
cd frontend && npm run generate:llms
```

Then open the "Chat with my website" post and the retriever tech card.

**Expected**: the eval section renders the `decide` mode aggregate (when present in the committed artifact); the retriever card / `public/llms/blog.md` copy mentions the on-device GLiNER2.5-Decide decision option; no console errors; no regression at ≤480px or with `prefers-reduced-motion`.

## Scenario 6 — Clean (fresh) checkout robustness

With `src/data/evalResults.ts` missing or stale, the blog's eval section shows the "run `npm run eval:chain`" note — `decide` presence is additive, never required for rendering.

## References

- Model/processor/fallback: `contracts/decide-mode.md`
- Entities: `data-model.md`
- Metrics/artifact semantics: `specs/002-agent-chain-eval/contracts/eval-metrics.md`, `artifact.md`