# Data Model: End-to-End Agent Chain Evaluation

**Feature**: `/specs/002-agent-chain-eval/spec.md` · Date: 2026-10-03

No new runtime persistence. All entities below belong to the **offline eval tooling** (`frontend/scripts/`) and the **committed artifact** the blog consumes. The only app-side additions are the generated `frontend/src/data/evalResults.ts` module and the browser trace recorder (`src/composables/useTraceRecorder.ts`).

## Trace (STS-format JSONL — runtime session record)

A real chat session exported from Mini-Michi and consumable by the eval (also renders in the HuggingFace trace viewer). Format per `contracts/traces.md`.

| Field | Type | Notes |
|---|---|---|
| header | `{ type: 'session', harness: 'about-me.mini-michi', id, name? }` | First line; harness is the site's id |
| messages | `{ type: 'message', message: { role, content, toolCalls?, toolCallId?, model?, timestamp? } }[]` | user / system (retrieval summary) / assistant (text or toolCalls) / tool (results) |

## TraceSession (normalized, in-memory)

`source` (file path / dir / url), `id`, `name`, `userQuery` (first `user` message), `retrievalSummary` (parsed from the `system` message, best-effort), `turns` (ordered messages), `calledTools` (tool names from all `toolCalls`), `toolResults` (concatenated `tool` message contents), `finalAnswer` (last non-empty `assistant` content, or `null` when the trace is malformed).

## TraceSource (loader interface — the extension seam)

| Loader | Spec | Behavior |
|---|---|---|
| `file` | path to `.jsonl` | parse + validate one trace |
| `dir` | path to a directory | every `*.jsonl` in it (recursive optional) |
| `url` | `https://` URL of a `.jsonl` | Node global `fetch`, then parse (local/CI only) |

Contract: `load(spec) → { traces: TraceSession[], errors: string[] }`; a bad line is recorded in `errors` and its trace skipped (never aborts the run). New origins implement this same shape — scoring/artifact code is untouched (FR-012).

## TraceCaseResult (per-trace scoring)

| Field | Type | Notes |
|---|---|---|
| `source` / `id` / `name` / `userQuery` | string | identity + the query |
| `calledTools` | string[] | tools the session actually called |
| `retrievalCovered` | boolean | every called tool ∈ current top-K for the query (re-run retrieval) |
| `toolValid` | boolean | every recorded call parses and is valid against current `TOOL_SCHEMAS`/`CONTENT_IDS` |
| `groundedness` | number | lexical faithfulness of `finalAnswer` vs `toolResults` (judge, same thresholds as fixtures) |
| `bannedViolation` | boolean | any site-wide banned fact matched |
| `pass` | boolean | `toolValid ∧ retrievalCovered ∧ groundedness ≥ 0.8 ∧ !bannedViolation` |
| `error` | string \| null | malformed-trace reason (then `pass` is n/a) |

## TraceAggregate (per run)

`count`, `sources: string[]`, `mode`, `topK`, `retrievalCoverRate`, `toolValidRate`, `groundedRate`, `bannedViolationRate`, `passRate`.

## EvalCase (fixture — extends `scripts/eval-fixtures.mjs`)

| Field | Type | Notes |
|---|---|---|
| `query` | string | The visitor's request (existing) |
| `expected` | `string[]` | Tool names that count as a correct retrieval/tool-call target (existing, "anyOf") |
| `expectedArgs` | `Partial<Record<string, Record<string, unknown>>>` (optional) | Argument expectations for a tool, e.g. `{ set_theme: { theme: 'red' } }`. Absent → only validity is checked |
| `expectedAnswerFacts` | `string[]` | Atomic claims the final answer MUST contain (e.g. `['Hochschule München']`). New |
| `bannedFacts` | `string[]` | Contradictory claims the answer MUST NOT contain (e.g. `['works for MUCGPT']`). New |

