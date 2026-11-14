# Data Model — Readable Pixel Page with Animated Statistics

**Feature**: `007-readable-pixel-stats` | **Date**: 2026-11-13 | **Plan**: [`plan.md`](./plan.md)

This feature introduces no persisted data and no backend. The model below describes (a) the presentation-time entities the new UI needs and (b) the derivation rules that decide which statistics may exist. All values are computed from shipped static modules; nothing is stored.

---

## 1. Statistic

One card in the band.

| Field | Type | Required | Source | Rules |
|-------|------|----------|--------|-------|
| `id` | stable string | yes | authored | Unique; kebab-case; used for `key` and test addressing (`career-years`, `degrees`, `tools`, `base`, `model-params`, `sources`, `hit-rate`, `latency`). |
| `group` | `'career' \| 'engineering'` | yes | authored | Must match its group's id. |
| `label` | string | yes | authored | Short noun phrase, sentence case, ≤ 5 words, no trailing period. |
| `note` | string | yes | authored | Exactly one line of context; must name the source in plain words ("since the degree started in 2012"). |
| `value` | `number \| string \| null` | yes | derived | `null` ⇒ statistic is dropped before rendering (never substituted). |
| `numeric` | boolean | yes | derived | `true` only when `typeof value === 'number'` and the value counts up; non-numeric visits render final text immediately. |
| `format` | `StatFormat` | yes | authored | `{ kind: 'integer' } \| { kind: 'percent', decimals: 0 } \| { kind: 'duration-ms' } \| { kind: 'text' }`, plus optional `suffix`/`prefix`. |
| `suffix` | string? | no | authored | Static unit rendered outside the animated digits (`yrs`, `M`, `ms`, `%`). |
| `source` | `StatSource` | yes | authored | `{ kind: 'anchor', href } \| { kind: 'route', href }` — a visitor-clickable pointer to where the value came from. |
| `href` | string | yes | authored | In-page anchor (`#about-education`) or existing hash route (`#/blog/chat-with-my-website#eval-results` not used — hash routes carry one fragment, so the blog link uses the article route and the evaluation anchor is documented in the note). |

**Invariants**

- `value === null` ⇒ the statistic never reaches the DOM. There is no `'—'`, `0`, `NaN`, `undefined` or "n/a" state.
- `numeric === false` ⇒ no count-up, no animation, value rendered as final text.
- Displayed value always equals `format(value)`, including after an interrupted animation (final snap).
- `label`, `note`, `suffix` and `source` are the only hand-authored fields; `value` never is.
- The card's number is not the only carrier of meaning: `label` + `note` must make sense if the number is hidden (screen-reader sibling reads `label: value note`).

## 2. StatisticGroup

| Field | Type | Rules |
|-------|------|-------|
| `id` | `'career' \| 'engineering'` | Unique. |
| `title` | string | Authored, e.g. "The person" / "This site". |
| `blurb` | string | One line explaining the group's nature and source. |
| `stats` | Statistic[] | Only non-null statistics; may be empty. |

**Invariants**

- A group with `stats.length === 0` is not rendered (no heading, no empty grid).
- If all groups are empty, `StatsBand` renders nothing at all — no wrapper, no spacing, no placeholder (`v-if` at the band level, not `display:none`).
- Bands/groups never read layout visibility: hiding a section does not remove a statistic (values remain truthful).

## 3. StatDerivation (the only producer of `value`)

A pure function per statistic, co-located in `src/data/siteStats.ts`:

```text
derive(build: BuildContext) -> number | string | null
```

`BuildContext` = `{ buildYear: number, site: typeof siteData, evalResults, sources: SourceDef[], maxInjectChars: number, defaultMode: RetrievalMode }`.

**Derivation table**

| Statistic | Reads | Computation | Drop condition |
|-----------|-------|-------------|----------------|
| `career-years` | `site.education[].period` | `buildYear - min(parseStartYear(period))` | No parseable year, or result `< 0` |
| `degrees` | `site.education` | `.length` | Length `0` |
| `tools` | `site.skills[].items` | `sum(items.length)` | `0` |
| `base` | `site.location`, `site.employer` | `${location} · ${employer}` | Either string missing/empty |
| `model-params` | chat model entry in `site.tech` (`icon === 'chip'`) `.tags` | first `/^.*?(\d+)M$/` capture → integer | No matching tag, no chip entry, or `0` |
| `sources` | `SOURCES` | `filter(kind === 'content').length` | `0` |
| `hit-rate` | `evalResults.modes[].splits.test.retrievalHitRate` | `max(...)` | `modes` empty or all values non-finite |
| `latency` | `evalResults.modes` matched on `defaultMode`, `splits.test.meanLatencyMs` | that number | Mode missing or value non-finite/`< 0` |

