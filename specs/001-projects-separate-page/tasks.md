# Tasks: Projects on a Separate Page

**Input**: Design documents from `/specs/001-projects-separate-page/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/routes.md, quickstart.md read

**Tests**: No test suite exists in this project (constitution Principle III). Verification is `npm run lint` → `npm run build` plus quickstart.md manual scenarios — encoded in tasks, no test tasks generated.

**Organization**: Tasks grouped by user story (US1 = dedicated page, US2 = home teaser, US3 = retrieval/content sync).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Web app (frontend-only): all source under `frontend/src/`, content pipeline under `frontend/scripts/` and `frontend/public/`

---

## Phase 1: Setup

**Purpose**: Align working branch before any code change

- [x] T001 Create/switch to the feature branch `001-projects-separate-page` from `main` in the repo root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the hash-route machinery — every story depends on it

- [x] T002 Extend `SiteRoute` in `frontend/src/composables/useHashRoute.ts`: add `ProjectsRoute` interface (`{ name: 'projects'; slug: string | null }`) to the `HomeRoute | BlogRoute` union, parse `#/projects` (with a deeper segment tolerated as `slug`, e.g. `#/projects/x` → projects page with slug — per data-model.md routes table) in `parseRoute()`, keep blog/home parsing byte-compatible, and add `projectsHref()` helper returning `'#' + '/projects'` next to `blogHref()` (UR-3: components never hardcode the string)
- [x] T003 Run `npm run lint` and `npm run build` from `frontend/` to confirm type-check passes on the extended union before any view consumes it (unused-at-this-point warning acceptable to check nothing broke)

**Checkpoint**: Route plumbing compiles; user stories can begin.

---

## Phase 3: User Story 1 — Dedicated Projects Page (Priority: P1) 🎯 MVP

**Goal**: `#/projects` renders a dedicated projects page with the full project listing; back navigation returns home.

**Independent Test**: Open `#/projects` directly in a browser → page renders all `siteData.projects` entries; browser back → home. No other story touched.

### Implementation for User Story 1

