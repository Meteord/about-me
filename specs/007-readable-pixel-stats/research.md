# Phase 0 Research — Readable Pixel Page with Animated Statistics

**Feature**: `007-readable-pixel-stats` | **Date**: 2026-11-13

All unknowns from the Technical Context are resolved below. Each decision records what was chosen, why, and which alternatives were evaluated. No `NEEDS CLARIFICATION` markers remain.

---

## R1. Page composition and section model

**Decision**: The home page becomes an explicit, fixed composition component (`HomePage.vue`), not a loop over reorderable sections:

1. `AboutIntro` (`id="about"` — avatar, name, lede, employer, tags)
2. `StatsBand` (rendered only when at least one statistic exists)
3. `AiShowcase` (inline, always open)
4. `AboutSection` (`about-education`, `about-skills`, `about-hobbies`)
5. `BlogSection` (`id="blog"`)
6. `ProjectsSection` (`id="projects"`)
7. `ContactSection` (`id="contact"`)

`useSiteLayout` loses `expanded`, `isExpanded`, `toggle`, `setExpanded`, `setAllExpanded`, `moveSection`, `moveSectionTo` and the `collapseOthers` option. It keeps `visible`, `highlight`, `spotlight`, `theme`, `zoom`, `focusSection` (scroll + spotlight only) and `setVisible`. `DEFAULT_SECTIONS` becomes `{ id: 'about' | 'blog' | 'projects' | 'contact', visible: true }[]`; the showcase is not a layout section (it is a fixed band, hideable only as part of assistant section-hiding — see R9).

**Rationale**: Section order is now editorial, not user- or tool-controlled (the tool-calling feature that reordered sections was removed before this feature). A fixed composition is simpler than a reorderable array and guarantees the spec's required order (intro → stats → showcase → rest) without conditional ordering logic. Keeping `SectionId` values identical preserves anchors, retrieval mappings (`SOURCE_DEFS`), `SECTION_LABEL`, and the committed evaluation.

**Alternatives considered**:
- *Keep the array + reorder helpers*: dead code paths, and any accidental reorder would break FR-005/FR-015 ordering. Rejected.
- *Two About entries (`intro`, `about`)*: forces splitting the `about` SectionId and every registry/spotlight mapping. Rejected.
- *Collapse "About details" behind a disclosure*: violates FR-001/SC-001. Rejected.

---

## R2. Where statistics come from (no hand-entered values)

**Decision**: One pure derivation module, `src/data/siteStats.ts`, is the only place statistic values are produced. It reads shipped data and computes at build/module-evaluation time:

- `src/data/siteData.ts` — education periods, degrees, skill groups/items, projects, blog posts, location/employer, tech model tags.
- `src/data/evalResults.ts` — committed artifact (`config.modes`, `config.topK`, `fixtures`, per-mode test-split hit rate and mean latency).
- `src/tools/registry.ts` — `SOURCE_DEFS` (content-source count) and `MAX_INJECT_CHARS`.
- The build year, injected by Vite as `__BUILD_YEAR__` (`vite.config.ts` `define`, declared in `env.d.ts`).

Each candidate is a derivation function returning `number | string | null`. `null` means "source not readable" and the statistic is dropped before rendering. Labels, one-line notes, units and source links are the only authored fields.

**Rationale**: FR-007 and SC-003 require verifiable values, no guesses, and automatic refresh on rebuild. Deriving in one module makes the rule auditable and keeps `evalResults.ts`/`siteData.ts` as single sources of truth. `__BUILD_YEAR__` keeps "years since 2012" honest at build time instead of hand-editing a number each year, and it avoids a runtime date dependency (the value cannot drift between visitors of the same deployment). The guards make the band self-pruning (spec edge case: unknown statistic → absent, never `—`/`0`/estimate).

**Alternatives considered**:
- *Author the numbers in a config file*: violates FR-007/SC-003 (hand-entered). Rejected.
- *Compute the year in the browser at render time*: contradicts "computed at build time", makes the number vary by visitor clock, and is harder to verify against the artifact. Rejected.
- *Read values from `public/llms/*.md` at runtime*: asynchronous, network-dependent, and would make an empty band depend on a fetch. Rejected.
- *New build script that emits a stats artifact*: extra pipeline surface for values already available in the bundle; `define` + pure derivation is smaller. Rejected (revisit only if stats must also be published in `llms/`).

