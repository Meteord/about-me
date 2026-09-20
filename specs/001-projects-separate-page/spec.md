# Feature Specification: Projects on a Separate Page

**Feature Branch**: `001-projects-separate-page`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "i want the projects also to move to a seperate page like the blog"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dedicated Projects Page (Priority: P1)

A visitor who wants to see Michael's projects navigates to a dedicated projects URL (hash-routed, exactly like the blog). The page shows the full projects content in a dedicated view, styled consistently with the site's retro pixel-window theme. The home desktop pixel-window stack no longer contains the full projects section; navigation back to home is instant and via browser back or an on-page link.

**Why this priority**: This is the core of the request — projects live on their own page instead of the home desktop. Without it the feature does not exist.

**Independent Test**: Navigate to `#/projects` in a browser → the dedicated projects page renders; navigate back → home renders without the full projects section.

**Acceptance Scenarios**:

1. **Given** the site is open at home, **When** the visitor activates the projects link/teaser, **Then** the URL becomes `#/projects` and a dedicated projects page renders with all project content currently shown by the projects section.
2. **Given** the dedicated projects page is open, **When** the visitor uses the browser back button, **Then** home renders with the projects teaser card.
3. **Given** the visitor opens `#/projects` directly from a bookmark or link, **When** the page loads, **Then** the dedicated projects page renders without needing to pass through home.
4. **Given** an unrecognized route hash (e.g. `#/banana`), **When** the page loads, **Then** the site falls back to home (same behavior as today; `#/blog/...` routes continue to work unchanged).

---

### User Story 2 - Home Projects Teaser (Priority: P2)

The home desktop keeps a compact "Latest projects" teaser card in place of the full projects pixel-window. The teaser shows a small selection of highlights and a hard link to the dedicated page, following the same pattern the blog uses on home. The teaser uses the established pixel-window chrome and palette so the home desktop remains visually coherent.

**Why this priority**: Without a replacement entry point on home, discovery of projects suffers; this completes the home-desktop metaphor alongside the blog teaser.

**Independent Test**: Open home → teaser card is visible, shows highlights, and activating it lands on `#/projects`.

**Acceptance Scenarios**:

1. **Given** home is open, **When** the visitor views the desktop, **Then** a "Latest projects" teaser card is present where the full projects section used to be, with the same collapsible pixel-window affordances as other home sections.
2. **Given** the teaser card is open, **When** the visitor activates the projects link, **Then** the site navigates to the dedicated projects page.

---

### User Story 3 - Retrieval & Site Content Updated (Priority: P3)

The site's AI tools and generated site-content files continue to answer questions about projects. The retrievable site content reflects the new location of projects (a dedicated page) so the on-device assistant can still answer "what are Michael's projects" and point visitors at the right place.

**Why this priority**: The chat/tools must not regress or serve stale guidance; this is a supporting integrity story.

**Independent Test**: Ask the on-device assistant about projects → it retrieves current project info; the generated site-content files include the projects page content.

**Acceptance Scenarios**:

1. **Given** the assistant is loaded, **When** the visitor asks about projects/skills-related topics that map to projects, **Then** the retrieved site content describes the dedicated projects page and its content.
2. **Given** the site content generation runs, **When** it completes, **Then** it includes a projects page source (like it does for blog) and `llms.txt` links it.

---

### Edge Cases

- What happens when a visitor opens `#/projects` on a fresh load (no home rendered first)? → The dedicated page must render standalone.
- What happens when the visitor deep-links to a nonexistent project detail (`#/projects/something`)? → Same unknown-route behavior as blog: falls back gracefully (home or projects list, mirroring existing conventions).
- What happens when the teaser card is collapsed? → It behaves like any other home pixel-window (toggle `−`/`+`), with the link available when expanded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST provide a dedicated projects page reachable at the hash route `#/projects`, following the same routing style as the blog.
- **FR-002**: The home desktop MUST no longer render the full projects section; it MUST instead render a "Latest projects" teaser card containing a small selection of project highlights.
- **FR-003**: The teaser card MUST include a link that navigates to the dedicated projects page.
- **FR-004**: Browser back/forward navigation MUST work correctly between home and the projects page.
- **FR-005**: Direct loads of `#/projects` (bookmark, shared link, page refresh) MUST render the projects page without requiring interaction with home first.
- **FR-006**: The dedicated projects page MUST present the same project information (projects list, descriptions, links) that the current projects section presented, with no content loss.
- **FR-007**: The new page and teaser MUST reuse the established site chrome — pixel-window framing, palette, headings, and interaction conventions — so the site remains visually consistent.
- **FR-008**: The blog routing behavior MUST remain unchanged by this feature.
- **FR-009**: The generated site-content files and the AI tools' retrievable content MUST be updated so project information is served from and describes the dedicated projects page.
- **FR-010**: Unrecognized hash routes MUST continue to fall back to home as they do today.

### Key Entities *(include if feature involves data)*

- **Project**: A piece of work displayed on the site — title, description, links, imagery/preview. Content is unchanged; only its presentation location moves.
- **Site content source**: The generated retrievable content documents that describe site sections for visitors and the on-device assistant; a projects page source is added alongside the blog one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can navigate from home to the projects page and back in under 10 seconds, entirely client-side, with no full page reload required.
- **SC-002**: 100% of the project content previously visible on home is reachable on the dedicated projects page.
- **SC-003**: Zero navigation regressions: `#/blog` routes and home sections load correctly after the change, verified by manual walkthrough on fresh load.
- **SC-004**: The on-device assistant can still answer project-related questions using up-to-date site content, verified by retrieving projects content in a chat turn.

## Assumptions

- Like the blog, "separate page" means hash-routed deep links within the existing single-page app — no server routes, no multi-page build output, no change to the GitHub Pages deployment base path.
- The dedicated projects page shows the full projects listing only; individual per-project detail pages are out of scope for this feature.
- The teaser on home shows highlights via the existing site data (no new content authoring required).
- Accessibility conventions already in place (focus outlines, reduced-motion handling, aria expanded states) carry over to the new page and teaser.
