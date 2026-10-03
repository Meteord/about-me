# Quickstart: Verify End-to-End Agent Chain Evaluation

**Feature**: `/specs/002-agent-chain-eval/spec.md` · Date: 2026-10-03

## Prerequisites

- Node `^20.19.0 || >=22.12.0`.
- From `frontend/`: dependencies installed. `@huggingface/transformers` 4.x bundles `onnxruntime-node` — no extra install.
- Network on first run: chat model q8 (~634 MB) +, for vector/hybrid, prompt router q8 (~357 MB), cached in `~/.cache/huggingface`. `--modes=lexical` needs no downloads.

## Automated verification gates (mandatory)

```sh
cd frontend
npm run generate:llms   # regenerates public/llms/*.md + llms.txt (also runs pre-build)
npm run lint            # oxlint + eslint (auto-fixes; review diff)
npm run build           # type-check (vue-tsc) + production build, in parallel
```

All three must pass with zero errors. Retrieval fixtures changed ⇒ existing gate still applies:

```sh
npm run eval:retrieval  # must exit 0 (no retrieval misses)
```

## End-to-end eval

Fast offline smoke run first (lexical only, greedy, q4 to halve download):

```sh
npm run eval:chain -- --modes=lexical --dtype=q4
```

Full run (user-selected default: all three modes, q8):

```sh
npm run eval:chain                # === eval:chain -- --modes=lexical,vector,hybrid --dtype=q8
```

Expected outcome:
- Prints a per-case line per mode (`[PASS]/[FAIL] query → tools called … factRecall x.xx · faithfulness x.xx · rounds N · NNms`) and an aggregate summary block per mode (hit@K, MRR, tool recall/F1, arg-validity, fact recall, faithfulness, hallucination rate, mean latency, chain pass rate).
- Writes `frontend/src/data/evalResults.ts` (see `contracts/artifact.md`) with full-precision values.
- Exits 0 iff no case fails `chainPass` (`contracts/eval-metrics.md`); else exits 1 (run reports which fixtures failed).

### SC-001 — all modes complete

Run the full command above. Expected: every fixture runs in lexical, vector and hybrid; vector/hybrid download the router on first run; no uncaught errors; exit code matches gate semantics.

### SC-002 — real model, not a stub

In the output, confirm the model header line (`chat model: LiquidAI/LFM2.5-350M-ONNX · cpu · q8`) and that final answers vary with the fixture's facts (e.g. education questions yield "Hochschule München" in the answer).

### SC-003 — deterministic

Run `npm run eval:chain -- --modes=lexical` twice; expected: byte-identical aggregate metrics and per-case numbers. `evalResults.ts` is identical except for `generatedAt` (a new ISO timestamp per run — expected), so a `diff` of the artifact is clean apart from that one field.

### SC-005 — Judge is a seam

Temporarily register a stub judge via `createJudge('stub')` in `scripts/eval-chain.mjs` that returns a constant `AnswerScore`; run `--modes=lexical`. Expected: retrieval/tool-call metrics and exit logic unchanged; only answer sub-scores change. Revert the stub.

## Runtime traces (SC-006/SC-007/SC-008 · FR-009/FR-010/FR-011/FR-012)

### FR-009 / SC-006 — Save a session as a trace

1. `npm run dev`, open the dock, chat (e.g. "what projects has he built?"), let it finish.
2. Activate "Save trace" → `mini-michi-<timestamp>.jsonl` downloads.
3. Inspect: line 1 is `{"type":"session","harness":"about-me.mini-michi",...}`; the rest are `type:"message"` envelopes with `user`/`system`(retrieval)/`assistant`(`toolCalls`)/`tool`(`toolCallId`)/final `assistant`. The file renders in the HF trace viewer (upload to a dataset/bucket to confirm, optional).
4. Drop it into `frontend/traces/`.

### FR-010 / SC-006 — Score the trace

