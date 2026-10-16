# Quickstart & Validation Guide: Retrieval- and Action-Only Blog Evaluation

## Prerequisites

- Node.js `^20.19.0 || >=22.12.0`
- Dependencies installed in `frontend/` (`npm install`)

## 1. Regenerate Retrievable Content (`public/llms/*.md`)

From `frontend/`:

```bash
npm run generate:llms
```

**Expected outcome**:
- `public/llms/blog.md` describes the blog's evaluation of retrieval, context injection, direct theme actions, and average latency without referencing LLM answer generation, `fact recall`, `faithfulness`, or `chain pass`.

## 2. Run the Fast Generation-Free Blog Evaluation (`SC-004`)

From `frontend/`:

```bash
npm run eval:chain -- --modes=bm25
```

**Expected outcome**:
- Completes in under 5 seconds with zero chat-model (`LFM2.5-350M-ONNX`) downloads or loads.
- Logs per-fixture `[PASS]`/`[FAIL]` status, injected sources or applied theme action, and execution time in milliseconds.
- Writes `frontend/src/data/evalResults.ts` adhering to the schema in [`data-model.md`](./data-model.md).
- Exits with status code `0` when all held-out `test`-split fixtures pass.

*(Optional)* To refresh all 4 retrieval modes (`bm25`, `vector`, `hybrid`, `decide`) using cached router/decide models:

```bash
npm run eval:chain
```

## 3. Run the Standalone Retrieval Gate (`SC-005`)

From `frontend/`:

```bash
npm run eval:retrieval -- --modes=bm25
```

**Expected outcome**:
- Split-integrity gate (V1–V7 + corpus hygiene) passes.
- 100% test-split `hit@5` with exit code `0`.

## 4. Verify Lint, Type-Check, and Production Build (`SC-005`)

From `frontend/`:

```bash
npm run lint
npm run build
```

**Expected outcome**:
- `oxlint` and `eslint` pass with zero errors.
- `vue-tsc --build` and `vite build` succeed with zero type or bundle errors.

## 5. Inspect the Blog Post UI (`SC-001`, `SC-002`, `SC-003`)

1. Start the dev server (`npm run dev` from `frontend/`) and open `#/blog/chat-with-my-website`.
2. Scroll to **The eval** section and verify against [`contracts/eval-ui-and-artifact.md`](./contracts/eval-ui-and-artifact.md):
   - Metric selector chips show only `hit@5`, `injection cover`, and `action pass` (`hit@5` and `injection cover` active by default).
   - Average time taken (`avg time ...`) is displayed as a separate statistic per mode and per split (`test` and `train`).
   - Per-fixture rows show mode, split badge, latency, `PASS`/`FAIL`, and `injected: ...` or `action: ...`, with zero `fact recall` or `faithfulness` bars.
   - No occurrences of `fact recall`, `faithfulness`, `chain pass`, or `answer drifted` appear anywhere in the section.
