# about-me

Personal "about me" page for Michael Jaumann — an AI and ML engineer based in Munich. Live at [meteord.github.io/about-me](https://meteord.github.io/about-me/).

## Stack

- [Vue 3](https://vuejs.org/) single-page app (no router), TypeScript
- Built with [rolldown-vite](https://rolldown.rs/), deployed to GitHub Pages
- Retro pixel-art CRT theme (warm dark palette, chunky "pixel-window" UI)
- No backend — everything lives in `frontend/`

## Layout

- `frontend/` — the entire Vue app (Vite + TypeScript)
  - `src/components/` — the collapsible pixel-window sections (About, Projects, Contact)
  - `src/assets/main.css` — all global styling
  - `public/` — static assets (`favicon.ico`, `mj.jpg`)
- `.github/workflows/` — CI (lint + build), GitHub Pages deploy, Renovate, secret scanning

## Local development

```sh
cd frontend
npm install
npm run dev      # dev server
npm run build    # full verify: type-check + production build
npm run lint     # oxlint + eslint (both with --fix)
npm run format   # prettier --write src/
```

See [frontend/README.md](frontend/README.md) for details.

## Deployment

Pushing to `main` triggers a GitHub Actions workflow that builds `frontend/dist` and deploys it to GitHub Pages. The site is served from the `/about-me/` base path (set in `frontend/vite.config.ts`); do not change it.