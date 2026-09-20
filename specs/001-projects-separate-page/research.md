# Research: Projects on a Separate Page

Feature: `/specs/001-projects-separate-page/spec.md` · Date: 2026-09-20

No NEEDS CLARIFICATION markers existed in the spec. This document records the design decisions needed to plan implementation.

## R-1: Routing mechanism for the projects page

**Context**: Spec FR-001 requires a dedicated projects page "following the same routing style as the blog". Blog uses custom hash routing in `src/composables/useHashRoute.ts` (`SiteRoute` union, `parseRoute()` on `hashchange`, `blogHref()`).

**Decision**: Extend the existing `SiteRoute` union with a `ProjectsRoute` (`{ name: 'projects' }`), parsed from `#/projects` (and `#/projects/<anything>` for graceful fallback), and add a `projectsHref()` helper next to `blogHref()`.

**Rationale**: Zero new dependencies, consistent with the established pattern, namespaced in one file, works on GitHub Pages static hosting without server rewrites.

**Alternatives considered**:
- Vue Router (HTML5 history mode) — violates constitution Principle II ("no router"), needs 404.html fallback tricks on GitHub Pages, plus Vite base-path handling. Rejected.
- Time-travel/scroll-to-anchor only — would not be a "separate page" per spec. Rejected.

## R-2: How the dedicated page renders

**Context**: FR-006: page must present the same project information with no content loss. Blog's `BlogPostPage.vue` shows the pattern: full-width column in `App.vue`, pixel-window frame, data pulled from `siteData`.

**Decision**: New `ProjectsPage.vue` component rendered in `App.vue` via `v-else-if` branch on the route (sibling of the `blogPost` branch), showing all `siteData.projects` entries as `project-card` blocks (the existing card style, not a per-project sub-page). It reuses the same card markup/classes as the current section where sensible.

**Alternatives considered**:
- Reusing `ProjectsSection.vue` unchanged inside the page — the section's collapsible-window semantics (toggle, layout state) don't make sense on a page. Rejected.
- Per-project detail pages (`#/projects/mucgpt`) — out of scope per spec Assumptions; route segments fall back.

## R-3: What the home teaser looks like

**Context**: FR-002/FR-003 and user's explicit choice: "keep a teaser" like blog.

**Decision**: Keep `ProjectsSection.vue` as the home pixel-window with `SectionId: 'projects'` (preserves `useSiteLayout` state: expand/collapse, show/hide, AI spotlight via `retrieve(topic="projects")`). Its content becomes a compact teaser: featured project highlight (`siteData.projects[0]`, e.g. name + one-line description) plus a `pixel-link-btn` "All projects →" pointing at `projectsHref()` — the identical interaction pattern as `BlogSection.vue`'s post links.

**Rationale**: Avoiding a new `SectionId` means zero changes to `useSiteLayout`, `TOPIC_SECTION`, `SECTION_LABEL`, `eval-fixtures.mjs` for the section machinery — the AI "bring matching section into view" flow keeps working byte-for-byte.

**Alternatives considered**:
- New `SectionId` (`projectsTeaser`) + removing `projects` — would ripple through registry, eval fixtures, `DEFAULT_SECTIONS`, and the AI spotlight contract; YAGNI per Principle VI note. Rejected.

## R-4: Unknown-route fallback for `#/projects/*`

**Context**: Edge case: `#/projects/something` (nonexistent project detail). Blog precedent: `#/blog` with a slug renders `BlogPostPage`, which shows post-not-found material; unknown roots fall back to home.

**Decision**: `parseRoute()` accepts `#/projects` (and ignores deeper segments, treating `#/projects/x` as the projects page for now — consistent with `blog` slug parsing but without detail pages; the page itself can render a small "unknown project" note mirroring `BlogPostPage`'s not-found handling, or simply render the list). Simplest consistent behavior: strip slug → render the projects list page.

**Rationale**: Never leaves the visitor on a broken view; direct URL traversal for a future detail page is preserved.

## R-5: Retrieval & llms content sync

**Context**: Principle VI and FR-009: `public/llms/projects.md`, `llms.txt`, and the `about_site` pipeline must describe the new page location.

**Decision**: Update `generate-llms-txt.mjs`'s `projectsMd` to state that projects live on their own page at `#/projects` (reachable from the home teaser). No `LLMS_FILES` addition needed (file already exists, keeps its name); no eval-fixture additions needed unless tool guide text changes (FR wording does not change tool schemas). `about_me(topic="projects")` is untouched — data source unchanged.

**Alternatives considered**:
- New `public/llms/projects-page.md` — duplicates retrieval surface for no user value. Rejected.

## R-6: Accessibility & theme handling for routed page transitions

**Context**: Principle V; existing `stack` transition on the column and `fade` on section content.

**Decision**: `App.vue`'s existing `transition-group` pattern covers the projects page swap (same as blog post branch). Page keeps `:focus-visible` outlines, heading hierarchy, real links; `prefers-reduced-motion` rules in `main.css` already cover transitions. No new motion beyond `steps(2, end)` classes.

**Rationale**: Pure reuse; nothing new to validate beyond the documented gates.
