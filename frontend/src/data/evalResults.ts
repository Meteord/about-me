export interface ToolCallRecord {
  round: number
  raw: string
  name: string
  args: Record<string, unknown>
  valid: boolean
  expectedArgHit: boolean
  result: unknown | null
  error: string | null
}

export interface StageTiming {
  retrievalMs: number
  roundsMs: number[]
  totalMs: number
  tokensGenerated: number
}

export interface AnswerScore {
  factRecall: number
  factsMissedDueToToolMiss: string[]
  bannedViolation: boolean
  faithfulness: number
  unsupportedSentences: string[]
  pass: boolean
}

export interface ToolScoreRow {
  name: string
  score: number
  rank: number
  selected: boolean
}

export interface CaseResult {
  fixtureIndex: number
  query: string
  mode: string
  effectiveMode: string
  selectedNames: string[]
  rows: ToolScoreRow[]
  toolCalls: ToolCallRecord[]
  finalAnswer: string
  timings: StageTiming
  score: AnswerScore
  retrievalPass: boolean
  toolsPass: boolean
  answerPass: boolean
  chainPass: boolean
  error: string | null
}

export interface ModeAggregate {
  mode: string
  n: number
  retrievalHitRate: number
  retrievalMRR: number
  toolRecall: number
  toolF1: number
  argValidityRate: number
  factRecall: number
  faithfulness: number
  hallucinationRate: number
  meanRounds: number
  meanTotalLatencyMs: number
  chainPassRate: number
  toolPassRate: number
  answerPassRate: number
}

export interface TraceAggregate {
  count: number
  sources: string[]
  mode: string
  topK: number
  retrievalCoverRate: number
  toolValidRate: number
  groundedRate: number
  bannedViolationRate: number
  passRate: number
}

export interface EvalResults {
  generatedAt: string
  config: {
    modes: string[]
    topK: number
    maxRounds: number
    sampling: boolean
    device: 'cpu'
    dtype: 'q8' | 'q4'
    chatModel: string
  }
  fixtures: number
  modes: ModeAggregate[]
  cases: CaseResult[]
  traces: TraceAggregate | null
}

