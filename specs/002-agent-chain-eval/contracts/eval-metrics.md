# Contract: Eval Metrics & Scoring

**Feature**: `/specs/002-agent-chain-eval/spec.md` · Date: 2026-10-03

Defines the exact formulas, normalization and thresholds the evaluator and the blog share. The blog renders these numbers; the evaluator computes them. A number without this definition is a bug.

## Normalization (SQuAD-style, used everywhere strings are compared)

1. Lowercase.
2. Strip punctuation (replace non-alphanumeric with spaces).
3. Remove articles `a`, `an`, `the` (for **overlap/grounding only**, never for fact-inclusion).
4. Collapse whitespace.
5. **Do not remove stopwords for fact matching** — facts carry content tokens.

## Retrieval metrics (unchanged from `eval:retrieval`)

- `hit@K` = 1 if any `expected` tool is inside `selectedNames.slice(0, K)` else 0.
- `MRR` = `1 / min(rank+1)` over expected tools present in the selected rows, else 0.
- `effectiveMode` = requested mode, or `lexical` when the router was unavailable and the retriever fell back (per-case, recorded in `CaseResult`).

## Tool-call metrics

- `called` = set of tool names the model emitted across all rounds.
- `toolRecall` = `|expected ∩ called| / |expected|`.
- `toolPrecision` = `|expected ∩ called| / |called|` (0 when `called` empty).
- `toolF1` = harmonic mean of recall/precision.
- `argValidityRate` = valid calls / all calls. A call is **valid** if its name ∈ `TOOL_SCHEMAS` and its args are valid for that tool: `get_content.id` ∈ `CONTENT_IDS`; `set_theme.theme` ∈ `{amber, orange, red}`.
- `expectedArgHit` = when `expectedArgs[name]` is defined, args match it (case/whitespace normalized).
- `toolsPass` (strict gate) = `toolRecall == 1 ∧ argValidityRate == 1 ∧` no calls to tools outside `TOOL_SCHEMAS`. Extra **valid** chained calls (e.g. `list_contents → get_content`) are allowed and only reported.

## Answer metrics (`DeterministicJudge`)

Two-mode fact matching — a fact **matches** if either mode passes:

- **Strict substring**: normalized fact is a substring of the normalized final answer. Used alone for short numeric/date/enum facts (avoid `3` matching `3 tools`).
- **Token-F1 ≥ 0.8**: SQuAD bag-of-tokens F1 between normalized fact and normalized answer (absorbs paraphrase for multi-word facts).

- `factRecall` = matched / `expectedAnswerFacts.length`.
- `bannedViolation` = true if any `bannedFacts` matches (same two-mode match). This is the hallucination gate.
- **Faithfulness (lexical grounding)**: split answer into sentences; a sentence is *supported* if its max token-overlap against any sentence of the concatenated tool results (for that case) ≥ **0.35**, AND every capitalized/number token in it appears somewhere in the tool results (entity-consistency probe). `faithfulness = supported / total sentences` (0 when the answer has no sentences).
- **Layout-only exemption**: when a case has executed tool results but **none carry textual grounding content** (a pure layout side-effect such as `set_theme` returning `{ kind: 'layout', theme }`, i.e. no string / `text` field), a natural-language answer cannot be lexically grounded in them, so the faithfulness gate is vacuous: `faithfulness = 1` and `unsupportedSentences = []`. The signal for these cases is carried by `factRecall`, `bannedFacts`, and the tool-call validity gate (which validates the executed action) — this keeps SC-001's "exit 0 iff no fixture misses" reachable for layout-only fixtures. Cases with no tool results at all, or with at least one textual result, are scored normally.
- `score.pass` = `factRecall == 1 ∧ !bannedViolation ∧ faithfulness ≥ 0.8`.

## Attribution rule

A fact is **not** a `factRecall` miss when the supporting tool was never called; it is recorded in `factsMissedDueToToolMiss` (drives retrieval→tool→answer attribution, not the pass gate).

## Chain pass (exit code)

`chainPass = toolsPass ∧ answerPass`. The script exits non-zero iff any run case has `chainPass == false` (or an uncaught error). `eval:retrieval`'s existing miss semantics are unchanged.

## Mode aggregates

Means over the cases that ran in that mode: `retrievalHitRate`, `retrievalMRR`, `toolRecall`, `toolF1`, `argValidityRate`, `factRecall`, `faithfulness`, `hallucinationRate`, `meanRounds`, `meanTotalLatencyMs`, `toolPassRate`, `answerPassRate`, `chainPassRate`.

## Trace metrics (runtime sessions — `contracts/traces.md`)

Scored per trace and aggregated as `TraceAggregate`:

- `retrievalCoverRate` — fraction of traces where every tool the session called is in the *current* top-K (re-run `retrieve(userQuery, {mode, topK})`). Drift signal.
- `toolValidRate` — fraction where every recorded call parses and is valid against the current registry (`contracts/traces.md`).
- `groundedRate` — fraction with `faithfulness ≥ 0.8`, where faithfulness reuses the fixture definition but grounds the *recorded* final answer against the trace's **own** tool results.
- `bannedViolationRate` — fraction matching any site-wide banned fact.
- `passRate` — fraction passing the trace gate: `toolValid ∧ retrievalCovered ∧ groundedness ≥ 0.8 ∧ !bannedViolation`.

Trace thresholds reuse the fixture constants (support 0.35, pass 0.8). Facts for traces come from the site-wide `BANNED_TRACE_FACTS` list, not per-fixture `expectedAnswerFacts`.

## Upgrades (future, out of scope v1)

NLI-based faithfulness (`cross-encoder/nli-deberta-v3-xsmall` ONNX q8, ~45 MB) and/or a larger on-device LLM judge plug in at the `Judge` seam (`contracts/judge.md`) — metrics names/meanings are preserved so the blog and gate logic stay unchanged.