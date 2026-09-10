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

export interface ContactLinks {
  linkedin: string
  github: string
}

export const siteData = {
  name: 'Michael Jaumann',
  location: 'Munich',
  employer: 'KIES',
  employerUrl: 'https://ki.muenchen.de/ki-team',
  lede: "Hi, I'm Michael Jaumann. I live in Munich and work for the",
  tags: ['Open Sourcerer', 'Spaghetti Lover', 'Running Enthusiast'],
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
  hobbies: ['Running', 'Cycling', 'Dog walks'],
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
  contact: {
    linkedin: 'https://www.linkedin.com/in/michael-jaumann-a4736a263/',
    github: 'https://github.com/Meteord',
  } as ContactLinks,
}

export type AboutTopic = 'bio' | 'education' | 'skills' | 'hobbies' | 'projects' | 'contact' | 'all'

const TOPICS: Record<AboutTopic, string> = {
  bio: 'name, location, employer and personal tags',
  education: 'academic degrees and theses',
  skills: 'technical skills grouped by category',
  hobbies: 'personal hobbies',
  projects: 'open source projects he works on',
  contact: 'social and professional links',
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
        `- Tags: ${siteData.tags.join(', ')}`,
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
    blocks.push(['## Hobbies'].concat(asList(siteData.hobbies)).join('\n'))
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

  return blocks.join('\n\n')
}
