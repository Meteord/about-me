# Contract: Runtime Traces (STS-Format)

**Feature**: `/specs/002-agent-chain-eval/spec.md` · Date: 2026-10-03

Defines how real chat sessions become eval inputs. The format is the HuggingFace **Session Trace Simple Format (STS-Format)** (huggingface.co/docs/hub/session-traces-format) so saved traces render in the HF trace viewer and can live on Hub datasets/buckets.

## Schema (the single source of truth)

JSONL: one JSON object per line.

**Line 1 — session header:**
```json
{ "type": "session", "harness": "about-me.mini-michi", "id": "<slug>", "name": "<human title, optional>" }
```
Extra metadata is allowed and ignored.

**Lines 2+ — message envelope:**
```json
{ "type": "message", "message": { "role": "user", "content": "…" } }
```
`message` fields: `role` (`user`|`assistant`|`system`|`tool`), `content` (text, may be empty), `toolCalls` (`[{ "id", "function": { "name", "arguments" } }]`, `arguments` is a JSON string), `toolCallId` (on `tool` messages), `timestamp` (epoch ms), `model`. The STS message object has **no extra fields** — anything extra goes into `content`.

## Emitted messages (browser recorder, `useTraceRecorder.ts`)

Maps the `AiSection` transcript:

| Transcript message | STS line |
|---|---|
| `user` | `{ role: "user", content }` |
| `retrieval` | `{ role: "system", content: "retrieval · top {selected}/{total} · effective {mode} · {latency}ms · selected: {names, }" }` — deterministic grammar below; displayed in the viewer |
| `tool-call` (calls[]) | `{ role: "assistant", content: "", toolCalls: [{ id: "tc{round}-{i}", function: { name, arguments } }] }` — `name`/`arguments` from `parsePythonicCalls` (name `unknown_*` and `arguments: "{}"` when unparsable) |
| `tool-result` (results[]) | one per result: `{ role: "tool", toolCallId: "tc{round}-{i}", content: JSON.stringify(result.result ?? result.error ?? null), model: "LiquidAI/LFM2.5-350M" }` — content is exactly what the model saw |
| final `assistant` text | `{ role: "assistant", content, model: "LiquidAI/LFM2.5-350M" }` |

Retrieval summary grammar (eval does **not** parse it — coverage is computed by re-running retrieval — but keep it stable for humans/diffs):
`retrieval · top {selected}/{total} · effective {mode} · {latencyMs}ms · selected: {name, name, …}`.

Download control: "Save trace" in the dock is enabled when the transcript is non-empty and not generating; filename `mini-michi-{YYYYMMDD-HHMMSS}.jsonl`.

## Ingestion & CLI (eval, `eval-chain.mjs` + `trace-lib.mjs`)

- Flags: `--traces=<path.jsonl | dir | https://url>` (repeatable). Default: `frontend/traces/` (empty/missing → no traces, no error). An explicit `--traces=` value overrides the default.
- Loaders behind `TraceSource`:

```js
loadTraceSource(spec) => { traces: TraceSession[], errors: string[] }
```

| kind | spec | loader |
|---|---|---|
| `file` | path ending `.jsonl` | parse + validate one file |
| `dir` | path to a directory | every `*.jsonl` (non-recursive), skip non-JSONL |
| `url` | starts `http(s)://` | Node global `fetch`, then parse (local/CI eval only — never the browser) |

- Validation: header `type === "session"`; message lines must be the envelope shape; a malformed line → recorded in `errors`, that trace skipped, run continues (SC-007). Missing final assistant message → malformed.
- The loader table is the extension seam: a new origin (e.g. a HF dataset/bucket API returning JSONL) is a new entry in this table implementing the same `loadTraceSource` shape (FR-012/SC-008).

## Scoring (historical — no re-execution)

Per trace (`TraceCaseResult`, see `data-model.md`):
- **Retrieval coverage**: `retrieve(userQuery, { mode, topK })` (current registry/retriever); `retrievalCovered` = every called tool ∈ current top-K. This is the drift signal.
- **Tool validity**: re-`parsePythonicCalls` each recorded call; valid iff name ∈ `TOOL_SCHEMAS` and args valid (`get_content.id` ∈ `CONTENT_IDS`, `set_theme.theme` ∈ enum).
- **Answer**: `DeterministicJudge` on `finalAnswer` vs the trace's own `toolResults` (faithfulness thresholds from `contracts/eval-metrics.md`) plus a **site-wide banned-fact list** (`BANNED_TRACE_FACTS` in `eval-fixtures.mjs` or `eval-lib.mjs`), e.g. "MUCGPT is Michael's employer" (he works for KIES).
- **Pass gate**: `toolValid ∧ retrievalCovered ∧ groundedness ≥ 0.8 ∧ !bannedViolation`.

## Privacy

`frontend/traces/README.md` mirrors the HF guidance: traces can contain prompts, personal data, etc. — review/redact before publishing. The recorder exports only the conversation; nothing is uploaded automatically.

## Future seams (not v1)

- `--traces-as-fixtures`: an adapter `traceToCase(trace) → EvalCase` (derive `expected` from `calledTools`, leave `expectedAnswerFacts` empty and rely on groundedness) to fold traces into the generative fixture corpus.
- HF dataset/bucket loader entry in the `TraceSource` table.