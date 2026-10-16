# Implementation Plan: Unbiased Retrieval Evaluation — Train/Test Split + Pure BM25

**Branch**: `005-retrieval-search` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-retrieval-search/spec.md`

## Summary

Make the retrieval evaluation honest in two moves. (1) **Held-out split, strict
by provenance** (user decision 2026-10-16): the eval fixtures get an
author-reviewed, persisted `split: 'train' | 'test'` field in
`frontend/scripts/eval-fixtures.mjs`; **all ~35 pre-existing fixtures — which
shaped the current aliases — go to train**, and a freshly hand-authored,
provenance-marked test set of **≥ 18 questions** (53 total → ≈ 34% share,
satisfying SC-002) becomes the only held-out data. Both eval scripts validate
split integrity (size, coverage, language parity, no-selection coverage,
provenance markers), report Hit@K/MRR per split, and gate the exit status on the
**test** split only, with train results labeled "tuning reference — not the
gate". A built-in hygiene check fails any run where a test-split query appears
verbatim (or trivially reordered) in the retrieval corpus text. Future
questions stay **hand-authored only** — no machine-assisted generation; new
tuning questions → train, new evaluation questions → test. (2) **Pure BM25**:
the keyword mode is renamed `lexical` → `bm25` on every surface (retriever,
settings, tool panel, chat transcript, trace recorder, both eval scripts,
artifact) and its preprocessing is de-tuned: the hand-picked stopword list is
replaced by the verbatim Lucene `_english_` + `_german_` default stop sets with
a standard letter/digit tokenizer, while the already-textbook Okapi scoring
function (k1 = 1.2, b = 0.75) stays. Fallback semantics are preserved:
vector/hybrid/decide unavailable → scores from pure BM25,
`stats.effective = 'bm25'`. No new dependencies, no new model downloads; the
browser path and the Node eval path share the same transpiled modules as today.

> **SC-003 note (strict hold-out consequence)**: with a genuinely unseen test
> set, "zero test-split misses" is a target reached by authoring answerable
> questions and calibrating legality via train-side levers *during* the
> authoring/freezing window — never by rewording test questions after the
> freeze (research R3 rule 5). A failing gate at implementation time is a real
> finding to tune against train, not a reason to soften the split.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `vue-tsc`), ES modules; eval
scripts in Node-compatible `.mjs` (ESM).

**Primary Dependencies**: Vue 3 (`<script setup lang="ts">`), Vite
(`rolldown-vite`), `@huggingface/transformers` (models, unchanged). **No new
runtime dependencies** — BM25 stays the ~30-line in-repo implementation.

**Storage**: none. Split lives as a committed field in
`frontend/scripts/eval-fixtures.mjs`; generated metrics artifact stays
`frontend/src/data/evalResults.ts`.

**Testing**: no test suite; `npm run eval:retrieval` and `npm run eval:chain`
are the executable evaluations (both gain split-aware gates), plus
`npm run lint` → `npm run build` as the mandatory verify chain
(Constitution III).

**Target Platform**: browser (GitHub Pages, static SPA, base `/about-me/`) for
the retriever/UI; Node 20/22 for the eval scripts.

**Project Type**: single-page web app + offline eval tooling (frontend only,
`frontend/`).

**Performance Goals**: unchanged — `bm25` scoring remains synchronous and
instant (single-digit ms per query on the 9-candidate corpus); retrieval eval
offline mode completes in seconds.

**Constraints**: FR-010 — pure BM25 eval requires no model download; FR-008 —
zero "lexical" strings outside gitignored historical traces; FR-006 — corpus
free of test-query verbatim/trivially-reordered matches, enforced per run;
Constitution I — everything stays on-device, no backend/keys.

**Scale/Scope**: ~53 fixtures (35 legacy train + ≥ 18 hand-authored test),
9 content sources + 1 action, 4 retrieval modes; touches 1 composable, 3
components, 4 scripts, the fixture file, the trace README, and the generated
artifact.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Assessment | Status |
|---|---|---|---|
| I | Client-Only & On-Device | Browser retrieval stays fully on-device; no backend, keys, or downloads added (BM25 is offline JS). See note. | PASS |
| II | Static Single-Page Simplicity | No router, no state library, no SSR; mode rename + reporting changes are data-level. Chose an in-repo BM25 over a new dependency to stay lean. | PASS |
| III | Verify Before Ship | Verify chain unchanged (`lint` → `build`); this feature strengthens the project's de-facto test gate (`eval:retrieval` must pass on the test split per Development Workflow & Quality Gates). | PASS |
| IV | Pixel-Theme Fidelity | No styling changes; only text labels (chips, glosses) in existing `tool-*`/`ai-*` markup in `main.css` naming. Components keep no `<style>` blocks. | PASS |
| V | Accessibility & Motion Safety | Mode chips keep `role="group"`, `aria-pressed`, `aria-label` (labels get the new BM25 text); EvalComparison's split distinction is static text, no new interactive a11y surface. | PASS |
| VI | Retrieval-Ready Content | Registry + fixtures stay in sync by design: this feature's hygiene rules *tighten* the fixture ↔ corpus contract (V-coverage + overlap check), documented in the fixture contract. SECTION_LABEL/llms content untouched. | PASS |

Note (Principle I): all browser-side retrieval stays on-device; the eval scripts
run in Node exactly as today (offline tooling, not a backend) and introduce no
API keys. The chat model flow is untouched.

**Post-design re-check (after Phase 1)**: design adds no new components, no
state libraries, no server, no styling blocks; the only UI change is label text
and an additional grouping in `EvalComparison.vue` using existing classes. All
six principles remain PASS; no Complexity Tracking entry needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-retrieval-search/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output — decisions R1–R7 with rationale/alternatives
├── data-model.md        # Phase 1 output — fixture/split/mode/artifact entities + validation rules
├── quickstart.md        # Phase 1 output — validation scenarios incl. gate-semantics proof
├── contracts/           # Phase 1 output
│   ├── fixtures-schema.md    # eval-fixtures.mjs module contract (split field + invariants)
│   ├── eval-cli.md           # evaluate CLI contract (modes, output, gate semantics)
│   └── artifact-schema.md    # generated EvalResults contract (per-split, gateSplit)
├── checklists/          # existing (spec quality)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── composables/
│   │   ├── useToolRetrieval.ts     # 'bm25' mode, standard tokenize + cited stop sets, deterministic tie-break
│   │   ├── retrievalSettings.ts    # type-level rename only
│   │   └── useTraceRecorder.ts     # fallback string 'bm25'
│   ├── tools/
│   │   └── registry.ts             # alias hygiene follows the authored split (FR-006)
│   ├── components/
│   │   ├── ToolSelectorPanel.vue   # BM25 chip/labels/fallback copy
│   │   ├── AiSection.vue           # MODE_GLOSS + banner mode name
│   │   ├── EvalComparison.vue      # train/test grouping, train labeled tuning reference
│   │   └── BlogPostPage.vue        # reads new artifact fields only (no lexical literals today)
│   └── data/
│       └── evalResults.ts          # regenerated artifact (per-split, gateSplit, bm25 naming)
├── scripts/
│   ├── eval-fixtures.mjs           # persisted split field + fixture discipline comments
│   ├── eval-retrieval.mjs          # split-aware gate + integrity checks + bm25 mode
│   ├── eval-chain.mjs              # split-aware aggregates/artifact + bm25 naming
│   ├── eval-lib.mjs                # mode-string consistency in stubs/errors
│   └── trace-lib.mjs               # unchanged semantics; test-side reporting
└── traces/
    └── README.md                   # --modes=bm25 usage line
```

**Structure Decision**: Single existing structure — the feature lives entirely
in the established `frontend/` layout (SPA `src/` + `scripts/` eval tooling),
matching Options 1 ("single project") as adapted by this repo; no new
directories, packages, or worktrees. Artifacts from this plan live under
`specs/005-retrieval-search/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — every principle passes with the chosen design (see table above and the
post-design re-check).
