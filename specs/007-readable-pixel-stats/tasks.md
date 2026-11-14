---

description: 'Task list for Readable Pixel Page with Animated Statistics'
---

# Tasks: Readable Pixel Page with Animated Statistics

**Input**: Design documents from `/specs/007-readable-pixel-stats/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: No test tasks are generated — the specification does not request tests and the repository has no unit-test suite. Verification is `npm run lint` → `npm run build`, the retrieval evaluation, and the manual matrix in `quickstart.md` (Polish phase).

**Organization**: Tasks are grouped by user story so each story is independently implementable and testable. All paths are relative to the repository root; run npm commands from `frontend/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Every task names the exact file(s) it touches

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Governance prerequisite and build-time constant that every later phase depends on.

- [X] T001 Amend `.specify/memory/constitution.md` Principles II and V per `plan.md` (always-open pixel-window sections instead of collapsible ones; `aria-controls`/`aria-expanded` required on remaining disclosure controls, not section headers), add a Sync Impact Report, bump the minor version and set Last Amended to the amendment date
- [X] T002 [P] Add the build-year constant: `define: { __BUILD_YEAR__: new Date().getFullYear() }` in `frontend/vite.config.ts` and `declare const __BUILD_YEAR__: number` in `frontend/env.d.ts`
- [X] T003 [P] Record a green baseline from `frontend/`: run `npm run lint`, `npm run build` and `npm run eval:retrieval`, and note the results in the working notes so later regressions are attributable

**Checkpoint**: Governance amended and `__BUILD_YEAR__` typed — all later phases can start.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared state, motion and composition that every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Rewrite `frontend/src/composables/useSiteLayout.ts`: `SectionState` becomes `{ id: SectionId; visible: boolean }`; remove `expanded`, `isExpanded`, `toggle`, `setExpanded`, `setAllExpanded`, `moveSection`, `moveSectionTo`, `resetLayout`, `scrollPage`, `flashSection`, `clearSpotlight` and `FocusOptions.collapseOthers`; keep `state`, `isVisible`, `setVisible`, `visibleSections` (presence only, not order), `focusSection(id, { target })` (highlight + spotlight + `scrollIntoView`, no expansion change), `setTheme`/`cycleTheme`, `setZoom`; add an assistant-only `showcaseVisible` flag plus `setShowcaseVisible()` for FR-021 while keeping the `SectionId` union at `'about' | 'blog' | 'projects' | 'contact'`
- [X] T005 [P] Create `frontend/src/composables/useReveal.ts` exporting `useReveal(target, options)` and `useCountUp(value, format, options)` per `research.md` R4 / contracts C4: one-shot module-level `WeakSet` guard, `IntersectionObserver` (threshold ≈ 0.2, `rootMargin: '0px 0px -10% 0px'`), ≤ 1200 ms stepped count-up via lazy `import('animejs')` + `steps(4)`, snap to the exact final value, `aria-hidden` counter text, immediate final state when `prefers-reduced-motion: reduce`, `IntersectionObserver` is missing, or the import fails, a 600 ms safety completion, and a `matchMedia` change listener that cancels motion
- [X] T006 [P] Create `frontend/src/composables/useChatSession.ts` as a module-level singleton by lifting state and logic out of `frontend/src/components/AiSection.vue`: `state`, `messages`, `modelMessages`, `input`, `isGenerating`, `generatingId`, `detailsOpen`, `suggestions`, retrieval `mode`/`topK`/`lastQuery`/`lastResult`/`vector`/`decide`, `send`, `cancel`, `clear`, `startNewChat`, `loadModel`, `saveTrace`, `retrieve`, `disposeVector`, `disposeDecide`, plus a derived `sourcesUsed` (injected names mapped to `SOURCE_DEFS.title`/`SECTION_LABEL`); `clear()` must keep disposing the chat, vector and decide models and reset `detailsOpen` to `false`
- [X] T007 [P] Convert `frontend/src/components/AboutSection.vue` to the always-open shell from `contracts/section-layout.md` C2: `<section id="about">` is owned by the intro, so keep the details band's own wrapper, a static `.pixel-window__bar--static` `<h2>` referenced by `aria-labelledby`, no `<button>` header, no `aria-expanded`/`aria-controls`, no `−`/`+`, and preserve the sub-block ids `about-education`, `about-skills`, `about-hobbies` and their `pixel-spotlight` bindings
- [X] T008 [P] Convert `frontend/src/components/BlogSection.vue` to the same static `<section id="blog">` shell with an always-rendered content block and no collapse control
- [X] T009 [P] Convert `frontend/src/components/ProjectsSection.vue` to the same static `<section id="projects">` shell with an always-rendered content block and no collapse control
- [X] T010 [P] Convert `frontend/src/components/ContactSection.vue` to the same static `<section id="contact">` shell with an always-rendered content block and no collapse control
- [X] T011 Create `frontend/src/components/HomePage.vue` with the fixed composition order from `contracts/section-layout.md` C1 (for now: about details → blog → projects → contact), each band gated by `isVisible(id)` with no empty shell, plus an "All sections are hidden" note; rewrite `frontend/src/App.vue` into a route shell that renders `HomePage` on the home route and keeps `BlogPostPage`/`ProjectsPage` for the existing hash routes, removing the `.app-dock` aside and the `components`/`visibleSections` loop
- [X] T012 Add the foundational CSS to `frontend/src/assets/main.css`: single-column `.app-layout`/`.app-column` shell (no dock lane), a widened page column (~72rem) with prose blocks capped at `max-width: 68ch`, and the static `.pixel-window__bar--static` heading row styles, reusing only `--pixel-*`/`--font-*` variables