**Invariants**

- No derivation reads `window`, `document`, the network, `localStorage`, or the visitor's clock. `buildYear` is the only time input and is a compile-time constant.
- `formatLatency` (already exported by `evalResults.ts`) is reused for `latency` so sub-millisecond values format as `< 1ms`; a formatted string means `numeric: false` for that card.
- Percentages are derived from the `gateSplit` (`test`) aggregates only — never train — matching the artifact's gating convention.
- If `evalResults` were missing/empty (e.g., a fresh checkout without the artifact), engineering statistics drop individually; the band still renders career statistics.

## 4. RevealState

Per-element, per-page-load record.

| Field | Type | Rules |
|-------|------|-------|
| `revealed` | boolean | Set once when the element first intersects; never reset while the page lives. |
| `mode` | `'pending' \| 'animated' \| 'immediate'` | `immediate` when reduced motion, no `IntersectionObserver`, or animejs load failure. |
| `startedAt` | number? | Monotonic timestamp for the ≤ 1.2 s counter budget. |

**State transitions**

```text
pending ──intersect──▶ animated ──finished──▶ revealed
pending ──reduce/unsupported/failure──▶ immediate ──▶ revealed
revealed ──scroll away/back──▶ revealed        (no replay)
page reload ──▶ pending                         (fresh state)
```

**Invariants**

- `revealed` is keyed by element identity (WeakSet), so Vue re-renders of the same node do not replay; a genuine remount creates a new element and may animate once more.
- Content is never left at `opacity: 0` or translated: `immediate` applies final styles synchronously; a 600 ms safety timer completes `pending` if no observer callback arrives.
- Counter output is `aria-hidden`; the final value also exists in a `.pixel-sr-only` node at all times.

## 5. SectionLayoutState (replaces the collapsible window state)

| Entity | Fields | Rules |
|--------|--------|-------|
| `SectionState` | `id: 'about' \| 'blog' \| 'projects' \| 'contact'`, `visible: boolean` | No `expanded` field exists. All sections default visible. |
| `SiteLayout` | `sections`, `theme: 'amber' \| 'orange' \| 'red'`, `highlight: SectionId \| null`, `spotlight: string \| null`, `zoom: 'compact' \| 'normal' \| 'comfortable'` | Same theme/zoom/highlight/spotlight semantics as today. |
| `SectionId` | union above (unchanged) | Registry `section` values, `SECTION_LABEL`, anchors and retrieval mappings stay valid. |

**Transitions**

- `setVisible(id, false)` → that section's band(s) unmount; `visibleSections()` no longer drives page order (order is fixed in `HomePage.vue`), only presence.
- `focusSection(id, { target })` → `highlight = id`, optional `spotlight = target`, scroll target into view; **no expansion state changes**.
- `setTheme(theme)` / `cycleTheme()` → document `data-theme`; no reveal/count-up reset.
- `setZoom(zoom)` → document `data-zoom`; stat grid and prose measure react through `rem`/`ch`.

**Invariants**