export const evalResults: EvalResults = {
  generatedAt: '2026-10-03T19:53:51.492Z',
  config: {
    modes: ['lexical'],
    topK: 5,
    maxRounds: 3,
    sampling: false,
    device: 'cpu',
    dtype: 'q4',
    chatModel: 'LiquidAI/LFM2.5-350M-ONNX',
  },
  fixtures: 27,
  modes: [
    {
      mode: 'lexical',
      n: 27,
      retrievalHitRate: 1,
      retrievalMRR: 1,
      toolRecall: 0.37037037037037035,
      toolF1: 0.35802469135802467,
      argValidityRate: 0.9444444444444444,
      factRecall: 0.9629629629629629,
      faithfulness: 0.330026455026455,
      hallucinationRate: 0,
      meanRounds: 1.5555555555555556,
      meanTotalLatencyMs: 8646.296296296296,
      toolPassRate: 0.2962962962962963,
      answerPassRate: 0.25925925925925924,
      chainPassRate: 0.18518518518518517,
    },
  ],
  cases: [
    {
      fixtureIndex: 0,
      query: 'Tell me about MUCGPT',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content', 'list_contents'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.33885924628041597,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'get_content(id="MUCGPT", topic="skills")',
          name: 'get_content',
          args: {
            id: 'MUCGPT',
            topic: 'skills',
          },
          valid: false,
          expectedArgHit: false,
          result: {
            kind: 'text',
            error:
              'Unknown content id "MUCGPT". Call list_contents first to see the available ids.',
          },
          error: null,
        },
        {
          round: 1,
          raw: 'list_contents()',
          name: 'list_contents',
          args: {},
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'text',
            text: '- about: About — Bio, education, skills and hobbies\n- projects: Projects — Open-source projects like MUCGPT, on their own page\n- contact: Contact — LinkedIn and GitHub links\n- blog: Blog — Blog articles about this site and the models that power it\n- blog:chat-with-my-website: Chat with my website — How Mini-Michi, the on-device assistant in the dock, runs a real language model in your browser — and why it only ever sees the tool schemas it actually needs.',
          },
          error: null,
        },
      ],
      finalAnswer:
        'MUCGPT is an open-source project focused on building a lightweight mobile assistant called Mini-Michi. It’s built primarily as an open-source software library rather than a standalone application. The team has released several versions since its initial release, including a stable version targeting Android devices. Mini-Michi was initially developed by the same company behind MUCGPT but now serves as a core component within larger apps using the Mini-Michi framework. Its primary purpose is to provide developers access to a pre-built, optimized machine learning model without needing extensive custom code.',
      timings: {
        retrievalMs: 1,
        roundsMs: [4088, 3094, 12132],
        totalMs: 19350,
        tokensGenerated: 144,
      },
      score: {
        factRecall: 0.5,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'MUCGPT is an open-source project focused on building a lightweight mobile assistant called Mini-Michi.',
          'It’s built primarily as an open-source software library rather than a standalone application.',
          'The team has released several versions since its initial release, including a stable version targeting Android devices.',
          'Mini-Michi was initially developed by the same company behind MUCGPT but now serves as a core component within larger apps using the Mini-Michi framework.',
          'Its primary purpose is to provide developers access to a pre-built, optimized machine learning model without needing extensive custom code.',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 1,
      query: 'Switch the theme to red',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['set_theme'],
      rows: [
        {
          name: 'set_theme',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0,
          rank: 1,
          selected: false,
        },
        {
          name: 'get_content',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'set_theme(theme="red")',
          name: 'set_theme',
          args: {
            theme: 'red',
          },
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'layout',
            theme: 'red',
          },
          error: null,
        },
      ],
      finalAnswer:
        'The theme has been switched to **red** successfully! Let me know if there’s anything else I can help with. 😊',
      timings: {
        retrievalMs: 1,
        roundsMs: [2387, 3419],
        totalMs: 5847,
        tokensGenerated: 42,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 1,
        unsupportedSentences: [],
        pass: true,
      },
      retrievalPass: true,
      toolsPass: true,
      answerPass: true,
      chainPass: true,
      error: null,
    },
    {
      fixtureIndex: 2,
      query: 'What education does Michael have?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content', 'list_contents'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.21152986320876138,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'Michael has no mention of any education in his profile or bio. Would you like me to search for other details that might be relevant?',
      timings: {
        retrievalMs: 2,
        roundsMs: [4498],
        totalMs: 4505,
        tokensGenerated: 29,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['Hochschule München', 'TU München'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'Michael has no mention of any education in his profile or bio.',
          'Would you like me to search for other details that might be relevant?',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 3,
      query: 'surprise me',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['list_contents', 'get_content'],
      rows: [
        {
          name: 'list_contents',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0.22418478966497582,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'Surprise! What’s something unexpected that I’ve got for you? Let me share my latest discovery! 😊',
      timings: {
        retrievalMs: 1,
        roundsMs: [4193],
        totalMs: 4203,
        tokensGenerated: 25,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['About'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'Surprise!',
          'What’s something unexpected that I’ve got for you?',
          'Let me share my latest discovery!',
          '😊',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 4,
      query: 'where does Michael live?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content', 'list_contents'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.42029240076978497,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'Michael lives in **San Francisco**. He has lived there since his childhood and continues to reside there today. His current residence is also located at **123 Main Street, San Francisco, CA**.',
      timings: {
        retrievalMs: 1,
        roundsMs: [5139],
        totalMs: 5144,
        tokensGenerated: 42,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['Munich'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'Michael lives in **San Francisco**.',
          'He has lived there since his childhood and continues to reside there today.',
          'His current residence is also located at **123 Main Street, San Francisco, CA**.',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 5,
      query: 'make the page red',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['set_theme', 'get_content', 'list_contents'],
      rows: [
        {
          name: 'set_theme',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0.11498066537467207,
          rank: 1,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.09998571423735172,
          rank: 2,
          selected: true,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'set_theme(theme="red")',
          name: 'set_theme',
          args: {
            theme: 'red',
          },
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'layout',
            theme: 'red',
          },
          error: null,
        },
      ],
      finalAnswer:
        'The page has been switched to the **red** accent color theme as requested. Let me know if there’s anything else I can help with!',
      timings: {
        retrievalMs: 1,
        roundsMs: [3427, 4808],
        totalMs: 8250,
        tokensGenerated: 45,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 1,
        unsupportedSentences: [],
        pass: true,
      },
      retrievalPass: true,
      toolsPass: true,
      answerPass: true,
      chainPass: true,
      error: null,
    },
    {
      fixtureIndex: 6,
      query: 'what time is it?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0,
          rank: 1,
          selected: false,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'There isn’t enough context to determine the current time. Could you clarify whether you’d like me to check the weather, suggest activities based on today’s skills-based topics, or help set reminders related to your project timelines?',
      timings: {
        retrievalMs: 1,
        roundsMs: [4924],
        totalMs: 4941,
        tokensGenerated: 48,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['Michael'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'There isn’t enough context to determine the current time.',
          'Could you clarify whether you’d like me to check the weather, suggest activities based on today’s skills-based topics, or help set reminders related to your project timelines?',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 7,
      query: 'show me some statistics',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['list_contents', 'get_content'],
      rows: [
        {
          name: 'list_contents',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0.13950790453752404,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        "I'm sorry, but I can't provide statistics as that goes against my current capabilities. My functions are limited to fetching content based on topics like skills, projects, contact, and blogs using the `get_content` function. Let me know if there’s anything else I can assist you with!",
      timings: {
        retrievalMs: 2,
        roundsMs: [6486],
        totalMs: 6496,
        tokensGenerated: 62,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['Blog'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          "I'm sorry, but I can't provide statistics as that goes against my current capabilities.",
          'My functions are limited to fetching content based on topics like skills, projects, contact, and blogs using the `get_content` function.',
          'Let me know if there’s anything else I can assist you with!',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 8,
      query: 'Wie kann ich Michael kontaktieren?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0,
          rank: 1,
          selected: false,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'get_content(id="contact", topic="skills")',
          name: 'get_content',
          args: {
            id: 'contact',
            topic: 'skills',
          },
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'contact',
            section: 'contact',
            topic: 'skills',
            spotlight: true,
            target: 'about-skills',
            text: "# Contact\n\n- [LinkedIn](https://www.linkedin.com/in/michael-jaumann-a4736a263/): Michael Jaumann's LinkedIn profile.\n- [GitHub](https://github.com/Meteord): Michael Jaumann's GitHub profile.\n",
          },
          error: null,
        },
      ],
      finalAnswer:
        'Michael jaumann ist über seine professionelle Website erreichbar. Hier sind die wichtigsten Kontaktsoptionen:\n\n- **LinkedIn**  \n  https://www.linkedin.com/in/michael-jaumann-a4736a263/\n\n- **GitHub**  \n  https://github.com/Meteord\n\nDiese Links zeigen aktuelle Projekte und Beiträge zu seinen Arbeiten an der Seite.',
      timings: {
        retrievalMs: 2,
        roundsMs: [3020, 7629],
        totalMs: 10678,
        tokensGenerated: 102,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 0.5714285714285714,
        unsupportedSentences: [
          'Michael jaumann ist über seine professionelle Website erreichbar.',
          'Hier sind die wichtigsten Kontaktsoptionen:',
          'Diese Links zeigen aktuelle Projekte und Beiträge zu seinen Arbeiten an der Seite.',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: true,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 9,
      query: 'show me a skills chart',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content', 'list_contents'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.9701259844399861,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'list_contents()',
          name: 'list_contents',
          args: {},
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'text',
            text: '- about: About — Bio, education, skills and hobbies\n- projects: Projects — Open-source projects like MUCGPT, on their own page\n- contact: Contact — LinkedIn and GitHub links\n- blog: Blog — Blog articles about this site and the models that power it\n- blog:chat-with-my-website: Chat with my website — How Mini-Michi, the on-device assistant in the dock, runs a real language model in your browser — and why it only ever sees the tool schemas it actually needs.',
          },
          error: null,
        },
      ],
      finalAnswer:
        'Here’s a quick skills chart based on the retrieved content:\n\n**Skills Overview**\n- **About** – Bio, education, skills & hobbies  \n- **Projects** – Open-source projects like MUCGPT, open on their own page  \n- **Contact** – LinkedIn and GitHub links  \n- **Blog** – Articles about this site and the models behind it  \n- **Chat with My Website** – Real-language model run by Mini-Michi; only uses tool schemas it actually needs  \n\nLet me know if you’d like deeper details on any specific area!',
      timings: {
        retrievalMs: 1,
        roundsMs: [2721, 12064],
        totalMs: 14808,
        tokensGenerated: 134,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['Pytorch', 'Typescript'],
        bannedViolation: false,
        faithfulness: 0.625,
        unsupportedSentences: [
          'Here’s a quick skills chart based on the retrieved content:',
          '**Skills Overview**',
          'Let me know if you’d like deeper details on any specific area!',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 10,
      query: 'where can I find his github?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0,
          rank: 1,
          selected: false,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'get_content(id="github")',
          name: 'get_content',
          args: {
            id: 'github',
          },
          valid: false,
          expectedArgHit: false,
          result: {
            kind: 'text',
            error:
              'Unknown content id "github". Call list_contents first to see the available ids.',
          },
          error: null,
        },
      ],
      finalAnswer:
        "The GitHub repository has the following link: https://github.com/your-repo-name  \nThis is the latest version of your project. Let me know if you'd like details!",
      timings: {
        retrievalMs: 1,
        roundsMs: [2701, 5040],
        totalMs: 7758,
        tokensGenerated: 51,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 1,
        unsupportedSentences: [],
        pass: true,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: true,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 11,
      query: 'how does this page work?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content', 'list_contents', 'set_theme'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.49061317612849337,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0.14910328212626897,
          rank: 2,
          selected: true,
        },
      ],
      toolCalls: [],
      finalAnswer:
        "The page I'm viewing appears to be an educational resource focused on skills development. It contains articles that cover topics like career paths, learning strategies, industry trends, and practical tips for professionals seeking growth opportunities. The content is organized around skill-based education rather than general hobbies or entertainment.\n\nWould you like me to explain any specific aspect of these pages further? For example, how do they categorize content by topic, or what types of resources are included?",
      timings: {
        retrievalMs: 1,
        roundsMs: [9710],
        totalMs: 9722,
        tokensGenerated: 95,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['on-device', 'transformers.js'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          "The page I'm viewing appears to be an educational resource focused on skills development.",
          'It contains articles that cover topics like career paths, learning strategies, industry trends, and practical tips for professionals seeking growth opportunities.',
          'The content is organized around skill-based education rather than general hobbies or entertainment.',
          'Would you like me to explain any specific aspect of these pages further?',
          'For example, how do they categorize content by topic, or what types of resources are included?',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 12,
      query: 'how fast is the chat model?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0,
          rank: 1,
          selected: false,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'The chat model has been updated since my last update. It runs at approximately **15–20 milliseconds** during normal operation. For extremely low latency (<10 ms), I recommend checking performance metrics through your application’s monitoring dashboard. Would you like me to check specific metrics now?',
      timings: {
        retrievalMs: 1,
        roundsMs: [5734],
        totalMs: 5762,
        tokensGenerated: 59,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['LFM2.5-350M'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'The chat model has been updated since my last update.',
          'It runs at approximately **15–20 milliseconds** during normal operation.',
          'For extremely low latency (<10 ms), I recommend checking performance metrics through your application’s monitoring dashboard.',
          'Would you like me to check specific metrics now?',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 13,
      query: 'does he have hobbies?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content', 'list_contents'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.3206204928149388,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'Michael does not explicitly mention any hobbies in his public profile or bio. His focus appears to be on professional skills like software development and project management. Would you like me to suggest some common hobbies based on general knowledge instead?',
      timings: {
        retrievalMs: 2,
        roundsMs: [5794],
        totalMs: 5805,
        tokensGenerated: 50,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['Running', 'Cycling'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'Michael does not explicitly mention any hobbies in his public profile or bio.',
          'His focus appears to be on professional skills like software development and project management.',
          'Would you like me to suggest some common hobbies based on general knowledge instead?',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 14,
      query: 'change the color to amber',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['set_theme', 'list_contents'],
      rows: [
        {
          name: 'set_theme',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.12036464849727711,
          rank: 1,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'set_theme(theme="amber")',
          name: 'set_theme',
          args: {
            theme: 'amber',
          },
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'layout',
            theme: 'amber',
          },
          error: null,
        },
      ],
      finalAnswer:
        'The page has been switched to an amber theme. Let me know if there’s anything else I can help with!',
      timings: {
        retrievalMs: 2,
        roundsMs: [2692, 3599],
        totalMs: 6325,
        tokensGenerated: 40,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 1,
        unsupportedSentences: [],
        pass: true,
      },
      retrievalPass: true,
      toolsPass: true,
      answerPass: true,
      chainPass: true,
      error: null,
    },
    {
      fixtureIndex: 15,
      query: 'which projects has he built?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content', 'list_contents'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.6843827930174563,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'list_contents()',
          name: 'list_contents',
          args: {},
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'text',
            text: '- about: About — Bio, education, skills and hobbies\n- projects: Projects — Open-source projects like MUCGPT, on their own page\n- contact: Contact — LinkedIn and GitHub links\n- blog: Blog — Blog articles about this site and the models that power it\n- blog:chat-with-my-website: Chat with my website — How Mini-Michi, the on-device assistant in the dock, runs a real language model in your browser — and why it only ever sees the tool schemas it actually needs.',
          },
          error: null,
        },
      ],
      finalAnswer:
        'Mini-Michi builds open-source projects such as MUCGPT and works through an open-source project platform via GitHub. His work also appears on his blog, featuring discussions about the mobile mini-web assistant called Mini-Michi, and how it operates within the web environment by using schema-based interactions.',
      timings: {
        retrievalMs: 2,
        roundsMs: [2911, 7522],
        totalMs: 10447,
        tokensGenerated: 74,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['MUCGPT'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'Mini-Michi builds open-source projects such as MUCGPT and works through an open-source project platform via GitHub.',
          'His work also appears on his blog, featuring discussions about the mobile mini-web assistant called Mini-Michi, and how it operates within the web environment by using schema-based interactions.',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 16,
      query: 'switch to another color',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['set_theme'],
      rows: [
        {
          name: 'set_theme',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0,
          rank: 1,
          selected: false,
        },
        {
          name: 'get_content',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'set_theme(theme="orange")',
          name: 'set_theme',
          args: {
            theme: 'orange',
          },
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'layout',
            theme: 'orange',
          },
          error: null,
        },
      ],
      finalAnswer:
        'The accent color has been switched to orange! Let me know if there’s anything else I can help with.',
      timings: {
        retrievalMs: 1,
        roundsMs: [2005, 2824],
        totalMs: 4857,
        tokensGenerated: 39,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 1,
        unsupportedSentences: [],
        pass: true,
      },
      retrievalPass: true,
      toolsPass: true,
      answerPass: true,
      chainPass: true,
      error: null,
    },
    {
      fixtureIndex: 17,
      query: 'what is his tech stack?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0,
          rank: 1,
          selected: false,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'get_content(id="about", topic="skills")',
          name: 'get_content',
          args: {
            id: 'about',
            topic: 'skills',
          },
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'text',
            section: 'about',
            topic: 'skills',
            spotlight: true,
            target: 'about-skills',
            text: "# About\n\nHi, I'm Michael Jaumann. I live in Munich and work for the [KIES](https://ki.muenchen.de/ki-team) team. I'm an Open Sourcerer, Spaghetti Lover, and a mediocre runner at [MRRC](https://www.mrrc-muenchen.de/).\n\n## Education\n\n- **B.Sc. Computer Science**, Hochschule München (2012-2016)\n  Thesis: VANET Overlay Networks\n- **M.Sc. Computer Science**, TU München (2017-2022, part-time)\n  Focus: Machine Learning & Software Engineering\n  Thesis: Protein Language Models for Structure Prediction\n\n## Skills\n\n- **Machine Learning:** Pytorch, Huggingface Transformers, Scikit-learn\n- **GenAI Frameworks:** Langchain, Langgraph\n- **Frontend:** React, Vue.js\n- **Backend:** FastAPI, Spring\n- **DevOps:** Gitlab Pipelines, Github Pipelines, Terraform, Openshift, Helm, Kubernetes\n- **Programming Languages:** Python, Java, Typescript, C++\n- **Others:** OpenCV, OpenGL, OMNeT++\n\n## Hobbies\n\nRunning, Cycling, Walking with my dog\n",
          },
          error: null,
        },
      ],
      finalAnswer:
        'Michael Jaumann’s technical background includes a B.Sc. Computer Science degree from Hochschule München (2012–2016), followed by a M.Sc. at TU München (2017–2022) focused on machine learning and software engineering. His current role involves open-source contributions such as KIES, MRRC, and other frameworks like Langchain and Langgraph. He also works on frontend development (React/Vue.js) and backend systems including FastAPI and Kubernetes. Programming languages include Python, Java, TypeScript, and others, reflecting both traditional computer science knowledge and modern AI-driven skills.',
      timings: {
        retrievalMs: 1,
        roundsMs: [2864, 14081],
        totalMs: 16976,
        tokensGenerated: 146,
      },
      score: {
        factRecall: 0.5,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'Michael Jaumann’s technical background includes a B.Sc. Computer Science degree from Hochschule München (2012–2016), followed by a M.Sc. at TU München (2017–2022) focused on machine learning and software engineering.',
          'His current role involves open-source contributions such as KIES, MRRC, and other frameworks like Langchain and Langgraph.',
          'He also works on frontend development (React/Vue.js) and backend systems including FastAPI and Kubernetes.',
          'Programming languages include Python, Java, TypeScript, and others, reflecting both traditional computer science knowledge and modern AI-driven skills.',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: true,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 18,
      query: 'show me the numbers',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['list_contents', 'get_content'],
      rows: [
        {
          name: 'list_contents',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0.13950790453752404,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'The user asked for "numbers," but none of the provided tools can retrieve numerical data. Here are some options based on common patterns:\n\n1. **Get statistics** – `get_statistics`  \n2. **Check performance metrics** – `get_performance`  \n3. **Review analytics dashboard** – `analytics_dashboard`  \n4. **Access internal reports** – `internal_report`  \n\nWould you like me to proceed with any of these?',
      timings: {
        retrievalMs: 2,
        roundsMs: [10291],
        totalMs: 10325,
        tokensGenerated: 102,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['About'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'The user asked for "numbers," but none of the provided tools can retrieve numerical data.',
          'Here are some options based on common patterns:',
          '1.',
          '**Get statistics** – `get_statistics`',
          '2.',
          '**Check performance metrics** – `get_performance`',
          '3.',
          '**Review analytics dashboard** – `analytics_dashboard`',
          '4.',
          '**Access internal reports** – `internal_report`',
          'Would you like me to proceed with any of these?',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 19,
      query: 'tell me about his studies',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content', 'list_contents'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.5679435643089596,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'list_contents()',
          name: 'list_contents',
          args: {},
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'text',
            text: '- about: About — Bio, education, skills and hobbies\n- projects: Projects — Open-source projects like MUCGPT, on their own page\n- contact: Contact — LinkedIn and GitHub links\n- blog: Blog — Blog articles about this site and the models that power it\n- blog:chat-with-my-website: Chat with my website — How Mini-Michi, the on-device assistant in the dock, runs a real language model in your browser — and why it only ever sees the tool schemas it actually needs.',
          },
          error: null,
        },
      ],
      finalAnswer:
        'Mini-Michi has an academic background, holding degrees in computer science and artificial intelligence. He also works as a developer at Microsoft, contributing to open-source projects such as MUCGPT. His work includes building custom chat interfaces using on-device machine learning models, all while keeping them lightweight and efficient.',
      timings: {
        retrievalMs: 2,
        roundsMs: [2838, 7731],
        totalMs: 10585,
        tokensGenerated: 74,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['Hochschule München', 'TU München'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'Mini-Michi has an academic background, holding degrees in computer science and artificial intelligence.',
          'He also works as a developer at Microsoft, contributing to open-source projects such as MUCGPT.',
          'His work includes building custom chat interfaces using on-device machine learning models, all while keeping them lightweight and efficient.',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 20,
      query: 'give me an overview of the site',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['list_contents', 'get_content'],
      rows: [
        {
          name: 'list_contents',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0.1888550387846029,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'Sure! Could you clarify how I should be acting? Here’s my response:\n\n**Marketplace Overview:**  \nThe marketplace offers a wide range of products tailored to various needs—from high-quality electronics to sustainable fashion accessories. It features competitive pricing, fast shipping options, and customer reviews that help buyers make informed decisions. Our platform also includes personalized recommendations based on your past purchases and browsing history.\n\nWould you like details on specific categories such as electronics, clothing, or other topics?',
      timings: {
        retrievalMs: 4,
        roundsMs: [8830],
        totalMs: 8844,
        tokensGenerated: 102,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['About', 'Blog'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'Sure!',
          'Could you clarify how I should be acting?',
          'Here’s my response:',
          '**Marketplace Overview:**',
          'The marketplace offers a wide range of products tailored to various needs—from high-quality electronics to sustainable fashion accessories.',
          'It features competitive pricing, fast shipping options, and customer reviews that help buyers make informed decisions.',
          'Our platform also includes personalized recommendations based on your past purchases and browsing history.',
          'Would you like details on specific categories such as electronics, clothing, or other topics?',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 21,
      query: 'which university did he attend?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0,
          rank: 1,
          selected: false,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'The user asked about which university Michael attended, but no specific ID was provided in the query. To proceed, I would need clarification such as an exact title of his alma mater or any additional details that could help locate the correct content.\n\nWould you like me to search for publicly available information using the `list_contents` function with topics related to universities?',
      timings: {
        retrievalMs: 1,
        roundsMs: [6921],
        totalMs: 6932,
        tokensGenerated: 75,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['Hochschule München', 'TU München'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'The user asked about which university Michael attended, but no specific ID was provided in the query.',
          'To proceed, I would need clarification such as an exact title of his alma mater or any additional details that could help locate the correct content.',
          'Would you like me to search for publicly available information using the `list_contents` function with topics related to universities?',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 22,
      query: 'paint the page orange',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['set_theme', 'get_content', 'list_contents'],
      rows: [
        {
          name: 'set_theme',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0.1257832097736683,
          rank: 1,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.109379468515906,
          rank: 2,
          selected: true,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'set_theme(theme="orange")',
          name: 'set_theme',
          args: {
            theme: 'orange',
          },
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'layout',
            theme: 'orange',
          },
          error: null,
        },
      ],
      finalAnswer:
        'The page has been switched to an orange theme as requested. Let me know if there’s anything else I can help with!',
      timings: {
        retrievalMs: 2,
        roundsMs: [3800, 4633],
        totalMs: 8459,
        tokensGenerated: 42,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 1,
        unsupportedSentences: [],
        pass: true,
      },
      retrievalPass: true,
      toolsPass: true,
      answerPass: true,
      chainPass: true,
      error: null,
    },
    {
      fixtureIndex: 23,
      query: 'what can you do?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['list_contents'],
      rows: [
        {
          name: 'list_contents',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0,
          rank: 1,
          selected: false,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'Here’s how I can assist based on your query:\n\n**What can I do?**  \nI can help by answering questions about **Michael Jaumann**—including his skills, projects, contact details, recent posts, and any other publicly available information relevant to him. My goal is to provide accurate, up-to-date insights while staying within ethical guidelines. Let me know if you’d like specific details! 😊',
      timings: {
        retrievalMs: 2,
        roundsMs: [6124],
        totalMs: 6155,
        tokensGenerated: 86,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['About'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'Here’s how I can assist based on your query:',
          '**What can I do?**',
          'I can help by answering questions about **Michael Jaumann**—including his skills, projects, contact details, recent posts, and any other publicly available information relevant to him.',
          'My goal is to provide accurate, up-to-date insights while staying within ethical guidelines.',
          'Let me know if you’d like specific details!',
          '😊',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 24,
      query: 'which content is available on this site?',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['list_contents', 'get_content'],
      rows: [
        {
          name: 'list_contents',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0.7339862936842443,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [],
      finalAnswer:
        'What specific content would you like me to check out? For example:\n- Project details\n- Recent articles\n- Blog posts\n- Contact forms\n- News updates\n\nLet me know your preference!',
      timings: {
        retrievalMs: 2,
        roundsMs: [5085],
        totalMs: 5099,
        tokensGenerated: 42,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['Blog'],
        bannedViolation: false,
        faithfulness: 0,
        unsupportedSentences: [
          'What specific content would you like me to check out?',
          'For example:',
          '- Project details',
          '- Recent articles',
          '- Blog posts',
          '- Contact forms',
          '- News updates',
          'Let me know your preference!',
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 25,
      query: 'show me all blog articles',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['list_contents', 'get_content'],
      rows: [
        {
          name: 'list_contents',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'get_content',
          score: 0.21792901899127468,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'list_contents()',
          name: 'list_contents',
          args: {},
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'text',
            text: '- about: About — Bio, education, skills and hobbies\n- projects: Projects — Open-source projects like MUCGPT, on their own page\n- contact: Contact — LinkedIn and GitHub links\n- blog: Blog — Blog articles about this site and the models that power it\n- blog:chat-with-my-website: Chat with my website — How Mini-Michi, the on-device assistant in the dock, runs a real language model in your browser — and why it only ever sees the tool schemas it actually needs.',
          },
          error: null,
        },
      ],
      finalAnswer:
        "Here are all the current blog articles I found:\n\n- **About** – Bio, education, skills and hobbies  \n- **Projects** – Projects – Open-source projects like MUCGPT, on their own page  \n- **Contact** – Contact – LinkedIn and GitHub links  \n- **Blog** – Blog – Blog articles about this site and the models that power it  \n- **Chat with My Website** – How Mini-Michi, the on-device assistant in the dock, runs a real language model in your browser—and why it only ever sees the tool schemas it actually needs.\n\nLet me know if you'd like details on any specific article!",
      timings: {
        retrievalMs: 2,
        roundsMs: [2975, 13562],
        totalMs: 16565,
        tokensGenerated: 151,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: [],
        bannedViolation: false,
        faithfulness: 0.7142857142857143,
        unsupportedSentences: [
          'Here are all the current blog articles I found:',
          "Let me know if you'd like details on any specific article!",
        ],
        pass: false,
      },
      retrievalPass: true,
      toolsPass: true,
      answerPass: false,
      chainPass: false,
      error: null,
    },
    {
      fixtureIndex: 26,
      query: 'tell me about the blog article',
      mode: 'lexical',
      effectiveMode: 'lexical',
      selectedNames: ['get_content', 'list_contents'],
      rows: [
        {
          name: 'get_content',
          score: 1,
          rank: 0,
          selected: true,
        },
        {
          name: 'list_contents',
          score: 0.7571108056707662,
          rank: 1,
          selected: true,
        },
        {
          name: 'set_theme',
          score: 0,
          rank: 2,
          selected: false,
        },
      ],
      toolCalls: [
        {
          round: 0,
          raw: 'list_contents()',
          name: 'list_contents',
          args: {},
          valid: true,
          expectedArgHit: true,
          result: {
            kind: 'text',
            text: '- about: About — Bio, education, skills and hobbies\n- projects: Projects — Open-source projects like MUCGPT, on their own page\n- contact: Contact — LinkedIn and GitHub links\n- blog: Blog — Blog articles about this site and the models that power it\n- blog:chat-with-my-website: Chat with my website — How Mini-Michi, the on-device assistant in the dock, runs a real language model in your browser — and why it only ever sees the tool schemas it actually needs.',
          },
          error: null,
        },
      ],
      finalAnswer:
        'Mini-Michi, the on-device assistant in the dock, runs a real language model in your browser—and it’s just as simple as checking the tool schemas they actually need.',
      timings: {
        retrievalMs: 1,
        roundsMs: [2900, 5674],
        totalMs: 8612,
        tokensGenerated: 50,
      },
      score: {
        factRecall: 1,
        factsMissedDueToToolMiss: ['on-device', 'WebGPU'],
        bannedViolation: false,
        faithfulness: 1,
        unsupportedSentences: [],
        pass: true,
      },
      retrievalPass: true,
      toolsPass: false,
      answerPass: true,
      chainPass: false,
      error: null,
    },
  ],
  traces: null,
}