**Checkpoint**: Layout state, motion module, shared session and the always-open home shell exist — user stories can proceed.

---

## Phase 3: User Story 1 — Read the whole site as one calm scroll (Priority: P1) 🎯 MVP

**Goal**: Every section's content is readable on load with no expand action, at a comfortable measure and type size, stacking cleanly on narrow screens.

**Independent Test**: Load the site in a fresh session without interacting; confirm the name/photo/bio, education, skills, hobbies, all blog teasers, the project summary and the contact links are readable in one scroll with no expand action, measure body copy at 1440 px and check stacking at 480 px and keyboard order.

- [X] T013 [P] [US1] Create `frontend/src/components/AboutIntro.vue`: `<section id="about">` with the avatar (`/mj.jpg`, non-empty `alt`), a `.pixel-name` `<h1>` from `siteData.name`, the lede, the employer link, and the tag chips from `siteData.tags`, always rendered and carrying no toggle
- [X] T014 [US1] Render `AboutIntro` above the about-details band in `frontend/src/components/HomePage.vue`, both gated by `isVisible('about')` so hiding `about` removes both bands and leaving no gap
- [X] T015 [US1] Add the reading-typography CSS to `frontend/src/assets/main.css`: body copy and lists at `max-width: 68ch` with `text-wrap: pretty`, body/label sizes in `rem` and never below `--type-micro` (0.75rem), `--font-display` restricted to `.pixel-name` and `.pixel-window__title` (plus routed page/article `h1`), and a `@media (max-width: 480px)` block that stacks to one column with no horizontal scrolling
- [X] T016 [US1] Keyboard and DOM pass over the home page: ensure every link and control is reachable in visual order with a visible `:focus-visible` outline, and confirm no section header exposes a `<button>`, `aria-expanded` or `aria-controls` (fix any leftover markup in `frontend/src/components/*.vue`)

**Checkpoint**: The site is fully readable with zero clicks — shippable MVP.

---

## Phase 4: User Story 2 — See who this is at a glance through animated statistics (Priority: P1)

**Goal**: A two-group band under the introduction shows only statistics derived at build time from shipped data, counts each number up once, and disappears entirely when nothing is derivable.

