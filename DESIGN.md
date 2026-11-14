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
    fontSize: "0.75rem"
rounded:
  none: "0px"
  sm: "2px"
shadow:
  hard: "4px 4px 0 0 rgba(16, 12, 7, 0.55)"
  soft: "2px 2px 0 0 rgba(16, 12, 7, 0.5)"
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
    backgroundColor: "{colors.cabinet-panel-raised}"
    textColor: "{colors.warm-bone}"
    rounded: "{rounded.sm}"
    padding: "1.5rem"
    shadow: "{shadow.soft}"
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
"pixel-window" — a hard-edged, notched panel with a labelled title bar — stacked in one editorial
column on a dark, grainy desktop. Everything is open: the introduction, the on-device assistant,
then background, blog, projects and contact. Nothing is hidden behind a toggle. There is no chrome
borrowed from modern SaaS; the interface is assembled from bevels, hard shadows, and phosphor
accents, and it is proud of it.

The stack opens with a person, not a document: the introduction band carries the name as signage, a
mono status readout, the greeting, two actions and a framed portrait. A slim "Jump to" menu bar
sticks to the top once the page scrolls, marking the band that currently fills the screen. Each
band's title bar ends with its own mono path (`~/background`), so the page reads as a filesystem of
open windows rather than a list of cards.

The mood is warm and nostalgic without becoming a costume. Colors stay on a single warm brown
axis, so the screen feels like an old amber monitor rather than a flat dark theme. Controls,
however, are precise and terminal-like: compact, bordered, and unambiguous. The nostalgia lives in
the material, not in sloppy interaction — every affordance is legible, focusable, and keyboard-
operable.

The assistant is a first-class citizen, not a bolt-on: it is a normal band in the scroll plus a
compact launcher, it uses the same chips and buttons, and its plain-language default view names
the content it used ("Used: skills, education"). The retrieval machinery — mode chips, scores,
candidate rows, checkpoint ids, trace export — lives behind one "Technical details" disclosure.
The design's job is to make "a real model running in your browser" feel tangible and trustworthy
without asking a reader to decode it.

**Key Characteristics:**

- Hard, structural pixel shadows and notched (never rounded) corners.
- One warm ground, one amber voice; every hue lives on the brown axis.
- Display type only as signage: the site name and section headings; technical sans everywhere else.
- One frame, one shadow, one heading row, one divider per section — ornament removed, not restyled.
- A portrait, not an avatar row: the first band introduces a person before it introduces the page.
- One sticky menu bar and one path readout per window: you always know where you are.
- Sourced numbers: every number on the page, the eval metrics included, is derived from shipped
  data and links to its source.
- Stepped, frame-y motion — `steps(2, end)` and CRT flicker, never smooth easing; one-shot only.

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

**Character:** Terminal-first. The loud display face is signage and nothing else — the site name
(`.pixel-name`), section headings (`.pixel-window__title`) and the inline blog article title. Every
other title, label, statistic numeral and body word uses the technical sans with weight and size
doing the hierarchy. Monospace appears only where the interface is showing data: tool ranks,
scores, model ids, and inline code.

### Hierarchy

- **Display** (400, `clamp(1.75rem, 4vw, 2.5rem)`, 1.15): The name and section headings. The
  inline blog article title keeps the display face at section-heading scale. Always warm-bone or
  marquee-yellow, often with a hard text shadow.
- **Section heading** (400, `1.5rem`, 1.2, display face): `.pixel-window__title` — the only
  heading role that keeps the display face.
- **Card / group title** (700, `1.25rem`–`1.5rem`, body face): project titles, statistics group
  titles, model card titles.
- **Statistic value** (700, `clamp(1.75rem, 3vw, 2.25rem)`, tabular numerals, body face): the
  counted numbers; never the display face, never truncated.
- **Body** (400, `1.0625rem`, 1.65, max 68ch): Paragraphs, list items, chat messages. `text-wrap:
  pretty` on prose.
- **Label** (600, `0.8125rem`, `0.06em`, uppercase): Status badges, section kickers, retrieval
  labels, and the small chrome text.