---

## R3. Which statistics appear, and how they are presented

**Decision**: Two labelled groups, seven candidates, all individually omittable. Group heading + one explanatory line; each card shows value, short label, one-line note and a source link.

**Career / person**

| id | Value | Derivation | Format | Note | Link |
|----|-------|------------|--------|------|------|
| `career-years` | `__BUILD_YEAR__ - min(parseYear(education.period))` | earliest start year in `siteData.education` | integer + "yrs" | "building software since the degree started in 2012" | `#about-education` |
| `degrees` | `siteData.education.length` | count | integer | "B.Sc. and M.Sc. in computer science" (label/note authored) | `#about-education` |
| `tools` | `sum(skill.items.length)` | skills | integer | "tools and technologies across the skill groups" | `#about-skills` |
| `base` | `siteData.location + ' · ' + siteData.employer` | strings | text (no count-up) | "where the work happens" | `#contact` |

**Engineering / this site**

| id | Value | Derivation | Format | Note | Link |
|----|-------|------------|--------|------|------|
| `model-params` | first `/(\d+)M/` match in the chat model's `tags` (`siteData.tech` with `icon: 'chip'`) | string parse | integer + "M" | "parameters running in your browser" | `blog/chat-with-my-website` |
| `sources` | `SOURCE_DEFS.filter(kind === 'content').length` | registry | integer | "content sources the retriever can choose from" | `blog/chat-with-my-website` |
| `hit-rate` | `max(test.retrievalHitRate)` across `evalResults.modes` | artifact | percent (0 decimals) | "top-k retrieval recall on held-out questions" | `blog/chat-with-my-website#eval-results` |
| `latency` | `evalResults.modes.find(m => m.mode === defaultRetrievalMode)?.splits.test.meanLatencyMs` | artifact + `retrievalSettings.mode` default | integer + "ms" via existing `formatLatency` | "average retrieval time in the default mode" | `blog/chat-with-my-website#eval-results` |

Rules:
- Cards use body font with tabular numerals (NOT the display face) — FR-002/SC-007.
- Percent values carry the `%` suffix as a static unit, not part of the animated number.
- Non-numeric values (`base`) render final text immediately; only `numeric: true` cards count up.
- Grid: 4 columns ≥ 1024 px, 2 columns ≥ 640 px, 1 column below; values never truncate (no `text-overflow`), labels wrap.
- Link labels are authored ("see education", "the evaluation"); links resolve to in-page anchors or the existing hash routes.
- `MAX_INJECT_CHARS`, `topK` and fixture counts are deliberately **not** cards: they would crowd the band and duplicate the blog post's evaluation section. They remain available there.

**Rationale**: Matches the spec's "both groups", "small and stable", "no fabricated live feed" and the reference site's data-card identity. The selection is compact (≤ 4 per group), every value is trivially verifiable against a shipped file, and the engineering set doubles as proof of the on-device claim. `formatLatency` is reused so a sub-millisecond value renders as `< 1ms` (text state), never as a fake zero.

**Alternatives considered**:
- *Include `topK`, inject-char budget, fixture totals*: seven engineering cards make the band a dashboard and duplicate the blog evaluation; rejected for calm.
- *Include hobby/runner counts*: feels like personal tracking and adds weak facts; rejected (spec: no invented habit data).
- *Use the display face for big numerals*: visually strong, but SC-007 explicitly limits display-face coverage to the name and section headings. Rejected.
- *Model download size (357 MB)*: not shipped data (it is not in the repo), so it cannot be derived; would violate FR-007. Rejected.

---

## R4. Motion system: reveal and count-up

**Decision**: One composable, `src/composables/useReveal.ts`, exported as:
- `useReveal(target, options)` — attaches a one-shot `IntersectionObserver` (`threshold ≈ 0.2`, `rootMargin: '0px 0px -10% 0px'`), sets the element visible, disconnects, and never re-runs for that element (module-level `WeakSet` guard so route remounts and scroll-back cannot replay).
- `useCountUp(value, format, options)` — returns a reactive display value that animates `0 → value` in ≤ 1200 ms with animejs `animate(..., { ease: steps(4) })`, then snaps to the exact final value.

