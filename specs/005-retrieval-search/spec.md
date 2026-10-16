# Feature Specification: Unbiased Retrieval Evaluation — Train/Test Split + Pure BM25

**Feature Branch**: `005-retrieval-search`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "i want a better test setup for the retrieval on my website. currently i think the lexical retrieval is overfitted for the sample question. i want a train/test split. also remove the lexical. instead of lexical pure bm25 should be used"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Held-out test split proves generalization (Priority: P1)

As the site maintainer, I want the retrieval evaluation fixtures split into a
**train** set and a **test** set, so that the headline evaluation result measures
how the retriever performs on questions it was never tuned against. Today the
sample questions and the retrieval corpus are entangled: many fixture queries
appear verbatim inside the searchable alias corpus, so the keyword retriever
"memorizes" the fixtures and the evaluation overstates real-world quality.

**Why this priority**: Without a held-out split, every other metric is
untrustworthy. This is the core of "a better test setup".

**Independent Test**: Run the retrieval evaluation and confirm it reports
separate train and test metrics, with the pass/fail decision derived from the
test split only. Deliverable: an evaluation report where test metrics can be
lower than train metrics, exposing the true generalization gap.

**Acceptance Scenarios**:

1. **Given** the committed fixture set, **When** the retrieval evaluation runs,
   **Then** it partitions all fixtures into exactly two disjoint groups (train,
   test), no fixture appears in both, and every fixture belongs to one of them.
2. **Given** a full evaluation run, **When** results are printed, **Then**
   Hit@K and MRR are reported per retrieval mode for the test split, and
   train-split results are labeled as tuning reference (not the gate).
3. **Given** a test-split fixture whose expected source is not retrieved within
   top-K, **When** the evaluation finishes, **Then** it exits with a failure
   (non-zero) and names the missed test fixture.
4. **Given** the split is committed to the repository, **When** the evaluation
   runs again on any machine, **Then** the split assignment is identical
   (deterministic, persisted split — never re-drawn randomly per run).

---

### User Story 2 - Pure BM25 replaces the tuned lexical mode (Priority: P2)

As the site maintainer, I want the keyword retrieval mode to be a **pure BM25**
implementation instead of the current hand-tuned "lexical" scorer, so that the
keyword baseline is a recognizable standard algorithm rather than a scorer whose
stopword list and corpus shaping were derived from the sample questions.

**Why this priority**: The overfitting lives in the tuned scorer; replacing it
with standard BM25 makes the train/test split meaningful — otherwise there is
nothing honest to evaluate.

**Independent Test**: Inspect the keyword scorer: it is a standard BM25
formulation with default parameters, and its inputs (tokenization, stopword
handling, corpus text) contain no customization traceable to the test fixtures.

**Acceptance Scenarios**:

1. **Given** the retrieval mode set, **When** the user or evaluation selects
   keyword retrieval, **Then** scores are computed with standard BM25 (default
   k1/b parameters, standard term-frequency/IDF weighting) — no fixture-tuned
   stopword list or reweighting heuristics.
2. **Given** a test-split fixture, **When** its exact wording is searched
   against the retrieval corpus text, **Then** no verbatim match exists (the
   corpus must not embed test queries as aliases or text).
3. **Given** the retriever must degrade gracefully, **When** the vector or
   decide model is unavailable, **Then** the fallback still works and reports
   itself as the pure BM25 mode.

---

### User Story 3 - Honest split-aware reporting (Priority: P3)

As the site maintainer, I want the evaluation output (console and the generated
comparison artifact shown on the blog page) to distinguish train from test, so
that visitors and I can see tuning data separated from held-out data, and I can
detect future overfitting at a glance.

**Why this priority**: Valuable for transparency, but only after the split and
the pure BM25 baseline exist.

**Independent Test**: Run the evaluation and read the generated artifact: both
splits are visible, mode naming is consistent everywhere, and nothing references
the retired "lexical" mode name.

**Acceptance Scenarios**:

1. **Given** an evaluation run, **When** results are recorded, **Then** the
   generated comparison artifact carries per-split metrics and a generation
   timestamp.
2. **Given** the mode selector and chat transcript in the site UI, **When** the
   user inspects them, **Then** the keyword mode is labeled with the new pure
   BM25 naming and no UI surface mentions "lexical".

---

### Edge Cases

- What happens when a fixture is intentionally "no selection" (small talk like
  greetings or off-topic questions)? These must keep working: they stay in the
  fixture set (in one split) and a correct run retrieves nothing for them.
- What happens when a new content source or theme action is added later? The
  fixture set must gain coverage for it — new tuning queries go to the train
  split, new evaluation queries go to the test split; the process must be
  documented so the split cannot silently erode.
- What happens when a German-language fixture lands only in the test split?
  Both splits must contain German queries so cross-language behavior is
  measured, not assumed.
- What happens to recorded runtime traces (real chat sessions) used by the
  eval? They are organic, never tuned against — they count as test-side data.
- What happens when BM25 produces ties (equal scores)? Ranking must remain
  deterministic across runs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The evaluation fixture set MUST be partitioned into a train split
  and a test split. The partition MUST be persisted in the repository
  (explicitly reviewable per fixture), deterministic across runs, and disjoint.
- **FR-002**: The test split MUST contain at least 10 evaluation questions and
  MUST cover every content source and theme action at least once, so the
  held-out result cannot hide a blind spot for an entire source.
