# Quickstart — Readable Pixel Page with Animated Statistics

**Feature**: `007-readable-pixel-stats` | **Date**: 2026-11-13
**Purpose**: Prove end-to-end that the page is readable without interaction, that every statistic is derived from shipped data, that motion is one-shot and motion-safe, and that the assistant still works from two entry points with one conversation.

References: [`contracts/statistics-band.md`](./contracts/statistics-band.md), [`contracts/chat-session.md`](./contracts/chat-session.md), [`contracts/section-layout.md`](./contracts/section-layout.md), [`data-model.md`](./data-model.md).

---

## 1. Prerequisites

- Node.js `^20.19.0 || >=22.12.0`
- A Chromium-based browser (WebGPU for the full demo) and, for the fallback check, a browser/profile with WebGPU disabled
- A wide viewport (≥ 1440 px) and device emulation at 480 px
- OS reduced-motion toggle (or browser DevTools → Rendering → *Emulate `prefers-reduced-motion: reduce`*)

## 2. Setup and baseline commands

Run from `frontend/`:

```bash
npm install
npm run dev            # http://localhost:5173/about-me/ (predev regenerates public/llms)
npm run generate:llms  # only if page copy changed
```

Mandatory gates (run at least once before reporting the feature complete):

```bash
npm run lint           # oxlint + eslint, both --fix: review any edits
npm run build          # vue-tsc --build + vite build
npm run eval:retrieval # must exit 0: zero held-out test misses
npm run eval:chain -- --modes=bm25   # only if shared modules it imports changed
```

Expected: lint clean after fixes, build succeeds with no type errors, retrieval evaluation reports `100%` on the held-out test split and exits `0`. There is no unit-test suite; §3 is the functional verification.

## 3. Validation scenarios

### S1 — Zero-click reading (US1, FR-001, SC-001)

1. Open the site in a fresh private window; do not click anything.
2. Scroll from top to bottom once.

**Expected**: the name/photo/bio, the statistics band, the showcase, education, skills, hobbies, all blog teasers, the project summary and the contact links are all present and readable. No `+`/`−` control, no chevron, no collapsed region anywhere. `<section>` headers contain an `<h2>`, not a `<button>`.

### S2 — Reading measure and type floor (FR-002, SC-002)

1. At 1440 px, open DevTools and measure a body paragraph's rendered line width in characters (e.g. select the text, count, or use a `ch`-aware overlay).
2. Check computed font sizes for body, labels, statistic notes and cap labels.

**Expected**: body text is 60–75 characters per line; no semantic text below `0.75rem` (12 px) at default zoom; display type appears only on the site name and section headings (project/card titles and statistics use the body font).

### S3 — Narrow viewport (FR-013, US1 scenario 3)

1. Emulate 480 px width (and separately 375 px).

**Expected**: single column; no horizontal scrolling; headings wrap to at most two lines; statistic values and labels are complete (no ellipsis); the stats grid is one column and the showcase input/send/transcript are usable.

### S4 — Statistics are real and sourced (FR-006/FR-007, SC-003, SC-013)

1. Note each card's value, label, note and link.
2. Verify against shipped data:
   ```bash
   grep -n "period" src/data/siteData.ts                       # earliest year → career-years
   grep -n "education:" -A 12 src/data/siteData.ts              # degree count
   grep -n "items:" src/data/siteData.ts                        # tools total
   grep -n "retrievalHitRate\|meanLatencyMs" src/data/evalResults.ts | head
   grep -n "name: 'about\|name: 'projects\|name: 'contact\|name: 'blog\|name: 'site_index" src/tools/registry.ts | wc -l
   ```
3. Change one source (e.g. add a temporary skill item or edit an education period), restart `npm run dev`, reload.

**Expected**: every displayed value matches the current source; after the source edit the corresponding card changes with no edit to `siteStats.ts` or any component. `career-years` equals build year minus the earliest education start year (no `new Date()` in the browser path). No card shows a dash, zero placeholder or estimate.

### S5 — Empty and partial statistics (FR-005/FR-007, SC-003)

1. Temporarily force one derivation to return `null` (e.g. return `null` for `latency`); reload.
2. Then force all derivations to `null`; reload.
3. Revert the temporary edits.

**Expected**: (1) the band still renders, the affected card is gone and the grid closes the gap; (2) no band element exists at all — inspect the DOM for a stats wrapper, and confirm the showcase sits directly beneath the intro with no empty region.

### S6 — Count-up once, no replay, no shift (FR-008, FR-011, SC-004, SC-015)

1. Reload, watch the band enter the viewport.
2. Scroll to the bottom, then back up; navigate to the blog article and back.
3. Use DevTools performance/layout-shift indicators (or the Layout Shift overlay) while numbers finish.

**Expected**: each numeric card counts from 0 to its value once in under 1.5 s with stepped motion; the final value is exact; scrolling back, route returns and theme changes do not replay it; no layout shift at completion (card width reserved, tabular numerals). Cards already on screen animate once; cards below the fold animate on first view.

### S7 — Reduced motion (FR-010, SC-005)

1. Enable the OS reduced-motion setting (or DevTools emulation) and reload.

