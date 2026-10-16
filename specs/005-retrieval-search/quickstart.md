# Quickstart: Validate the Unbiased Retrieval Evaluation

**Branch**: `005-retrieval-search`
Prerequisite: Node `^20.19.0 || >=22.12.0`; all commands run from `frontend/`.

---

## 1. Offline retrieval pass (no model download) — the core gate

```bash
cd frontend
npm run eval:retrieval -- --modes=bm25
```

Expected:

- Pre-run integrity checks pass silently (split field valid everywhere with
  provenance markers on test fixtures, test split ≥ ⌈N/3⌉ of all fixtures and
  ≥ 10, every source/action covered, German queries in both splits, zero
  test-query verbatim overlap with the corpus).
- Output ends with per-split summaries, e.g.
  `test:  hit@5 = 100% · MRR = …` and
  `train (tuning reference — not the gate): hit@5 = …% · MRR = …`
- Exit status 0 when the **test** split has zero misses (SC-003).

Offline matrix options:

```bash
npm run eval:retrieval -- --modes=bm25 --topk=3     # stricter K
```

## 2. Gate semantics proof (SC-001, two reversible checks)

1. **Test miss must fail**: temporarily move a test fixture's expected answer
   further down the corpus (e.g. set a test fixture to compare against a renamed
   source, or bump `--topk=1` so a rank-2 test fixture misses):
   `npm run eval:retrieval -- --modes=bm25 --topk=1` → expect exit status 1 and
   the missed **test** fixture named, then restore topk.
2. **Train miss must not fail**: temporarily set one train fixture's `expected`
   to a name never retrieved:
   `npm run eval:retrieval -- --modes=bm25` → expect the train `MISS` printed,
   exit status still 0, summary labeled `tuning reference — not the gate`.
   Revert.

## 3. Naming audit (FR-008)

```bash
grep -rni "lexical" frontend/src frontend/scripts frontend/traces/README.md \
  --exclude-dir=node_modules --exclude-dir=dist
```

Expected: zero hits (or only hits inside gitignored historical `.jsonl` trace
data and historical eval prose expressly kept — anything else is a defect).

```bash
npm run eval:retrieval -- --modes=lexical
```

Expected: `no valid retrieval modes requested` style failure, non-zero exit.

## 4. Full chain (all four modes) — the committed artifact

```bash
npm run eval:chain                     # q8, greedy; downloads ~357 MB + ~345 MB + chat model on first run (cached in ~/.cache/huggingface)
# fast iteration on the chain only:
npm run eval:chain -- --modes=bm25 --dtype=q4
```

Expected: per-split aggregates printed per mode; `frontend/src/data/evalResults.ts`
rewritten with `config.gateSplit: 'test'`, per-mode `splits.test`/`splits.train`,
`split` on every case, and only `bm25` as the keyword mode name. Exit 0 when all
test-split cases (and traces, if present) pass (SC-005).

## 5. Browser spot-check (SC-006)

```bash
cd frontend && npm run dev
```

- Open the tool panel (dock → Model settings): the four mode chips read
  **BM25 · VECTOR · HYBRID · DECIDE**; "Under the hood" copy says BM25 keyword
  match; no surface mentions the retired name.
- No model loaded → select BM25, ask a question → instant result; stats line
  reports `bm25`.
- Fallback check (FR-009): select VECTOR without loading the router → result
  scores come from BM25 and the stats/effective line reports
  `bm25 (fallback)`; a forced router error shows “falling back to BM25 scores”.
- Chat transcript step shows the new mode label per turn.

## 6. Static verify chain (Constitution III — always the last step)

```bash
cd frontend
npm run lint
npm run build
```

Both must pass. Then commit (dist/ and traces/*.jsonl stay untracked).

## References

- Data model: [data-model.md](./data-model.md) (fixture validation V1–V7, mode table, hygiene rule)
- CLI behavior: [contracts/eval-cli.md](./contracts/eval-cli.md)
- Artifact schema: [contracts/artifact-schema.md](./contracts/artifact-schema.md)
- Fixture discipline: [contracts/fixtures-schema.md](./contracts/fixtures-schema.md)
- Decision log: [research.md](./research.md)