Validation rules (design, enforced by the evaluator's report, not a schema runtime):
- Facts must be **atomic** (one claim each) — split compound facts to keep attribution honest.
- Banned facts should be phrased as the *contradictory claim* the model could emit (negation-safe).
- Every existing fixture is extended with at least `expectedAnswerFacts` (its `expected` tools imply a fact the answer should carry); `bannedFacts` may be empty.

## ToolCallRecord (per round, per case)

| Field | Type | Notes |
|---|---|---|
| `round` | number | 0-based agent round (≤ MAX_ROUNDS−1) |
| `raw` | string | The model's emitted call block |
| `name` | string | Parsed tool name |
| `args` | `Record<string, unknown>` | Parsed named args (mapped from positional by `mapArgsToNamedParams`) |
| `valid` | boolean | Name exists in `TOOL_SCHEMAS` ∧ args valid (`get_content.id` ∈ `CONTENT_IDS`; `set_theme.theme` ∈ enum) |
| `expectedArgHit` | boolean | `expectedArgs[name]` present ∧ args match it (undefined → true if `valid`) |
| `result` | `unknown \| null` | The tool's returned payload (real text for chain eval) |
| `error` | `string \| null` | Executor error, if any |

## StageTiming

`retrievalMs`, `roundsMs: number[]` (generation latency per round), `totalMs`, `tokensGenerated` (decoded new-token count, from output tensor dims).

## AnswerScore (returned by the `Judge`)

| Field | Type | Notes |
|---|---|---|
| `factRecall` | number | matched `expectedAnswerFacts` / total (two-mode match, R-4) |
| `factsMissedDueToToolMiss` | string[] | Facts whose supporting tool was never called (attribution, not a miss) |
| `bannedViolation` | boolean | any `bannedFacts` matched |
| `faithfulness` | number | supported answer sentences / total (lexical grounding vs tool results) |
| `unsupportedSentences` | string[] | Sentences failing the support threshold / entity-consistency probe |
| `pass` | boolean | `factRecall === 1 ∧ !bannedViolation ∧ faithfulness ≥ 0.8` |

## CaseResult (per fixture × mode)

`fixtureIndex`, `query`, `mode`, `effectiveMode` (lexical when router unavailable), `selectedNames`, `rows` (retrieval ToolScore rows), `toolCalls: ToolCallRecord[]`, `finalAnswer` (string), `timings: StageTiming`, `score: AnswerScore`, and the four booleans `retrievalPass` (hit@K), `toolsPass` (R-4 strict), `answerPass` (`score.pass`), `chainPass` (`toolsPass ∧ answerPass`).

## ModeAggregate (per mode)

`mode`, `n` (cases), `retrievalHitRate`, `retrievalMRR`, `toolRecall`, `toolF1`, `argValidityRate`, `factRecall`, `faithfulness`, `hallucinationRate` (fraction with `bannedViolation`), `meanRounds`, `meanTotalLatencyMs`, `chainPassRate`, `toolPassRate`, `answerPassRate`.

## EvalArtifact (committed `frontend/src/data/evalResults.ts`)

```ts
export interface EvalResults {
  generatedAt: string            // ISO timestamp of the run
  config: {
    modes: string[]              // modes actually run
    topK: number
    maxRounds: number            // MAX_ROUNDS = 3
    sampling: boolean            // greedy by default
    device: 'cpu'
    dtype: 'q8' | 'q4'
    chatModel: string            // 'LiquidAI/LFM2.5-350M-ONNX'
  }
  fixtures: number               // count run
  modes: ModeAggregate[]
  cases: CaseResult[]            // flat list incl. mode
  traces: TraceAggregate | null  // null when --traces produced no scored traces
}
export const evalResults: EvalResults = { /* generated */ }
```

Relationship to the app: `BlogPostPage.vue` imports `{ evalResults, type EvalResults }` from `'../data/evalResults'` and renders `modes` (comparison), `cases` (breakdown), and `traces` (runtime-traces block when present). If `fixtures === 0`, the section shows the "run the eval" note.

## State transitions

None at runtime. The eval script *writes* the artifact atomically (write temp then rename); a `npm run build` re-run does not regenerate it (only `npm run eval:chain` does). Stale artifact is a normal state — the blog renders whatever is committed, with the `generatedAt` shown. Trace lifecycle is file-based: browser *exports* a `.jsonl` (download, no persistence), the eval *reads* it from a file/dir/URL, and the artifact carries only the derived `TraceAggregate`/`TraceCaseResult` numbers — raw traces are never embedded in the artifact (keeps it small and privacy-safe).

## Notes on stubs vs data (Phase-1 design consequence)

`../composables/useLlmsContent` is stubbed with a **disk-backed** implementation (reads `frontend/public/llms/*.md`), `../composables/useSiteLayout` is stubbed no-op, `window` is shimmed; `../data/siteData` is loaded real. These affect only the executor side-effects, never the textual tool result the model reads or the judge scores (see `contracts/eval-metrics.md`).

The browser trace recorder (`useTraceRecorder.ts`) is app-side and shares no code with the eval: it maps the chat transcript (`messages` in `AiSection.vue`) to STS-format lines and downloads them; the eval's `trace-lib.mjs` parses that same format independently (single source of truth for the schema is `contracts/traces.md`).