**Independent Test**: Load the page, verify the band appears directly under the intro, every value counts up once, every card has label + note + source link, values match their sources, and forcing all derivations to `null` leaves no band or gap.

- [X] T017 [P] [US2] Create `frontend/src/data/siteStats.ts` with the `Statistic`/`StatisticGroup`/`StatFormat` types and a pure `buildStatGroups({ buildYear, site, eval, sources, maxInjectChars, defaultMode })` per `contracts/statistics-band.md` C1–C2 and `data-model.md` §3: `career-years` (buildYear − earliest `siteData.education[].period` year, else `null`), `degrees` (`education.length`), `tools` (Σ `skills[].items.length`), `base` (`${location} · ${employer}`, text only), `model-params` (first `/(\d+)M/` tag of the `icon: 'chip'` tech entry), `sources` (`SOURCE_DEFS.filter(kind === 'content').length`), `hit-rate` (max of `modes[].splits.test.retrievalHitRate`), `latency` (`splits.test.meanLatencyMs` for the `retrievalSettings.mode` default, formatted with `formatLatency`); drop any statistic whose value is missing, non-finite or negative, drop empty groups, never call `Date`, `window`, `fetch` or `localStorage`
- [X] T018 [P] [US2] Create `frontend/src/components/StatCard.vue` per `contracts/statistics-band.md` C3: visible short label, `.stat-card__value` with `aria-hidden` animated digits plus a `.pixel-sr-only` node reading `"{label}: {finalValue}{suffix}"`, one-line note, and a `.pixel-link` source link; tabular numerals, no `text-overflow`, no fixed `max-width` on the value, and the whole card is not a link
- [X] T019 [US2] Create `frontend/src/components/StatsBand.vue`: `<section aria-labelledby="stats-title">` rendering only when `buildStatGroups()` returns a non-empty group, nested `<section>` + `<h3>` + one-line blurb per group in the fixed order career → engineering, and no wrapper/margin/placeholder at all when empty
- [X] T020 [US2] Wire motion into `frontend/src/components/StatCard.vue`: use `useCountUp` only when `numeric` is `true`, snap to the exact formatted value on completion, render non-numeric values (e.g. `Munich · KIES`, `< 1ms`) immediately, keep `%`/`ms`/`M` suffixes static, and reserve the value width so completion causes no layout shift
- [X] T021 [US2] Insert `StatsBand` into `frontend/src/components/HomePage.vue` directly between `AboutIntro` and the about-details band, with no visibility gating of its own and no empty region when it renders nothing
- [X] T022 [P] [US2] Add `id="eval-results"` around the evaluation block in `frontend/src/components/BlogPostPage.vue` (or `EvalComparison.vue` where the block is rendered) so the `hit-rate`/`latency` source links resolve on the blog article
- [X] T023 [US2] Add the statistics-band CSS to `frontend/src/assets/main.css`: a 1-column grid below 640 px, 2 columns at 640–1023 px, up to 4 columns from 1024 px, values/labels that wrap but never truncate, body font for values and titles, `--type-body`/`--type-small` for labels and notes, and accent-colored links that follow `data-theme`

**Checkpoint**: The statistics band renders real, sourced, one-shot-animated numbers and vanishes when no value is derivable.

---

## Phase 5: User Story 3 — Try the on-device model without fighting the UI (Priority: P1)

**Goal**: An always-open, plainly labelled showcase with a calm default view, all technical detail behind one disclosure, and a home-only launcher sharing the same conversation.

**Independent Test**: Scroll to the showcase, ask a question and see a streamed answer; confirm the default view names the content used without scores, modes or checkpoint names; expand the single details affordance and use mode/top-k/trace controls; scroll away, open the launcher and confirm the same conversation and scroll position.

