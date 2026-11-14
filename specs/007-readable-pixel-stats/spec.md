# Feature Specification: Readable Pixel Page with Animated Statistics

**Feature Branch**: `007-readable-pixel-stats`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "i want the website to be easier readable, less clunky. i quite like the style of this website: https://www.victoriaslocum.com/ especially the data/animations. can you find a combinatino of the pixel style (simplify it) and the animations/statistics view of this website"

## Clarifications

### Session 2026-11-13

- Q: Which page structure should the redesign land on? → A: Single scrolling editorial page with all sections visible on load, closest to the reference site (later refined: visitors get no collapse control at all — see the layout and reading flow session below).
- Q: Which numbers should the animated statistics band present? → A: Both — career/person facts plus the site's own engineering data (on-device model size, retrieval modes, Hit@K, mean retrieval latency from the committed evaluation results).

### Session 2026-11-13 (follow-up: on-device showcase)

- Q: Where should the on-device model showcase live? → A: As a dedicated interactive section inside the single scroll, with a compact floating launcher that opens the same session, so the demo is reachable while reading anywhere on the home page.
- Q: How should the statistics band relate to the model demo? → A: Show only statistics that actually exist. Do not invent values, do not render empty or placeholder statistics; if a statistic has no real source, it is simply absent, and if none exist the band does not render at all. The model showcase stays present but visually simpler and easier to read. The blog and blog article stay as they are, only calmer.
- Q: Is live in-session instrumentation (tokens/second, live timing readouts) part of this change? → A: No. The band and showcase present publishing-time values only; no new measurement or telemetry is added.

### Session 2026-11-13 (layout and reading flow)

- Q: Where should the statistics band sit relative to the introduction on the home page? → A: Introduction first, statistics band immediately after it, then the assistant showcase, then the remaining sections.
- Q: Should visitors still be able to collapse a section themselves, or should the always-open page drop the collapse control entirely? → A: Drop it entirely — no section is collapsible by a visitor; sections are permanently readable, and only the assistant scrolls to a section or hides/restores it.
- Q: Must every statistic's value be computed from already-shipped site data at build time, or may a value be written by hand with a citation? → A: Every value is computed at build time from shipped data; only labels, notes and units are authored by hand.
- Q: Should the floating launcher also appear on the blog article and the projects page, or only on the home page? → A: Home page only; the blog article and projects page keep their content with no assistant entry point.
- Q: When the assistant hides the showcase section, should the floating launcher stay available with the conversation, or step aside and offer to restore the section? → A: The launcher stays available with the existing conversation, so the visitor can keep chatting or ask for the section back.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the whole site as one calm scroll (Priority: P1)

As a first-time visitor, I want the About, Blog, Projects and Contact content to be visible and readable in a single continuous scroll, so that I can skim the person behind the site in under a minute instead of clicking open window after window.

**Why this priority**: "Easier to read, less clunky" is the explicit request. Today three of four sections start collapsed, so most of the page's substance is hidden behind toggle clicks, and each block is wrapped in heavy window chrome (three chrome squares, notched borders, dashed dividers, scanlines, display font on every heading). Opening the page to reading content is the single biggest readability win and is independently shippable.

**Independent Test**: Load the site in a fresh session without interacting and confirm that About, Blog, Projects and Contact content is present and readable in one scroll with no expand action; then measure body copy line length and type sizing against the readability targets.

**Acceptance Scenarios**:

1. **Given** a visitor loads the site with no prior interaction, **When** the page finishes rendering, **Then** the About introduction, education, skills, hobbies, all project summaries, all blog teasers and the contact links are readable without any click, keypress or scroll-triggered expansion.
2. **Given** the visitor is reading body copy on a wide desktop viewport, **When** they scan a paragraph, **Then** the line length stays within a comfortable reading measure (roughly 60–75 characters), and body text is never smaller than the site's base body size.
3. **Given** the visitor is reading on a 480px-wide phone, **When** the page renders, **Then** sections stack in a single column, headings stay on one or two lines without clipping, and no horizontal scrolling is required.
4. **Given** a visitor uses only the keyboard, **When** they tab from the top of the page, **Then** they reach every link and control in visual order with a clearly visible focus indicator, and every section's content is rendered and focusable, since no collapse control exists to hide it.

