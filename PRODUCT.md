# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A broad mix of visitors, all roughly equal in priority:

- **Recruiters and hiring managers** evaluating Michael Jaumann for AI/ML engineering roles and collaboration.
- **AI/ML practitioners and peers** interested in the on-device model and tool-retrieval implementation.
- **Casual visitors** arriving from a shared link, bookmark, or search.

Their common job: quickly understand who Michael is and what he can do, and — for the technical audience — see a working example of the AI engineering he builds.

## Product Purpose

A personal "about me" page for Michael Jaumann, an AI and ML engineer based in Munich. It presents his bio, education, skills, projects, and contact links, and doubles as a live on-device AI demo: an in-browser assistant ("Mini-Michi") that answers questions about him and rearranges the page using tools.

Both purposes are co-equal. Success means a visitor leaves with a clear professional picture of Michael **and** has experienced a real language model and retrieval pipeline running entirely in their browser.

## Positioning

A neighboring personal site could not truthfully copy the mechanism: a real SLM (LiquidAI LFM2.5-350M-ONNX) plus a tool-retrieval step (BM25 / vector / hybrid) runs fully client-side with no backend and no API keys, presented as part of the page itself rather than as a detached demo. The retrieval step only sends the most relevant tool schemas to the model, so the visitor can watch context being pruned in real time.

## Operating Context

- Visitors browse a single-page site whose sections are collapsible "pixel-window" cards; blog posts and the projects listing live on hash-routed pages (`#/blog/...`, `#/projects`).
- The chat dock (Mini-Michi) is available alongside every view. On first send it lazily loads the chat model, then streams replies token-by-token.
- Before each reply the chat retrieves the top-k relevant tools and passes only those schemas to the model; retrieval modes are `lexical` (BM25, instant), `vector` (prompt-router, lazy ~357 MB download), and `hybrid` (reciprocal rank fusion).
- Tools either answer questions about Michael (`about_me`), describe the site from generated content (`about_site`), or rearrange the visible sections.
- No accounts, no persistence beyond the session, no analytics requirement established.

## Capabilities and Constraints

**Capabilities (confirmed in code):**

- Collapsible pixel-window sections: About, Blog, Projects, Contact.
- Dedicated hash-routed pages for blog posts and the projects listing, with home teasers.
- On-device chat assistant with streamed generation, WebGPU (q4) with WASM (q8) fallback.
- Tool registry with retrieval-driven schema pruning and a visual tool-selector panel.
- Retrievable site content generated into `public/llms/*.md` plus `llms.txt`.

**Constraints:**

- **Client-side only, no backend.** Everything runs in the visitor's browser; no servers and no API keys, ever.
- **Content is real and must never be fabricated.** Bio, education, skills, projects, links, and blog posts come from Michael. No invented testimonials, customers, benchmarks, pricing, or deployment claims.
- **English only.** No i18n requirement for the site.
- **Static GitHub Pages deploy.** Built output is served from the `/about-me/` base path; no server routing.

## Brand Commitments

- Name: **Michael Jaumann**; the on-device assistant is named **Mini-Michi**.
- Voice: personal, self-aware, and playful — e.g. the personal tags "Open Sourcerer", "Spaghetti Lover", "Mediocre Runner at MRRC".
- Durable identity constraint: the site is presented as a retro pixel-art CRT desktop with a warm dark palette and chunky "pixel-window" chrome. This is an established part of the product's identity, not a per-project choice.

## Evidence on Hand

- Real profile data in `frontend/src/data/siteData.ts` (bio, education, skills, hobbies, projects, tech/models, article links, blog posts, contact links).
- Generated retrievable content in `frontend/public/llms/{about,projects,blog,contact}.md` and `frontend/public/llms.txt`.
- Portrait photo at `frontend/public/mj.jpg`.
- Live site at https://meteord.github.io/about-me/.

**Absences future work must not fill by invention:** no testimonials, no client/customer logos, no performance benchmarks or usage metrics, and only one project (MUCGPT) is currently listed.

## Product Principles

1. **Real, not decorative.** The AI genuinely runs and the content is genuinely Michael's. Never fake a demo, a result, or a fact.
2. **Private by construction.** Keep everything client-side; no data leaves the page and no keys are ever introduced.
3. **Profile and demo are one thing.** The assistant helps visitors get information and shape the page — it is not a bolted-on gimmick beside a résumé.
4. **A human voice.** Keep the self-aware, personal tone; it is a differentiator, not noise.
5. **Portable and static.** Preserve a dependency-light client-side build that deploys unchanged to GitHub Pages.
