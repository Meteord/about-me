# Quickstart: Verify Projects-on-a-Separate-Page

**Feature**: `/specs/001-projects-separate-page/spec.md` · Date: 2026-09-20

## Prerequisites

- Node `^20.19.0 || >=22.12.0`
- From `frontend/`: dependencies installed (`npm ci` / `npm install` already done)

## Automated verification gates (mandatory)

```sh
cd frontend
npm run generate:llms   # regenerates public/llms/*.md + llms.txt (also runs pre-build)
npm run lint            # oxlint + eslint (auto-fixes; review diff)
npm run build           # type-check (vue-tsc) + production build, in parallel
```

All three must pass with zero errors. If tool docs/retrieval wording changed:

```sh
npm run eval:retrieval  # must exit 0 (no retrieval misses)
```

## Manual scenario walkthrough (dev server)

```sh
cd frontend
npm run dev   # opens the SPA; routes are fragment-based
```

### SC-001/FR-001/FR-004 — Navigate to the dedicated page and back

1. Open the app at home.
2. Expand the "Projects" pixel-window on home → expect the **teaser** (featured highlight + "All projects →" link), not the full earlier content layout.
3. Activate the teaser link → URL becomes `#/projects`, dedicated projects page renders, home desktop is replaced (no stack reload flicker beyond the standard stepped transition).
4. Press browser Back → home, URL fragment cleared, teaser still present.

Expected outcome: instant client-side navigation both ways, no full page reload.

### FR-005 — Direct load of the page

1. Paste `http://localhost:5173/about-me/#/projects` (dev respects `base` as subdir of root) or `/#/projects` into a fresh tab.
2. Expected: projects page renders standalone; no need to visit home first.

### FR-006 — No content loss

1. On `#/projects`, verify every project currently in `siteData.projects` (currently: MUCGPT — description, GitHub link, tech-stack groups) appears as a card.
2. Expected: 1:1 match with the data source; external link opens in a new tab (`rel="noopener"`).

### FR-002/FR-003 — Teaser on home

1. Home → confirm the Projects window shows the teaser card and a hard link to the projects page (same visual pattern as Blog's post links).
2. Collapse/expand toggle (`−`/`+`, `aria-expanded`), `:focus-visible` outline on the link, no styling regressions at a ≤480px window width.

### FR-008 — Blog routes unaffected

1. Navigate to `#/blog` and any `#/blog/<slug>` post → unchanged behavior.
2. Expected: identical to pre-feature.

### FR-010 — Unknown routes

1. Visit `#/banana` and `#/projects/does-not-exist`.
2. Expected: `#/banana` → home fallback; `#/projects/x` → projects page (slug tolerated, no broken view).

### SC-004/FR-009 — Retrieval integrity

1. Open the Mini-Michi chat in the dock and ask "what are Michael's projects" (vector mode optional; lexical always available).
2. Expand the retrieved step in the transcript → the referenced content describes projects on their own page.
3. Check `frontend/public/llms/projects.md` and `frontend/public/llms.txt` were regenerated and mention the dedicated page.

### FR-007 — Theme fidelity (spot check)

1. Look at the projects page: pixel-window bar, notched corners, hard offset shadows, `steps(2, end)` transitions, no rounded/soft surfaces, amber/orange/red accents only from `--pixel-*` variables.
2. Expected: indistinguishable motif from the blog post page.
