---
name: Michael Jaumann — About Me
description: Retro pixel-art CRT desktop for an on-device AI portfolio
colors:
  soot-brown: '#171310'
  cabinet-panel: '#201a13'
  cabinet-panel-raised: '#2a2118'
  warm-bone: '#f6efe4'
  warm-bone-dim: '#d8cdbb'
  hardware-border: '#4a3f32'
  hardware-border-light: '#5b4c3c'
  phosphor-amber: '#fbbf24'
  marquee-yellow: '#fde047'
  signal-orange: '#f97316'
  alert-red: '#f87171'
  signal-pink: '#f0abfc'
  deep-shadow: '#100c07'
typography:
  display:
    fontFamily: "Bungee Spice, Bungee, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.15
  title:
    fontFamily: "Bungee Spice, Bungee, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Stack Sans Notch, system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0.005em"
  label:
    fontFamily: "Stack Sans Notch, system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.06em"
  mono:
    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', monospace"
    fontSize: "0.6875rem"
rounded:
  none: "0px"
  sm: "2px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
  3xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.cabinet-panel-raised}"
    textColor: "{colors.marquee-yellow}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.phosphor-amber}"
    textColor: "{colors.deep-shadow}"
  button-send:
    backgroundColor: "{colors.phosphor-amber}"
    textColor: "{colors.deep-shadow}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1.25rem"
  chip:
    backgroundColor: "{colors.cabinet-panel-raised}"
    textColor: "{colors.warm-bone}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.75rem"
  card:
    backgroundColor: "rgba(16, 12, 7, 0.35)"
    textColor: "{colors.warm-bone}"
    rounded: "{rounded.sm}"
    padding: "1.5rem"
  input-field:
    backgroundColor: "rgba(16, 12, 7, 0.5)"
    textColor: "{colors.warm-bone}"
    rounded: "{rounded.sm}"
    padding: "0.625rem 0.875rem"
  window-panel:
    backgroundColor: "{colors.cabinet-panel}"
    textColor: "{colors.warm-bone}"
    rounded: "{rounded.sm}"
    padding: "2rem 2rem 2.25rem"
  window-bar:
    backgroundColor: "{colors.cabinet-panel-raised}"
    textColor: "{colors.warm-bone}"
    padding: "1rem 1.5rem 1.125rem"
---

# Design System: Michael Jaumann — About Me

## Overview

**Creative North Star: "The Amber CRT Workbench"**

The site is a warm terminal glowing in a dark room. Every piece of content sits inside a chunky
"pixel-window" — a hard-edged, notched panel with a labelled title bar — stacked on a dark, grainy
desktop. The whole surface reads as one machine: the left dock runs Mini-Michi and the tool
retriever, the right column holds the profile and its collapsible sections. There is no chrome
borrowed from modern SaaS; the interface is assembled from bevels, hard shadows, and phosphor
accents, and it is proud of it.

The mood is warm and nostalgic without becoming a costume. Colors stay on a single warm brown
axis, so the screen feels like an old amber monitor rather than a flat dark theme. Controls,
however, are precise and terminal-like: compact, bordered, and unambiguous. The nostalgia lives in
the material, not in sloppy interaction — every affordance is legible, focusable, and keyboard-
operable.

The assistant is a first-class citizen, not a bolt-on: it lives in the same window chrome, uses the
same chips and buttons, and its retrieval step is shown in the open. The design's job is to make
"a real model running in your browser" feel tangible and trustworthy.

**Key Characteristics:**

- Hard, structural pixel shadows and notched (never rounded) corners.
- One warm ground, one amber voice; every hue lives on the brown axis.
- Marquee display type for names and numerals; technical sans for everything readable.
- A visible, honest system: state badges, progress bars, and tool scores are part of the look.
- Stepped, frame-y motion — `steps(2, end)` and CRT flicker, never smooth easing.

## Colors

A warm dark-brown foundation lit by a single amber accent, with orange as its hot companion and
red/pink reserved for state.

### Primary

