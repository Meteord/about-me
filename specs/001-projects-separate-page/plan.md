# Implementation Plan: Projects on a Separate Page

**Branch**: `001-projects-separate-page` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-projects-separate-page/spec.md`

## Summary

Move the Projects content off the home pixel-window desktop into a dedicated hash-routed page (`#/projects`), mirroring how the blog already works (`#/blog`, `#/blog/<slug>` → `BlogPostPage.vue` via `useHashRoute.ts`). Home keeps a compact "Latest projects" teaser card linking to the new page; blog routing, AI tool retrieval (`about_me`/`about_site`), and the llms content pipeline stay in sync with the new location.

## Technical Context

**Language/Version**: TypeScript on Vue 3 (`<script setup lang="ts">`), Vite (`rolldown-vite`), Node `^20.19.0 || >=22.12.0`

**Primary Dependencies**: Vue 3, Vite; no router library, no state library (hash routing via `src/composables/useHashRoute.ts`)

**Storage**: N/A (static site; content lives in `src/data/siteData.ts` and `public/llms/*.md`)

**Testing**: No test suite. Verification gates: `npm run lint` → `npm run build` (vue-tsc type-check + production build) from `frontend/`; `npm run eval:retrieval` when retrieval content changes.

**Target Platform**: Static single-page app on GitHub Pages at base `/about-me/` (client-side only, WebGPU/WASM browser environment for the AI demo)

**Project Type**: Web application (frontend-only)

**Performance Goals**: Navigation to `#/projects` and back is instant client-side (no network fetch beyond already-loaded assets); projects page renders in the first paint of the SPA

**Constraints**: No backend, no secrets, `vite.config.ts` base stays `/about-me/`, all styling global in `src/assets/main.css` with pixel-* class naming, no `border-radius` > 2px, stepped easing; dispose-model conventions untouched

**Scale/Scope**: 1 new page component (`ProjectsPage.vue`), 1 modified home section (`ProjectsSection.vue` → ProjectsTeaser), hash-route extension, registry/llms/eval-fixture sync. ~10 files touched.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Client-Only & On-Device | ✅ PASS | Hash routing is client-side only; no backend, no secrets. |
| II. Static Single-Page Simplicity | ⚠️ PASS WITH NOTE | Constitution says "new views MUST be pixel-window sections, not routes" — but the blog already established the routed-page pattern (`useHashRoute.ts` + `BlogPostPage.vue`) before this feature. Moving projects there follows the existing precedent and reuses the same shared composable; no router library, state library, or SSR is introduced. Documented as the accepted extension of Principle II; no new framework complexity. |
| III. Verify Before Ship | ✅ PASS | Verify chain defined in quickstart.md: lint → build; eval:retrieval for fixture changes. |
| IV. Pixel-Theme Fidelity | ✅ PASS | New page reuses `pixel-window` chrome and existing classes; all styles go in `main.css`. |
| V. Accessibility & Motion Safety | ✅ PASS | Section toggle keeps `aria-controls`/`:aria-expanded`; teaser link is a real `<a>`; reduced-motion and 480px breakpoint respected. |
| VI. Retrieval-Ready Content | ✅ PASS | `projects` topic in `about_me` unchanged (`siteData.ts`); `public/llms/projects.md` and `llms.txt` updated to describe the dedicated page; `TOPIC_SECTION`/`SECTION_LABEL` mapping kept so the chat can still spotlight the projects content; retrieval fixtures extended if tool docs change. |

**Gate result**: PASS — the single deviation from II is pre-existing (blog) and this feature extends it rather than introducing it.

## Post-Design Constitution Check (after Phase 1)

Same statuses as above. The design adds no dependencies, no backend calls, no local assets, no `<style>` blocks, and no new `SectionId` (the `projects` id is retained on home for the teaser, so the AI's `retrieve(topic="projects")→expand section` flow keeps working). Content relocations: none — data source (`siteData.projects`) is shared between teaser and page.

## Project Structure

### Documentation (this feature)

```text
specs/001-projects-separate-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── routes.md        # Phase 1 output: hash-route contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/src/
├── composables/
│   └── useHashRoute.ts          # MODIFIED: add ProjectsRoute to SiteRoute union, projectsHref()
├── components/
│   ├── ProjectsSection.vue      # MODIFIED: becomes home teaser card ("Latest projects" highlights + link to #/projects)
│   └── ProjectsPage.vue         # NEW: dedicated projects page (pixel-window skeleton like BlogPostPage.vue)
├── App.vue                      # MODIFIED: render ProjectsPage when route is projects
└── assets/main.css              # MODIFIED: classes for the projects page + teaser (global styles only)

frontend/public/llms/
└── projects.md                  # REGENERATED via scripts/generate-llms-txt.mjs (describes new page)

frontend/scripts/
└── generate-llms-txt.mjs        # MODIFIED: projects.md content mentions dedicated page route

frontend/src/tools/registry.ts   # UNCHANGED: topic enum already includes 'projects'; TOOL_GUIDE text tweak if route wording changes
```

**Key design decision**: `ProjectsSection.vue` keeps its `projects` `SectionId` on home (as a teaser window) so `useSiteLayout` show/hide/highlight state and `retrieve(topic="projects")` section-spotlighting continue to work unchanged. The dedicated page component is routed via `SiteRoute`, exactly like `BlogPostPage`.
