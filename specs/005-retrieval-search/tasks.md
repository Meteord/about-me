---
description: "Task list for feature implementation — Unbiased Retrieval Evaluation (Train/Test Split + Pure BM25)"
---

# Tasks: Unbiased Retrieval Evaluation — Train/Test Split + Pure BM25

**Input**: Design documents from `/specs/005-retrieval-search/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ (fixtures-schema.md, eval-cli.md, artifact-schema.md), quickstart.md

**Tests**: No test suite exists (constitution Principle III) — the executable evaluations are `npm run eval:retrieval` and `npm run eval:chain` (both gain split-aware gates in this feature) plus the mandatory `npm run lint` → `npm run build` chain. No test tasks are generated; validation tasks run the eval scripts and quickstart scenarios directly.

**Organization**: Tasks are grouped by user story. US1 (split machinery) and US2 (pure BM25) touch mostly disjoint files and can interleave, with one hard ordering constraint: the held-out test set is **authored only after the corpus freeze** (US2's de-tuned stopwords + finalized train aliases — research R3). US3 (reporting) consumes both.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Frontend web app: all code lives under `frontend/` (Vue 3 SPA, `@/` → `frontend/src/`)
- Eval tooling: `frontend/scripts/*.mjs`; fixtures in `frontend/scripts/eval-fixtures.mjs`
- Commands run from `frontend/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm a clean, recorded baseline before any change

- [X] T001 Record the pre-change baseline (no code changes): run `npm run eval:retrieval -- --modes=lexical` from `frontend/` (offline, instant) and note the per-mode Hit@5/MRR numbers as the tuning-era reference the generalization gap will be measured against; then run `npm run lint` and `npm run build` from `frontend/` — both must pass (constitution III)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared validation infrastructure that US1 wires into both eval scripts and US3's artifact run depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add the shared split-integrity + corpus-hygiene validation helpers to `frontend/scripts/eval-lib.mjs` as exported functions (parameterized by the fixture list and the corpus docs from `getSourceDocs()`), implementing data-model §1 rules V1–V7 — V1 valid `split` on every fixture, V2 test split ≥ ⌈N/3⌉ of ALL fixtures and ≥ 10, V3 every `SOURCE_DEFS` name (9 content sources + `set_theme`) in some test fixture's `expected`, V4 ≥ 2 German queries per split from ≥ 2 different sources, V5 `expected: []` "no selection" fixtures in both splits, V6 every test-expected source also covered by ≥ 1 train fixture, V7 `note` provenance marker on every test fixture — plus the FR-006/SC-004 hygiene check: normalize each test query (lowercase, punctuation stripped, whitespace collapsed) and its trivial-reorder key (same normalized tokens sorted) and fail if either appears as a substring of any corpus doc text (train-split queries ignored); every violation is a hard error naming the offending fixture/alias, runs offline before any retrieval; not yet wired into the scripts (US1 does that)

**Checkpoint**: Foundation ready — validation rules exist in one place; user story implementation can begin

---

## Phase 3: User Story 1 - Held-out test split proves generalization (Priority: P1) 🎯 MVP

**Goal**: The fixture set is partitioned into a persisted, reviewable, deterministic train/test split (all ~35 pre-existing fixtures → train; ≥ 18 freshly hand-authored, provenance-marked test questions), both eval scripts validate split integrity and the FR-006 hygiene rule before every run, and the pass/fail gate is computed on the test split only (spec US1; research R2, R3, R4, R8; contracts/fixtures-schema.md, eval-cli.md).

**Independent Test**: Run `npm run eval:retrieval` and confirm it reports separate train and test Hit@K/MRR per mode, exits non-zero when (and only when) a **test** fixture misses top-K, and the split assignment is identical on every run because it is authored in the fixture file, never derived.

### Implementation for User Story 1

- [X] T003 [US1] Annotate all 35 pre-existing fixtures in `frontend/scripts/eval-fixtures.mjs` with `split: 'train'` — add the field to every fixture object WITHOUT changing any `query`/`expected`/fact values (metrics stay comparable) — and rewrite the file's header comment with the fixture discipline per contracts/fixtures-schema.md: split is persisted and author-reviewed per fixture; new tuning questions → `train`, new evaluation questions → `test` (hand-authored only, no machine-assisted generation); every test fixture carries a `note` provenance marker; test queries are immutable after the freeze — never reworded to chase metrics (FR-001, FR-005; research R2, R8)
- [X] T004 [P] [US1] Wire the T002 helpers into `frontend/scripts/eval-retrieval.mjs` as a fail-fast pre-run gate (non-zero exit naming offenders, before any retrieval), then make the run split-aware: partition `FIXTURES` by `split`, tag every per-fixture result line with its split, compute Hit@K/MRR/latency per (mode × split), and print per-split summaries exactly as contracts/eval-cli.md specifies — `test:  hit@K = …% · MRR = …` (the gate) and `train (tuning reference — not the gate): hit@K = …% · MRR = …`; drive the exit status from test-split misses ONLY (a train miss prints `MISS` but never fails the run); keep the existing `--modes`/`--topk` controls (FR-001, FR-004, FR-010, SC-001)
- [X] T005 [P] [US1] Wire the same T002 helpers into `frontend/scripts/eval-chain.mjs` as the identical fail-fast pre-run gate, copy `split` from each fixture onto its chain case, compute aggregates per (mode × split) alongside the existing combined metrics, and gate the exit status on test-split chain failures only (traces stay test-side data with today's behavior); keep all existing CLI flags (`--modes`, `--topk`, `--dtype`, `--sampling`, `--judge`, `--traces`) (FR-004, FR-010; data-model §5–§7; contracts/eval-cli.md)
- [X] T006 [US1] Author the initial held-out test split: append ≥ 18 new hand-written fixtures to `FIXTURES` in `frontend/scripts/eval-fixtures.mjs`, each with `split: 'test'` and a `note` provenance marker (e.g. `'held-out: authored 2026-10-16, post-freeze'`), satisfying: every source/action name (`about_bio`, `about_education`, `about_skills`, `about_hobbies`, `projects`, `contact`, `blog`, `blog:chat-with-my-website`, `site_index`, `set_theme`) appears in at least one test fixture's `expected` (V3); ≥ 2 German queries from ≥ 2 different sources (V4); ≥ 1 small-talk fixture with `expected: []` (V5); test count ≥ ⌈N/3⌉ of all fixtures and ≥ 10 — 35 train + 18 test = 53 total ≈ 34% (V2, SC-002); chain-eval fields (`expectedAnswerFacts`, `bannedFacts`, `expectAction`, `expectedArgs`) drawn from real site content (`frontend/src/data/siteData.ts`, `public/llms/*.md`). ⚠️ STRICT ORDER (research R3): author only AFTER T008 + T009 land (corpus freeze = de-tuned stopwords + finalized train aliases); while authoring, sanity-run `npm run eval:retrieval -- --modes=bm25 --topk=5` and replace any unanswerable candidate question (an invalid fixture, not a finding); after the freeze the queries are immutable and no corpus/alias edit may be driven by test results (FR-005, SC-003 note)
- [X] T007 [US1] Validate US1 per quickstart §1–2 and fix what the checks surface: `npm run eval:retrieval -- --modes=bm25` passes with integrity checks silent and per-split summaries printed; gate-semantics proof — `--topk=1` forces a test-split miss → exit status 1 naming the missed **test** fixture (then restore); temporarily point one train fixture's `expected` at a never-retrieved name → `MISS` printed, exit status still 0, summary labeled `tuning reference — not the gate` (then revert); remove or generalize any alias entry in `frontend/src/tools/registry.ts` that the FR-006 hygiene check names (test query verbatim or trivially reordered in corpus text) until the check passes silently (FR-006, SC-001, SC-004)

**Checkpoint**: At this point, User Story 1 should be fully functional — the eval gates on the held-out split and the split cannot silently erode

---

## Phase 4: User Story 2 - Pure BM25 replaces the tuned lexical mode (Priority: P2)

**Goal**: The keyword mode is a recognizable standard BM25 — classic Okapi scoring (already textbook, unchanged) with de-tuned preprocessing: verbatim cited Lucene `_english_` + `_german_` stop sets and a standard letter/digit tokenizer replacing the hand-picked fixture-derived stopword list; the mode identifier becomes `bm25` on every surface and the fallback self-reports `bm25` (spec US2; research R1, R5, R7).

**Independent Test**: Inspect the keyword scorer in `frontend/src/composables/useToolRetrieval.ts` — it reads as "BM25 + two cited published stop lists, nothing else"; `grep -ri lexical` over `frontend/src`, `frontend/scripts`, `frontend/traces/README.md` finds no mode-name hits; `npm run eval:retrieval -- --modes=bm25` runs offline with no model download.

### Implementation for User Story 2

- [X] T008 [US2] De-tune the keyword scorer's preprocessing in `frontend/src/composables/useToolRetrieval.ts`: replace the hand-picked 24-term `STOPWORDS` set (every entry appears in the train fixtures — that is the overfitting) with two verbatim, cited published constants — the Lucene default English stop set (`a, an, and, are, as, at, be, but, by, for, if, in, into, is, it, no, not, of, on, or, such, that, the, their, then, there, these, they, this, to, was, will, with`) union Lucene's predefined German stop set (`_german_` as shipped by Elasticsearch/Lucene analyzers, copied from research R1 without modification) — each with a code comment citing its source and stating that no term was added or removed because of any fixture; change `tokenize` to lowercase + split on every character that is NOT a Unicode letter or digit (keeps `mucgpt`, `blog`, digits; drops punctuation) and drop the `token.length > 1` filter; keep the Okapi BM25 scoring function exactly as is (k1 = 1.2, b = 0.75, IDF = `ln(1 + (N − df + 0.5)/(df + 0.5))`) — no reweighting, no alias boosting, no query-term special cases inside the scorer (FR-007; research R1)
- [X] T009 [US2] Rename the mode identifier `lexical` → `bm25` in `frontend/src/composables/useToolRetrieval.ts` — the `RetrievalMode` union becomes `'bm25' | 'vector' | 'hybrid' | 'decide'`, `lexicalScores` → `bm25Scores`, `hybridScores` consumes the bm25 ranks, the fallback paths (model not ready, scoring throws) and the empty-query stats report `effective: 'bm25'` — and update the type-only import in `frontend/src/composables/retrievalSettings.ts` (default mode stays `'hybrid'`; behavior unchanged); add the deterministic tie-break to candidate ordering in `retrieve()`: sort by score descending, tie-broken by candidate `name` ascending (then original index), so equal BM25 scores can never re-rank across runs (FR-008, FR-009; data-model §4; Edge case 5)
- [X] T010 [P] [US2] Rename the mode on the UI surfaces — `frontend/src/components/ToolSelectorPanel.vue`: `MODES` list, `MODE_LABEL` `bm25: 'BM25'`, `MODE_MEANING` 'BM25 keyword match', both retriever-failure strings → "… falling back to BM25 scores", and the "Under the hood" copy; `frontend/src/components/AiSection.vue`: `MODE_GLOSS` `bm25: 'BM25 keyword match'` and the banner mode chip — label text only, zero styling changes, chips keep `role="group"` / `aria-pressed` / `:aria-label` with the new labels (FR-008, SC-006; constitution IV, V)
- [X] T011 [P] [US2] Rename the mode in the tooling: `frontend/scripts/eval-retrieval.mjs` (default `--modes=bm25,vector,hybrid,decide`, mode guard, header/usage copy — "bm25 runs without any model download"); `frontend/scripts/eval-chain.mjs` (`VALID_MODES`, fallback messages, `effectiveMode: retrieval?.stats.effective ?? 'bm25'`, usage comment); sweep mode-string mentions in `frontend/scripts/eval-lib.mjs` and `frontend/scripts/trace-lib.mjs` (a grep shows none beyond the unrelated prose word "lexically" in a docstring, which stays); `frontend/traces/README.md` (`--modes=lexical` usage line → `bm25`); passing `--modes=lexical` must print the valid mode set and exit non-zero — no silent aliasing (FR-008, FR-010; contracts/eval-cli.md)
- [X] T012 [US2] Validate US2 (quickstart §3 partial + §5): `npm run eval:retrieval -- --modes=bm25` completes fully offline (no model download) reporting train-split metrics — test metrics may shift here; test the invalid mode: `npm run eval:retrieval -- --modes=lexical` → non-zero exit with the valid set printed; browser spot-check via `npm run dev` from `frontend/`: the four mode chips read **BM25 · VECTOR · HYBRID · DECIDE**, BM25 answers instantly with the stats line reporting `bm25`, selecting VECTOR without the router falls back with scores from BM25 and reports `bm25 (fallback)`, and the transcript step shows the new label. The naming grep still hits the stale committed artifact `frontend/src/data/evalResults.ts` at this point — expected; it is regenerated in T016 (FR-008, FR-009, FR-010, SC-006)

**Checkpoint**: At this point, the keyword mode is pure BM25 everywhere and the fallback is honest — User Stories 1 and 2 together form the trustworthy evaluation

---

## Phase 5: User Story 3 - Honest split-aware reporting (Priority: P3)

**Goal**: Evaluation output distinguishes train from test everywhere visitors and the maintainer look: the generated artifact carries per-split metrics + the recorded gate split, the blog page's comparison section shows the train/test grouping with train labeled as tuning reference, and no surface mentions the retired mode name (spec US3; research R5, R6; contracts/artifact-schema.md).

**Independent Test**: Run the evaluation and read the generated artifact: both splits are visible per mode with `gateSplit: 'test'` recorded, `EvalComparison.vue` renders the distinction so the generalization gap is readable at a glance, and the full-chain naming audit is clean.

### Implementation for User Story 3

- [X] T013 [US3] Extend the artifact contract in `frontend/scripts/eval-chain.mjs` (the `INTERFACE_TEXT` template + artifact assembly passed to `writeArtifact`): `config.gateSplit: 'test'`; `fixtures` becomes `{ total: number; train: number; test: number }`; each entry in `modes` gains `n` (cases across both splits) and `splits: { test: ModeAggregate; train: ModeAggregate }` reusing the existing aggregate fields; every `CaseResult` gains `split: 'train' | 'test'`; `mode`/`effectiveMode` values never read `lexical`; keep the file composition (interfaces + `export const evalResults`) and the prettier serialization pass in `writeArtifact` as implemented (FR-011, FR-008; contracts/artifact-schema.md)
- [X] T014 [P] [US3] Render the split dimension in `frontend/src/components/EvalComparison.vue`: per mode, show the test-split aggregate as the headline (the gate) and the train-split aggregate labeled "tuning reference — not the gate", so the generalization gap (train vs test) is visible at a glance; the per-case list shows each case's split tag; render strictly from artifact data (no hardcoded mode list — whatever `results.modes` holds); reuse existing `eval-*` / `pixel-*` classes and keep `BlogPostPage.vue` passing `evalResults` through unchanged apart from any new-field reads (FR-011, SC-005; constitution IV)
- [X] T015 [P] [US3] Add any needed styles for the split grouping to `frontend/src/assets/main.css` under the existing `eval-*` naming — split-group sub-labels and the "tuning reference" tag styling using `:root` variables only (no hardcoded colors/fonts), hard offset shadows, ≤ 2px radii, `steps(2, end)` easing; include the `@media (max-width: 480px)` treatment and confirm `prefers-reduced-motion` rules still cover the bars; components stay free of `<style>` blocks (constitution IV, V)
- [X] T016 [US3] Regenerate the committed artifact (a data step, not code): run full `npm run eval:chain` from `frontend/` (default all four modes, q8, greedy; first run downloads router ~357 MB + decide ~345 MB + chat model to `~/.cache/huggingface`; fast-iterate with `npm run eval:chain -- --modes=bm25 --dtype=q4`) so `frontend/src/data/evalResults.ts` is rewritten with `gateSplit: 'test'`, per-mode `splits.test`/`splits.train`, `split` on every case, `fixtures: { total, train, test }`, and only `bm25` as the keyword mode name; exit 0 with all test-split cases passing (SC-003, SC-005). Requires T006 (final fixtures) + T013

**Checkpoint**: All user stories complete — the artifact and the page report the honest, split-aware story

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: FR-008 completeness and the mandatory verify gates

- [X] T017 Run the FR-008 naming audit and sync the docs (quickstart §3): `grep -rni "lexical" frontend/src frontend/scripts frontend/traces/README.md --exclude-dir=node_modules --exclude-dir=dist` → zero hits (gitignored historical `.jsonl` traces excepted — they are organic data, never renamed); `npm run eval:retrieval -- --modes=lexical` exits non-zero; update `AGENTS.md` eval command examples (`--modes=lexical` → `--modes=bm25`) and any other repo docs (e.g. `DESIGN.md`, `PRODUCT.md`, feature READMEs) still naming the retired mode, keeping `AGENTS.md` consistent with the constitution (FR-008)
- [X] T018 Final verify (constitution III + full quickstart): `npm run lint` then `npm run build` from `frontend/` both pass; re-run `npm run eval:retrieval -- --modes=bm25` → integrity checks silent, test split zero misses at top-K, exit 0 (SC-003); confirm `dist/` and `traces/*.jsonl` stay untracked; commit (a stale `generatedAt` in `frontend/src/data/evalResults.ts` is normal and visible until the next full `eval:chain`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 machinery (T003–T005) is independent of US2 and can proceed immediately
  - US1 test authoring (T006) has ONE hard cross-story dependency: it waits for T008 + T009 (corpus freeze), per research R3 — hold-out questions are authored against the de-tuned corpus, never the tuned one
  - US3 depends on US1 + US2 (it reports what both produce)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2). Internal order: T003 (annotate) → T004 ∥ T005 (wire scripts) → T006 (author, after the T008/T009 freeze) → T007 (validate + alias fixes)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2), independently of US1 machinery. Internal order: T008 (de-tune) → T009 (rename + tie-break, same file) → T010 ∥ T011 (UI ∥ tooling, both after T009) → T012 (validate)
- **User Story 3 (P3)**: Depends on US1 + US2. T013 (artifact schema) → T014 ∥ T015 (component ∥ CSS); T016 (regenerate) additionally requires T006

### Recommended Execution Sequence (respects the strict hold-out)

1. T001 (baseline) → T002 (helpers)
2. T003 → T004 ∥ T005 (US1 machinery, still on the old mode name)
3. T008 → T009 → T010 ∥ T011 → T012 (US2: freeze + rename)
4. T006 (author test set post-freeze) → T007 (US1 validation)
5. T013 → T014 ∥ T015 → T016 (US3: reporting + artifact)
6. T017 → T018 (polish + gates)

### Parallel Opportunities

- T004 ∥ T005: the two eval scripts are different files, wired from the same T002 helpers
- T010 ∥ T011: UI components vs scripts/tooling — different files, both only need T009's type rename
- T014 ∥ T015: component logic vs stylesheet — different files
- T001 and T002 can overlap (read-only baseline + new helper code)
- US1 machinery (T003–T005) and US2 (T008–T009) could be split across two implementers until the T006 freeze point joins them

---

## Parallel Example: User Story 2

```bash
# After T009 lands the type rename, launch the two different-file renames together:
Task: "T010 [P] [US2] Rename the mode on the UI surfaces (ToolSelectorPanel.vue, AiSection.vue)"
Task: "T011 [P] [US2] Rename the mode in the tooling (eval-*.mjs, trace-lib.mjs, traces/README.md)"
```

## Parallel Example: User Story 3

```bash
# T013 defines the schema first; then the two render-side tasks together:
Task: "T014 [P] [US3] Split grouping in frontend/src/components/EvalComparison.vue"
Task: "T015 [P] [US3] Split styles in frontend/src/assets/main.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 — with its one US2 prerequisite)

1. Complete Phase 1: Setup (record the baseline)
2. Complete Phase 2: Foundational (shared integrity helpers)
3. Complete Phase 3: US1 machinery (T003–T005), then T008–T009 (the corpus freeze US2 owes US1), then T006–T007 (author + validate)
4. **STOP and VALIDATE**: T007 proves the gate semantics — a test miss fails the run, a train miss does not
5. At this point the evaluation is already honest offline (SC-001–SC-004); deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → validation infrastructure ready
2. US1 machinery → split-aware scripts (pre-freeze state, train-only validation)
3. US2 → pure BM25 + the freeze → validate naming + offline run (T012)
4. US1 completion → the authored held-out set + passing test gate (T006–T007)
5. US3 → split-aware artifact + page rendering + regenerated data (T013–T016)
6. Polish → naming audit + docs sync + full verify chain (T017–T018)

### Why the freeze ordering is non-negotiable

- FR-005 forbids tuning retrieval behavior against the test split; the ONLY legal
  calibration window is while authoring (research R3 rule 5, SC-003 note). Authoring
  the test set before the de-tune would freeze questions against a scorer that no
  longer exists, leaving unfixable test failures — the split would be honest but the
  gate unpassable. Hence T006 depends on T008 + T009, and no task may edit
  `frontend/src/tools/registry.ts` aliases in response to test-split results after T006.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to the specific user story for traceability
- The mode identifier is `bm25` (UI display labels may read "BM25"); `lexical` is never a valid value after T009–T011
- No new runtime dependencies, no new model downloads; the browser path and the Node eval path keep sharing the same transpiled modules
- Historical gitignored trace files may embed the retired name — they are organic test-side data and are never renamed (spec Edge case 4)
- Commit after each task or logical group; stop at any checkpoint to validate the story independently
