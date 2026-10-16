# Contract: Blog Evaluation UI & Generation-Free Artifact (`006-retrieval-only-eval`)

## 1. CLI Contract (`npm run eval:chain`)

**Command** (run from `frontend/`):
```bash
npm run eval:chain [-- --modes=bm25,vector,hybrid,decide --topk=5 --traces=<file|dir|url>]
```

**Behavior**:
1. Runs the fail-fast split-integrity and corpus-hygiene validator (`validateSplitIntegrity`) before any retrieval or model initialization.
2. Initializes only the requested retrieval models (`loadVector()` for `vector`/`hybrid`, `loadDecide()` for `decide`). **Must never load or invoke `useChatModel` (`LiquidAI/LFM2.5-350M-ONNX`) or an answer judge.**
3. For each requested mode and each fixture in `scripts/eval-fixtures.mjs`:
   - Calls `retriever.retrieve(fixture.query, { mode, topK })`.
   - Calls `registry.decideAction(fixture.query, rows, currentTheme)`.
   - If no theme action fired, calls `registry.buildContextText(selectedNames)` to determine `injectedNames` under the `MAX_INJECT_CHARS` budget.
   - Records `latencyMs` covering retrieval + action/injection, and computes `retrievalPass`, `injectionPass`, `actionPass`, and overall `pass`.
4. If runtime traces exist in `frontend/traces/` or `--traces=...`, scores each trace historically via `scoreTrace` (retrieval coverage + action validity only).
5. Writes `frontend/src/data/evalResults.ts` formatted with Prettier.
6. Exits with code `0` if and only if all held-out `test`-split cases have `pass === true` and all evaluated runtime traces have `pass === true`; exits with code `1` otherwise.

## 2. UI Contract: `EvalComparison.vue`

### Metric Selector Chips (`FR-001`, `FR-002`)
- Available `MetricKey` values:
  - `'retrievalHitRate'` → label `` `hit@${results.config.topK}` `` (`eval-metric--amber`)
  - `'injectionCoverRate'` → label `'injection cover'` (`eval-metric--orange`)
  - `'actionPassRate'` → label `'action pass'` (`eval-metric--amber`)
- Default active metrics on initial render: `['retrievalHitRate', 'injectionCoverRate']`.
- At least 1 metric chip must remain active at all times.
- Forbidden labels: `fact recall`, `faithfulness`, `chain pass`.

### Comparison Chart & Separate Average Latency Statistic (`FR-008`, `SC-003`)
- Each mode row displays:
  - Mode name and overall average time per query (`avg time <formatted>`) in the mode header.
  - `test` split header showing sample count AND test-split average latency (`avg time <formatted>`), followed by the active percentage metric bars (`0%–100%`).
  - `train` split header showing sample count AND train-split average latency (`avg time <formatted>`), followed by the active percentage metric bars (`0%–100%`).

### Per-Fixture Breakdown (`FR-003`, `FR-004`, `FR-005`, `FR-008`)
- Failure summary line above the list: `<total> runs — <passed> pass · <failed> fail.` (plus failure reason tally when `failed > 0`).
- Each fixture group displays the query and one row per evaluated mode containing:
  - Mode name (`entry.mode`)
  - Split badge (`test` / `train`)
  - Individual query latency (`formatLatency(entry.latencyMs)`)
  - `PASS` / `FAIL` badge driven by `entry.pass`
  - Meta line: fallback indicator (`→ bm25` if `effectiveMode !== mode`), plus either `action: <appliedTheme>` or `injected: <injectedNames | none>`
  - When `!entry.pass`, failure reason from `{'retrieval missed', 'action misfired', 'expected source not injected'}`
  - **No `fact recall` or `faithfulness` progress bars.**

## 3. UI & Content Contract: `BlogPostPage.vue` and `public/llms/blog.md` (`FR-006`, `SC-001`)

- Section heading & question: focuses on how well retrieval, context injection, and direct actions work across modes.
- Metadata & legend: describes `hit@K`, `injection cover`, `action pass`, and `avg time` (latency); does not mention `chatModel`, `sampling`, `fact recall`, `faithfulness`, or `chain pass`.
- Takeaway box (`What this tells us`): summarizes `retrievalHitRate`, `injectionCoverRate`, `actionPassRate`, overall `passRate`, and average latency across modes.
- Runtime traces block (when `evalResults.traces` is non-null): renders `retrieval covered`, `action valid`, and `pass` (no `grounded` rate).
- Retrievable markdown (`scripts/generate-llms-txt.mjs` → `public/llms/blog.md`): describes the retrieval, context-injection, action, and latency evaluation without mentioning LLM answer generation or answer-grounding metrics in the eval summary.