- **Phosphor Amber** (#fbbf24): The single interactive accent. Focus outlines, active mode chips,
  progress bars, diagram edges, icon color, list bullets, and the primary send button. If a control
  is live, it is amber.
- **Marquee Yellow** (#fde047): The "lit text" accent — window titles, headings, link labels, and
  button text. Warmer and brighter than the accent; used where the eye should read, not click.

### Secondary

- **Signal Orange** (#f97316): The companion heat. Chip borders, the animated title-bar stripe, and
  the LinkedIn hover. Always paired with amber, never a stand-in for it.

### Tertiary

- **Alert Red** (#f87171): Error state only — the `--error` badge, error messages, the stop button.
- **Signal Pink** (#f0abfc): A rare third chip/tech-card tint. Never a primary or state color.

### Neutral

- **Soot Brown** (#171310): The page ground. Body background and the darkest recesses.
- **Cabinet Panel** (#201a13): Base panel fill for windows and cards.
- **Cabinet Panel Raised** (#2a2118): Raised surfaces — window bars, chips, buttons, hover states.
- **Warm Bone** (#f6efe4): Primary ink. Body copy and labels.
- **Warm Bone Dim** (#d8cdbb): Secondary ink. Teasers, meta, placeholders, inactive toggle.
- **Hardware Border** (#4a3f32): The default 1–2px stroke on every panel, chip, and divider.
- **Hardware Border Light** (#5b4c3c): Hover and emphasis stroke, and chrome-square outlines.
- **Deep Shadow** (#100c07): The near-black behind every offset shadow and on-accent text.

### Named Rules

**The One Accent Rule.** Phosphor Amber is the only true interactive color; orange is its
companion, red and pink are state. Never introduce a fourth hue, and never use red or pink as
decoration.

**The Warm-Only Rule.** Every surface, ink, and border sits on the warm brown axis. No pure black,
no pure white, no cool gray. If a value looks blue or neutral-cool, it is wrong.

## Typography

**Display Font:** Bungee Spice (with Bungee, system-ui, sans-serif)
**Body Font:** Stack Sans Notch (with system-ui, -apple-system, sans-serif)
**Label/Mono Font:** ui-monospace stack (`SF Mono`, `Cascadia Code`, `JetBrains Mono`)

**Character:** Terminal-first. The loud display face is reserved for the few places that act as
signage — window titles, the name, project titles, and big step numerals — while the technical sans
carries every readable word. Monospace appears only where the interface is showing data: tool
ranks, scores, and inline code.

### Hierarchy

- **Display** (400, `clamp(1.75rem, 4vw, 2.5rem)`, 1.15): Page titles, the name, and the largest
  project heading. Always warm-bone or marquee-yellow, often with a hard text shadow.
- **Title** (400, `1.125rem`, 1.2): Window and card titles in the display face.
- **Body** (400, `1.0625rem`, 1.65, max ~65ch): Paragraphs, list items, chat messages. `text-wrap:
  pretty` on prose.
- **Label** (600, `0.8125rem`, `0.06em`, uppercase): Status badges, section kickers, retrieval
  labels, and the small chrome text.
- **Mono** (400, `0.6875rem`): Tool ranks and scores, and inline `code` inside chat.

### Named Rules

**The Marquee-Only Rule.** Bungee Spice appears only on signage — titles, names, and numerals. It
never sets a sentence of body copy. When in doubt, the technical sans wins.

## Layout

A centered two-column desktop on a max-width of 82rem (`app-layout`): a sticky left dock
(`minmax(18rem, 24rem)`) holding the chat, and a right column capped at 40rem (52rem for the wide
blog/projects pages). The columns sit 2.5rem apart with a 2rem top offset for the sticky dock. The
page itself centers vertically (`app-main`) with `4rem 1rem` padding.

Content is a vertical stack of full-width `pixel-window` sections with a 2.5rem gap. Density is
comfortable: panels pad `2rem 2rem 2.25rem`, cards `1.5rem`, chips `0.25rem 0.75rem`. Spacing
follows a 4px-based scale (`0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 2.5rem`).

Responsive behavior is breakpoint-light: at `max-width: 900px` the layout collapses to one column
and the dock becomes static (chat height capped at 42rem); at `max-width: 480px` paddings and type
steps shrink and the tool-result grid drops its score column. `html[data-zoom]` can set the root
font to 14px (compact) or 18px (comfortable) — a tool-driven content zoom, so all sizes are in
`rem`.

## Elevation & Depth

Depth is hard and structural, not soft. There are no blurred drop shadows anywhere: every raised
surface carries a solid offset block shadow (`4px 4px 0` for windows and cards, `2px 2px 0` for
chips, buttons, and messages) plus a pair of inset bevel lines that read as a lit top-left edge and
a shaded bottom-right edge. Windows and the chat panel use `filter: drop-shadow(...)` rather than
`box-shadow` so the notched corners clip cleanly.

The only glow in the system is the CRT highlight animation on spotlighted windows — a stepped amber
ring that pulses twice — and the `pixel-crt` opacity flicker on the avatar. Everything else stays
flat at rest.

### Shadow Vocabulary

- **Hard offset** (`4px 4px 0 0 rgba(16, 12, 7, 0.55)`): Windows, cards, project cards. The default
  structural elevation.
- **Soft offset** (`2px 2px 0 0 rgba(16, 12, 7, 0.5)`): Chips, buttons, messages, status rows.
- **Inset bevel** (`inset 2px 0 0 rgba(255,244,230,0.05)` + `inset -2px 0 0 rgba(0,0,0,0.4)`):
  Windows and the chat panel, top-left lit / bottom-right shaded.
- **Hover lift** (translate `-2px,-2px` + `6px 6px 0`): Project and blog cards on hover.

### Named Rules

**The Hard-Shadow Rule.** Depth is a hard offset block, never a soft blur. If a shadow is fuzzy, it
is wrong — except the deliberate amber glow of the CRT highlight.

## Shapes

The form language is cut, not curved. Radius never exceeds 2px; the signature is a **notched
corner** made with `clip-path: polygon(...)`, chamfering each of the four corners. The notch scales
with the element: 8px on windows and the chat panel, 6px on buttons and message bubbles, 4px on
chips and the send button. Borders are 1–2px solid `--pixel-border`, and the top-left/bottom-right
inset bevels complete the "moulded plastic" illusion.

Recurring geometry: 4px repeating stripes (the title-bar marquee and section rules), 12px corner
brackets on model cards, a large translucent numeral watermark, and square chrome dots in the
window bar (red / amber / orange).

### Named Rules

**The Notch Rule.** Corners are cut, never rounded. Any radius above 2px is a bug; express corner
softness as a `clip-path` chamfer instead.

## Components

### Buttons

- **Shape:** Notched (6px chamfer), 2px amber border, 2px radius.
- **Primary (`.pixel-link-btn`):** Raised panel fill with marquee-yellow text, `0.5rem 1rem`
  padding, hard 2px drop-shadow.
- **Hover / Focus:** Hover fills amber with deep-shadow text; active translates `1px,1px` and
  shrinks the shadow; focus shows a red 2px outline offset 2px; disabled drops to 45% opacity.
- **Send (`.pixel-chat__send`):** Amber fill with dark text, `0.5rem 1.25rem`. Turns red
  (`.pixel-chat__send--stop`) while generating.

### Chips

- **Style:** Raised panel fill, 1px hardware border, 4px notch, soft offset shadow, body font.
- **Variants:** `--amber`, `--orange`, `--red` tint the text and border only; the fill stays panel.
- **State:** Mode/filter chips (`.tool-selector__chip`) invert to amber fill with dark text when
  active, and double as buttons with `aria-pressed`.

### Cards / Containers

- **Corner Style:** 2px radius, square corners (cards are not notched).
- **Background:** `rgba(16, 12, 7, 0.35)` over the panel gradient.
- **Shadow Strategy:** Hard offset; project/blog cards lift on hover.
- **Border:** 1px hardware border; model cards add 12px corner brackets on hover.
- **Internal Padding:** `1.5rem` (cards), `1.25rem` (model cards).

### Inputs / Fields

- **Style:** Dark recessed fill `rgba(16, 12, 7, 0.5)`, 1px hardware border, 2px radius, body font.
- **Focus:** 2px amber `outline` with zero offset.
- **Disabled:** 50% opacity; placeholder uses warm-bone-dim at 70%.

### Navigation

- **Window bar (`.pixel-window__bar`):** A full-width button — display-font title left, square
  chrome dots, and a `−`/`+` toggle. The active edge carries a 4px amber/orange marquee stripe.
- **Page back-link (`.pixel-link-btn`):** Top-right `← Blog` / `← Home` on routed pages.
- **Contact links (`.pixel-contact__link`):** Icon + label, body font; hover nudges `2px` right and
  tints (orange for LinkedIn, amber for GitHub).
- **Inline links (`.pixel-link`):** Amber text with a dashed orange underline, brightening on hover.

### Section Window (signature)

The defining component: a `pixel-window` with a notched 8px frame, a gradient panel fill, inset
bevels, and a hard drop-shadow. The bar is a real toggle button (`aria-controls` + `aria-expanded`)
with a `−`/`+` control, and content fades in via the stepped `fade` transition. Sections can be
highlighted (`pixel-window--highlight`) or spotlighted (`pixel-spotlight`) by the AI tools.

### Tool Result Row (signature)

The retrieval demo's ranked list: a CSS-grid row showing rank badge, tool name, two-line
description, a striped score bar, monospace score, and an `IN CONTEXT` tag. Unselected rows sit at
55% opacity; selected rows go full opacity with an amber inset stripe. This is the visual proof
that context is being pruned.

## Do's and Don'ts

### Do:

- **Do** express every corner as a `clip-path` chamfer (4px chips, 6px buttons/messages, 8px
  windows); keep `border-radius` at or below 2px.
- **Do** use `--pixel-*` variables and the `--shadow-hard` / `--shadow-soft` tokens; never hardcode
  a color or shadow.
- **Do** animate with `steps(2, end)` (or `steps(4, end)` for progress) so motion feels frame-y.
- **Do** keep the single accent discipline: amber means interactive, orange means companion heat.
- **Do** keep window bars as real `<button>`s with `aria-controls` and `aria-expanded`, and keep
  `:focus-visible` outlines on every control.

### Don't:

- **Don't** introduce soft/blurred shadows, gradients with smooth falloff, or glossy highlights.
- **Don't** use `border-radius` above 2px, or any pill/rounded-corner shape.
- **Don't** add a cool gray, blue, or pure white/black to the palette — the world is warm-only.
- **Don't** set body copy in the display face; Bungee Spice is signage only.
- **Don't** put component `<style>` blocks in `.vue` files — all styling lives in
  `src/assets/main.css`.
