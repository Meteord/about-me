# Feature Specification: End-to-End Agent Chain Evaluation

**Feature Branch**: `002-agent-chain-eval`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "i want to evaluate how good the whole agent chain is working. from retrieval to the finally generated answer. for that i want an evaluation suite. the results should also be shown in the blog section"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - End-to-end chain evaluation suite (Priority: P1)

A maintainer can run one script that evaluates the *entire* agent chain exactly as the site runs it in the browser — retrieval picks the top-k tools, Mini-Michi (the real on-device LFM2.5-350M) decides which tools to call and answers from their results, tool calls are executed and fed back, and a final answer is produced. The script reports stage-level metrics (retrieval, tool-calling, answer quality, latency) per fixture query and per retrieval mode (lexical, vector, hybrid), and exits non-zero when a fixture fails.

**Why this priority**: This is the core of the request — "evaluate how good the whole agent chain is working, from retrieval to the finally generated answer". The existing `eval:retrieval` covers only the retrieval stage; without the chain eval the quality of the full demo cannot be measured.

**Independent Test**: Run `npm run eval:chain` from `frontend/` → it downloads the models (cached), runs every fixture through the real chain in all three modes, prints a per-fixture + aggregate report, writes the results artifact, and exits 0 when all fixtures pass.

**Acceptance Scenarios**:

1. **Given** the repo and installed dependencies, **When** the maintainer runs `npm run eval:chain`, **Then** every fixture query is pushed through retrieval → pruned schemas → LFM2.5-350M generation → tool-call parsing → tool execution → final answer, using the same code paths as `AiSection.handleSend` (MAX_ROUNDS = 3).
2. **Given** a fixture whose expected tool is retrieved but the model still emits a wrong/no tool call, **When** the run completes, **Then** the report flags it (tool-call miss) and the script exits non-zero.
3. **Given** a fixture whose final answer omits a required fact or contradicts a known fact, **When** the run completes, **Then** the answer-quality metric flags it and the script exits non-zero.
4. **Given** vector/hybrid modes, **When** the router checkpoint is not yet cached, **Then** it is downloaded once (~357 MB) and cached; the first run reports it.
5. **Given** the script re-runs with the default (sampling off) settings, **When** it finishes, **Then** the metrics are identical on repeated runs (deterministic/reproducible).

---

### User Story 2 - Pluggable answer judge (Priority: P2)

The answer-quality scoring is isolated behind a `Judge` contract with a deterministic heuristic implementation as the default. A stronger judge (e.g. a larger on-device model, or a config-driven LLM judge behind an opt-in flag) can be added later without restructuring the suite.

**Why this priority**: The user chose "deterministic first, LLM judge later". Structuring for the swap now avoids a rewrite when a stronger on-device judge is viable, and keeps the suite backend-free (constitution Principle I).

**Independent Test**: Replace the default judge with a stub judge through the contract and run the suite → the report consumes the stub's scores; the rest of the chain metrics are unchanged.

**Acceptance Scenarios**:

1. **Given** the eval suite, **When** answer scoring runs, **Then** it goes through a single `judge` entry point defined by a documented interface (`Judge.assess(case, transcript) → Score`), never ad-hoc scoring scattered across the script.
2. **Given** the default deterministic judge, **When** it scores a final answer, **Then** it returns fact-inclusion, no-hallucination (banned facts absent), and groundedness sub-scores without any network/model dependency.
3. **Given** the future need for a stronger judge, **When** a new implementation is added, **Then** no chain-retrieval or fixture code needs to change — only the judge selection.

---

### User Story 3 - Results shown in the blog section (Priority: P3)

The existing "Chat with my website" blog post gains an "eval results" section that renders the persisted eval artifact: per-mode aggregate metrics (retrieval hit@K/MRR, tool-call recall, answer quality, mean latency), a per-case breakdown with score bars, and a note that the numbers come from a real on-device run. The section matches the site's retro pixel theme and accessibility conventions.

**Why this priority**: The user asked for results "shown in the blog section" and chose to extend the existing post. This makes the eval visible to visitors and reinforces the "no data leaves your browser / real on-device" story.