- [X] T024 [P] [US3] Create `frontend/src/components/ChatSurface.vue` with a `variant: 'inline' | 'launcher'` prop: transcript with streaming cursor, working state, input + send/stop, clear/new-chat control, the default-view `Used: …` line (only when a source was injected, never raw ids such as `about_skills`), a labelled `role="progressbar"` download bar, and a plain-sentence error with Retry; it owns only its own transcript scroll element and never triggers a model load or `loadVector`/`loadDecide` on mount
- [X] T025 [P] [US3] Create `frontend/src/components/ChatDetails.vue`: exactly one native `<details>`/`<summary>` labelled "Technical details", closed on load and after Clear, containing retrieval mode chips, the top-k stepper, ranked candidates/score bars/`IN CONTEXT`/`ACTED` tags, pruned-% and latency stats, exact checkpoint names + dtype/device/file, the sampling toggle, Save trace, and the plain-worded retrieval-fallback note
- [X] T026 [US3] Modify `frontend/src/components/ToolSelectorPanel.vue` to render without its own window bar or title, so it can be mounted inside `ChatDetails` while keeping its candidate rows, score bars and `IN CONTEXT` tags functional
- [X] T027 [US3] Create `frontend/src/components/AiShowcase.vue`: a static always-open section shell with a plain heading, a one-sentence explanation ("a small language model runs in your browser"), `ChatSurface variant="inline"` and `ChatDetails`; while the model is idle show the plain explanation + one "Load Mini-Michi" action and no spinner
- [X] T028 [US3] Create `frontend/src/components/AssistantLauncher.vue`: a fixed home-only trigger `<button type="button" aria-expanded aria-controls="assistant-launcher-panel">` named "Chat with Mini-Michi" opening a `role="dialog" aria-modal="true"` panel that renders `ChatSurface variant="launcher"`; move focus to the input on open, trap Tab/Shift+Tab, close on Escape returning focus to the trigger, apply/release a body scroll lock at ≤ 480 px, and never change `window.scrollY` on wide screens
- [X] T029 [US3] Mount `AiShowcase` after `StatsBand` and `AssistantLauncher` outside the flow in `frontend/src/components/HomePage.vue`, then delete `frontend/src/components/AiSection.vue` and its imports, keeping today's `disposeVector()`/`disposeDecide()` unmount cleanup
- [X] T030 [US3] Implement plain-language source naming in `frontend/src/composables/useChatSession.ts`: derive `sourcesUsed.names`/`labels` from the injected retrieval names via `SOURCE_DEFS.title` and `SECTION_LABEL`, expose them to both surfaces, keep them visible after a model-load error (SC-011), and leave exact checkpoint identifiers only inside `ChatDetails`
- [X] T031 [US3] Add the showcase/launcher/details CSS to `frontend/src/assets/main.css`: calm panel surfaces with one border treatment, transcript scroll containment without widening the page, fixed bottom-right launcher with a stepped state change, and a `@media (max-width: 480px)` panel that fills the usable width without clipping

**Checkpoint**: The demo is reachable from the scroll and from a launcher, with one conversation and zero technical clutter in the default view.

---

## Phase 6: User Story 4 — Motion that supports reading instead of distracting (Priority: P2)

**Goal**: Brief one-shot reveals, stepped hover/focus responses and a fail-safe reduced-motion path that never hides content.

**Independent Test**: Scroll through the page and confirm content reveals once as it enters view and hover/focus responses are stepped and layout-neutral; repeat with reduced motion enabled and confirm everything is at its final state on first paint; block the animejs chunk and confirm content stays visible.

