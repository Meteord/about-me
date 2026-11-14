# Contract: Always-Open Section Layout

**Feature**: `007-readable-pixel-stats` | **Consumers**: `HomePage.vue`, `AboutIntro.vue`, `AboutSection.vue`, `BlogSection.vue`, `ProjectsSection.vue`, `ContactSection.vue`, `BlogPostPage.vue`, `ProjectsPage.vue`, `useSiteLayout.ts`, `src/assets/main.css`
**Violation of this contract is a defect**: any visitor-facing collapse, fake control or lost anchor breaks the feature's primary success criterion.

---

## C1. Composition contract

`HomePage.vue` renders this fixed order; order is not data-driven:

1. `AboutIntro` — `id="about"` (avatar, name, lede, employer link, tags)
2. `StatsBand` — rendered only when at least one statistic exists (see `statistics-band.md`)
3. `AiShowcase` — always open, always present on home
4. `AboutSection` — education / skills / hobbies sub-blocks
5. `BlogSection` — `id="blog"`
6. `ProjectsSection` — `id="projects"`
7. `ContactSection` — `id="contact"`

`AssistantLauncher` is mounted by `HomePage.vue` outside the flow (fixed position).

**Guarantees**

1. Every band's content is in the initial DOM; no click, keypress or scroll is required to read it (FR-001, SC-001).
2. The statistics band sits directly after the introduction and before the showcase whenever it renders (FR-005, FR-015).
3. On the blog article and projects routes, only that view renders; neither shows the launcher or showcase (FR-016, FR-023).
4. Gaps stay consistent when the band or a section is absent: the parent stack's `gap` applies to rendered children only, so removing the band leaves no empty region.

## C2. Section shell contract

Each band is:

```html
<section id="{section-id}" class="pixel-window" aria-labelledby="{section-id}-title">
  <div class="pixel-window__bar pixel-window__bar--static">
    <h2 id="{section-id}-title" class="pixel-window__title">{Title}</h2>
    <!-- optional: one non-interactive meta line or back-link on routed pages -->
  </div>
  <div class="pixel-window__content">{content, always rendered}</div>
</section>
```

**Prohibited**

- A `<button>` header, `aria-expanded`, `aria-controls`, `−`/`+` text, `.pixel-window__toggle`, or any collapsed/hidden content state.
- Window-control ornaments (three chrome squares, marquee stripe per bar) and any other decoration that implies an action the element does not perform (FR-004).
- `<details>`-based sections that a visitor can collapse.

**Required**

- Static heading (`<h2>`) with an `id` referenced by the section's `aria-labelledby`.
- Anchors preserved: `#about`, `#about-education`, `#about-skills`, `#about-hobbies`, `#blog`, `#projects`, `#contact`, plus the existing hash routes `#/blog/<slug>` and `#/projects`. The blog article gains `id="eval-results"` around its evaluation block so the statistics note can point at it.
- Sub-block spotlight targets keep their ids (`about-education`, `about-skills`, `about-hobbies`) and the `pixel-spotlight` class binding.
- A section whose visibility is false renders nothing (no shell, no gap); `about` hides both the intro and the about-details bands.

## C3. Layout state contract (`src/composables/useSiteLayout.ts`)

```ts
interface SectionState {
  id: SectionId              // 'about' | 'blog' | 'projects' | 'contact' (unchanged)
  visible: boolean           // assistant-only
}

// Required public API
state                    // sections/theme/highlight/spotlight/zoom
isVisible(id)
setVisible(id, visible)  // assistant hide/show
focusSection(id, { target }) // highlight + spotlight + scroll; NO expansion change
setTheme(theme) / cycleTheme()
setZoom(zoom)
```

**Removed API** (must not exist): `isExpanded`, `toggle`, `setExpanded`, `setAllExpanded`, `moveSection`, `moveSectionTo`, `resetLayout`, `scrollPage`, `flashSection`, `clearSpotlight`, and `FocusOptions.collapseOthers`.

**Guarantees**

1. No layout state or mutation can expand/collapse/reorder sections.
2. `focusSection` scrolls to the target sub-block (or section) without changing visibility or content mount state; it sets `highlight` (and `spotlight` when a target is given) with the existing timeouts.
3. Hiding a section removes it from the page and lets the remaining bands reflow without animation artifacts; showing it restores it in its original position.
4. Theme changes update `data-theme` and do not alter reveal/count-up state.
5. `SectionId` values stay identical, so `SOURCE_DEFS`, `SOURCE_DEFS.section`, `SECTION_LABEL` and the retrieval evaluation stay valid (FR-022).

## C4. Typography, measure and chrome contract (global CSS only)

1. Body copy and lists are capped at `max-width: 68ch` (60–75 characters) inside the wider page column; `text-wrap: pretty` stays on prose.
2. `--font-display` is used only for the site name (`.pixel-name`) and headings that name a section/page (`.pixel-window__title`, the routed page heading and the blog article heading, which occupy the same role). Card titles, panel titles, statistic values, labels and body copy use `--font-body` (FR-002, SC-007).
3. No text below `--type-micro` (`0.75rem`); all sizes in `rem` so `html[data-zoom]` still works (FR-013).
4. Per section: one 8 px notched frame (`.pixel-window`), one hard offset shadow, one heading row, at most one divider (`.pixel-rule`) and one accent family. Nested `.pixel-card`s use fill + soft shadow, no competing outer border.
5. All corners are `clip-path` chamfers or `border-radius ≤ 2px`; no glossy/rounded/soft surfaces; motion uses `steps()`; colours/fonts only from `--pixel-*`/`--font-*` (FR-003, Constitution IV).
6. 4.5:1 contrast for headings, body, labels, statistics and assistant text in all three accent themes; the scanline overlay is decorative, `pointer-events: none`, and reduced to a low opacity so composited contrast holds (SC-006).
7. Hover/focus responses are stepped and layout-neutral (tint/border/`translateY(-1px)`), and every control keeps a visible `:focus-visible` outline (FR-012).
8. At `max-width: 480px` sections stack in one column, headings stay on one or two lines, values/labels never truncate, and no horizontal scrolling appears (FR-013, US1 scenario 3).

## C5. Motion contract

1. Reveal is one-shot per element per page load, ≤ 300 ms, opacity/transform only; content is never left transparent or offset (FR-011, SC-015).
2. Reduced motion disables reveal, count-up, blink and pulse; final states render immediately (FR-010, SC-005).
3. Motion never gates readability: the page is fully legible with JavaScript disabled (the hidden state requires both a motion-allowed media query and the `js-anim` class added by the motion module).
4. Theme changes and route returns do not replay reveals or count-ups.

## C6. Acceptance checks

- [ ] Fresh load: About intro, education, skills, hobbies, all blog teasers, project summary, contact links are readable with zero clicks; no `aria-expanded` or toggle exists on any section header.
- [ ] Search the DOM for `pixel-window__chrome`, `pixel-window__toggle`, `aria-expanded` → only the details disclosure and launcher remain.
- [ ] `#about`, `#about-skills`, `#blog`, `#projects`, `#contact`, `#/blog/chat-with-my-website`, `#/projects` all resolve to the correct content.
- [ ] Ask Mini-Michi for a topic → page scrolls and spotlights the sub-block; ask to hide a section → it disappears; ask again → it returns in place.
- [ ] Disable JavaScript after first paint (or block the motion chunk) → all content remains visible.
- [ ] Effective line length of a body paragraph at 1440 px is 60–75 characters.
- [ ] Reduced motion on → no reveal/count-up/blink; all content at final state.
- [ ] 480 px viewport → single column, no clipping or horizontal scroll; launcher panel fits.