- No function in the layout module collapses, expands or reorders sections; the only mutators of visibility are the assistant action path and a test harness.
- `about` hides both the intro band and the about-details band (one id, two components).
- The showcase has no layout id and cannot be hidden by layout visibility; assistant hiding of the demo is out of the layout state (the demo's reachability is guaranteed by the launcher).

## 6. ShowcaseSession (single conversation)

Module-level singleton; both entry points read it.

| Field | Type | Rules |
|-------|------|-------|
| `messages` | `ChatMessage[]` | Discriminated union: `user`, `assistant` (streaming-capable), `retrieval` summary (plain names + collapsible rows), `action`, `error`. |
| `modelMessages` | `{ role, content }[]` | Chat history sent to the model; cleared by clear/new chat. |
| `input` | string | Shared by both surfaces. |
| `isGenerating`, `generatingId` | boolean / `number \| null` | One generation at a time; Stop cancels via `CancelledError` and keeps partial text if non-empty. |
| `model` | `{ status, device, dtype, progress, file, error }` | `idle \| checking \| loading \| ready \| error`; no load is triggered by mounting. |
| `retrieval` | `{ mode, topK, lastQuery, lastResult, vector, decide }` | Unchanged retrieval composable wiring. |
| `detailsOpen` | boolean | Technical-details disclosure; defaults closed on every page load and after Clear. |
| `sourcesUsed` | `{ names: string[], labels: string[] }` | Derived from the last retrieval's injected names mapped through `SOURCE_DEFS.title` / `SECTION_LABEL`; empty ⇒ render nothing (never "0 sources"). |
| `suggestions` | string[] | Random example questions; reshuffled after each turn. |

**Transitions**

```text
idle ──send──▶ retrieving ──theme action──▶ done (no model call)
                        └──content──▶ (load model if not ready) ──▶ streaming ──▶ done | error
streaming ──stop/cancel──▶ done (partial kept if non-empty)
any ──clear──▶ idle + dispose chat/vector/decide models + suggestions reshuffled + details closed
```

**Invariants**

- Two mounted surfaces render the same `ShowcaseSession`; there is no second message array and no second model instance. Mounting the launcher never starts a generation and never duplicates a streaming answer.
- `Clear` always releases model memory (`dispose()`, `disposeVector()`, `disposeDecide()`), preserving current behaviour.
- A failed model load leaves `sourcesUsed` visible, so matched content is still shown (SC-011).
- No telemetry/timing is recorded beyond the existing per-turn retrieval stats shown inside the details disclosure.

## 7. EntryPoint

| Field | Type | Rules |
|-------|------|-------|
| `kind` | `'inline' \| 'launcher'` | Exactly two, both home-only. |
| `open` | boolean (launcher only) | Launcher panel visibility; inline is always open. |
| `focusReturn` | HTMLElement \| null | Launcher holds the trigger element to restore focus on close. |
| `scrollContainer` | HTMLElement (per surface) | Each surface owns its own transcript scroll container; auto-scroll is local. |

**Invariants**

- Opening/closing the launcher never mutates `ShowcaseSession.messages`, `model`, or the inline surface's scroll container.
- Closing the launcher restores `window.scrollY` implicitly (fixed panel, no scroll lock on wide screens); on ≤ 480 px the scroll lock is released on close.
- Escape closes; Tab cycles inside while open; focus returns to the trigger. On routed pages neither entry point exists.

## 8. Relationships

```text
siteData ─┐
evalResults ─┼─▶ StatDerivation ─▶ Statistic* ─▶ StatisticGroup* ─▶ StatsBand (v-if groups exist)
registry ─┤                                                     └─▶ StatCard (RevealState + count-up)
buildYear ─┘

SectionLayoutState ─▶ HomePage visibility (about | blog | projects | contact)

useChatSession ─▶ ChatSurface (inline) ─┐
                └─▶ ChatSurface (launcher, dialog) ─┴─▶ ShowcaseSession (single)
                                                  └─▶ ChatDetails (detailsOpen)
```

## 9. Validation rules (testable)

1. Every rendered `Statistic.value !== null` and equals its `format(value)`.
2. No rendered statistic has a hand-entered numeric value: changing `siteData`/`evalResults`/`registry` and rebuilding changes the card, and grep finds no literal number in `siteStats.ts` except the format/derive constants.
3. With every derivation forced to `null`, `StatsBand` renders no root element and the showcase is directly adjacent to the intro (no gap).
4. `career-years` uses the build year, not `new Date()` in the browser (no date call in `siteStats.ts`).
5. `numeric` statistics animate once and land on the exact formatted value; non-numeric cards never animate.
6. Under reduced motion, `revealed` starts at `immediate` for every card; no opacity/transform/counter transition runs.
7. No section exposes a button, `aria-expanded` or `aria-controls` on its header; the only such pairs are the details toggle and the launcher.
8. Both entry points read the identical message array (same length and content at any instant).
9. Clear releases all three model handles and returns `detailsOpen` to `false`.
10. `SectionId` values, anchor ids and `SOURCE_DEFS.section` mappings are unchanged (retrieval/evaluation compatibility).
