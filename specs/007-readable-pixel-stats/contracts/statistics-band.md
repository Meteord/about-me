# Contract: Statistics Band

**Feature**: `007-readable-pixel-stats` | **Consumers**: `StatsBand.vue`, `StatCard.vue`, `siteStats.ts`, `apps` (blog article links)
**Violation of this contract is a defect**: every displayed number must be traceable, and absence must never look like a value.

---

## C1. Producer contract — one derivation module

All statistic values are produced by `src/data/siteStats.ts`. No other module, component or template literal may compute a displayed statistic value.

```ts
type StatGroupId = 'career' | 'engineering'

type StatFormat =
  | { kind: 'integer' }
  | { kind: 'percent'; decimals: 0 | 1 }
  | { kind: 'duration-ms' }
  | { kind: 'text' }

interface Statistic {
  id: string                 // stable, kebab-case, unique
  group: StatGroupId
  label: string              // authored
  note: string               // authored, one line
  value: number | string | null
  numeric: boolean           // true only for count-up-eligible numbers
  format: StatFormat
  suffix?: string            // authored static unit
  source: { href: string; label: string } // authored link target + link text
}

interface StatisticGroup {
  id: StatGroupId
  title: string              // authored
  blurb: string              // authored, one line
  stats: Statistic[]         // only stats whose value !== null
}

/** Pure: no window/document/fetch/Date/localStorage access. */
function buildStatGroups(input: {
  buildYear: number
  site: typeof siteData
  eval: EvalResults
  sources: SourceDef[]
  maxInjectChars: number
  defaultMode: RetrievalMode
}): StatisticGroup[]
```

**Guarantees**

1. `buildStatGroups` is deterministic for a fixed input (no time, randomness or I/O).
2. A statistic whose value cannot be derived from shipped data is excluded from `stats` — not set to `null`, `0`, `''`, `'—'` or an estimate.
3. A group with no remaining statistics is excluded from the result; an all-empty result is `[]`.
4. `buildYear` is the only time input and is a compile-time constant (`__BUILD_YEAR__`, defined in `vite.config.ts`, declared in `env.d.ts`). The module never calls `Date`/`new Date()`.
5. The numeric derivations are limited to the table in [`../data-model.md`](../data-model.md) §3; adding a statistic requires a new derivation function and a source that ships with the site.

## C2. Value semantics (no fabricated data)

| Situation | Required behaviour |
|-----------|--------------------|
| Source data present and parseable | Render `format(value)` |
| Source missing a field (e.g. no parseable year) | Drop the statistic silently |
| `evalResults.modes` empty (fresh checkout without artifact) | Drop engineering statistics; keep career statistics |
| Partial data (e.g. hit rate present, latency mode missing) | Drop only the affected statistic |
| Formatting yields a non-finite or negative number | Drop the statistic |
| Non-numeric value (e.g. `Munich · KIES`, `< 1ms`) | Render final text immediately; `numeric: false`; no counter |

**Explicitly forbidden**: placeholder cards, skeleton cards, `0` for unknown, dashes, "n/a", hard-coded current year, `new Date()` in the browser, reading `evalResults.cases` to recompute aggregates (the committed aggregates are the source), using the training split for the headline hit rate.

## C3. Rendering contract (`StatsBand.vue`, `StatCard.vue`)

1. Band root is `<section aria-labelledby="stats-title">`; it renders **only** when `buildStatGroups()` returns at least one non-empty group. When empty, the component emits no DOM at all (no wrapper, no margin, no `.pixel-window` shell).
2. Group is a `<section>` (nested) with an `<h3>` title and one-line blurb. Groups appear in fixed order: career, engineering.
3. Card is a semantic unit with a visible label, the value, the one-line note and one link. Card values:
   - number: `<span class="stat-card__value">` containing animated digits (`aria-hidden="true"`) plus a static `.pixel-sr-only` node with `"{label}: {finalValue}{suffix}"`;
   - non-number: the same structure with the text as the final value and no animation.
4. Numeric cards expose the final formatted value to assistive technology at all times; intermediate animation frames are never announced (no `aria-live` on the counter).
5. Values never truncate: no `text-overflow: ellipsis`, no fixed `max-width` on the value; the counter box uses tabular numerals and reserves the final width (or `min-width` per card) so completion causes no layout shift.
6. Grid: 1 column `< 640px`, 2 columns `640–1023px`, up to 4 columns `≥ 1024px`; the band is inside the page's reading column but may span the wider grid width.
7. Labels/notes use `--type-body`/`--type-small` and the body font. The display font is not used for card values or titles (SC-007).
8. Links use the existing `.pixel-link` treatment and are keyboard reachable in visual order; the whole card is not a link (no nested interactive elements).

## C4. Motion contract

1. A numeric card animates `0 → value` at most once per element per page load, within ≤ 1.2 s, with stepped easing (`steps(4, end)` or CSS `steps()`), and snaps to the exact final formatted value.
2. Non-numeric cards and `percent` units animate only the digits (the `%`/`ms`/`M` suffix is static and always visible).
3. `prefers-reduced-motion: reduce`, missing `IntersectionObserver`, or a failed animation-module import ⇒ final value immediately, no transition, no hidden state.
4. Cards that are already in the viewport on load animate once; cards scrolled past without being seen show their final value when they first intersect. Scroll-back never replays.
5. No animation changes layout: no width/height/margin/font-size animation; the card's box is stable at first paint.
6. Theme changes (`amber`/`orange`/`red`) do not restart, cancel mid-way or re-trigger any count-up or reveal.

## C5. Acceptance checks

- [ ] Change `siteData.education` (add an entry / change a period) → rebuild → `career-years`/`degrees` change with no code edit.
- [ ] Regenerate `evalResults.ts` → rebuild → `hit-rate` and `latency` change with no code edit.
- [ ] Temporarily force every derivation to return `null` → the band is absent and the showcase immediately follows the intro.
- [ ] Force only `latency` to return `null` → all other cards keep their layout; no gap where the card would be.
- [ ] Inspect a card's value with a screen reader → final value is read once; no digit-by-digit announcements.
- [ ] Enable reduced motion → no reveal/count-up; all values final on first paint.
- [ ] Resize to 480 px → one column, no truncated value, no horizontal scroll.
