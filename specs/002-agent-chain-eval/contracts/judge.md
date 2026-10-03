# Contract: Judge Interface & Selection

**Feature**: `/specs/002-agent-chain-eval/spec.md` · Date: 2026-10-03

The answer-quality scorer is the single point where "how good is the final answer" is decided. It is deliberately decoupled from the chain harness so a stronger judge (on-device LLM, NLI model) can be swapped in later without touching retrieval, tool-call, or fixture code (spec FR-005, US2).

## The seam

`Judge.assess(case, transcript) → AnswerScore` where:

- `case` — the `EvalCase` (fixture): `query`, `expected`, `expectedArgs`, `expectedAnswerFacts`, `bannedFacts`.
- `transcript` — a **neutral run record** (no Vue/ref types, no model internals):
  `{ finalAnswer: string, toolResults: unknown[], toolCalls: ToolCallRecord[], selectedNames: string[], timings: StageTiming }`.
- `AnswerScore` — as defined in `data-model.md` (factRecall, factsMissedDueToToolMiss, bannedViolation, faithfulness, unsupportedSentences, pass).

Implementations are pure functions of `(case, transcript)`: no network, no randomness. The harness calls exactly one judge per case via `createJudge(name)`.

## Selection

`createJudge(name: string): Judge`

| name | implementation | notes |
|---|---|---|
| `'deterministic'` (default) | `DeterministicJudge` — two-mode fact matching + banned gate + lexical faithfulness + entity-consistency probe | formulas/thresholds in `contracts/eval-metrics.md` |
| `'llm'` (future, not in v1) | A larger on-device model judges groundedness/correctness from the transcript | MUST still return the same `AnswerScore` shape; opt-in via `--judge` flag; never a backend call (constitution Principle I) |
| `'nli'` (future, not in v1) | NLI-based faithfulness (`e − c` entailment/contradiction scoring) | replaces only the faithfulness sub-score; same seam |

Unknown names → error at startup (fail fast, before model downloads).

## Determinism & reproducibility

`DeterministicJudge` must be order-independent and side-effect free. The eval harness guarantees greedy decoding by default (spec FR-006), so `score.pass` is reproducible across runs. Sampling (`--sampling`) changes the *model* output, never the judge.

## Failure semantics

- A judge throwing on a case is a harness error (not a fixture miss): the case is reported with an error and the run exits non-zero, but other cases still score.
- The blog consumes only the committed `EvalResults` artifact; the judge exists solely in the eval tooling (`scripts/eval-chain.mjs` + `src/`-free implementation). No judge code ships to the browser bundle.