---

### User Story 2 - See who this is at a glance through animated statistics (Priority: P1)

As a recruiter or fellow engineer landing on the page, I want a compact band of animated headline numbers — some about Michael's career, some about the on-device AI this site actually runs — so that I immediately get both the person and the engineering, in the spirit of the reference site's "259 books / 478 sessions / 312 hours" cards.

**Why this priority**: The reference site's identity comes from data cards, and the user explicitly asked for its "statistics view". It is the visible differentiator of this redesign and it delivers value on the first screen, independent of the reading-layout work. It must be honest: a band that shows only real, sourced values is worth showing; a band padded with guesses is worse than no band.

**Independent Test**: Load the page and verify that the statistics band appears only when at least one real value is available, that every value counts up once when it first enters the viewport, that each value is labelled and has a one-line explanation of where it comes from, and that each number matches its stated source. Then simulate a build with no available statistics and confirm no band, placeholder or empty shell is rendered.

**Acceptance Scenarios**:

1. **Given** the visitor loads the page, **When** the first screen renders, **Then** the introduction (name, photo and short bio) appears first and the statistics band sits directly beneath it, before any other section.
2. **Given** the visitor loads the page, **When** the statistics band enters the viewport, **Then** each numeric value animates from zero to its final value exactly once, in a short, stepped motion consistent with the site's retro feel, and never re-animates on scroll-back.
3. **Given** the statistics band has rendered, **When** the visitor inspects any statistic, **Then** it shows a value, a short label, a one-line context note, and (where applicable) a pointer to the more detailed place on the site or to the source it was derived from.
4. **Given** the band presents both groups, **When** the visitor reads it, **Then** career statistics and engineering statistics are visually grouped and labelled so their different natures are obvious.
5. **Given** a statistic's source data changes — a project or blog entry is added, or the evaluation results are regenerated — **When** the page is rebuilt, **Then** the displayed value reflects the new source automatically, with no manual copy editing of the number.
6. **Given** the visitor has a small screen, **When** the band renders, **Then** statistics form a legible two-column or stacked grid with no truncated labels or clipped values.
7. **Given** a statistic has no real source at build time, **When** the page renders, **Then** that statistic is absent, no placeholder, dash or zero stands in for it, and the remaining statistics keep their layout.
8. **Given** no statistic is available at all, **When** the page renders, **Then** the entire statistics band is omitted and the page opens directly on the introduction without an empty gap.

---

### User Story 3 - Try the on-device model without fighting the UI (Priority: P1)

As a visitor curious whether the "AI in your browser" claim is real, I want a clearly labelled try-it area inside the page where I can ask a question and watch the on-device assistant answer, with a simple panel that shows me which of Michael's own content it used and hides the technical detail until I ask for it — and I want to get back to it from anywhere on the home page with one tap.

**Why this priority**: The on-device assistant is half the product and the user explicitly wants it kept. It is the proof behind the site's central claim, so it must stay prominent; but today it is the densest, hardest-to-read part of the page (dense control bar, technical checkpoint names, score bars, mode chips). Making it present but calm is the same "less clunky" goal applied to the one interactive element.

**Independent Test**: Scroll to the showcase, ask a question and confirm an answer streams in; confirm the panel names the content it used in plain words while advanced details stay collapsed; then scroll far away, use the floating launcher and confirm the same conversation reopens at the same scroll position.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls through the page, **When** they pass the introduction and statistics band, **Then** the try-it showcase is visible as a normal section of the scroll (not hidden behind a toggle) and is clearly labelled as a live, on-device demo.
2. **Given** the visitor types a question and sends it, **When** the assistant responds, **Then** the answer appears progressively in the panel with a visible working state, and the visitor needed no account, key or configuration beyond accepting the model download.
3. **Given** an answer has been produced, **When** the visitor looks at the panel, **Then** it states in plain language which of Michael's content the answer drew on (for example "skills" or "the blog post"), while ranked scores, candidate lists and retrieval-mode detail remain collapsed until the visitor chooses to expand them.
4. **Given** the panel refers to the models behind the demo, **When** the visitor reads a label, **Then** it is expressed in plain human terms, with the exact checkpoint names available on demand rather than as always-visible text.
5. **Given** the visitor has scrolled away from the showcase, **When** they activate the floating launcher, **Then** the same conversation opens (not a new empty one) and closing it returns them to their previous reading position.
6. **Given** a 480px-wide screen, **When** the showcase renders, **Then** the input, send control and transcript are usable without horizontal scrolling or clipped text.
7. **Given** the browser cannot run the on-device model, **When** the showcase loads, **Then** it explains the limitation in one plain sentence and still shows which content the question matched, rather than presenting a blank or permanently loading panel.
8. **Given** the visitor clears the conversation, **When** they start again, **Then** the panel returns to a clean, calm initial state and the model's memory is released as before.

