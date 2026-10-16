# Contract: Evaluation fixture module (`frontend/scripts/eval-fixtures.mjs`)

The fixture file is the persisted split authority (FR-001). It is a plain ESM
module imported by `eval-retrieval.mjs`, `eval-chain.mjs` and (via
`eval-lib.mjs` stubs) the browser-side documentation of eval semantics.

## Exported API (unchanged names, added field)

```js
export const FIXTURES = [
  {
    query: string,                        // immutable natural-language question
    expected: string[],                   // any-of source/action names; [] = no selection
    split: 'train' | 'test',              // NEW — persisted, author-reviewed per fixture
    note?: string,                        // provenance marker; REQUIRED on test fixtures
                                          // (e.g. 'held-out: authored 2026-10-16, post-freeze')
    // chain-eval only (optional):
    expectAction?: true,
    expectedArgs?: { set_theme: { theme: 'amber' | 'orange' | 'red' } },
    expectedAnswerFacts?: string[],
    bannedFacts?: string[],
  },
  // …
]

export const BANNED_TRACE_FACTS = string[]  // unchanged
```

## Invariants (enforced by both eval scripts; see data-model §1 V1–V7)

- `split` present and valid on **every** fixture; no fixture without one.
- **Strict hold-out (user decision 2026-10-16)**: all pre-existing fixtures
  carry `split: 'train'`; the test split consists exclusively of freshly
  hand-authored questions with a `note` provenance marker. No machine-assisted
  question generation (now or later) — new tuning questions → `train`, new
  evaluation questions → `test`.
- All `expected` names exist in `SOURCE_DEFS` at runtime (existing check kept).
- Test split ≥ ⌈N/3⌉ of **all** fixtures and ≥ 10 (initial composition:
  35 train + ≥ 18 authored test = 53 total → ≈ 34%); every source/action
  covered in test `expected`; German queries in both splits; "no selection"
  fixtures in both splits.
- No **test** fixture query appears verbatim (or as a trivial reorder) in the
  retrieval corpus (`getSourceDocs()` text) — satisfied by construction (aliases
  stay keyed to train wording) and checked by the scripts every run.

## Change discipline

- `query`/`expected` of an existing fixture: treat as immutable (metrics stay
  comparable across commits) — and for test fixtures immutable **by contract**
  (never reworded after the split freeze to chase metrics; research R3 rule 5).
- New fixture → author `split` explicitly: tuning questions → `train`,
  held-out evaluation questions → `test` (then re-verify V1–V7 by running
  `npm run eval:retrieval -- --modes=bm25`). Test-side additions are
  hand-authored with a `note` marker; machine-generated evaluation questions
  are out of process (strict decision, research R8).
- Removing a source/action → drop or re-home its fixtures in the same commit
  (Constitution VI sync rule). If its **test** coverage disappears too, new
  test-side questions for a replacement source must be authored before the
  release (V3 fails otherwise).
