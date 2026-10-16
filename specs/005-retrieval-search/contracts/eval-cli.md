# Contract: Evaluation CLI (eval:retrieval + eval:chain)

Both scripts keep their existing command-line controls (FR-010) and gain the
split-aware gate (FR-004). The retired mode name `lexical` is not a valid mode
value anywhere (FR-008).

## Modes

Valid `--modes` comma list: `bm25,vector,hybrid,decide` (`bm25` = pure BM25,
replaces `lexical`). Defaults: all four. Passing `lexical` is an **invalid
mode** → the run prints the valid set and exits non-zero (no silent aliasing).

## `npm run eval:retrieval [-- --modes=<list> --topk=<k>]`

- `--modes` default `bm25,vector,hybrid,decide`; `--topk` default `5`.
- `bm25` runs fully offline (no model download).
- Pre-run integrity checks (fail fast, non-zero, named offenders): fixture
  split validity and provenance markers, split size/coverage/language
  invariants, test-query corpus overlap.
- Output per mode:
  - one line per fixture: `[ok|MISS] <query> → <top names>` with split tag;
  - summary lines per **split**:
    `test:  hit@K = …% · MRR = …` (the gate)
    `train (tuning reference — not the gate): hit@K = …% · MRR = …`
- **Exit status**: non-zero iff any **test**-split fixture (or trace, for the
  chain) missed. Train misses are printed, never gated.

## `npm run eval:chain [-- --modes=<list> --topk=<k> --dtype=q8|q4 --sampling --judge=<name> --traces=<spec>…]`

- Same mode list semantics; same pre-run integrity checks.
- Aggregates reported per (mode × split); chain cases carry `split`.
- Writes the committed artifact `frontend/src/data/evalResults.ts` (schema:
  [artifact-schema.md](./artifact-schema.md)) and names it in the final line.
- **Exit status**: non-zero iff **test**-split chain failures (including trace
  failures, which are test-side data) > 0. Train-only chain failures print.

## Fallback reporting

When the router (vector/hybrid) or decide model cannot load, the scripts print
`… falls back to bm25` and the per-case `effectiveMode` reads `bm25` — the
fallback self-identifies as the pure BM25 mode (FR-009).
