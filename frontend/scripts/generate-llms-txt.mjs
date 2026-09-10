import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'dist')
const llmsDir = join(outDir, 'llms')
mkdirSync(llmsDir, { recursive: true })

const aboutMd = `# About

Hi, I'm Michael Jaumann. I live in Munich and work for the [KIES](https://ki.muenchen.de/ki-team) team. I'm an Open Sourcerer, Spaghetti Lover, and Running Enthusiast.

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

Running, Cycling, Dog walks
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

writeFileSync(join(llmsDir, 'about.md'), aboutMd)
writeFileSync(join(llmsDir, 'projects.md'), projectsMd)
writeFileSync(join(llmsDir, 'contact.md'), contactMd)

const llmsTxt = `# Michael Jaumann | AI and ML Engineer

> Personal "about me" page for Michael Jaumann, an AI and ML engineer in Munich. Covers his work for the KIES team, education, skills, projects (MUCGPT), hobbies, and contact links.

## Links
- [Home](https://meteord.github.io/about-me/): Michael Jaumann's retro pixel-art portfolio.
- [About](llms/about.md): Background, education (B.Sc. CS Hochschule München, M.Sc. CS TU München), skills, and hobbies.
- [Projects](llms/projects.md): MUCGPT, Munich's open-source AI chatbot for citizens.
- [Contact](llms/contact.md): LinkedIn and GitHub profiles.
- [GitHub](https://github.com/Meteord): Michael Jaumann's GitHub profile.
- [LinkedIn](https://www.linkedin.com/in/michael-jaumann-a4736a263/): Michael Jaumann's LinkedIn profile.
- [KIES](https://ki.muenchen.de/ki-team): The team Michael works for in Munich.
`

writeFileSync(join(outDir, 'llms.txt'), llmsTxt)