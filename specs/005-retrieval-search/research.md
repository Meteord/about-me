# Research: Unbiased Retrieval Evaluation — Train/Test Split + Pure BM25

**Feature branch**: `005-retrieval-search` | **Date**: 2026-10-16
**Input**: [spec.md](./spec.md)

---

## R1: What "standard textbook BM25" means and which off-the-shelf stopword/tokenization treatment replaces the custom stopword list (FR-007)

### Decision

Keep the already-classic Okapi BM25 scoring function (k1 = 1.2, b = 0.75, IDF =
`ln(1 + (N − df + 0.5)/(df + 0.5))`) **unchanged** — the scorer's math is not the
problem — and replace only its preprocessing:

- **Tokenization**: lowercase, split on every character that is not a Unicode
  letter or digit (mirrors a Lucene letter-or-digit tokenizer; keeps `mucgpt`,
  `blog`, `chat`, digits; drops punctuation). Drop the current custom
  `token.length > 1` filter.
- **Stopwords**: the union of two verbatim, published constants — the Lucene
  default **English** stop set (`a, an, and, are, as, at, be, but, by, for, if,
  in, into, is, it, no, not, of, on, or, such, that, the, their, then, there,
  these, they, this, to, was, will, with`) and Lucene's predefined **German**
  stop set (`_german_`, as shipped by Elasticsearch/Lucene analyzers). Both
  lists are famous reference constants, copied without modification, and cited
  in a code comment pointing at the source — no term was added or removed
  because of any fixture.
- **Score-corpus identity**: the scorer must be inspectable as "BM25 + these two
  cited lists, nothing else". No reweighting, no synonym/alias boosting inside
  the scorer, no query-term special cases.

### Rationale

- The overfitting the user observed does **not** live in the scoring function
  (already textbook: the classic Robertson–Spärck Jones formulation with the
  universally cited defaults). It lives in (a) the hand-picked 24-term stopword
  list — every entry is a word appearing in the fixtures ("what", "how", "can",
  "you", "about", "this", "which"…) — and (b) alias entries that duplicate
  fixture queries verbatim. FR-006/FR-007 therefore target the preprocessing and
  corpus, not the formula.
