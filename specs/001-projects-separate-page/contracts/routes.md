# Route Contract: Hash Routes

**Feature**: `/specs/001-projects-separate-page/spec.md` · Date: 2026-09-20

The site's only external navigation contract is the URL fragment space. This document defines all valid hash routes after this feature.

## Contract

| Hash route | Rendered view | Binding |
|---|---|---|
| *(empty)* / any unrecognized | Home desktop (pixel-window sections incl. **projects teaser**) | `siteData` + `useSiteLayout` |
| `#/projects` | **Dedicated projects page** (full project listing, all `siteData.projects` as project cards) | `siteData.projects` |
| `#/projects/<anything>` | Dedicated projects page (unused segment tolerated; no per-project detail pages in this scope) | `siteData.projects` |
| `#/blog` | Blog index (existing) | `siteData.blog` |
| `#/blog/<slug>` | Blog post page for `<slug>` (existing) | `siteData.blog` |

## Rules

1. **UR-1**: `#/projects` MUST resolve to the dedicated projects page on fresh load, in-app navigation, and browser back/forward.
2. **UR-2**: `#/blog/*` routes MUST be byte-for-byte unaffected.
3. **UR-3**: Links pointing to the projects page MUST be produced through the same helper mechanism as blog links (`projectsHref()`), producing `#/projects` — no raw string literals in components.
4. **UR-4**: The home desktop MUST contain a "Latest projects" teaser pixel-window whose link navigates to `#/projects`; the teaser section MUST retain section id `projects` (layout + AI spotlight addressable).
5. **UR-5**: Base path scope: all routes are fragment-based (`#…`), so the GitHub Pages base `/about-me/` is unaffected; no server routes exist.
6. **UR-6**: `projects.md` site content (`about_site`) MUST describe that projects sit on their own page reachable from the home teaser.

## Invariants for verification

- Unknown hash → home (never blank page, never error).
- `siteData.projects` has exactly one rendering pipeline for page content (no duplicated project data).
- Every link on home is a client-side fragment navigation (no full page reload).
