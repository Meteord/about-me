import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public')
const llmsDir = join(outDir, 'llms')
mkdirSync(llmsDir, { recursive: true })

const aboutMd = `# About

Hi, I'm Michael Jaumann. I live in Munich and work for the [KIES](https://ki.muenchen.de/ki-team) team. I'm an Open Sourcerer, Spaghetti Lover, and a mediocre runner at [MRRC](https://www.mrrc-muenchen.de/).

## Education

- **B.Sc. Computer Science**, Hochschule München (2012-2016)
  Thesis: VANET Overlay Networks
- **M.Sc. Computer Science**, TU München (2017-2022, part-time)
  Focus: Machine Learning & Software Engineering
  Thesis: Protein Language Models for Structure Prediction

## Skills

- **Machine Learning:** Pytorch, Huggingface Transformers, Scikit-learn
- **GenAI Frameworks:** Langchain, Langgraph
- **Frontend:** React, Vue.js
- **Backend:** FastAPI, Spring
- **DevOps:** Gitlab Pipelines, Github Pipelines, Terraform, Openshift, Helm, Kubernetes
- **Programming Languages:** Python, Java, Typescript, C++
- **Others:** OpenCV, OpenGL, OMNeT++

## Hobbies

Running, Cycling, Walking with my dog
`

const projectsMd = `# Projects

## MUCGPT

MUCGPT is Munich's open-source AI chatbot for citizens, enabling secure and customizable interactions with large language models. Users can create and share their own assistants, with roles and rights managed via Single Sign-On. The platform is designed for extensibility, privacy, and ease of use in public sector applications.

- [View on GitHub](https://github.com/it-at-m/mucgpt)

### Technology Stack

- **Frontend:** React, Typescript, Javascript
- **Backend:** FastAPI, LangGraph, Python
- **Deployment:** Docker, API Gateway, PostgresDB, Keycloak
`

const contactMd = `# Contact

- [LinkedIn](https://www.linkedin.com/in/michael-jaumann-a4736a263/): Michael Jaumann's LinkedIn profile.
- [GitHub](https://github.com/Meteord): Michael Jaumann's GitHub profile.
`

const blogMd = `# Blog

Michael's blog on this site. Articles live under the Blog section.

## Chat with my website (2026-09-20)

This page has no backend: everything runs on-device in the visitor's browser via transformers.js. Mini-Michi, the chat assistant, retrieves the most relevant tools before every reply and only sends those schemas to the language model.

### Models

- [LFM2.5-350M-ONNX](https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX): Mini-Michi runs LiquidAI's LFM2.5-350M-ONNX causal language model, streamed over WebGPU or WebAssembly. No data leaves the page.
- [LFM2.5-Encoder-350M-Prompt-Router-ONNX](https://huggingface.co/kucukkanat/LFM2.5-Encoder-350M-Prompt-Router-ONNX): Before every reply, a retrieval step ranks the site's tools and pre-selects only the most relevant schemas for the model. Vector search mode scores the request against all tool names in one bidirectional pass of the LFM2.5 prompt-router (kucukkanat ONNX export, q8), using its trained cosine head. BM25 over an alias-enriched tool index acts as an instant fallback, and hybrid mode fuses both rankings with reciprocal rank fusion (RRF).

### Links

- [ColBERT tool-selection demo](https://huggingface.co/spaces/LiquidAI/colbert-tool-selection): LiquidAI's demo that inspired the tool-selector concept — it retrieves the top-5 most relevant tools out of 151 with a retriever instead of stuffing every schema into the context window.
- [LFM2.5 retrievers blog](https://www.liquid.ai/blog/lfm2-5-retrievers): LiquidAI's blog post on prompt-routing and retrieval, the idea behind scoring a request against all tool names in a single pass.
`

const visualsMd = `# Visuals

The Visuals section of this page is the statistics dashboard. The Mini-Michi chat can bring it into view with the show_stats tool, collapsing the other sections.

## Site statistics

Live facts about this site: tool count, section count, skill and project counts, and the active color theme.

## Skills chart

A horizontal bar chart of Michael's skill groups, one bar per category (Machine Learning, GenAI Frameworks, Frontend, Backend, DevOps, Programming Languages, Others), where each bar segment stands for one skill in that category.
`

writeFileSync(join(llmsDir, 'about.md'), aboutMd)
writeFileSync(join(llmsDir, 'projects.md'), projectsMd)
writeFileSync(join(llmsDir, 'contact.md'), contactMd)
writeFileSync(join(llmsDir, 'blog.md'), blogMd)
writeFileSync(join(llmsDir, 'visuals.md'), visualsMd)

const llmsTxt = `# Michael Jaumann | AI and ML Engineer

> Personal "about me" page for Michael Jaumann, an AI and ML engineer in Munich. Covers his work for the KIES team, education, skills, projects (MUCGPT), hobbies, and contact links.

## Links
- [Home](https://meteord.github.io/about-me/): Michael Jaumann's retro pixel-art portfolio.
- [About](llms/about.md): Background, education (B.Sc. CS Hochschule München, M.Sc. CS TU München), skills, and hobbies.
- [Projects](llms/projects.md): MUCGPT, Munich's open-source AI chatbot for citizens.
- [Contact](llms/contact.md): LinkedIn and GitHub profiles.
- [Blog](llms/blog.md): Articles, including "Chat with my website" — the on-device models powering this page (chat model + tool retriever).
- [Visuals](llms/visuals.md): The statistics dashboard — site facts and the skills bar chart Mini-Michi can bring into view.
- [GitHub](https://github.com/Meteord): Michael Jaumann's GitHub profile.
- [LinkedIn](https://www.linkedin.com/in/michael-jaumann-a4736a263/): Michael Jaumann's LinkedIn profile.
- [KIES](https://ki.muenchen.de/ki-team): The team Michael works for in Munich.
`

writeFileSync(join(outDir, 'llms.txt'), llmsTxt)