---

### User Story 4 - Motion that supports reading instead of distracting (Priority: P2)

As a visitor, I want subtle reveal, count-up and hover motion that makes the page feel alive and data-driven, while never delaying or obscuring content.

**Why this priority**: The user asked for the reference site's animations. Motion is what makes the statistics feel like a live record, but it must not fight the readability goal, so it comes after structure and content.

**Independent Test**: Scroll through the page and confirm content reveals briefly as it enters view, interactive elements respond on hover/focus, and all motion completes quickly; then repeat with the operating system's reduced-motion preference enabled and confirm content is fully visible with no animation.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls a section into view for the first time, **When** it enters the viewport, **Then** it becomes fully readable within a fraction of a second and never remains partly transparent or offset afterwards.
2. **Given** a visitor interacts with a stat card, project card, link or chip, **When** they hover or focus it, **Then** the element responds with a small, stepped visual change that does not shift surrounding layout.
3. **Given** a visitor has enabled reduced motion at the operating system level, **When** they load and scroll the page, **Then** no count-up, reveal, blink or pulse animation runs, all numbers appear at their final values immediately, and no content is hidden pending animation.
4. **Given** a visitor loads the page on a low-powered device, **When** the reveal and count-up animations run, **Then** scrolling stays fluid and no animation causes layout jump or content reflow when it finishes.

---

### User Story 5 - Simplified pixel identity, still unmistakably retro (Priority: P2)

As the site owner, I want the pixel-art CRT character kept but calmed down — one accent per area, fewer competing borders, shadows and ornaments, display type reserved for headlines — so the retro look stops competing with the words.

**Why this priority**: This is the "simplify it" half of the request. It cannot be separated from readability, but it can be applied after the layout change and measured against the existing design contract.

**Independent Test**: Compare the redesigned page against the current one and confirm the pixel identity is still present (hard edges, notched corners, warm dark palette, blocky shadows, stepped motion) while the number of decorative elements per section and the amount of display-face text are both reduced.

**Acceptance Scenarios**:

1. **Given** any section of the redesigned page, **When** the visitor looks at its chrome, **Then** it uses at most one outer border treatment, one accent color family, and one decorative divider per section, with no window-control ornament that implies an action it does not perform.
2. **Given** a body paragraph or list, **When** it renders, **Then** it uses the reading typeface rather than the display typeface, and the display typeface appears only on the site name and section headings.
3. **Given** the three theme accent options, **When** the visitor changes the accent, **Then** the statistics band, links, focus rings and highlights all follow the new accent while text contrast remains comfortable against the dark background.
4. **Given** the site's stated design rules (hard offset shadows, notched corners, no rounded or glossy surfaces, stepped easing), **When** the redesign is reviewed, **Then** every one of those rules still holds and no soft or rounded styling has been introduced.

---

### User Story 6 - Ask Mini-Michi to show me something, and still land on it (Priority: P3)

As a visitor chatting with Mini-Michi, I want requests like "show me your skills" or "hide the blog section" to still scroll to, spotlight, hide or restore the right part of the now always-open page.

**Why this priority**: The assistant's page side effects previously assumed collapsible windows, and hiding is now an assistant-only capability. Keeping this working prevents a regression while the layout changes; it is lower priority because it only affects visitors who use the chat.