**Expected**: no reveal, count-up, blink or pulse runs; all statistics show final values immediately; all content is visible (nothing transparent or offset). Re-enable motion and confirm normal behaviour returns without a reload requirement.

### S8 — Keyboard and screen reader (FR-009, US1 scenario 4)

1. Tab from the top of the page. Note focus order and focus-ring visibility.
2. With a screen reader (VoiceOver/NVDA/Orca), navigate to the statistics band.

**Expected**: every link and control is reachable in visual order with a visible `:focus-visible` outline; section content is focusable/readable because nothing is collapsed; a card announces its label and final value once (no digit-by-digit announcements); the group heading provides an accessible name.

### S9 — Assistant default view and details (FR-015/FR-016/FR-017/FR-018, SC-008, SC-009)

1. Scroll to the showcase. Without expanding anything, inspect the visible controls.
2. Ask a question and wait for the streamed answer.
3. Expand the single technical-details disclosure.

**Expected**: default view shows only the plain explanation, transcript, input/send, the "Used: …" line in plain words and a clear control. No mode chips, score bars, candidate rows, latency stats or checkpoint names are visible. The details disclosure is the only expandable element in the showcase, and once opened it exposes mode chips, top-k, ranked candidates/scores, exact checkpoint names, sampling and Save trace — all still functional. A first question needs no account/key, only accepting the model download.

### S10 — Hybrid failure states (FR-019/FR-020, SC-011)

1. Set DevTools network throttling/offline after first load, or disable WebGPU and use a browser that cannot start WASM model loading.
2. Send a question.

**Expected**: one plain sentence explains the limitation, a Retry action appears, no spinner runs forever, and the content the question matched is still named in the "Used: …" line. Clearing returns the calm initial state, closes the details and releases the model (confirm memory/network drop in the Network/Performance panel).

### S11 — Launcher shares one conversation (FR-016/FR-021, SC-010, SC-012)

1. Ask a question inline, then scroll far away.
2. Open the launcher; compare the transcript; close it.
3. Ask from the launcher; close and inspect the inline showcase.
4. Ask Mini-Michi to hide a section, then to show it again; ask for a topic.

**Expected**: the launcher shows the same conversation (same messages, no new empty chat); closing returns to the same reading position; an answer asked from the launcher appears inline exactly once; hide removes the section and its card space (statistics stay truthful), show restores it in place; a topic request scrolls to and spotlights the block without collapsing anything. Keyboard: the launcher trigger reports `aria-expanded`, focus moves into the panel, Tab stays inside, Escape closes, focus returns. No launcher exists on the blog article or projects page.

### S12 — Minimal chrome and themes (FR-003/FR-004/FR-014, SC-006, SC-007)

1. Inspect a section: count border treatments, accent families and dividers; check for chrome dots / toggle glyphs.
2. Ask Mini-Michi to switch to each theme (amber → orange → red).
3. Check contrast in each theme (DevTools colour picker or axe).

**Expected**: at most one outer border treatment, one accent family and one divider per section; no window-control ornament that does nothing; the statistics band, links, focus rings and highlights follow the accent; every text/background pair is ≥ 4.5:1; corners remain chamfered (no radius > 2 px), shadows are hard offsets, motion stays stepped.

### S13 — Blog article and projects page (FR-023/FR-024/FR-025)

1. Open `#/blog/chat-with-my-website` and `#/projects`, then use the back links.
2. Confirm the article still shows its flow diagram, model cards, article links, and the evaluation section (all copy intact).
3. Deep-link directly to `#/blog/chat-with-my-website` and to `#about-skills`.

**Expected**: both views adopt the calmer chrome, keep all existing content and the evaluation block (now with an `eval-results` anchor), resolve deep links correctly, show no fake window controls, and offer no assistant entry point.

## 4. Automated gate outputs to record

| Command | Expected |
|---------|----------|
| `npm run lint` | exit 0 after auto-fixes; review the diff |
| `npm run build` | exit 0; no TypeScript errors; `dist/` not committed |
| `npm run eval:retrieval` | exit 0; held-out `test` split has zero misses; `bm25` still 100% |
| `npm run eval:chain -- --modes=bm25` | exit 0; artifact regenerated only if evaluation inputs changed (not expected) |

## 5. Follow-ups this feature requires before/with implementation

1. **Constitution amendment** (governance, MINOR): Principles II and V as described in `plan.md` → Constitution Check; record a Sync Impact Report and bump the version/date. Implementation MUST NOT ship with the old wording unchanged.
2. **DESIGN.md**: replace the collapsible-window/navigation rules with the static-heading, one-border, body-type and motion rules; document the stats band and launcher.
3. **AGENTS.md**: update the "Adding a new pixel-window section" checklist (no toggle/`aria-expanded`, always-open bands, stats derivation, shared chat session) so future sections don't reintroduce chrome or collapse.
4. **Content copy in `public/llms/*.md`**: only if the page's prose about the layout/statistics is updated; otherwise leave untouched to keep the committed retrieval evaluation valid. If changed, run `npm run generate:llms` and re-run `npm run eval:retrieval`.