Guarantees:
- Only iframe-free, layout-neutral properties animate (`opacity`, `translateY` on reveal; text content only for the counter, in a fixed-width/tabular box).
- Content is never hidden unless motion is allowed: the hidden state requires `document.documentElement.classList.contains('js-anim')` **and** a `prefers-reduced-motion: no-preference` match. Both are established by the composable, with a safety timeout that force-completes after 600 ms.
- `prefers-reduced-motion: reduce`, missing `IntersectionObserver`, or a failed animejs import → immediate final state; no transitions, no counter.
- Listen for `matchMedia` changes so toggling the OS preference mid-session stops/cancels motion.
- The counter writes `aria-hidden="true"` text; a `.pixel-sr-only` sibling exposes the final formatted value (stable, announced once).
- animejs stays a lazy dynamic import (existing pattern in `useBlogAnimation.ts`), so it never blocks first paint.

**Rationale**: Spec FR-008–FR-012, SC-004, SC-005, SC-015 demand exactly this: at most once, bounded duration, reduced-motion bypass, no hidden content, no reflow. IntersectionObserver is the only reliable way to satisfy "statistics already scrolled past show their final value when first seen" and back/forward navigation. Reusing animejs (already shipped) avoids a new dependency; the existing `.js-anim` convention keeps the no-JS/failure path readable.

**Alternatives considered**:
- *CSS-only animations triggered on mount*: cannot express "once, when first in view" or count-up without JS; rejected.
- *New animation library (motion/framer, GSAP)*: new dependency with no benefit over animejs; rejected.
- *Continuous/rAF counter with `ease-out`*: smooth easing violates the stepped aesthetic; rejected in favour of `steps(4)`.
- *Add a `useCountUp` per card with its own observer*: N observers; a shared observer/composable is simpler and one-shot semantics live in one place. Rejected.

---

## R5. Reading typography, measure and chrome reduction

**Decision**:
- **Measure**: prose containers use `max-width: 68ch` (and `text-wrap: pretty` stays). The page column widens to `72rem` for the 4-column stats grid, while text-bearing blocks (paragraphs, lists, notes, chat text) are capped at the measure.
- **Type roles**: display face (`--font-display`) only on `.pixel-name` and section headings (`.pixel-window__title`, blog-post title, page title). Project/model/card titles, window status bars, chat panel title and statistic numerals move to the body face with weight/size hierarchy. Everything keeps `rem` sizing so `html[data-zoom]` still works; the 12 px `--type-micro` floor stays.
- **Chrome**: remove the three `.pixel-window__chrome` squares, the `−`/`+` `.pixel-window__toggle`, and the per-bar 4 px marquee stripe (`.pixel-window__bar::after`). A section becomes: one 8 px notched frame + one hard offset shadow + a static heading row + content; nested `.pixel-card`s lose their border and rely on fill + soft shadow; one `.pixel-rule` divider maximum per section.
- **Decorative overlay**: keep the scanline overlay (CRT identity) but drop opacity from `0.18` to `0.07`, and keep it `pointer-events: none`; contrast checks are done against the composited background.
- **Hover states**: stepped, layout-neutral (border/text/background tint, `translateY(-1px)` on cards at most) with `@media (hover: hover)`; no size or margin changes.

**Rationale**: FR-002/FR-004/FR-013, SC-002/SC-007. The existing type scale already has a 12 px floor and a `68ch`-class prose intent; the defect is that display type and ornaments dominate. Removing rather than restyling is the smallest durable change and directly satisfies "one border, one accent, one divider".

**Alternatives considered**:
- *Keep toggles but default-open*: still implies an action and still needs chrome; rejected (FR-004).
- *Remove scanlines entirely*: loses identity for little readability gain once opacity is low; rejected.
- *Keep display face on stat numerals*: conflicts with SC-007; rejected.

---

## R6. Shared assistant session and the two entry points

