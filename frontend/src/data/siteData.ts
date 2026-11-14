export interface EducationEntry {
  degree: string
  school: string
  period: string
  detail: string
}

export interface SkillGroup {
  label: string
  items: string[]
}

export interface Project {
  name: string
  description: string
  link: string
  techStack: { label: string; items: string[] }[]
}

export interface TechModel {
  name: string
  description: string
  link: string
  tags: string[]
  icon: 'chip' | 'funnel'
}

export interface ArticleLink {
  label: string
  url: string
  description: string
}

export interface BlogPost {
  slug: string
  title: string
  date: string
  teaser: string
  readTime: string
}

export interface ContactLinks {
  linkedin: string
  github: string
}

export interface Tag {
  label: string
  url?: string
}

export interface RunningPb {
  distance: string
  time: string
}

/**
 * The on-device assistant's public identity. Single source of truth: the band
 * title, console plate, prompts, error copy and generated content all read
 * the name from here, so renaming it is a one-line edit.
 */
export const assistant = {
  name: 'MJ-350',
  model: 'LFM2.5-350M',
}

export const siteData = {
  name: 'Michael Jaumann',
  location: 'Munich',
  employer: 'KIES',
  employerUrl: 'https://ki.muenchen.de/ki-team',
  lede: "Hi, I'm Michael Jaumann. I live in Munich and work for the",
  tags: [
    { label: 'Open Sourcerer' },
    { label: 'Spaghetti Lover' },
    { label: 'Mediocre Runner at MRRC', url: 'https://www.mrrc-muenchen.de/' },
  ],
  education: [
    {
      degree: 'B.Sc. Computer Science',
      school: 'Hochschule München',
      period: '2012–2016',
      detail: 'Thesis: VANET Overlay Networks',
    },
    {
      degree: 'M.Sc. Computer Science',
      school: 'TU München',
      period: '2017–2022, part-time',
      detail:
        'Focus: Machine Learning & Software Engineering. Thesis: Protein Language Models for Structure Prediction',
    },
  ] as EducationEntry[],
  skills: [
    { label: 'Machine Learning', items: ['Pytorch', 'Huggingface Transformers', 'Scikit-learn'] },
    { label: 'GenAI Frameworks', items: ['Langchain', 'Langgraph'] },
    { label: 'Frontend', items: ['React', 'Vue.js'] },
    { label: 'Backend', items: ['FastAPI', 'Spring'] },
    {
      label: 'DevOps',
      items: [
        'Gitlab Pipelines',
        'Github Pipelines',
        'Terraform',
        'Openshift',
        'Helm',
        'Kubernetes',
      ],
    },
    { label: 'Programming Languages', items: ['Python', 'Java', 'Typescript', 'C++'] },
    { label: 'Others', items: ['OpenCV', 'OpenGL', 'OMNeT++'] },
  ] as SkillGroup[],
  hobbies: ['Running', 'Cycling', 'Walking with my dog'],
  dog: {
    name: 'Nubi',
    breed: 'Lagotto Romagnolo',
    birth: '25 Jan 2023',
    weight: '11 kg',
    topSpeed: '3:00 min per km',
    likes: ['Food', 'Sniffing', 'Other dogs', 'Swimming'],
    blurb:
      'The reason every \u201cshort walk\u201d takes an hour. Nubi trots along on the hobby runs, supervises the bike repairs and keeps the sofa warm between adventures.',
    caption: 'Head of walks',
  },
  running: {
    caption: 'Personal bests',
    pbs: [
      { distance: 'Marathon', time: '2:57:57' },
      { distance: 'Half marathon', time: '1:20:04' },
      { distance: '10K', time: '37:58' },
      { distance: '5K', time: '18:01' },
    ] as RunningPb[],
  },
  projects: [
    {
      name: 'MUCGPT',
      description:
        "MUCGPT is Munich's open-source AI chatbot for citizens, enabling secure and customizable interactions with large language models. Users can create and share their own assistants, with roles and rights managed via Single Sign-On. The platform is designed for extensibility, privacy, and ease of use in public sector applications.",
      link: 'https://github.com/it-at-m/mucgpt',
      techStack: [
        { label: 'Frontend', items: ['React', 'Typescript', 'Javascript'] },
        { label: 'Backend', items: ['FastAPI', 'LangGraph', 'Python'] },
        { label: 'Deployment', items: ['Docker', 'API Gateway', 'PostgresDB', 'Keycloak'] },
      ],
    },
  ] as Project[],
  tech: [
    {
      name: 'Chat model — LFM2.5-350M',
      description:
        'MJ-350, the friendly assistant living on this page, runs LiquidAI\u2019s LFM2.5-350M-ONNX causal language model entirely in the browser via transformers.js, streamed over WebGPU or WebAssembly. Answers appear word by word as the model writes them.',
      link: 'https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX',
      tags: ['LFM2.5-350M', 'transformers.js', 'WebGPU', 'WASM'],
      icon: 'chip',
    },
    {
      name: 'Content retriever — LFM2.5 prompt router + GLiNER2.5-Decide',
      description:
        'Before every reply, a retrieval step ranks the site\u2019s content sources and injects only the most relevant ones into the chat context. In vector mode, a single pass of the LFM2.5 prompt-router (kucukkanat ONNX export, q8) scores the request against all source names. BM25 over an alias-enriched index is the instant fallback, and hybrid mode fuses both rankings with reciprocal rank fusion. Decide mode runs an on-device GLiNER2.5-Decide classifier (onnx-community mobile export, q4f16 on WebAssembly) whose GLiNER2 processor is ported in this repo \u2014 the query is the state, the source names are the labels, and the top-ranked sources are injected like any other mode. Theme changes are applied directly by the retriever \u2014 the model never calls a tool.',
      link: 'https://huggingface.co/kucukkanat/LFM2.5-Encoder-350M-Prompt-Router-ONNX',
      tags: ['LFM2.5-Encoder-350M-Prompt-Router', 'GLiNER2.5-Decide', 'q8', 'q4f16', 'BM25', 'RRF'],
      icon: 'funnel',
    },
  ] as TechModel[],
  articleLinks: [
    {
      label: 'ColBERT tool-selection demo',
      url: 'https://huggingface.co/spaces/LiquidAI/colbert-tool-selection',
      description:
        'LiquidAI\u2019s demo that inspired the content-retriever concept: it retrieves the top-5 most relevant tools out of 151 with a retriever instead of stuffing every schema into the context window.',
    },
    {
      label: 'LFM2.5 retrievers blog',
      url: 'https://www.liquid.ai/blog/lfm2-5-retrievers',
      description:
        'LiquidAI\u2019s blog post on prompt-routing and retrieval, the idea behind scoring a request against all source names in a single pass.',
    },
    {
      label: 'GLiNER2.5-Decide model',
      url: 'https://huggingface.co/fastino/GLiNER2.5-Decide',
      description:
        'The classification model behind DECIDE mode: GLiNER2.5-Decide, a schema-conditioned DeBERTa-v3-large with one logit per label marker.',
    },
    {
      label: 'Jevosaurus — a GLiNER2.5-Decide app',
      url: 'https://huggingface.co/spaces/shreyask/jevosaurus',
      description:
        'An on-device example built on GLiNER2.5-Decide and open-jev that runs entirely in the browser \u2014 the same model family DECIDE mode uses.',
    },
  ] as ArticleLink[],
  blog: [
    {
      slug: 'chat-with-my-website',
      title: 'Chat with my website',
      date: '2026-09-20',
      teaser:
        'Meet MJ-350, the friendly assistant on this page — a real language model that runs in your browser and only ever reads the content sources it actually needs.',
      readTime: '3 min',
    },
  ] as BlogPost[],
  contact: {
    linkedin: 'https://www.linkedin.com/in/michael-jaumann-a4736a263/',
    github: 'https://github.com/Meteord',
  } as ContactLinks,
}