- [X] T032 [P] [US4] Attach `useReveal` to every home band root in `frontend/src/components/HomePage.vue` (and, where a band root lives in the child, in `AboutIntro.vue`, `AboutSection.vue`, `BlogSection.vue`, `ProjectsSection.vue`, `ContactSection.vue`) so each band reveals once per page load with opacity/transform only and never remains transparent or offset
- [X] T033 [US4] Migrate `frontend/src/components/BlogPostPage.vue` from `useBlogAnimation` to `useReveal` and delete `frontend/src/composables/useBlogAnimation.ts`, keeping the `js-anim` class ownership in the single motion module
- [X] T034 [US4] Add the stepped, layout-neutral hover/focus CSS for stat cards, project cards, blog teasers, chips and links to `frontend/src/assets/main.css` (tint/border/`translateY(-1px)` only, gated behind `@media (hover: hover)`, no size or margin change)
- [X] T035 [US4] Reduced-motion and failure audit of `frontend/src/composables/useReveal.ts` and `frontend/src/assets/main.css`: confirm `prefers-reduced-motion: reduce` (and a mid-session preference change) disables reveal, count-up, blink and pulse, that missing `IntersectionObserver` or a failed animejs import leaves final values immediately, and that content is fully visible with JavaScript blocked after first paint

**Checkpoint**: Motion is one system, one-shot, and strictly cosmetic.

---

## Phase 7: User Story 5 — Simplified pixel identity, still unmistakably retro (Priority: P2)

**Goal**: Calm the retro chrome and type roles while keeping notched corners, warm dark palette, hard shadows and stepped easing.

**Independent Test**: Inspect a section and confirm at most one border treatment, one accent family and one divider; confirm display type appears only on the site name and section headings; switch all three accents and check contrast; confirm corners are chamfered, shadows hard and easing stepped.

- [X] T036 [US5] Remove the remaining ornamental chrome from `frontend/src/assets/main.css`: delete `.pixel-window__chrome`, `.pixel-window__toggle`, `.pixel-window__bar::after` (marquee stripe) and redundant dashed dividers, keep exactly one 8 px notched frame + one hard offset shadow + one heading row + at most one `.pixel-rule` per section, give nested `.pixel-card`s fill + soft shadow without a competing border, and lower the scanline overlay opacity from `0.18` to `0.07` while keeping `pointer-events: none`
- [X] T037 [US5] Reassign type roles in `frontend/src/assets/main.css`: move project/card/model titles, tool and status bars, the chat panel title and statistic numerals to `--font-body` with weight/size hierarchy, leaving `--font-display` only on `.pixel-name`, section headings and the routed page/article `h1`
- [X] T038 [US5] Restyle `frontend/src/components/BlogPostPage.vue`, `frontend/src/components/ProjectsPage.vue` and `frontend/src/components/EvalComparison.vue` to the calmer chrome (static heading, one border, one divider, no fake window controls) without changing their content or data
- [X] T039 [US5] Verify and adjust the three accent themes in `frontend/src/assets/main.css`: `data-theme="amber|orange|red"` must recolor the statistics band, links, focus rings and highlight/spotlight states together, keep every text/background pair at ≥ 4.5:1, and introduce no `border-radius` above 2 px or smooth easing

**Checkpoint**: The page reads as pixel-retro but calm, with ornament removed rather than restyled.

---

## Phase 8: User Story 6 — Ask Mini-Michi to show me something, and still land on it (Priority: P3)

**Goal**: Keep the assistant's scroll, spotlight, hide/restore, navigation and theme actions working on the always-open page.

**Independent Test**: Ask Mini-Michi for a topic and a section hide/show, verify the page scrolls to and spotlights the target, that hiding removes the section and its band (including the showcase while the launcher stays available), and that a later request restores it in place.

- [X] T040 [US6] Keep the deterministic theme path in `frontend/src/composables/useChatSession.ts`: run `decideAction(query, rows, currentTheme)` before any model call, apply `setTheme`/`cycleTheme` with no model call, and ensure theme changes do not restart reveal or count-up state
- [X] T041 [US6] Apply assistant page effects in `frontend/src/composables/useChatSession.ts` and `frontend/src/components/ChatSurface.vue`: `focusSection(id, { target })` for topic requests (scroll + spotlight, no collapse), `setVisible(id, false|true)` for hide/show, `setShowcaseVisible(false|true)` for the showcase, and the existing blog/projects navigation actions
- [X] T042 [US6] Gate every band in `frontend/src/components/HomePage.vue` on visibility so a hidden section unmounts without a gap and reappears in its original position, `about` hides both intro and details, and the launcher stays mounted regardless of `showcaseVisible`
- [X] T043 [US6] Move `SECTION_LABEL` and the action label mapping into `frontend/src/composables/useChatSession.ts`, and confirm `SOURCE_DEFS` names, aliases, `section` mappings and the `SectionId` union are unchanged so the committed retrieval evaluation stays valid (FR-022)