- Replacing the custom list with **cited constants** satisfies the spec
  assumption ("standard, off-the-shelf stopword/tokenization treatment — not the
  current custom stopword list") and makes future audits trivial: diff the const
  against the published list.
- Shipping `_english_` **and** `_german_` is required by FR-003 (both splits
  contain German queries): an English-only list would give German function words
  (was, wie, ich, wo, und …) non-standard treatment, skewing the cross-language
  results the split is supposed to measure.

### Alternatives considered

| Alternative | Why rejected |
|---|---|
| Pull a BM25 library (e.g. `bm25`, `wink-bm25`) as a dependency | Violates Constitution II (start simple / minimal deps); the in-repo implementation is ~30 lines and already textbook. Also the browser bundle would grow for no behavioral gain. |
| No stopword removal at all ("pure BM25 never matches stopwords") | Docurable, but the spec's assumption explicitly prescribes a standard off-the-shelf stopword treatment; BM25 IDF alone keeps query function words competing for rank position with only length-normalization damping. Also leaves German query words with no treatment at all. |
| Single English-only standard list | Fails FR-003's intent — German fixtures would be scored by a language-mismatched preprocessing step. |
| Porter/snowball stemming on top (standard in Lucene analyzers) | Unnecessary scope growth: 9 content sources × short aliases; stemming adds algorithm surface (and a German stemmer) without addressing the fixture-tuning problem. YAGNI. |
| Keep custom stopwords but "document them" | Directly contradicts FR-007 ("custom hand-tuning derived from sample questions MUST be removed"). |

---

## R2: Where the persisted train/test split lives and how it stays deterministic (FR-001, SC-002)

### Decision

Author the split **inside the fixture file itself**
(`frontend/scripts/eval-fixtures.mjs`): every fixture gains a
`split: 'train' | 'test'` field, reviewed per fixture in normal git diffs. No
runtime assignment, no hashing, no randomness — "deterministic" is achieved by
*authorship*, not by seeding. A tiny defensive check in both eval scripts
rejects the file if any fixture lacks a valid split value or if the two shared
invariants (disjoint by construction; coverage, see below) are violated.

### Rationale

- The spec explicitly says membership is "persisted, explicitly reviewable per
  fixture" and "never re-drawn randomly per run". A field on the fixture is the
  only representation where a human sees each assignment at review time.
- Deterministic-hash splits (e.g. `hash(query) % 3 === 0`) are reproducible but
  *not reviewable per fixture* and silently re-shuffle the split whenever
  fixtures are renamed — worse for erosion detection (Edge case: "the process
  must be documented so the split cannot silently erode").

### Alternatives considered

| Alternative | Why rejected |
|---|---|
| Hash-based runtime split (seeded) | Deterministic but not per-fixture reviewable; changes silently when fixtures change; the spec's persisted-reviewable wording rules it out. |
| Separate `eval-splits.mjs` mapping file | Two files must be kept in sync by hand; a field on the fixture cannot drift or go stale relative to the fixture it annotates. |
| Directory-based split (`fixtures-train.mjs` / `fixtures-test.mjs`) | Splits shared fixture metadata (expected facts, banned facts) across files or forces duplication. |

---

## R3: Split composition rule — strict hold-out (FR-002, FR-003, SC-002) *[revised 2026-10-16]*

### Decision

**All pre-existing fixtures become the train split.** They are not eligible for
the test side: they were authored while building the current scorer, and the
alias corpus was visibly written against them (e.g. 'where does michael live'
is literally an `about_bio` alias). FR-006's verbatim-overlap removal fixes only
the machine-checkable part of that contamination; the soft part — corpus shaped
*around* those questions — cannot be undone, so those questions are tuning
reference by definition, and calling any of them "held out" would overstate
generalization.

The **test split is freshly authored exclusively for this change**: hand-written
questions composed against the site content *after* the corpus freeze this
feature introduces (de-tuned stopwords, alias set reshaped for the train set),
meeting the checkable invariants:

1. **Size**: the combined total must satisfy SC-002's ≥ 1/3 share — with 35
   existing fixtures on the train side, the initial test set is **≥ 18
   questions** (35 + 18 = 53 total → ≈ 34%); it must always be ≥ 10.
2. **Coverage**: every content source (`about_bio`, `about_education`,
   `about_skills`, `about_hobbies`, `projects`, `contact`, `blog`,
   `blog:chat-with-my-website`, `site_index`) and the `set_theme` action appear
   in at least one **test** fixture.
3. **Language parity**: ≥ 2 German test questions, sampling different expected
   sources (both splits contain German — train via the existing set, test via
   authoring).
4. **"No selection" coverage**: at least one small-talk fixture (`expected: []`)
   in the test split, so the "retrieve nothing" behavior is gated on the
   held-out side too (Edge case 1).
5. **Answerability calibration, not tuning**: test questions may be sanity-run
   against the offline `bm25` mode *while being authored and before the split is
   declared final* (an unanswerable question is an invalid fixture, not a
   finding). After the freeze, they are immutable — never reworded to chase
   metrics; legitimate post-freeze improvements go through train-side levers
   only (FR-005).

The train-side invariants stay automatic with this decision: every source/action
is already covered by train fixtures (the existing set), and FR-006's hygiene is
satisfied **by construction** — the new test questions have no aliases because
aliases remain keyed to train wording (the automated verbatim-overlap check in
R4 still gates accidental collisions every run).

The concrete new test set is authored in `eval-fixtures.mjs` during
implementation; the eval scripts enforce rules 1–4 programmatically (fail the
run listing the violations) so composition cannot erode silently.

### Rationale

SC-002 demands ≥ 1/3 test share with ≥ 10 questions, full source/action
coverage, and German presence — derived above as ≥ 18 new questions. The strict
hold-out is what makes the split worth having: a test split that shares
provenance with the tuning corpus measures memorization *removal*, not
*generalization*. The authoring cost is the price of an honest headline number.

### Alternatives considered

| Alternative | Why rejected |
|---|---|
| Mixed split: existing fixtures eligible for test, dedup/generalize aliases (the original R3 draft) | Syntactic hold-out: aliases were shaped around these queries, so even paraphrase-safe members understate the gap. User decision 2026-10-16: rejected in favor of strict. |
| Random stratified split of the existing set | Same provenance flaw, plus not per-fixture reviewable. |
| Machine-paraphrased variants of train queries as the test set | Rejected twice over: correlated with tuning by construction, and the user decided evaluation questions stay hand-authored (R8). |
| Traces as the sole test set | Organic but uncontrollable — can't guarantee source/action coverage or volume; they remain a supplement (R8). |

---

## R4: Verbatim-overlap hygiene check (FR-006, SC-004)

### Decision

Add an automated check to both eval scripts (offline, runs before retrieval):

- Normalize a query (lowercase, strip punctuation, collapse whitespace; also a
  **trivial-reorder key**: same normalized tokens sorted alphabetically).
- Scan the full retriever corpus text available in Node (the transpiled
  registry's `getSourceDocs()` output — name, title, description, aliases).
- Fail the run (non-zero, listing offenders) if any **test-split** query's
  normalized string or reorder-key appears verbatim in any corpus doc text.
  Train-split entries are ignored (aliases duplicating train queries are the
  legitimate tuning lever, per the spec's Assumptions).

### Rationale

This is the SC-004 "automated/verified check". It runs in every eval pass (no
separate CI job), so a future alias edit that re-introduces a test query fails
loudly at the next evaluation instead of silently inflating test metrics.

### Alternatives considered

N-gram/substring similarity scoring → fuzzy thresholds create false positives and
negotiable rules; the spec bans *verbatim or trivially reordered*, which is
exactly expressible as exact match on the two normalizations. Git pre-commit hook
→ too far removed from the data it protects and the project's husky setup has no
existing eval hook.

---

## R5: Mode rename surface map `lexical` → `bm25` (FR-008, FR-009, FR-010)

### Decision

Mode identifier becomes `bm25` everywhere; UI display label may read "BM25".
Grep-verified surfaces that must change (surface audit, 2026-10-16):

| Surface | Location | Change |
|---|---|---|
| Retriever type | `frontend/src/composables/useToolRetrieval.ts` | `RetrievalMode = 'bm25' \| 'vector' \| 'hybrid' \| 'decide'`; `lexicalScores` → `bm25Scores` (tokenize = R1 semantics); fallback `effective: 'bm25'`; empty-query stats line; hybrid consumes `bm25Scores` |
| Settings default | `frontend/src/composables/retrievalSettings.ts` | default mode stays `'hybrid'`; type-only change |
| Tool panel | `frontend/src/components/ToolSelectorPanel.vue` | `MODES` list, `MODE_LABEL.lexical → bm25: 'BM25'`, `MODE_MEANING` ("BM25 keyword match"), both fallback error strings ("falling back to BM25 scores"), the "Under the hood" copy |
| Chat transcript | `frontend/src/components/AiSection.vue` | `MODE_GLOSS.lexical → bm25: 'BM25 keyword match'`; banner mode chip |
| Trace recorder | `frontend/src/composables/useTraceRecorder.ts` | fallback string `'lexical'` → `'bm25'` |
| Retrieval eval | `frontend/scripts/eval-retrieval.mjs` | `--modes=bm25,...`, default mode list, header copy, mode guard, summary lines |
| Chain eval | `frontend/scripts/eval-chain.mjs` | `VALID_MODES`, fallback messages, per-case `effectiveMode` default |
| Eval lib | `frontend/scripts/eval-lib.mjs` | mode-string mentions in stubs/messages (if any) |
| Traces README | `frontend/traces/README.md` | `--modes=lexical` usage line |
| Generated artifact | `frontend/src/data/evalResults.ts` | regenerated by `npm run eval:chain` (stale `generatedAt` is expected and visible per AGENTS.md; a genuine re-run must produce it — see tasks phase) |
| Artifact renderer | `frontend/src/components/EvalComparison.vue`, `BlogPostPage.vue` | no hardcoded 'lexical' found (modes render from data) — only verify after regeneration |

Runtime traces treat as: new recordings will carry `bm25`; historical trace files
may embed `lexical` strings but are gitignored organic data — they score
historically and are not renamed (spec Edge case 4: traces are never re-tuned).

### Rationale

FR-008 demands the retired name disappear from *every* surface, including
generated output. The table is the audit base for tasks.md; a final
`grep -ri lexical frontend/ --exclude-dir=node_modules --exclude-dir=dist`
reaching zero (outside historical traces and eval-lib prose) is the exit
criterion.

### Alternatives considered

Alias-transition (accept both mode strings for one release) → FR-008 says the
retired name MUST disappear; an alias keeps it alive in code and exactly
preserves the confusion the spec wants gone.

---

## R6: Per-split reporting and gate (FR-004, FR-011, SC-001, SC-005)

### Decision

- **Metrics**: Hit@K and MRR formulas unchanged (Hit@K = any expected name in
  top-K or expected-empty; MRR = 1/best-rank of any expected name among
  selected). They are computed **per split**, per mode.
- **Gate**: only test-split misses contribute to the exit status in *both* eval
  scripts. Train-split results are printed with an explicit `tuning reference —
  not the gate` label; a train-only miss prints but does not fail.
- **eval:retrieval**: per-mode summary becomes two lines
  (`test: hit@K…` / `train (reference):…`); missing **test** fixtures are named.
- **eval:chain / artifact**: aggregates gain a split dimension; the artifact
  schema (see contracts/artifact-schema.md) records
  `config.gateSplit: 'test'`, per-mode `splits.train` / `splits.test`
  aggregates, `split` on every case, and keeps `fixtures: { total, train,
  test }`. `EvalComparison.vue` adds a train/test grouping toggle so visitors
  see the gap (US3), labeled so train reads as tuning reference.
- **Deterministic ties** (Edge case 5): candidate ordering uses a stable
  comparator — score descending, then `name` ascending — inside
  `retrieve()`/both scorers' consumers, so equal BM25 scores can never re-rank
  across runs (JS `Array.prototype.sort` is stable in modern engines, but the
  explicit name tiebreak makes the contract comment-worthy and engine-proof).
- **Traces** are test-side: trace aggregates are reported as test-side data and
  never enter the train reference (Edge case 4).

### Rationale

SC-001's verification procedure (force a test fixture to miss → non-zero exit;
train-only miss → no effect) maps directly to "gate = f(test cases only)".
Recording `gateSplit` in the artifact makes the gate discoverable to readers
who only see the blog page.

### Alternatives considered

Weighted gate (test-weighted train penalties) → unverifiable against SC-001 and
blurs whose failure failed the run. Separate gate option flag (`--gate=train`)
→ invites tuning against the gate; fixed to `test` per FR-004.

---

## R7: Fallback semantics after the rename (FR-009, SC-006)

### Decision

Behavioral contract of the retriever is unchanged, re-expressed under the new
name: vector/hybrid require the router; decide requires the classifier; when the
needed model is not `ready` (or scoring throws), scores come from the pure BM25
scorer and `stats.effective` reports `bm25`. The tool panel's fallback copy
("falling back to lexical scores") becomes "falling back to BM25 scores
(keyword)". The judge path of the chain eval treats
`retrieval?.stats.effective ?? 'bm25'` analogously. No new failure modes are
introduced: the BM25 path is synchronous, offline, and cannot throw on valid
input.

### Alternatives considered

None worth recording — FR-009 is a preservation requirement; the design merely
renames the mode through which the existing fallback flows.

---

## R8: Fixture data provenance & generation (FR-001, FR-005, Edge cases) *[revised 2026-10-16]*

### Decision

The fixture data has three sources with explicit, fixed roles:

| Source | Role | Where |
|---|---|---|
| Pre-existing ~35 fixtures | **Train only.** Tuning reference; they shaped the corpus and may keep doing so. | Already in `eval-fixtures.mjs` |
| Freshly hand-authored test questions (≥ 18 initial) | **Test only.** Written against the site content after this change's corpus freeze; sanity-run offline while authoring, then immutable (R3 rule 5). | Added to `eval-fixtures.mjs` with provenance notes |
| Recorded runtime traces (`frontend/traces/*.jsonl`) | **Test-side supplement**, organic, never retuned against, never required for coverage (can't control visitor volume/sources). | Scored historically by `eval:chain --traces=` |

**Generation process (hand-authored only — no machine assistance):** future
questions are written manually; the discipline lives in the fixture contract —
new *tuning* question → train, new *evaluation* question → test. A paraphrase
**generator script is explicitly out of scope** (user decision 2026-10-16);
paraphrasing train questions for the test side is rejected as a data-generation
strategy even manually, unless a future amendment revisits it (it correlates
with tuning by construction).

**Provenance marker:** every test fixture carries a short `note` (e.g.
`note: 'held-out: authored 2026-10-16, post-freeze'`), making the strict
hold-out auditable per fixture in review; train fixtures need no marker.

### Rationale

The user's overfitting complaint is about provenance as much as assignment:
data that touched tuning cannot honestly measure generalization. Making the
rule *where the data comes from* (not just *where it sits*) turns FR-005's
"must not be tuned against" into an auditable process, and the erosion edge
case (new source ships without test coverage) still fails loudly via the V-rule
checks whenever someone adds a train-only source.

### Alternatives considered

| Alternative | Why rejected |
|---|---|
| LLM-assisted paraphrase generation (on-device or external) | Correlates with train by construction; adds tooling to maintain; user explicitly chose hand-authoring. |
| Fully synthetic query corpora (crowdsourcing-style templates) | Massive overkill for a 9-candidate personal site; template corpora would themselves embed authoring bias. |
| No provenance record ("trust the git history") | Erosion-checkable only by archaeology; a one-line `note` per test fixture makes the contract self-enforcing. |
