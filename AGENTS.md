# AGENTS.md

## Project

Personal "about me" page. Vue 3 single-page app (no router) living entirely in `frontend/`, built with Vite (`rolldown-vite`) + TypeScript, deployed to GitHub Pages. No backend.

## Commands (run from `frontend/`)

- `npm run dev` — dev server
- `npm run build` — runs `type-check` and `build-only` in parallel (`run-p`); this is the full verify step
- `npm run type-check` — `vue-tsc --build`
- `npm run lint` — oxlint then eslint, **both with `--fix`** (will modify files)
- `npm run format` — `prettier --write src/`

Verify order: `lint` → `build`. There is no test suite (`src/**/__tests__/*` is excluded from tsconfig).

## Conventions

- Prettier: no semicolons, single quotes, printWidth 100 (`.prettierrc.json`). Eslint uses the prettier `skipFormatting` rule, so run `npm run format` to fix style.
- `@/` alias maps to `src/` (vite.config.ts, tsconfig.app.json).
- Components use `<script setup lang="ts">`. The site is styled as collapsible "pixel-window" sections — reuse the existing `pixel-*` CSS naming in `src/assets/main.css`.
- Node engine: `^20.19.0 || >=22.12.0`.

## Design guidelines (retro pixel-art CRT theme)

The look is retro pixel-art desktop meets CRT screen: a warm dark palette (near-black browns + amber/orange accents), chunky hard-edged UI with notched "pixel" corners and offset block shadows, a scanline overlay on the body, a blinking cursor after the name, and the display font `Bungee Spice` for headings. Everything should feel crisp, blocky, and slightly chunky — never glossy, rounded, or soft.

All styling lives globally in `src/assets/main.css` (components carry no `<style>` block); add new classes there with the existing `pixel-*` / `tech-*` / `project-*` naming.

- Use the CSS variables in `:root` (`--pixel-*` colors, `--shadow-hard`/`--shadow-soft`, `--font-display`/`--font-body`) — never hardcode colors or fonts. Fonts are loaded via the Google Fonts import in `main.css`, no local assets.
- Aesthetic rules: warm dark palette, hard 2px+ offset shadows (`drop-shadow` or `--shadow-*`), pixel corners via `clip-path: polygon(...)` (4–8px notches), **no `border-radius` above 2px**, and stepped easing — use `steps(2, end)` transitions/animations, never smooth `ease`.
- Section chrome: each collapsible section is a `.pixel-window` with a `.pixel-window__bar` toggle button (must keep `aria-controls` + `:aria-expanded`), three `.pixel-window__chrome` squares, and a `.pixel-window__toggle` (`−`/`+`). Content fades in via the `fade` `<transition>`.
- Reuse building blocks instead of restyling: `.pixel-chip` (with `--amber`/`--orange`/`--red` variants), `.pixel-card`, `.pixel-list`, `.pixel-link`, `.pixel-link-btn`, `.pixel-contact__link`. Headings that need the display font get `.pixel-title`/`.pixel-section-title`/`.project-card__title`.
- Respect the accessibility conventions already in place: `:focus-visible` outlines, `prefers-reduced-motion` handling, `text-wrap: pretty`, and the `@media (max-width: 480px)` sizing overrides.

## Deployment gotchas

- GitHub Pages workflow (`.github/workflows/gh-pages.yml`) deploys `frontend/dist` on push to `main`.
- `vite.config.ts` sets `base: '/about-me/'` — do not change it; the site lives at that path on GitHub Pages.
- `dist/` is gitignored — never commit build output.
- `public/mj.jpg` is referenced as root-absolute `/mj.jpg`; Vite rewrites it against `base` at build time.