**Checkpoint**: All six user stories work together on the always-open page.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Housekeeping, documentation and the verification matrix that the repository uses instead of tests.

- [X] T044 Run `npm run format` then `npm run lint` in `frontend/` and review the auto-fixes applied to `frontend/src/**`
- [X] T045 Run `npm run build` in `frontend/` (runs `vue-tsc --build` + `vite build`) and fix any type or build errors
- [X] T046 Run `npm run eval:retrieval` (must exit 0 with zero held-out test misses) and, if any shared module it imports changed, `npm run eval:chain -- --modes=bm25` in `frontend/` — **result: identical to the T003 baseline (same 3 pre-existing held-out misses: 2× vector, 1× decide; hit@5 94%, MRR 0.736). No regression; the gate was already red before this feature and fixing it would require re-tuning retrieval, which FR-022 forbids.** `eval:chain` was not re-run because it rewrites the committed `src/data/evalResults.ts` artifact (a bm25-only run would drop the other modes the statistics band reads); the modules it imports (`registry.ts`, `useToolRetrieval.ts`, `retrievalSettings.ts`) load and run unchanged in `eval:retrieval`.
- [X] T047 [P] Update `DESIGN.md`: replace the collapsible-window/navigation rules with static headings, one-border chrome, type-role and motion rules, and document the statistics band and launcher
- [X] T048 [P] Update `AGENTS.md`: rewrite the "Adding a new pixel-window section" checklist without toggle/`aria-expanded`, and document `siteStats.ts`, the shared chat session, the details disclosure and the home-only launcher
- [X] T049 Walk `specs/007-readable-pixel-stats/quickstart.md` scenarios S1–S13 (1440 px, 375/480 px, keyboard, screen reader, reduced motion, three themes, deep links) and fix every defect found
- [X] T050 DOM and accessibility audit of the built page (inspect the rendered DOM of `frontend/src/components/*.vue` output and `frontend/src/assets/main.css`): confirm `pixel-window__chrome`, `pixel-window__toggle` and section `aria-expanded` are gone (only the details disclosure and launcher keep `aria-expanded`/`aria-controls`), statistic final values are announced once, and contrast holds in all three themes
- [X] T051 Content and scope check in `frontend/src/data/siteData.ts` and `frontend/public/llms/`: confirm all existing content is retained (introduction, education, skills, hobbies, projects, blog list and article, contact links, AI explanation), that `#about`, `#about-skills`, `#blog`, `#projects`, `#contact`, `#/blog/chat-with-my-website` and `#/projects` resolve, that no backend/keys/telemetry or live readouts were added, and — only if page copy changed — run `npm run generate:llms` and re-run `npm run eval:retrieval`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T001 (constitution amendment) is a governance prerequisite and must land before implementation is reported complete.
- **Foundational (Phase 2)**: Depends on Setup (T002 for `__BUILD_YEAR__`). BLOCKS all user stories.
- **User Stories (Phase 3–8)**: All depend on Foundational. US1 → US2 → US3 is the intended order because all three edit `frontend/src/components/HomePage.vue` and `frontend/src/assets/main.css`; US4–US6 follow in priority order.
- **Polish (Phase 9)**: Depends on all stories being complete.

### User Story Dependencies