**Independent Test**: Open `#/blog/chat-with-my-website` → the eval-results section renders the persisted numbers (not placeholders); the page has zero console errors and no regressions at ≤480px width or with reduced motion.

**Acceptance Scenarios**:

1. **Given** the blog post page is open, **When** the visitor scrolls to the eval section, **Then** it shows the latest committed results artifact: mode comparison for hit@K, tool-call recall, answer quality, and mean end-to-end latency.
2. **Given** the artifact is missing or stale, **When** the page renders, **Then** it degrades gracefully (a visible note, no broken layout).
3. **Given** a screen-reader or keyboard user, **When** they tab through the results, **Then** tables/bars have accessible labels and `:focus-visible` outlines; the section respects `prefers-reduced-motion`.

---

### User Story 4 - Runtime trace extensibility (Priority: P2)

A finished chat session with Mini-Michi can be saved from the dock as a trace file in the HuggingFace Session Trace Simple Format (STS-Format, JSONL, `harness: "about-me.mini-michi"`): the user query, the retrieval step (as a `system` message), the assistant's tool calls, the linked tool results, and the final answer. A developer can then drop saved traces into `frontend/traces/` — or point `--traces` at a file, directory, or HTTPS URL (e.g. a HuggingFace dataset/bucket hosting agent traces) — and the eval suite scores them as real-world regression cases: it re-runs retrieval on the query (does today's top-k still cover the tools the session actually used?), validates the recorded tool calls against the current registry, and judges the recorded final answer (groundedness against the session's own tool results, plus site-wide banned facts). Trace metrics aggregate into the artifact and the blog's eval section. Trace loading sits behind a documented `TraceSource` interface so new sources can be added without touching scoring.

**Why this priority**: The user explicitly asked for the suite to be extensible with runtime traces ("think about… agent-trace"). Beyond the hand-written fixtures, real usage data is the strongest signal for "how good is the whole chain working"; P1 stories deliver the suite itself, this makes it growable from actual traffic. P2 because the suite already works without it.

**Independent Test**: Chat with Mini-Michi → "Save trace" downloads an STS JSONL; drop it into `frontend/traces/` → `npm run eval:chain` scores it and the blog shows a runtime-traces block.

**Acceptance Scenarios**:

1. **Given** a finished chat, **When** the visitor activates "Save trace", **Then** the browser downloads a `.jsonl` whose first line is `{"type":"session","harness":"about-me.mini-michi",...}` and whose remaining lines are `type:"message"` envelopes (user, retrieval-as-`system`, assistant `toolCalls`, `tool` results with `toolCallId`, final assistant answer) that render in the HF trace viewer.
2. **Given** the downloaded trace, **When** it is placed in `frontend/traces/` and the default eval runs, **Then** it is loaded and scored with no extra flags; `--traces=<file>`, `--traces=<dir>`, and `--traces=<https-url>` work as well.
3. **Given** a scored trace, **When** the report prints, **Then** it shows per-trace retrieval coverage (called tools ⊆ current top-K), tool-call validity vs the current registry, answer groundedness vs the trace's own tool results, banned-fact violations, and a pass gate; aggregates land in `evalResults.ts` and render in the blog's eval section.
4. **Given** a malformed trace, **When** it is ingested, **Then** the bad line(s) are reported and the trace skipped, the run continues, and the exit code reflects only scored-trace failures.
5. **Given** a desire for a new trace source, **When** a developer implements the `TraceSource` interface (e.g. an HF-dataset loader), **Then** no scoring or artifact code needs to change.

---

### Edge Cases

- What happens when the chat model download fails mid-run? → The script reports per-case model errors and exits non-zero; partially produced results are still written so the failure is debuggable.
- What happens when the router fails in vector/hybrid mode? → The retriever falls back to lexical (same semantics as the browser); the report records the effective mode per case.
- What happens when the model emits no tool call but the query needs one? → The answer-quality judge scores the answer against the required facts; a miss fails the fixture.
- What happens when a fixture's expected facts are edited but the artifact is stale? → Re-run the eval; the blog renders the last committed artifact only (static site, never evaluated at runtime).
- What happens when tool executors touch browser APIs (`window.location.hash`, layout state)? → In the Node harness those side-effects are stubbed; the tool `result` payload (the text the model reads) is preserved exactly.
- What happens when a saved trace references a tool/args that are no longer valid? → The trace's tool-validity metric flags it (registry drift); the trace still scores on the other metrics.
- What happens when a trace's answer used no tools? → Groundedness is computed against whatever tool results exist; a needs-tools query answered with none is flagged via retrieval coverage.
- What happens when a trace's final assistant message is missing? → The trace is malformed and skipped with a warning (per-line error reporting).
- What about privacy in traces? → The recorder exports only the conversation; `frontend/traces/README.md` mirrors the HF guidance to review/redact before publishing (traces can contain personal data).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST provide an `npm run eval:chain` script (in `frontend/scripts/`) that runs the full agent chain end-to-end in Node for each fixture: `retrieve()` (real retriever; vector router on CPU q8 like `eval:retrieval`), `pruneSchemas()`, `buildSystemPrompt()`, `useChatModel().generate()` (real `LiquidAI/LFM2.5-350M-ONNX` via transformers.js on CPU), `extractToolCalls()`, `executeToolCall()` (browser side-effects stubbed), and the multi-round loop mirroring `AiSection.handleSend` (MAX_ROUNDS = 3).
- **FR-002**: The suite MUST reuse the existing fixtures in `scripts/eval-fixtures.mjs` and extend each with answer-expectation metadata: `expectedAnswerFacts` (substrings/facts the final answer must contain) and `bannedFacts` (facts that must not appear).
- **FR-003**: The report MUST include, per mode and aggregated: retrieval Hit@K and MRR (reusing existing logic), tool-call recall (fraction of expected tools actually called by the model in any round), tool-call argument validity (e.g. `get_content` id valid, `set_theme` theme valid and matching the fixture), answer fact-inclusion score, no-hallucination score, groundedness score, mean tool-call rounds, per-stage latency (retrieval / generation / total), and exit non-zero on any fixture miss.
- **FR-004**: The script MUST persist results as a committed, machine-readable generated module under `frontend/src/data/` (`evalResults.ts`: `EvalResults` interface + `evalResults` const — see `contracts/artifact.md`), regenerated on each run and readable by the blog.
- **FR-005**: Answer-quality scoring MUST go through a documented `Judge` contract (`assess(case, transcript) → score`), with a deterministic heuristic `DeterministicJudge` as the default implementation, so a stronger judge (e.g. a larger on-device model or an opt-in LLM judge) can be added later without restructuring the chain or fixtures.
- **FR-006**: The default eval MUST be deterministic (sampling off, greedy decoding — matching the site's default `sampling.value === false`) so repeated runs are reproducible.
- **FR-007**: The existing "Chat with my website" blog post (`BlogPostPage.vue`) MUST render a new eval-results section from the artifact: per-mode aggregate metrics and a per-case breakdown, styled with existing global `pixel-*` / `tool-*` / `model-*` classes (no `<style>` blocks), accessible (`:focus-visible`, `prefers-reduced-motion`, 480px breakpoint), with graceful degradation when the artifact is missing.
- **FR-008**: Retrieval fallback semantics MUST match the browser: vector mode is never forced by the eval loop; if the router is unavailable, lexical scores are used and the effective mode is recorded per case.
- **FR-009**: Mini-Michi MUST be able to export a finished session as an STS-format trace (`harness: "about-me.mini-michi"`) — user messages, the retrieval step as a `system` message, assistant tool calls with ids, tool results linked by `toolCallId`, and the final answer — via a "Save trace" control in the dock.
- **FR-010**: The eval suite MUST accept runtime traces via `--traces=<file|dir|url>` (default: the `frontend/traces/` directory), validate the STS format, and score each trace: re-run retrieval for coverage of the called tools, validate the recorded calls/args against the current registry, and judge the recorded final answer (groundedness vs the trace's own tool results + a site-wide banned-fact list).
- **FR-011**: Trace results MUST aggregate into the artifact's `traces` section and render in the blog's eval-results section, degrading gracefully when no traces have run.
- **FR-012**: Trace loading MUST be isolated behind a `TraceSource` interface with `file`, `dir`, and `url` loaders, so new trace sources (e.g. a HuggingFace dataset/bucket) can be added without changing scoring, metrics, or artifact code.

### Key Entities *(include if feature involves data)*

- **EvalCase**: One fixture — `query`, `expected` (tools), `expectedAnswerFacts[]`, `bannedFacts[]`.
- **EvalRunResult**: Per mode, per case — retrieval rows/stats, model tool calls per round, executed tool results, final answer, stage latencies, and the judge's score.
- **Judge**: Interface + implementations (`DeterministicJudge` default; future `LLMJudge` behind an opt-in flag) — decides answer quality offline.
- **EvalArtifact**: The committed generated module (`frontend/src/data/evalResults.ts` — `EvalResults` interface + `evalResults` const, see `contracts/artifact.md`) consumed by the blog section.
- **Trace**: A session recorded in STS-format JSONL (`harness: "about-me.mini-michi"`) — user messages, retrieval summary, tool calls, tool results, final answer.
- **TraceSession**: The normalized in-memory form of a trace after validation (header + ordered messages) that the scorer consumes.
- **TraceSource**: A loader interface (`file` / `dir` / `url`) that turns a spec string into `TraceSession[]`; the extension seam for new trace origins.
- **TraceCaseResult**: Per-trace scoring (retrieval coverage, tool validity, groundedness, banned violations, pass).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run eval:chain -- --modes=lexical,vector,hybrid` completes for every fixture with no uncaught errors; exit code is 0 if and only if no fixture misses its expected tools or required answer facts.
- **SC-002**: The suite exercises the real chat model (not a stub): the final answers in the report are generated by LFM2.5-350M, and the report records model status/device/dtype (CPU, q8) per run.
- **SC-003**: Repeated runs with default settings produce byte-identical aggregate metrics (deterministic).
- **SC-004**: The blog's eval-results section renders the committed artifact's numbers with zero console errors, passes a keyboard/reduced-motion walkthrough, and shows no layout regression at ≤480px.
- **SC-005**: Swapping the judge for a stub implementation through the `Judge` contract changes only answer-quality scores; retrieval/tool-call metrics and exit logic remain correct (verifiable in quickstart).
- **SC-006**: Saving a session produces a trace that opens in the HF trace-viewer format; placing it in `frontend/traces/` and running `npm run eval:chain` scores it end-to-end with no extra flags.
- **SC-007**: Trace ingestion tolerates malformed lines (per-line reporting, continues) and exits non-zero iff a scored trace fails its gate.
- **SC-008**: Adding a new trace source requires implementing one `TraceSource` loader; scoring, metrics, and artifact code are unchanged.

## Assumptions

- The eval runs locally on the maintainer's machine (or CI) — never in the visitor's browser; the site is a static consumer of the committed artifact (constitution Principle I holds: no backend, no runtime model calls for rendering).
- Both models run on CPU q8 in Node (the pattern `eval:retrieval` already uses for the prompt router); no GPU assumption.
- `window`/layout side-effects in tool executors are stubbed in Node; they never change the textual tool result the model reads (only URL/layout/scroll effects differ, which are irrelevant to scoring).
- The existing 27 retrieval fixtures are extended (not replaced) so retrieval metrics remain comparable; new fixtures follow the same `query`/`expected` shape plus answer facts.
- "LLM judge later" is explicitly out of scope for v1 except for the `Judge` contract; no LLM judge is implemented in this feature.
- Traces are exported manually (a "Save trace" control); there is no auto-upload — the static site never pushes data anywhere (Principle I holds).
- Trace scoring judges the **recorded** session (historical fidelity) using the trace's own tool results; it does not re-execute tools or regenerate the answer.
- URL trace loading is used only by the local/CI eval tool (global `fetch` in Node) — never in the browser bundle.
- `frontend/traces/` holds user-collected traces; its `README.md` documents the flow and privacy guidance (mirrors HF).