- **Mono** (400, `0.75rem`): Tool ranks and scores, model ids, and inline `code` inside chat.

No text is set below `--type-micro` (`0.75rem` / 12px).

### Named Rules

**The Signage-Only Rule.** Bungee Spice appears only on the site name, section headings and the
inline blog article title. It
never sets a card title, a statistic value, a status bar or a sentence of body copy. When in doubt,
the technical sans wins.

## Layout

One centered editorial column on a max-width of 76rem (`app-layout`), with the content column
capped at 72rem (`app-column`) and prose blocks capped at 68ch inside it. There is no dock lane and
no second column. The page pads `4rem 1rem 6rem` (the extra bottom space keeps the last band clear
of the fixed launcher).

Content is a fixed vertical stack with a 2.5rem gap: introduction → assistant showcase →
background → blog → projects → contact. The order is editorial, never data-driven. The "Jump to"
menu bar is the first row of that stack and sticks to the viewport top above 640px, marking the
band that currently fills the screen. The introduction is the only band laid out on two columns
(greeting + portrait); the background band is a two-column grid (education and hobbies stacked
beside a tall skills column); the blog article is a centred document (76ch) inside a full-width
frame. Density is comfortable: panels pad `2rem 2rem 2.25rem`, cards `1.5rem`, chips
`0.25rem 0.75rem`. Spacing follows a 4px-based scale (`0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 2.5rem`).

Responsive behavior is breakpoint-light: the background grid collapses to one column at 900px, the
introduction stacks with the portrait first at 720px, the project card stacks at 760px; at
`max-width: 480px` paddings shrink, the menu bar returns to a static two-line strip, headings stay
on one or two lines, the tool-result grid drops its score column, and the launcher panel takes the
usable width with a body scroll lock. Values and labels wrap, never truncate, and the page never
scrolls horizontally. `html[data-zoom]` can set the root font to 14px (compact) or 18px
(comfortable) — so all sizes are in `rem`.

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
- **Hover lift** (translate `-1px` + hard shadow): Statistic, project and blog cards on hover —
  layout-neutral, gated behind `@media (hover: hover)`.

### Named Rules

**The Hard-Shadow Rule.** Depth is a hard offset block, never a soft blur. If a shadow is fuzzy, it
is wrong — except the deliberate amber glow of the CRT highlight.

## Shapes

The form language is cut, not curved. Radius never exceeds 2px; the signature is a **notched
corner** made with `clip-path: polygon(...)`, chamfering each of the four corners. The notch scales
with the element: 8px on windows and the chat panel, 6px on buttons and message bubbles, 4px on
chips and the send button. Borders are 1–2px solid `--pixel-border`, and the top-left/bottom-right
inset bevels complete the "moulded plastic" illusion.

Recurring geometry: a single 2px solid divider (`.pixel-rule`) where a section needs one, 12px
corner brackets on model cards, and a large translucent numeral watermark. There are no window
chrome dots, no marquee stripe and no `−`/`+` toggle.

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

- **Menu bar (`.pixel-jump`):** A single full-width strip — "Jump to" plus the six band anchors in
  page order. Above 640px it is `position: sticky` at the viewport top and marks the band that
  fills the screen (`aria-current="location"`, amber underline); below 640px it returns to a
  static, wrapping strip. Every anchor target reserves `4.75rem` of `scroll-margin-top` for it.
- **Section heading row (`.pixel-window__bar--static`):** A full-width, non-interactive row —
  display-font heading on the left, the band's mono path on the right (`.pixel-window__crumb`,
  `~/background`), never a `<button>`: no `aria-expanded`, no `aria-controls`, no toggle.
- **Contact links (`.pixel-contact__link`):** Icon + label in a full-size target (44px minimum),
  raised panel fill and 1px hardware border; hover tints (orange for LinkedIn, amber for GitHub)
  and lights the border.
- **Inline links (`.pixel-link`):** Amber text with a dashed orange underline, brightening on hover.

### Section Window (signature)