**Decision**: Lift all chat state out of `AiSection.vue` into a module-level singleton composable `src/composables/useChatSession.ts`:
- State: `messages`, `modelMessages`, `input`, `isGenerating`, `generatingId`, suggestions, retrieval mode/top-k, `loadModel/generate/cancel/dispose`, `retrieve`, `disposeVector/disposeDecide`, `clearChat`, `startNewChat`, `saveTrace`, plus derived `sourcesUsed` (human labels for the last retrieval) and `details` state.
- Presentational reuse: `ChatSurface.vue` renders the transcript, working state, input and clear control; it takes a `variant: 'inline' | 'launcher'` prop and owns only its own scroll container ref. Both `AiShowcase.vue` (inline section) and `AssistantLauncher.vue` (fixed panel) mount the same component against the same singleton, so there is exactly one conversation and one model instance; a streaming answer appears in whichever surfaces are mounted, never duplicated in data.
- `AssistantLauncher.vue`: fixed bottom-right, `<button aria-expanded aria-controls>`; panel `role="dialog" aria-label="Chat with Mini-Michi"`, `aria-modal="true"`, focus moved to the input on open, Tab trapped inside, Escape closes, focus returns to the launcher, and the page scroll position is untouched (the panel is fixed and body scroll is not locked on wide screens; on ≤ 480 px the panel takes the usable width and a scroll lock is applied and released on close).
- Launcher is rendered only by `HomePage.vue`; routed blog/projects views have no entry point.
- Route changes: the home surfaces unmount; a single `onBeforeUnmount` in `HomePage.vue` (or an app-level host) keeps today's `disposeDecide()/disposeVector()` behaviour. `clearChat()` keeps disposing the chat model, vector and decide models.

**Rationale**: FR-016/FR-019/FR-020, SC-010, SC-011, plus the spec edge cases "launcher and inline used together", "visitor clears mid-answer", "one session". Extracting state is mandatory: two components cannot share setup-local refs. Rendering the same presentational component in both places makes divergent behaviour impossible while keeping scroll containers independent.

**Alternatives considered**:
- *Move the whole inline section into the launcher (single mount)*: breaks the always-open showcase required by FR-015. Rejected.
- *Teleport one instance between inline and launcher*: Vue `Teleport` can move DOM, but the inline section must remain visible while the launcher is open; rejected.
- *Keep state in `AiSection.vue` and pass props/events*: two long prop/event chains and fragile duplication; rejected.
- *New route for the chat*: violates single-page constraint. Rejected.

---

## R7. Progressive disclosure of technical detail

**Decision**: Default state of the showcase shows only: plain title and one-sentence explanation ("a small language model runs in your browser"), the transcript, a working/progress state, an input + send/stop, a plain-language line naming the content used (mapped through `SOURCE_DEFS.title`/`SECTION_LABEL`, e.g. "skills, education"), and a clear control. All of the following move into one `<details>` disclosure labelled "Technical details" (with a `<summary>` that carries `aria-expanded` implicitly through the native element):
- retrieval-mode chips and top-k stepper,
- per-turn ranked candidates, score bars, `IN CONTEXT`/`ACTED` tags, latency and pruned-% stats,
- exact checkpoint names and device/dtype status,
- "Save trace" export,
- sampling toggle.

The per-turn "retrieved N/M → sources" step in the transcript collapses to a single plain sentence ("Used: skills, education"); expanding it is part of the same details affordance, not a second disclosure on every turn. Model labels in prose use human names ("the on-device chat model", "the content retriever"); exact checkpoint ids only inside details.

