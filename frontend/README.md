# frontend

The full Vue 3 single-page application for the about-me site. Vite (rolldown-vite) + TypeScript, styled as a retro pixel-art CRT desktop.

## Project setup

```sh
npm install
```

## Compile and hot-reload for development

```sh
npm run dev
```

## Type-check, compile, and minify for production

```sh
npm run build
```

`build` runs `type-check` (`vue-tsc --build`) and `build-only` (`vite build`) in parallel via `run-p`.

## Lint

```sh
npm run lint
```

Runs oxlint then eslint, **both with `--fix`** (will modify files).

## Format

```sh
npm run format
```

Runs `prettier --write src/`. No semicolons, single quotes, print width 100.

## Structure

- `src/App.vue` — renders the collapsible sections
- `src/components/` — `AboutSection.vue`, `ProjectsSection.vue`, `ContactSection.vue`
- `src/assets/main.css` — all global styling (components carry no `<style>` block)
- `public/` — static assets; `mj.jpg` is referenced as root-absolute `/mj.jpg` and rewritten against `base` at build time

## Deploy notes

- `vite.config.ts` sets `base: '/about-me/'` — the site lives at that path on GitHub Pages. Do not change it.
- `dist/` is gitignored — never commit build output.
- The GitHub Pages deploy runs from the repo root workflow (`.github/workflows/gh-pages.yml`) on push to `main`.