- **US1 (P1)**: No story dependency (after Foundational). Delivers the zero-click reading floor.
- **US2 (P1)**: Adds `StatsBand` between intro and about details in the same `HomePage.vue`; independently testable once US1's intro exists.
- **US3 (P1)**: Adds `AiShowcase`/launcher to `HomePage.vue`; independently testable after US1/US2, and needs the `useChatSession` singleton from T006.
- **US4 (P2)**: Uses `useReveal` (T005) and touches all band components; no dependency on US2/US3 behaviour.
- **US5 (P2)**: CSS-only over classes introduced in Foundational/US1–US3 and the routed pages.
- **US6 (P3)**: Depends on the shared session (T006) and the layout API (T004); verifies behaviour of US1–US3.

### Within Each User Story

- Data/types before components before wiring before styling (US2: T017 → T018 → T019 → T020 → T021/T023).
- Static shell/markup before CSS refinements.
- Shared state before UI consumers.
- Story complete and verified before moving to the next priority.

### Parallel Opportunities

- Setup: T002 and T003 in parallel after T001.
- Foundational: T005, T006, T007, T008, T009, T010 are independent files and can run in parallel; T004 must precede T007–T011; T011 must precede T012's layout assertions.
- US1: T013 is independent of T015/T016.
- US2: T017, T018 and T022 are independent files.
- US3: T024 and T025 are independent files.
- US4: T032 spans band components; T033 (blog page) can run alongside.
- Polish: T047 and T048 (docs) can run in parallel with T049's manual matrix.

---

## Parallel Example: Foundational Phase

```bash
# After T004 (layout state) lands, convert the four section shells together:
Task: "Convert frontend/src/components/AboutSection.vue to a static always-open shell"
Task: "Convert frontend/src/components/BlogSection.vue to a static always-open shell"
Task: "Convert frontend/src/components/ProjectsSection.vue to a static always-open shell"
Task: "Convert frontend/src/components/ContactSection.vue to a static always-open shell"

# Motion and shared session are independent of the section shells:
Task: "Create frontend/src/composables/useReveal.ts"
Task: "Create frontend/src/composables/useChatSession.ts"
```

## Parallel Example: User Story 2

```bash
# Independent files in the statistics story:
Task: "Create frontend/src/data/siteStats.ts"
Task: "Create frontend/src/components/StatCard.vue"
Task: "Add id=\"eval-results\" to the evaluation block in frontend/src/components/BlogPostPage.vue"
```

## Parallel Example: User Story 3

