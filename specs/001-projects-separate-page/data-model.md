# Data Model: Projects on a Separate Page

**Feature**: `/specs/001-projects-separate-page/spec.md` · Date: 2026-09-20

No new persistence, no new entities. This feature adds a **route view state** value and reorganizes presentation of the existing **Project** entity.

## Route (view-level state, hash-backed)

| Route | Shape | Renders | Notes |
|---|---|---|---|
| Home | `{ name: 'home' }` | Pixel-window desktop incl. projects **teaser** window | Any unrecognized hash |
| Blog index | `{ name: 'blog', slug: null }` | `#/blog` | Existing behavior, unchanged |
| Blog post | `{ name: 'blog', slug: string }` | `$: BlogPostPage` for `#/blog/<slug>` | Existing behavior, unchanged |
| **Projects page** (new) | `{ name: 'projects', slug: null }` | Dedicated projects page from `#/projects` | NEW |
| **Projects deep link** (new) | `{ name: 'projects', slug: string }` | Projects page (slug tolerated, list rendered) | NEW — fallback per R-4 |

- Discriminated union extension of `SiteRoute`; parsing unchanged in spirit (hash segments, `hashchange` listener, SSR-safety not a concern — static SPA).
- Link helper: `projectsHref()` → `#/projects` (returns no detail links; future detail pages out of scope).

## Project (existing entity — unchanged data, new presentation surfaces)

Fields (from `siteData.projects: Project[]`):

| Field | Type | Usage in this feature |
|---|---|---|
| `name` | string | Teaser highlight title; page card title |
| `description` | string | Teaser one-liner (trimmed); page card full description |
| `link` | string | Page card external link (target `_blank`, `rel="noopener"`) |
| `techStack` | `{ label, items[] }[]` | Page card tech-stack chips/groups (as current card markup) |

Validation/constraints: nothing new — `siteData.projects` is the single source of truth for both teaser and page; content loss is impossible by construction (both views read the same array). Currently one project (MUCGPT); page must render N projects without assumption of count.

## Relationships

- `Project` ↔ teaser: teaser shows the first/featured project (existing `projects[0]` pattern) — read-only.
- `Project` ↔ page: page renders every entry of `siteData.projects` in DOM order — read-only.
- `Project` ↔ retrieval: `about_me(topic="projects")` output is unaffected (same array, same formatter in `siteData.ts`).

## State transitions

- Home desktop section state (`useSiteLayout`) for id `projects`: expanded/collapsed/visible/hidden/highlighted — **unchanged**; the teaser remains addressable for the AI spotlight flow.
- Route transitions: `home → projects → back = home` via `hashchange`; no persisted state, no global store.