- [x] T004 [US1] Create `ProjectsPage.vue` in `frontend/src/components/` — dedicated page component following the `BlogPostPage.vue` pixel-window skeleton: `pixel-window` frame with bar (`pixel-window__title` "Projects", `pixel-window__chrome`, no toggle/`+−` control — page is not collapsible), `aria-controls`+`:aria-expanded` not required here (no toggle), render a card per `siteData.projects` entry reusing `pixel-card`/`project-card__title`/`project-card__desc`/`pixel-link-btn project-card__link` markup (name, description, `link` with `target="_blank" rel="noopener"`, `techStack` groups as pixel-chips); accept no props; tolerate unknown deep link `#/projects/<anything>` by rendering the list (R-4)
- [x] T005 [US1] Add page-level CSS classes to `frontend/src/assets/main.css` (existing `pixel-*`/`project-*` naming, `:root` variables only, no `border-radius` > 2px, `steps(2, end)` easing for the fade transition reused from `BlogPostPage`'s pattern)
- [x] T006 [US1] Wire the route in `frontend/src/App.vue`: import `ProjectsPage`, add a render branch keyed on `route.value.name === 'projects'` in the same `transition-group` pattern as the `blogPost` branch (`app-column app-column--wide`, keyed `<ProjectsPage :key="...">`), leaving both the blog branch and the home `shown` branch behavior unchanged
- [x] T007 [US1] Verify FR-010 fallback still holds: unrecognized hashes (e.g. `#/banana`) route to home — confirm `parseRoute()` default branch is untouched in `frontend/src/composables/useHashRoute.ts`
- [x] T008 [US1] Verify from `frontend/`: `npm run lint` && `npm run build` pass; manual check per quickstart.md SC-001/FR-001/FR-004/FR-005 (`#/projects` fresh load, in-app link optional at this point, back/forward)

**Checkpoint**: MVP — dedicated page works standalone; home still shows the old full section (acceptable intermediate state).

---

## Phase 4: User Story 2 — Home Projects Teaser (Priority: P2)

**Goal**: Home "Projects" pixel-window becomes a compact teaser with highlights + hard link to `#/projects`; section state/AI spotlight preserved.

**Independent Test**: Home shows teaser card, link navigates to `#/projects`, collapse/expand + `aria-expanded` still work.

### Implementation for User Story 2

- [x] T009 [US2] Convert content of `frontend/src/components/ProjectsSection.vue` to the teaser: keep the section element, id `projects`, `pixel-window__bar` toggle (`aria-controls="projects-content"` + `:aria-expanded`) exactly as is (front-load none of the layout-ai state contract); replace `project-grid` full card layout with teaser content — featured highlight from `siteData.projects[0]` (name + one-line description) and a `pixel-link-btn` "All projects →" with `:href="projectsHref()"` (mirroring `BlogSection.vue`'s link list pattern)
- [x] T010 [US2] Add teaser CSS to `frontend/src/assets/main.css` using existing classes (`blog-list__*` naming precedent may be mirrored as `project-teaser__*`), global styles only, no `<style>` block in the component
- [x] T011 [US2] Verify from `frontend/`: `npm run lint` && `npm run build`; manual quickstart.md FR-002/FR-003 check (teaser visible, link navigates to `#/projects`, toggle works, `:focus-visible` outline, ≤480px layout) and confirm `retrieve(topic="projects")` still spotlights the section via the unchanged `SectionId` in `frontend/src/composables/useSiteLayout.ts`

**Checkpoint**: US1 + US2 both independently functional; home↔page loop complete.

---

## Phase 5: User Story 3 — Retrieval & Site Content Updated (Priority: P3)

**Goal**: llms content and tool docs describe the new projects page location; retrieval eval stays green.

**Independent Test**: `public/llms/projects.md` + `llms.txt` mention the dedicated page; `npm run eval:retrieval` exits 0.

### Implementation for User Story 3

- [x] T012 [US3] Update `projectsMd` in `frontend/scripts/generate-llms-txt.mjs` (Projects generation block, currently around line 37) to state that projects live on their own page at `#/projects`, reachable from the home "Projects" teaser (UR-6); keep the file name `llms/projects.md` unchanged (no `LLMS_FILES` change in `frontend/src/composables/useLlmsContent.ts`)
- [x] T013 [US3] Review `TOOL_GUIDE`/tool prose in `frontend/src/tools/registry.ts` for "projects" wording (e.g. retrieve description mentioning sections): update any text that claims projects live on the home desktop ONLY IF it conflicts with the new layout; `TOPIC_SECTION` (`projects: 'projects'`) and `about_me` topics in `frontend/src/data/siteData.ts` must NOT change
- [x] T014 [US3] Run `npm run generate:llms` from `frontend/` and confirm regenerated `frontend/public/llms/projects.md` + `frontend/public/llms.txt` describe the dedicated page
- [x] T015 [US3] Run `npm run eval:retrieval` from `frontend/` — must exit 0 with no misses (extend `frontend/scripts/eval-fixtures.mjs` only if wording changes break a fixture)

**Checkpoint**: All user stories independently functional; content pipeline in sync.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T016 [P] Accessibility sweep across new views in `frontend/src/components/ProjectsPage.vue` and `frontend/src/components/ProjectsSection.vue`: real `<a>` links only, `:focus-visible` outlines intact, `prefers-reduced-motion` rules already cover transitions (nothing new in `main.css`), heading hierarchy sane (per plan.md Principle V)
- [x] T017 Full verification chain from `frontend/`: `npm run lint` → `npm run build` → walk quickstart.md scenarios end-to-end (all FRs/SCs incl. SC-003 blog unchanged and SC-003 unknown-route fallback), manual `npm run dev` pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — T001 first
- **Foundational (Phase 2)**: T002 blocks T004–T006 (all views need `ProjectsRoute` + `projectsHref()`)
- **US1 (Phase 3)**: depends on T002; delivers the MVP page
- **US2 (Phase 4)**: depends on T002 only (teaser links via `projectsHref()`); can run in parallel with US1 by different files (`ProjectsSection.vue` vs `ProjectsPage.vue`) — but T011's link verification implicitly exercises T004–T006
- **US3 (Phase 5)**: can run once code land is visible; T012 needs no code dependency, T013 review benefits from final component state
- **Polish (Phase 6)**: after all stories

### User Story Dependencies

- **US1**: independent after T002 — no dependency on US2/US3
- **US2**: independent after T002 — teaser renders without the page existing (link just navigates; page branch from US1 makes it meaningful, so sequential P1→P2 recommended)
- **US3**: independent file set (`scripts/`, `registry.ts`) — can parallelize with US1/US2 except T012 regeneration sanity-checks after code settles

### Within Each User Story

- Route/composable changes before component consumption
- Component before its CSS pairing task pairing exercises it
- Verify gates at story end (T008/T011/T015)

### Parallel Opportunities

- T004 (ProjectsPage.vue) and T009 (ProjectsSection.vue) touch different files — could run concurrently after T002, though sequential order is recommended for MVP value
- T005 (page CSS) parallel with T004; T010 (teaser CSS) parallel with T009
- T016 runs alone in polish phase

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 → T002 → T003
2. Phase 3 (T004–T008): dedicated page reachable at `#/projects`
3. STOP and validate via quickstart.md; demo-able increment

### Incremental Delivery

1. Setup + Foundational → plumbing ready
2. US1 → validate page → (MVP)
3. US2 → validate teaser loop
4. US3 → validate content pipeline (`eval:retrieval` green)
5. Polish → full verify chain → ready to ship or open PR

### Parallel Team Strategy (not really applicable — single dev, tiny surface)

- One developer sessions: T001–T003 → T004–T008 → T009–T011 → T012–T015 → T016–T017

---

## Notes

- Commit per task or logical group
- Verify tests (lint/build) fail loudly before proceeding at each checkpoint
- No `SectionId` changes anywhere — T013 must not touch `TOPIC_SECTION`/`SECTION_LABEL` unless wording-only
- `vite.config.ts` base stays `/about-me/`; `dist/` never committed