```bash
# Presentational surfaces and the details disclosure are separate files:
Task: "Create frontend/src/components/ChatSurface.vue"
Task: "Create frontend/src/components/ChatDetails.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup (constitution amendment + `__BUILD_YEAR__`).
2. Complete Phase 2: Foundational (layout state, motion module, shared session, static section shells, `HomePage`/`App` shell).
3. Complete Phase 3: User Story 1 (intro + reading typography + zero-click/keyboard pass).
4. **STOP and VALIDATE**: run quickstart S1–S3 and S8; ship the readable scroll if the remaining band work must wait.
5. Deploy/demo if ready.

### Incremental Delivery

1. Setup + Foundational → always-open home shell (content still all there, no collapse).
2. US1 → zero-click readable editorial page (MVP).
3. US2 → sourced, animated statistics band (second shippable increment; empty band is a valid state).
4. US3 → calm showcase + shared launcher (demo restored to the new layout).
5. US4 → one motion system across home and blog article.
6. US5 → simplified pixel identity on home and routed pages.
7. US6 → assistant scroll/spotlight/hide/show parity on the always-open page.

### Parallel Team Strategy

With more than one implementer:

1. Team completes Setup + Foundational together (T004 first, then T005–T010 in parallel, then T011–T012).
2. After Foundational:
   - Developer A: US1 then US2 (both touch `HomePage.vue` and `main.css`).
   - Developer B: US3 (new components only) after T006.
   - Developer C: US5 CSS pass on routed pages (`BlogPostPage.vue`, `ProjectsPage.vue`, `EvalComparison.vue`) and documentation.
3. Serialize any two tasks that edit `frontend/src/components/HomePage.vue` or `frontend/src/assets/main.css`, and rebase before merging.

---

## Notes

- [P] tasks touch different files and have no ordering dependency; same-file tasks are deliberately unmarked.
- No test tasks: the spec requests none, and `src/**/__tests__/*` is excluded from tsconfig.
- Verification is `npm run lint` → `npm run build`, `npm run eval:retrieval`, and the `quickstart.md` matrix.
- Every displayed statistic must come from `frontend/src/data/siteStats.ts`; `value: null` means dropped, never rendered as `0`, `—` or `n/a`.
- Keep `SOURCE_DEFS` names/aliases and the `SectionId` union unchanged so the committed evaluation stays valid without re-tuning.
- Commit after each task or logical group; never commit `frontend/dist/`.

---

## Working Notes

### Baseline (T003, before implementation)

- `npm run lint` → 0 warnings, 0 errors.
- `npm run build` → green (`vue-tsc --build` + `vite build`).
- `npm run eval:retrieval` → **already red before any change**: `test: hit@5 = 94% · MRR = 0.736`, 3 held-out misses (`[vector] Womit verbringt Michael seine Freizeit?`, `[vector] Which social network shows Michael's professional profile — LinkedIn?`, `[decide] Open-source chatbot for Munich citizens — what's it called?`). Recorded so later regressions are attributable.

### Final verification (T044–T051)

- `npm run format` → `npm run lint` → 0 warnings / 0 errors; `npm run build` → green.
- `npm run eval:retrieval` → same 94% / 0.736 and the same 3 misses as the baseline (no regression; the gate is unchanged, not newly broken).
- `npm run generate:llms` → no diff (`public/llms/*` unchanged); the only copy edit was the blog teaser's "in the dock" → "on this page".
- DOM/a11y audit of the built page (headless Chromium via CDP, 1440 / 768 / 480 / 375 px):
  - `pixel-window__chrome`, `pixel-window__toggle`, marquee stripe: gone from markup and CSS; 0 `<button>`s in any `.pixel-window__bar`.
  - Only the launcher trigger carries `aria-expanded` + `aria-controls`; the details disclosure uses native `<details>`/`<summary>`.
  - Anchors resolve: `#about`, `#about-education`, `#about-skills`, `#about-hobbies`, `#blog`, `#projects`, `#contact`, `#assistant`, `#stats-title`, `#eval-results` (blog article), plus `#/blog/<slug>` and `#/projects`.
  - Real Tab walk: order follows the visual column; closed-details controls are skipped; the launcher is last; every control keeps a `:focus-visible` outline.
  - Statistics: 8 cards, each announcing exactly one final value through `.pixel-sr-only` (`Building software: 14yrs`, `Degrees: 2`, `Tools & technologies: 22`, `Based in: Munich · KIES`, `Model parameters: 350M`, `Content sources: 9`, `Retrieval hit rate: 100%`, `Retrieval time: 166ms`); animated digits are `aria-hidden`, no `aria-live` on counters.
  - Contrast ≥ 4.5:1 for name/headings/body/labels/links/stat values/chat text in amber, orange and red (lowest measured 8.32:1).
  - No horizontal scrolling at 1440/768/480/375; launcher panel fits and is focus-trapped; ≤ 480 px applies and releases a body scroll lock without moving `window.scrollY`.
  - Reduced motion (`prefers-reduced-motion: reduce` emulated): every band and card at its final state on first paint, final statistic values, transitions/blink at ~0 s.
  - Reveal/count-up: one-shot per element and per stable key — scrolling back, switching theme, and returning from the blog route never replay or leave content hidden; a card jumped over keeps its exact final value instead of a fabricated `0`.
  - Shared session: a theme request from the inline surface applies `data-theme` with no model call and the launcher shows the same two messages; Clear resets both surfaces and closes the details disclosure; with Hugging Face requests blocked, the `Used: …` line still names the matched content and one plain error + Retry is shown (SC-011).