The defining component: a `pixel-window` with a notched 8px frame, a gradient panel fill, inset
bevels, and a hard drop-shadow — one frame, one shadow, one static heading row, one path readout,
one accent family. Content is always rendered: a section is readable with zero clicks and there is
no collapsed state. Sections can be highlighted (`pixel-window--highlight`) or spotlighted
(`pixel-spotlight`) by the assistant, and hidden/shown by an assistant action (the band unmounts,
leaving no gap).

### Introduction Band

The first band is a person, not a table of contents. The title bar carries the name alone — display
face, one blinking terminal cursor, no anchor mark — with `~/about` on the right. The body is a
two-column grid: a mono status row (lit amber LED + `AI / ML ENGINEER / MUNICH, GERMANY`), the
greeting, the personal tags, and two actions (`Ask MJ-350`, primary; `See the projects`,
quiet). The portrait is a framed screen on the right — 2px amber bezel, 8px notch, faint scanlines,
a mono caption plate — cropped square from the 320px source. On phones the portrait moves above the
text at 120px wide.

### Statistics Band

`StatsBand.vue` / `StatCard.vue` remain available (counted values in tabular body numerals, static
units, a source link, `aria-hidden` animated digits, values derived in `src/data/siteStats.ts`) but
the band is **not** mounted in `HomePage.vue`.

### Assistant Showcase, Details and Launcher

The showcase is a normal band with a plain lead sentence and a **console**: one recessed screen
(8px notch, inset bevels, no lift — it is sunk into the panel, not raised above it) holding, top to
bottom, a plate (status LED, the assistant's name, its model readout, and a mono state word), the
scrollable transcript, a one-line status readout (`Answers cite the page sources they used.` with
the quiet Clear utility), and a `>` prompt row ending the screen. The prompt is the last line of the
console: the field is borderless, the `>` marker is amber mono, and Send inverts to a transparent
outline while there is nothing to send. Each answer's sources are chips aligned under its text
column. One native `<details>` labelled "Technical details" holds the retrieval panel, model ids,
dtype/device and trace export. The assistant's name lives in `assistant` (`src/data/siteData.ts`)
and is read by the band title, the console plate, the system prompt and the generated content. The
launcher is a fixed bottom-right trigger (`aria-expanded` + `aria-controls`) that opens a
`role="dialog"` panel rendering the same retriever and the same conversation; focus moves to the
input, Tab stays inside, Escape closes and returns focus. The trigger fades out and leaves the tab
order whenever it would land on top of the assistant band (it has nothing to add there), and
shortens to "Find" below 480px.

### Contact Sign-off

The closing band is a sign-off, not a strip of links: "Say hello." with a mono location readout on
the left and the two reach-me buttons on the right. The band uses the same frame and path readout
as every other band so the page ends on the same note it opened.

### Project Card

Two columns: the description and the GitHub action on the left, the stack on the right. The stack
is a spec sheet — two columns (frontend/backend) with the deployment group spanning both and its
items in two columns — so the card's halves stay the same height instead of one sparse column
beside a long list.

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
- **Do** keep section headings static (no `<button>`, no `aria-expanded`); reserve
  `aria-controls` + `aria-expanded` for the two real disclosures (technical details, launcher) and
  keep `:focus-visible` outlines on every control.
- **Do** keep the menu bar's six items in page order and mark the current band — a 7,000px page
  needs a "you are here".
- **Do** end every window bar with its mono path (`~/blog`); it is the band's identity, not decoration.
- **Do** derive every displayed statistic from shipped data and link it to its source.

### Don't:

- **Don't** introduce soft/blurred shadows, gradients with smooth falloff, or glossy highlights.
- **Don't** use `border-radius` above 2px, or any pill/rounded-corner shape.
- **Don't** add a cool gray, blue, or pure white/black to the palette — the world is warm-only.
- **Don't** set body copy, card titles, statistic values or status bars in the display face;
  Bungee Spice is signage only.
- **Don't** put component `<style>` blocks in `.vue` files — all styling lives in
  `src/assets/main.css`.
