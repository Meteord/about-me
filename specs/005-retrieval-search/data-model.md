# Data Model: Unbiased Retrieval Evaluation — Train/Test Split + Pure BM25

**Feature branch**: `005-retrieval-search` | **Date**: 2026-10-16
**Input**: [spec.md](./spec.md) · Decisions in [research.md](./research.md)

---

## 1. Evaluation Fixture

A natural-language query plus the any-of answer set, plus split membership.

| Field | Type | Rules |
|---|---|---|
| `query` | string | Non-empty; immutable once committed (rewording changes scores and split meaning). May be EN or DE. |
| `expected` | `string[]` | Source/action names from `SOURCE_DEFS`; empty array = intentional "no selection" (small talk). Any-of semantics. |
| `expectedAnswerFacts` | `string[]` | Atomic claims the chain answer must contain (chain eval only). |
| `bannedFacts` | `string[]` | Contradictory claims the answer must not contain (chain eval only). |
| `expectAction` | `boolean?` | Present on theme requests: the heuristic `set_theme` path must fire. |
| `expectedArgs` | `object?` | Exact theme the action must apply (e.g. `{ set_theme: { theme: 'red' } }`). |
| `split` | `'train' \| 'test'` | **New.** Persisted field, authored in `frontend/scripts/eval-fixtures.mjs`; never derived at runtime. Exactly one of the two values; every fixture carries it. |
| `note` | `string?` | Provenance marker. Required on test fixtures (e.g. `'held-out: authored 2026-10-16, post-freeze'`); documents the strict hold-out provenance per fixture (research R8). |

**Data provenance (user decision 2026-10-16, strict hold-out)**: all pre-existing
fixtures → `train`; the test split consists exclusively of freshly hand-authored
questions written after this change's corpus freeze, sanity-run offline while
authoring and immutable afterwards. No machine-assisted generation — new
tuning questions go to train, new evaluation questions to test (research R8).

**Validation rules** (enforced by both eval scripts before any retrieval):

- V1 — Every fixture has a valid `split` value (else: hard error naming the fixture).
- V2 — Test split size ≥ ⌈N/3⌉ and ≥ 10, where N = *all* fixtures. Initial
  composition: 35 existing (train) + ≥ 18 authored test questions = 53 total →
  test share ≈ 34% (spec SC-002).
- V3 — Coverage: every `SOURCE_DEFS` name (9 content sources + `set_theme`)
  appears in the `expected` set of at least one **test** fixture.
- V4 — Language: each split contains ≥ 2 German queries, drawn from ≥ 2
  different expected sources.
- V5 — "No selection" fixtures (`expected: []`) exist in **both** splits.
- V6 — Each test fixture's expected source also has ≥ 1 **train** fixture with
  that source in its `expected` set (guaranteed initially — the existing set
  covers all sources — and re-checked per run).
- V7 — Every test fixture carries a `note` provenance marker (auditable strict
  hold-out, research R8).

**State transitions**: none (static data). *Erosion rule*: new fixtures default
to `train` unless authored as a held-out evaluation question (which then requires
the `note` marker); the split field makes every such decision a visible,
commentable diff line.

---

## 2. Split

Enum `{ train, test }`. Semantics:

- `train` — tuning reference. Comprises **all pre-existing fixtures** plus any
  future tuning questions. May legitimately shape corpus text, aliases and
  future scoring work. Metrics reported, never the gate (FR-004).
- `test` — held out. Comprises **only freshly authored questions** written after
  the corpus freeze (strict hold-out, provenance-marked via `note`). The only
  pass/fail gate; its queries must never appear verbatim (or trivially
  reordered) in the retrieval corpus (FR-006 — satisfied by construction since
  aliases stay keyed to train wording, enforced by the per-run hygiene check).
- Runtime traces are *conceptually* test-side data (Edge case 4) but carry no
  split field — they are reported through the trace aggregate only.

Relationships: a Split *partitions* Fixtures (disjoint + total, FR-001); a Split
*constrains* RetrievalCorpusText (test-side hygiene, FR-006).

---

## 3. Retrieval Mode

Union `'bm25' | 'vector' | 'hybrid' | 'decide'` (identifier, not display label).

| Mode | Availability | Scores source | Fallback |
|---|---|---|---|
| `bm25` | always, offline, no download (FR-010) | Okapi BM25 over source docs (k1 = 1.2, b = 0.75) | — |
| `vector` | router model `ready` | zero-shot prompt-router softmax | `bm25`, `stats.effective = 'bm25'` |
| `hybrid` | router model `ready` | RRF(BM25 ranks, vector ranks) | `bm25` |
| `decide` | decide model `ready` | GLiNER2.5-Decide softmax | `bm25` |

`stats.effective` records the mode whose scores were actually used — the
fallback self-reports as `bm25` (FR-009). The retired identifier `lexical`
appears nowhere (FR-008; surface map in research R5).

---

## 4. Retrieval Corpus Text (per candidate)

Searchable text of each `SOURCE_DEFS` entry: `name — title: description.
alias, alias, …` (unchanged shape).

**Hygiene rule (FR-006/SC-004)**: for every **test** fixture, neither the
normalized query (lowercase, punctuation stripped, whitespace collapsed) nor its
trivial-reorder key (same normalized tokens sorted) may appear as a substring of
any corpus doc text. Alias entries duplicating **train** queries are allowed.
Verified automatically in both eval scripts; violation = non-zero exit naming
the offending alias and fixture.

**Deterministic ordering (Edge case 5)**: candidates sort by score descending,
tie-broken by `name` ascending — every run produces the identical ranking.

---

## 5. Eval Case Result (per-mode × per-split run, chain eval)

Same shape as today plus the split dimension:

| Field (new/changed) | Type | Rules |
|---|---|---|
| `split` | `'train' \| 'test'` | **New.** Copied from the fixture. |
| `mode` / `effectiveMode` | `string` | Values from the new mode union (`bm25` never `lexical`). |
| `retrievalPass` | boolean | Hit@K against `expected` at `topK`. |
| `answerPass` / `chainPass` | boolean | Unchanged judge semantics. |

---

## 6. Mode Aggregate (per mode × split)

Existing metrics (Hit@K, MRR, injectionCoverRate, actionPassRate, factRecall,
faithfulness, hallucinationRate, latencies, pass rates) computed over the cases
of one (mode, split) pair. Artifact shape: `splits: { train, test }` nested per
mode (see [contracts/artifact-schema.md](./contracts/artifact-schema.md)).

**Gate rule**: `gateSplit = 'test'` recorded in the artifact config; exit status
of both eval scripts = f(test-split failures only). Train-only misses print as
`tuning reference — not the gate` (SC-001).

---

## 7. Trace Aggregate (unchanged role, renamed mode)

`{ count, sources, mode, topK, retrievalCoverRate, actionValidRate,
groundedRate, bannedViolationRate, passRate }` — `mode` now carries `bm25`.
Traces are test-side; they never mutate the train reference. Not part of the
exit-status gate beyond today's behavior (recorded traces failing still fail the
chain run as they do now).

---

## 8. Metrics (unchanged formulas, split-scoped)

- **Hit@K** = 1 if any expected name ∈ selected top-K, else 0
  (expected-empty fixtures: always 1).
- **MRR** = 1 / min(rank of any expected name among selected rows), 0 if none.
- Reported per (mode, split) pair; the comparison artifact shows both so the
  generalization gap (train vs test) is visible at a glance (US3).