export type AboutTopic =
  | 'bio'
  | 'education'
  | 'skills'
  | 'hobbies'
  | 'projects'
  | 'contact'
  | 'blog'
  | 'all'

const TOPICS: Record<AboutTopic, string> = {
  bio: 'name, location, employer and personal tags',
  education: 'academic degrees and theses',
  skills: 'technical skills grouped by category',
  hobbies: 'personal hobbies, running personal bests and his dog Nubi',
  projects: 'open source projects he works on',
  contact: 'social and professional links',
  blog: 'blog articles, like how this website works and which models power it',
  all: 'all available information about Michael',
}

export function aboutTopicDescription(): string {
  return Object.entries(TOPICS)
    .map(([key, value]) => `"${key}" = ${value}`)
    .join('; ')
}

function asList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}

export function aboutMeMarkdown(topic: AboutTopic = 'all'): string {
  const blocks: string[] = []

  const wants = (t: AboutTopic): boolean => topic === 'all' || topic === t

  if (wants('bio')) {
    blocks.push(
      [
        '## Bio',
        `- Name: ${siteData.name}`,
        `- Location: ${siteData.location}`,
        `- Employer: ${siteData.employer} (${siteData.employerUrl})`,
        `- Tags: ${siteData.tags.map((tag) => tag.label).join(', ')}`,
      ].join('\n'),
    )
  }

  if (wants('education')) {
    blocks.push(
      ['## Education']
        .concat(
          siteData.education.map(
            (entry) => `- ${entry.degree}, ${entry.school} (${entry.period}). ${entry.detail}`,
          ),
        )
        .join('\n'),
    )
  }

  if (wants('skills')) {
    blocks.push(
      ['## Skills']
        .concat(siteData.skills.map((group) => `- ${group.label}: ${group.items.join(', ')}`))
        .join('\n'),
    )
  }

  if (wants('hobbies')) {
    const dog = siteData.dog
    blocks.push(
      ['## Hobbies']
        .concat(asList(siteData.hobbies))
        .concat([
          `### ${dog.name} (dog)`,
          `- Breed: ${dog.breed}`,
          `- Born: ${dog.birth}`,
          `- Weight: ${dog.weight}`,
          `- Top speed over 1 km: ${dog.topSpeed}`,
          `- Likes: ${dog.likes.join(', ')}`,
        ])
        .concat(
          ['### Running (personal bests)'].concat(
            siteData.running.pbs.map((pb) => `- ${pb.distance}: ${pb.time}`),
          ),
        )
        .join('\n'),
    )
  }

  if (wants('projects')) {
    blocks.push(
      ['## Projects']
        .concat(
          siteData.projects.map((project) => {
            const stack = project.techStack
              .map((group) => `${group.label}: ${group.items.join(', ')}`)
              .join('; ')
            return `- ${project.name}: ${project.description} Link: ${project.link}. Tech stack: ${stack}`
          }),
        )
        .join('\n'),
    )
  }

  if (wants('contact')) {
    blocks.push(
      [
        '## Contact',
        `- LinkedIn: ${siteData.contact.linkedin}`,
        `- GitHub: ${siteData.contact.github}`,
      ].join('\n'),
    )
  }

  if (wants('blog')) {
    blocks.push(
      ['## Blog']
        .concat(siteData.blog.map((post) => `- "${post.title}" (${post.date}): ${post.teaser}`))
        .join('\n'),
    )
    blocks.push(
      ['## Models powering this site']
        .concat(
          siteData.tech.map(
            (model) =>
              `- ${model.name}: ${model.description} Link: ${model.link}. Tags: ${model.tags.join(', ')}`,
          ),
        )
        .join('\n'),
    )
    blocks.push(
      ['## Article links']
        .concat(
          siteData.articleLinks.map(
            (link) => `- [${link.label}](${link.url}): ${link.description}`,
          ),
        )
        .join('\n'),
    )
  }

  return blocks.join('\n\n')
}