**Independent Test**: Ask Mini-Michi for a topic and a section hide/show and verify the page scrolls to the target, highlights the matching block, and that hiding a section removes it from the page and a later "show it again" restores it.

**Acceptance Scenarios**:

1. **Given** the page is fully open, **When** the visitor asks Mini-Michi about a specific topic, **Then** the page scrolls that block into view and visually spotlights it without collapsing anything.
2. **Given** the visitor asks Mini-Michi to hide a section, **When** the action is applied, **Then** that section and its statistics contribution disappear from the page and the remaining sections reflow cleanly, even though the visitor has no manual collapse control of their own.
3. **Given** all sections have been hidden, **When** the visitor asks Mini-Michi to show a section again, **Then** the section reappears in its former position and is readable immediately.
4. **Given** the visitor asks Mini-Michi to hide the showcase section itself, **When** the section disappears, **Then** the floating launcher remains available with the existing conversation, so the demo is never unreachable.
5. **Given** the visitor asks for a theme change, **When** the accent changes, **Then** the statistics band and reveal states are unaffected and no animation restarts.

---

### Edge Cases

- **Reduced motion enabled**: Numbers render at final values, sections are never transparent or offset, and blinking decorations stop. No content depends on an animation completing.
- **Statistics entering the viewport already scrolled past**: If a visitor lands on a deep anchor (for example a blog post or the projects page and back), statistics that never entered view must not animate invisibly; they show their final value when first seen.
- **Back/forward navigation or returning from a sub-page**: Count-ups do not replay on every return; a section's reveal happens at most once per page load.
- **Unknown or unavailable statistic**: A value with no real source is dropped from the band, never displayed as a dash, a zero or an estimate. If no statistics remain, the band disappears entirely and the next section moves up with no gap.
- **Non-numeric statistics** (for example "in-browser only" or "no backend"): these display their final text immediately, without count-up, and keep the same card treatment as numeric ones.
- **Very long labels or large numbers on narrow screens**: labels wrap, values never truncate, and the grid falls back to one column.
- **Section hidden while statistics reference it**: statistics sourced from a hidden section stay visible and truthful; if a value can no longer be derived, it is dropped per the rule above rather than shown stale.
- **Keyboard-only and screen-reader users**: the final statistic value is announced; intermediate animation values are not announced repeatedly; the visual grouping has an accessible name.
- **Browser without support for modern scroll or motion features**: content is visible and readable without them (the page must never depend on those capabilities).
- **Direct link to a sub-page or a chat-driven anchor**: the single scrolling home page still resolves anchor and scroll targets used by the assistant.
- **Model not yet loaded**: the showcase shows a calm initial state and a single primary action to start the demo; advanced details stay collapsed until the demo actually has a conversation.
- **Model download declined or interrupted**: the showcase returns to its initial state with a plain retry affordance and never leaves a spinner running forever.
- **Browser cannot run the on-device model**: one plain sentence explains the limitation, the matched content is still shown, and the rest of the page is unaffected.
- **Retrieval falls back to a simpler mode**: the visitor sees no error; the fallback is described in plain words inside the collapsed details, not as a warning banner.
- **Launcher and inline section used together**: opening the launcher while the inline showcase is on screen never creates a second conversation and never duplicates a streaming answer.
- **Visitor clears mid-answer**: the answer stops, the panel returns to its calm initial state, and no partial state leaks to the launcher.
- **Showcase section hidden by the assistant**: the launcher stays available with the existing conversation, so the visitor can keep chatting or ask for the section back in the same conversation; the demo never becomes unreachable.
- **Very long answers or many retrieved sources**: the transcript and the "content used" line stay readable and scroll-contained; the panel never pushes the page layout wider or taller than its bounds.
- **Narrow screen with launcher open**: the launcher panel takes the full usable width, traps keyboard focus while open, closes on Escape, and returns focus to the launcher control.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST render About, Blog, Projects and Contact content in a single continuous scroll with all sections readable immediately on load, requiring no expand action and presenting no visitor-facing collapse or expand control on any section.
- **FR-002**: Body copy MUST be set in the reading typeface at or above the site's base body size, with a comfortable line measure (approximately 60–75 characters), while the display typeface is reserved for the site name and section headings.
- **FR-003**: The visual language MUST remain unmistakably pixel-retro: hard-edged surfaces, notched pixel corners, warm dark palette with one accent color family per area, hard offset shadows, and stepped easing, with no rounded, glossy or soft surfaces.
- **FR-004**: Per section, decorative chrome MUST be reduced to at most one border treatment, one accent family and one divider; ornaments that mimic window controls but perform no action MUST NOT be displayed.
- **FR-005**: A statistics band MUST appear directly below the page introduction and above all remaining content whenever at least one statistic with a real source exists, split into two visually labelled groups (career/person facts and this site's engineering data); when no statistic is available, the band MUST NOT render at all and MUST NOT leave an empty region or placeholder shell.
- **FR-006**: Each statistic MUST display a value, a short label, and a one-line context note; statistics that map to a deeper part of the site or to a published source MUST link to it.
- **FR-007**: Every displayed statistic MUST be derived from a verifiable source — site content, the committed evaluation results, or a measured property of the shipped site — and MUST NOT be hand-invented. Numeric values MUST be computed at build time from that source; only labels, one-line notes and units are authored by hand. A statistic whose value cannot be derived MUST be omitted rather than shown with a placeholder, dash, zero or estimate, and displayed values MUST update whenever their source data changes and the site is rebuilt.
- **FR-008**: Numeric statistics MUST count up exactly once, within a short bounded duration, when they first enter the viewport, and MUST never replay on later scroll or navigation.
- **FR-009**: The final value of every statistic MUST be exposed to assistive technology and to visitors with reduced motion without waiting for an animation.
- **FR-010**: All motion — reveals, count-ups, blinks and hover/focus responses — MUST be disabled or reduced to a static equivalent when the visitor has enabled reduced motion at the operating system level.
- **FR-011**: Scroll reveals MUST NOT leave content invisible, clipped or offset, and MUST complete quickly enough that a visitor scrolling at reading speed always sees finished content.
- **FR-012**: Statistic cards, project cards, blog teasers, tags and links MUST provide a stepped hover/focus response that does not cause layout shift or text reflow.
- **FR-013**: The statistics band MUST adapt to narrow viewports (two columns, then one) and to the site's compact/comfortable text-size preferences without truncating values or labels.
- **FR-014**: The three accent theme options MUST recolor the statistics band, links, focus rings and highlights together, keeping text contrast comfortable on the dark background.
- **FR-015**: The interactive on-device assistant MUST remain present as a dedicated, always-open section within the single scroll, positioned immediately after the introduction and the statistics band so it is found without hunting, and labelled plainly as a live in-browser demo.
- **FR-016**: A compact, persistent launcher MUST let a visitor reopen the conversation from anywhere on the home page; the launcher and the inline showcase MUST share one conversation and one model session, and closing the launcher MUST return the visitor to their previous reading position. The launcher appears on the home page only, not on the blog article or projects page.
- **FR-017**: The showcase's default state MUST show only what a non-technical visitor needs — the question input, the streamed answer, a plain-language statement of which of Michael's content was used, and a control to clear the conversation — while ranked candidates, scores, retrieval-mode detail and checkpoint names MUST be collapsed behind an explicit "details" affordance.
- **FR-018**: Where the showcase names the underlying models, it MUST use plain human labels, exposing exact checkpoint names only on demand.
- **FR-019**: The showcase MUST remain usable with no account, key or configuration beyond accepting the model download, and MUST show a plain, honest message plus the matched content when the browser cannot run the model, instead of a blank or permanently loading panel.
- **FR-020**: Clearing the conversation MUST reset the showcase to its calm initial state and release the on-device model's memory as the current behaviour does.
- **FR-021**: The assistant's page side effects MUST continue to work on the always-open page: focusing a topic scrolls to and spotlights the matching block without collapsing anything; hiding and re-showing a section removes and restores it in its original position, including the showcase section itself. These are assistant-only capabilities — the page itself MUST NOT expose a manual hide, collapse or expand control.
- **FR-022**: The content sources, section labels and accent actions the assistant uses MUST keep matching the redesigned page, so retrieval results and the committed evaluation remain valid without re-tuning.
- **FR-023**: The home page MUST remain a single-page experience with no additional routes; the blog teaser, the full blog article and the projects page MUST all remain reachable and MUST adopt the same simplified styling without losing their existing content.
- **FR-024**: All existing content MUST be retained — introduction, education, skills, hobbies, projects, the blog list and article, contact links and the explanation of how the on-device AI works — with nothing removed as part of simplification.
- **FR-025**: Anchor links and deep links to sections, the blog article and the projects page MUST continue to resolve and land on the correct content.
- **FR-026**: The redesign MUST NOT introduce any backend, account, tracking, telemetry or third-party data collection, and MUST NOT add live in-session performance readouts; every displayed value MUST come from content or published results already shipped with the site.

### Key Entities *(include if feature involves data)*

- **Statistic**: One headline number or phrase in the band. Attributes: identifier, derived value (computed from its source at build time, never hand-entered), unit or suffix, short label, one-line context note, group (career or engineering), source pointer (site location or published artifact), whether it is numeric (count-up eligible) or textual, and a source-verification state (derivable from shipped data → included, or not derivable → dropped before rendering).
- **Statistic Group**: A labelled cluster of statistics (career/person versus site engineering), with a heading and a short explanatory line. A group renders only if it contains at least one sourced statistic.
- **Reveal State**: Per-section record of whether the section has already been shown to the visitor during this page load, used to guarantee reveals and count-ups happen at most once.
- **Section Visibility**: Record of which home-page sections the assistant has hidden or shown, preserved on the always-open page, now including the showcase section. It is not driven by any visitor-facing control.
- **Evaluation Reference**: The committed summary of retrieval/action performance (hit rate, injection coverage, action pass rate, mean latency) that engineering statistics read from.
- **Showcase Session**: The single live assistant conversation shared by the inline showcase and the floating launcher, with its loaded model state, working status, last answer, content sources consulted, an expandable technical-detail state, and an error/unavailable state.
- **Conversation Entry Point**: The two ways into the showcase session — the always-open inline section and the compact launcher — which must never create a second conversation. Both exist on the home page only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can read every home-page section's content after zero clicks, versus the current default where 3 of 4 sections require a click to reveal.
- **SC-002**: 100% of body paragraphs render at 60–75 characters per line on a 1440px-wide viewport, and no body or label text falls below the site's documented minimum size at any supported viewport.
- **SC-003**: 0 statistics are displayed with a hand-entered value or without a traceable shipped source, 0 placeholder, dash or zero values stand in for missing data, and the band renders only when at least one derivable statistic exists.
- **SC-004**: Every numeric statistic finishes its count-up in under 1.5 seconds, and 0 statistics re-animate after leaving and re-entering the viewport.
- **SC-005**: With reduced motion enabled, 0 reveal, count-up or blink animations run, and 100% of content is visible at final state on load.
- **SC-006**: All text on the page meets a 4.5:1 contrast ratio against its background in all three accent themes, verified for headings, body, labels, statistics and the assistant panel.
- **SC-007**: The number of decorative chrome elements per section drops by at least half compared with the current design, and display typeface coverage drops to the site name plus section headings only.
- **SC-008**: A first-time visitor can reach the showcase and send a first question in under 30 seconds, with no account, key or setup beyond accepting the model download.
- **SC-009**: 0 technical checkpoint names, score bars, candidate lists or retrieval-mode chips are visible in the showcase's default state; all of them are behind one explicit details affordance.
- **SC-010**: The inline showcase and the floating launcher open the same conversation in 100% of cases, and closing the launcher restores the previous scroll position in 100% of cases.
- **SC-011**: When the on-device model cannot run, the showcase still displays the content the question matched in 100% of cases, with one plain-language explanation and no indefinite loading state.
- **SC-012**: Asking the assistant to show a topic still scrolls to and spotlights the right block in 100% of the covered topics; hiding and restoring a section still works for all four sections plus the showcase.
- **SC-013**: Every displayed engineering statistic matches its published source after a rebuild, including after the evaluation results are regenerated.
- **SC-014**: The site passes its mandatory verification gates with zero errors, and the retrieval evaluation passes with zero missed test cases.
- **SC-015**: No visible layout shift occurs while animations run (content does not reflow when count-ups finish or reveals complete).
- **SC-016**: At least 90% of first-time testers can name one career statistic and one engineering statistic from the band within 10 seconds of landing, when the band is present.

## Assumptions

- **Page structure**: The home page becomes one editorial scroll with all sections open, ordered top to bottom as introduction → statistics band → on-device showcase → the remaining sections. The on-device assistant becomes an inline showcase section plus a compact floating launcher instead of a permanent left dock; the launcher is scoped to the home page. The blog-article and projects sub-pages remain separate views reached by link, with their content retained and no assistant entry point.
- **No visitor-facing collapse**: Sections are never collapsible by the visitor — there is no expand/collapse control, no collapsed state and no accordion behaviour. All sections render permanently open. Hiding a section and scrolling to/spotlighting one are assistant-only capabilities, invoked through the chat; a visitor restores a hidden section by asking the assistant for it again. The "expanded" concept disappears from reading entirely.
- **Governance**: The site's project principles require the home page to stay a single page of in-place sections rather than adding routes, and require the pixel aesthetic to remain. Both hold. The principles describe sections as collapsible pixel windows and place the assistant in the left dock; this feature removes visitor-facing collapse and moves the assistant out of the dock, so those clarifying amendments are raised explicitly during planning rather than silently diverging.
- **Statistics content**: Career statistics come from what the site already states (years building software since the start of the computer-science degree in 2012, two degrees, open-source project count, blog post count, location/employer context). Engineering statistics come from the shipped on-device stack and the committed evaluation results (on-device parameters, number of retrieval modes, top-k sources injected, hit rate, mean retrieval latency). No new personal tracking or habit data is invented.
- **No fabricated numbers**: A statistic is included only when its value can be computed from shipped content or committed results at build time. Anything that would only exist after a model download, a live measurement or guesswork is omitted — the band shrinks or disappears rather than showing a dash, a zero or an estimate. The statistics set is small and stable rather than a fabricated "live" feed.
- **No live instrumentation**: The redesign adds no tokens-per-second meters, live timing counters, session telemetry or score readouts. The showcase displays published values and its own answer state only.
- **Blog is retained in full**: The blog list, the "Chat with my website" article, its evaluation explanation and its comparison visuals stay available and keep their content; they are restyled to the calmer visual language rather than removed or truncated.
- **Showcase simplification**: "Simpler" means progressive disclosure, not capability loss — primary view = input, answer, a plain line naming the content used, and a control to clear the conversation; ranked candidates, scores, retrieval modes and checkpoint names move behind an explicit details affordance that remains fully available.
- **One session**: The inline section and the launcher are two entrances to one conversation so a visitor never loses an answer by scrolling away or opening the launcher.
- **Motion budget**: Motion is subtle and brief (reveals well under half a second, count-ups under 1.5 seconds, stepped easing), and motion never gates content visibility.
- **Reference interpretation**: The inspiration taken from the reference site is the data-card/statistics presentation, generous spacing, editorial single-column reading, and tasteful reveal motion — not its photographic gallery, its light palette, or its page routes.
- **Design contract**: The site's documented design rules (global stylesheet, palette variables, notched corners, no border-radius above 2px, stepped easing, accessibility conventions) continue to apply; the redesign simplifies within them and does not require loosening them. If a rule must change, it is changed explicitly and documented, not bypassed.
- **Content stays retrievable**: Any content source or section label the on-device assistant uses keeps its identity, so retrieval and the committed evaluation results remain valid.
- **Scope boundary**: This feature is a presentation, content-surfacing and interaction-simplification change. It does not change the chat model, retrieval algorithms, evaluation methodology, or deployment model.

## Dependencies

- The committed evaluation results artifact remains the single source for engineering performance statistics.
- The site's existing content data remains the source for career statistics.
- The site's existing assistant integration points (section labels, content sources, layout state) remain available to the redesigned page.
- The on-device model download and browser capability detection continue to behave as today; the showcase only changes how that state is presented.