**Rationale**: FR-017/FR-018, SC-009 (zero technical names/score bars/mode chips visible by default) while retaining every capability (spec assumption: "simpler means progressive disclosure, not capability loss", and the retrieval demo remains inspectable for the blog's claim). Native `<details>` gives keyboard and screen-reader behaviour for free.

**Alternatives considered**:
- *Delete the tool selector entirely*: loses the inspectable retrieval proof and the mode demo; rejected.
- *Keep a second collapsed panel for retrieval*: two affordances where spec asks for one; rejected.
- *Per-turn expandable retrieval rows (current behaviour)*: visible dense rows in the default transcript; rejected.

---

## R8. Model unavailable, download declined, retrieval fallback

**Decision**: Keep the existing failure semantics and present them calmly:
- `state.status === 'idle'` → one primary action ("Load Mini-Michi") plus one sentence; no spinner.
- `loading/checking` → labelled progress bar with `role="progressbar"`, cancellable (dispose) and never indefinite: the loader's existing error path ends the state.
- `error` → one plain sentence from `humanizeModelError` + retry; the transcript keeps the "content used" line from the retrieval step, so the matched content is still shown.
- Retrieval mode fallback (`effective !== mode`) → no warning banner; the details section states it in plain words.
- The chat loader keeps the existing "never fire a guaranteed-to-fail session creation" rule (WebGPU-first only where the graph runs on WebGPU); UI work must not trigger loads on mount. `AiShowcase`/launcher mount does not call `loadModel`, `loadVector` or `loadDecide`; only the explicit action or first send does.

**Rationale**: FR-019, SC-008/SC-011, and the AGENTS.md invariant that one failed transformers.js session creation poisons all later loads for the page lifetime. Calm presentation replaces today's error-heavy banner without weakening the errors.

**Alternatives considered**:
- *Auto-load the model when the showcase enters the viewport*: 357 MB on scroll without consent, and any failure surfaces before the visitor asks; rejected.
- *Hide the showcase when unsupported*: loses the content-match proof required by SC-011; rejected.

---

## R9. Assistant page effects on an always-open page

**Decision**: Keep `focusSection(id, { target })` semantics, minus collapsing: it sets `highlight`, sets `spotlight` when a target id is given, and `scrollIntoView` on the target (or the section id) next tick. Keep `setVisible(id, false/true)` for assistant-driven hide/show; `HomePage.vue` renders each band only when its section is visible, including the showcase (hiding `about` hides both intro and about details). The launcher is independent of visibility so the demo stays reachable. Manual controls are removed entirely. Theme changes still come from `decideAction` before any model call and must not restart reveal/count-up state (reveal state is per-element and module-level, so re-render preserves it).

**Rationale**: FR-021/FR-022, SC-012. Keeping the same function names/mappings preserves the assistant's existing page effects and the evaluation's action pass rate; removing `collapseOthers` is the only behavioural change and it is required by FR-001.

**Alternatives considered**:
- *New assistant actions for hide/show*: would change `SOURCE_DEFS`/`decideAction` and invalidate the committed evaluation; rejected.
- *Re-implement scroll effects in the chat component*: duplicates layout policy; rejected.

---

## R10. Verification, documentation and governance

**Decision**:
- Gates: `npm run lint` → `npm run build`; `npm run eval:retrieval` must report zero held-out test misses; run `npm run eval:chain -- --modes=bm25` after touching any module it imports (the plan touches none of the retrieval graph, but the shared `useChatSession` refactor must be checked).
- Manual matrix in `quickstart.md`: fresh load with zero clicks, measure/line length at 1440 px, 480 px layout, keyboard order and focus rings, reduced motion, stats source spot-check, empty-band simulation, launcher/session sharing, hide/show, unsupported-browser state, contrast in all three themes.
- Docs: update `DESIGN.md` (chrome, type roles, motion, stat band, launcher), `AGENTS.md` (new layout/chat/stat checklist, `<details>` disclosure rules), and amend `.specify/memory/constitution.md` (Principles II and V) with a Sync Impact Report and MINOR version bump before implementation starts.
- No change to `scripts/eval-*`, `eval-fixtures.mjs`, `SOURCE_DEFS` names/aliases, or `public/llms/*` unless copy changes; if copy does change, regenerate and re-run the retrieval gate.

**Rationale**: Constitution III, spec SC-014, and the repo convention that AGENTS.md/DESIGN.md stay consistent with the constitution. Manual verification is unavoidable without a test suite.

**Alternatives considered**:
- *Introduce Vitest for this feature*: new toolchain and a different verification model; out of scope and would need a constitution change. Rejected.
- *Snapshot tests for stats*: values are data-dependent; a Node check would duplicate the pure functions without catching UI regressions. Rejected (revisit if stats logic grows).

---

## R11. Heading semantics without toggles

**Decision**: Each band is a `<section aria-labelledby="...">` with a static heading in `.pixel-window__bar` (`<h2 id="...">`); no button, no `aria-controls`, no `aria-expanded`, no `−`/`+`. The bar is a `<div>`, so it is not focusable and carries no fake affordance. Section content is always rendered. The only `aria-expanded`/`aria-controls` pairs are the technical-details toggle and the launcher. Anchors (`#about`, `#about-skills`, `#blog`, `#projects`, `#contact`) stay on the sections/sub-blocks, so assistant spotlighting and deep links keep working.

**Rationale**: FR-001/FR-004, SC-001, and the spec's accessibility edge cases. A heading-based structure is the correct semantic for permanent content; keeping `aria-expanded` on a non-interactive header would be invalid ARIA.

**Alternatives considered**:
- *`<details>` sections defaulting to open*: technically open and collapsible by the visitor (violates FR-001) and needs summary styling; rejected.
- *`aria-disabled` button header*: still exposes a control that does nothing; rejected (FR-004).
