# About Me Constitution

<!--
  SYNC IMPACT REPORT
  ==================
  Version change: (none — initial ratification) → 1.0.0
  Modified principles: (initial draft, 6 principles)
    - I. Client-Only & On-Device (new)
    - II. Static Single-Page Simplicity (new)
    - III. Verify Before Ship (new)
    - IV. Pixel-Theme Fidelity (new)
    - V. Accessibility & Motion Safety (new)
    - VI. Retrieval-Ready Content (new)
  Added sections:
    - Technology & Deployment Constraints
    - Development Workflow & Quality Gates
    - Governance
  Removed sections: (none)
  Follow-up TODOs: none — all placeholders resolved from repo context.
  Note: This report is scratch material for human review; remove before committing.
-->

## Core Principles

### I. Client-Only & On-Device (NON-NEGOTIABLE)

Every feature MUST run entirely in the browser. There MUST be no backend, no
server-side code, and no API keys or secrets of any kind committed or fetched at
runtime. AI chat (Mini-Michi) and tool retrieval MUST use on-device models loaded
client-side; memory for models MUST be released (disposed) when the user clears
the chat. Rationale: the site is a static GitHub Pages demo; a backend or secrets
would break the deployment model and leak credentials.

### II. Static Single-Page Simplicity

The app MUST remain a single-page Vue 3 application with no router, living
entirely in `frontend/` and built with Vite. New views MUST be collapsible
pixel-window sections in `App.vue`, not routes. Start simple (YAGNI): no state
libraries, no SSR, no server rendering unless a constitution amendment changes
this. Rationale: the page is a personal about-me; routing and extra frameworks
add complexity with no benefit.

### III. Verify Before Ship (NON-NEGOTIABLE)

Every change MUST pass the verify chain before being considered done:
`npm run lint` → `npm run build` (from `frontend/`), which runs type-check
(`vue-tsc`) plus the production build. There is no test suite; type-check and
build are the mandatory gates. Lint auto-fixes (`--fix`), so run it before
committing and review its modifications. Rationale: with no tests, static
verification is the only automated safety net.

### IV. Pixel-Theme Fidelity

All styling MUST live globally in `src/assets/main.css` using the existing
`pixel-*` / `tech-*` / `project-*` / `model-*` / `tool-*` class naming; components
MUST NOT carry `<style>` blocks. Colors and fonts MUST come from the `:root` CSS
variables (`--pixel-*`, `--shadow-*`, `--font-*`) — never hardcoded. Aesthetic
rules are non-negotiable: warm dark palette, hard offset shadows, pixel notched
corners via `clip-path`, no `border-radius` above 2px, stepped `steps(2, end)`
easing, and never glossy, rounded, or soft visuals. Rationale: a consistent retro
pixel-art CRT identity is the product's core design contract.

### V. Accessibility & Motion Safety

Interactive components MUST preserve existing accessibility conventions:
`:focus-visible` outlines, `aria-controls` + `:aria-expanded` on section toggles,
`prefers-reduced-motion` handling, and `text-wrap: pretty`. New components MUST
be checked at the `@media (max-width: 480px)` breakpoint. Rationale: the site is
public-facing; keyboard users and reduced-motion users MUST not regress.

### VI. Retrieval-Ready Content

All user-visible facts about Michael MUST be retrievable by the on-device AI:
`about_site` reads `public/llms/*.md` (regenerated via `npm run generate:llms`),
and `about_me` reads topics from `src/data/siteData.ts`. When adding a section or
changing content, the tool registry (`src/tools/registry.ts`: `TOOL_SCHEMAS`,
`TOPIC_SECTION`, `TOOL_GUIDE`), `SECTION_LABEL` (AiSection.vue), the
`public/llms/<id>.md` set, and the retrieval eval fixtures
(`scripts/eval-fixtures.mjs`) MUST be kept in sync. Rationale: stale registry or
llms content silently breaks the AI chat demo, which is half the product.

## Technology & Deployment Constraints

- Vue 3 `<script setup lang="ts">` + Vite (`rolldown-vite`) + TypeScript;
  `@/` alias maps to `src/`.
- Node engine: `^20.19.0 || >=22.12.0`.
- Fonts via the Google Fonts import in `main.css`; no local font assets.
- `vite.config.ts` base MUST stay `/about-me/` (GitHub Pages path) — do not change.
- `dist/` is gitignored; never commit build output.
- Root-absolute public assets (e.g. `/mj.jpg`) rely on Vite base rewriting.
- GitHub Pages deploy happens automatically via
  `.github/workflows/gh-pages.yml` on push to `main`.

## Development Workflow & Quality Gates

- Run commands from `frontend/`: `npm run dev`, `npm run build`,
  `npm run lint` (oxlint + eslint, both with `--fix`), `npm run format`
  (prettier), `npm run generate:llms` (also runs on `predev`/`prebuild`).
- Verify order: `lint` → `build`. No test suite exists
  (`src/**/__tests__/*` excluded from tsconfig).
- Adding a section requires touching every listed integration point (see
  AGENTS.md checklist: layout ids, App.vue map, section component, registry
  enums/guide, SECTION_LABEL, llms file, retrieval fixtures).
- Formatting style: prettier no semicolons, single quotes, printWidth 100.
- `npm run eval:retrieval` MUST pass (no misses) when tool docs or retrieval
  modes change; extend `eval-fixtures.mjs` when adding tools.

## Governance

- This constitution supersedes any conflicting guidance in ad-hoc docs;
  `AGENTS.md` provides operational detail and MUST stay consistent with it.
- Amendments MUST document the change in a Sync Impact Report, increment the
  version using semantic versioning (MAJOR: principle removal/redefinition;
  MINOR: new principle or materially expanded guidance; PATCH: clarifications),
  and update the Last Amended date.
- All changes MUST pass the Verify Before Ship gates (Principle III) and
  respect the design and accessibility rules (Principles IV–V); complexity MUST
  be justified against Principle II.

**Version**: 1.0.0 | **Ratified**: 2026-09-20 | **Last Amended**: 2026-09-20