```sh
cd frontend
npm run eval:chain -- --modes=lexical --traces=frontend/traces
```

Expected: the report adds a `runtime traces` block — per trace (retrievalCovered, toolValid, groundedness, bannedViolation, pass) and aggregates (`retrievalCoverRate`, `toolValidRate`, `groundedRate`, `bannedViolationRate`, `passRate`); `evalResults.ts` gains `traces`. Also test `--traces=<file.jsonl>` and `--traces=<https://…/trace.jsonl>` (URL via global fetch, local/CI only). No traces present (empty dir / no flag) → `traces: null`, run still passes.

### SC-007 — Malformed trace tolerance

Append a garbage line (e.g. `{not json`) to a copy of the trace and run with `--traces=<copy>`. Expected: the bad line is reported, that trace skipped, the run continues, exit code reflects only scored-trace failures.

### SC-008 — New trace source seam

In `scripts/trace-lib.mjs`, add a loader entry to the `TraceSource` table (e.g. an HF dataset URL returning JSONL) implementing the same `loadTraceSource(spec) → { traces, errors }` shape. Expected: scoring/artifact/blog code unchanged; `--traces=<that spec>` works.

### FR-011 — Blog block

On `#/blog/chat-with-my-website`, the eval-results section shows a "runtime traces" block (count + rates) when `traces` is present, and hides it gracefully when `null`.

## Manual scenario walkthrough (dev server)

```sh
cd frontend
npm run dev
```

### FR-007 / SC-004 — Blog section renders the results

1. Open `#/blog/chat-with-my-website` → scroll to the "How well does the whole chain actually work?" section.
2. Expected: mode-comparison cards/table (hit@K, tool recall, answer quality, faithfulness, mean latency, rounds, pass rate) and a per-case breakdown with score bars, all from `evalResults.ts`.
3. Delete/rename `frontend/src/data/evalResults.ts` (or temporarily export `fixtures: 0`) → reload → the section shows the "run `npm run eval:chain`" note, layout intact.
4. Keyboard: tab through the section (visible `:focus-visible` outlines, `aria-*` on any toggle); set `prefers-reduced-motion` (OS) → no smooth/stepped scroll jank; narrow the window to ≤480px → no overflow.
5. Console: zero errors on the page.

### US3 story integrity — retrieval content still accurate

The eval section is part of the blog post content; `frontend/public/llms/blog.md` must mention the eval section so `about_site` stays truthful (Principle VI). Check `npm run generate:llms` output includes it and `npm run eval:retrieval` still passes.

## Verification mapping

| Requirement | How verified |
|---|---|
| FR-001 chain runs the real model | SC-002 manual inspection + eval output header |
| FR-002 fixtures carry answer facts | `scripts/eval-fixtures.mjs` diff shows `expectedAnswerFacts`/`bannedFacts` |
| FR-003 full metric report | eval stdout (aggregates + per case) + `evalResults.ts` |
| FR-004 artifact committed | `git status` shows `frontend/src/data/evalResults.ts`; `contracts/artifact.md` matches |
| FR-005 Judge contract | SC-005 stub-swap test; `contracts/judge.md` |
| FR-006 deterministic | SC-003 double-run |
| FR-007 blog section | FR-007 walkthrough + `npm run build` clean |
| FR-008 fallback semantics | full run: a `--modes=vector` run with router disabled records `effectiveMode: 'lexical'` |
| FR-009 trace export | FR-009 walkthrough (Save trace → STS JSONL) |
| FR-010 trace ingestion | FR-010 scenarios (`--traces=file/dir/url`) |
| FR-011 blog traces block | FR-011 walkthrough |
| FR-012 TraceSource seam | SC-008 loader addition |

## Known cost

A full all-modes q8 run is the long pole (~634 MB + 357 MB download first time; CPU greedy decode is roughly 6–30 s per fixture-round). Use `--modes=lexical --dtype=q4` for day-to-day iteration and the full run before committing results.