- **FR-003**: Both splits MUST contain representative German-language and
  English-language queries.
- **FR-004**: The evaluation pass/fail gate MUST be computed on the test split
  only. Train-split metrics MUST be reported for reference and MUST NOT
  influence the exit status.
- **FR-005**: Retrieval behavior (corpus text, aliases, tokenization, stopwords,
  scoring parameters) MUST NOT be tuned against the test split. The train split
  is the only legitimate tuning reference; this rule MUST be documented where
  future contributors will see it.
- **FR-006**: The retrieval corpus text MUST NOT contain any test-split fixture
  query verbatim (or trivially reordered). Existing corpus/alias entries that
  duplicate test-split queries MUST be removed or generalized.
- **FR-007**: The keyword retrieval mode MUST be implemented as standard,
  textbook BM25 (standard scoring function with default parameters); custom
  hand-tuning derived from sample questions MUST be removed from it.
- **FR-008**: The retired mode name MUST disappear from every surface: mode
  settings, retriever code, UI labels (tool panel, chat transcript), both
  evaluation scripts, the generated comparison artifact, and runtime trace
  records. The new mode name MUST consistently identify the pure BM25 mode and
  MUST be the identifier `bm25` (UI labels may read "BM25" for display).
- **FR-009**: Fallback semantics MUST be preserved: when the vector or decide
  model is not loaded or fails, retrieval falls back to the pure BM25 mode and
  the reported effective mode reflects that fallback.
- **FR-010**: The pure BM25 mode MUST remain the instant, offline mode: running
  the evaluation for it requires no model download, and the evaluation keeps its
  existing command-line controls (mode selection, top-K) with non-zero exit on
  test-split misses.
- **FR-011**: Generated evaluation output (console summary and the committed
  comparison artifact) MUST report metrics per split per mode and MUST record
  which split produced the gated result.

### Key Entities *(include if feature involves data)*

- **Evaluation fixture**: A natural-language query plus the set of source/action
  names that count as a correct answer (any-of semantics). New attribute:
  split membership (train or test).
- **Split**: `train` (may be used to tune corpus/aliases/scoring) or `test`
  (held out; the only gate). Membership is persisted, not derived at runtime.
- **Retrieval mode**: One of pure BM25 (`bm25`), vector, hybrid, decide. The
  `bm25` mode replaces the retired keyword mode and serves as the fallback.
- **Retrieval corpus text**: The searchable text of each source/action candidate
  (name, title, description, aliases). Must stay free of test-split query text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The evaluation reports separate train/test Hit@K and MRR per mode,
  and its pass/fail outcome depends on the test split alone (verified by
  intentionally forcing a test-split fixture to miss top-K — the exit status
  must become non-zero; a train-only miss must not affect the exit status).
- **SC-002**: The test split holds ≥ 1/3 of all fixtures with ≥ 10 questions,
  every source/action covered at least once, and German queries present.
- **SC-003**: A pure BM25 evaluation run passes the test-split gate with zero
  misses at the configured top-K, using no model downloads.
- **SC-004**: An automated/verified check confirms zero verbatim overlap between
  test-split queries and the retrieval corpus text.
- **SC-005**: The full evaluate chain still completes for all four modes with
  consistent new naming, and the committed comparison artifact reflects per-split
  results.
- **SC-006**: A visitor using the site chat experiences no regression: keyword
  retrieval answers instantly, the mode chip shows the new name, and
  fallback-on-error still works.

## Clarifications

### Session 2026-10-16

- Q: How is the SC-001 gate-dependence verification performed given the contradictory parenthetical? → A: The verification is to intentionally make a test-split fixture miss top-K and confirm the run exits non-zero — a test-split miss must fail the run.
- Q: What is the new name for the pure BM25 mode replacing "lexical"? → A: `bm25`.
- Q: Should the pre-existing fixture set (which shaped the current aliases) be eligible for the test split? → A: No — all pre-existing fixtures move to the train split; the test split is composed exclusively of new questions hand-authored after this change's corpus freeze (strict hold-out), meeting FR-002/FR-003 coverage.
- Q: How are future evaluation questions generated? → A: Hand-authored only; no machine-assisted generation. New tuning questions go to the train split, new evaluation questions to the test split (documented discipline); recorded runtime traces remain an organic, test-side supplement.

## Assumptions

- The split is authored as part of the fixture set (explicit, reviewed
  assignment per fixture) rather than randomized at evaluation time. All
  pre-existing fixtures (~35) become the train split; the test split is a
  freshly authored, strictly held-out set of ≥ 18 hand-written questions
  (35 + 18 = 53 total → test share ≈ 34%, satisfying SC-002's ≥ 1/3 with ≥ 10
  test questions), so a ~1/3 share-and-coverage split is achievable while
  honouring the strict hold-out decision.
- Alias entries duplicating **train**-split queries are acceptable (that is what
  the train split exists for) and remain a legitimate tuning lever; only
  test-split overlap is forbidden.
- Standard BM25 means the classic formulation (default k1 = 1.2, b = 0.75) with
  a standard, off-the-shelf stopword/tokenization treatment — not the current
  custom stopword list.
- The other retrieval modes (vector, hybrid, decide) are untouched except for
  naming and reporting consistency; no new models or downloads are introduced.
- Runtime recorded traces are treated as test-side data and are out of scope for
  retuning.
