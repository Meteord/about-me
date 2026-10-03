/**
 * Retrieval eval fixtures. Each query lists the tool names that count as a
 * correct answer ("anyOf"): a retrieval counts as a hit if any expected tool
 * appears within the selected top-K context, and MRR uses the best rank among
 * the expected tools.
 *
 * Answer-expectation metadata (chain eval):
 *   - expectedAnswerFacts: atomic claims the final answer MUST contain, drawn
 *     from real site content (frontend/src/data/siteData.ts / public/llms/*.md).
 *   - bannedFacts: contradictory claims the answer MUST NOT contain (may be empty).
 *   - expectedArgs (optional): argument expectations for a tool call.
 *
 * Do NOT change `query`/`expected` — retrieval metrics stay comparable.
 */
export const FIXTURES = [
  {
    query: 'Tell me about MUCGPT',
    expected: ['get_content'],
    expectedAnswerFacts: ['MUCGPT', 'Munich'],
    bannedFacts: [],
  },
  {
    query: 'Switch the theme to red',
    expected: ['set_theme'],
    expectedArgs: { set_theme: { theme: 'red' } },
    expectedAnswerFacts: ['red'],
    bannedFacts: [],
  },
  {
    query: 'What education does Michael have?',
    expected: ['get_content'],
    expectedAnswerFacts: ['Hochschule München', 'TU München'],
    bannedFacts: ['M.Sc. from Hochschule München'],
  },
  {
    query: 'surprise me',
    expected: ['list_contents'],
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'where does Michael live?',
    expected: ['get_content'],
    expectedAnswerFacts: ['Munich'],
    bannedFacts: ['lives in Berlin'],
  },
  {
    query: 'make the page red',
    expected: ['set_theme'],
    expectedArgs: { set_theme: { theme: 'red' } },
    expectedAnswerFacts: ['red'],
    bannedFacts: [],
  },
  {
    query: 'what time is it?',
    expected: ['get_content'],
    expectedAnswerFacts: ['Michael'],
    bannedFacts: [],
  },
  {
    query: 'show me some statistics',
    expected: ['list_contents'],
    expectedAnswerFacts: ['Blog'],
    bannedFacts: [],
  },
  {
    query: 'Wie kann ich Michael kontaktieren?',
    expected: ['get_content'],
    expectedAnswerFacts: ['LinkedIn', 'GitHub'],
    bannedFacts: [],
  },
  {
    query: 'show me a skills chart',
    expected: ['get_content'],
    expectedAnswerFacts: ['Pytorch', 'Typescript'],
    bannedFacts: [],
  },
  {
    query: 'where can I find his github?',
    expected: ['get_content'],
    expectedAnswerFacts: ['GitHub'],
    bannedFacts: [],
  },
  {
    query: 'how does this page work?',
    expected: ['get_content'],
    expectedAnswerFacts: ['on-device', 'transformers.js'],
    bannedFacts: [],
  },
  {
    query: 'how fast is the chat model?',
    expected: ['get_content'],
    expectedAnswerFacts: ['LFM2.5-350M'],
    bannedFacts: [],
  },
  {
    query: 'does he have hobbies?',
    expected: ['get_content'],
    expectedAnswerFacts: ['Running', 'Cycling'],
    bannedFacts: [],
  },
  {
    query: 'change the color to amber',
    expected: ['set_theme'],
    expectedArgs: { set_theme: { theme: 'amber' } },
    expectedAnswerFacts: ['amber'],
    bannedFacts: [],
  },
  {
    query: 'which projects has he built?',
    expected: ['get_content'],
    expectedAnswerFacts: ['MUCGPT'],
    bannedFacts: [],
  },
  {
    query: 'switch to another color',
    expected: ['set_theme'],
    expectedAnswerFacts: ['color'],
    bannedFacts: [],
  },
  {
    query: 'what is his tech stack?',
    expected: ['get_content'],
    expectedAnswerFacts: ['Pytorch', 'Typescript'],
    bannedFacts: [],
  },
  {
    query: 'show me the numbers',
    expected: ['list_contents'],
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'tell me about his studies',
    expected: ['get_content'],
    expectedAnswerFacts: ['Hochschule München', 'TU München'],
    bannedFacts: [],
  },
  {
    query: 'give me an overview of the site',
    expected: ['list_contents'],
    expectedAnswerFacts: ['About', 'Blog'],
    bannedFacts: [],
  },
  {
    query: 'which university did he attend?',
    expected: ['get_content'],
    expectedAnswerFacts: ['Hochschule München', 'TU München'],
    bannedFacts: ['studied in Berlin'],
  },
  {
    query: 'paint the page orange',
    expected: ['set_theme'],
    expectedArgs: { set_theme: { theme: 'orange' } },
    expectedAnswerFacts: ['orange'],
    bannedFacts: [],
  },
  {
    query: 'what can you do?',
    expected: ['list_contents'],
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'which content is available on this site?',
    expected: ['list_contents'],
    expectedAnswerFacts: ['Blog'],
    bannedFacts: [],
  },
  {
    query: 'show me all blog articles',
    expected: ['list_contents'],
    expectedAnswerFacts: ['Chat with my website'],
    bannedFacts: [],
  },
  {
    query: 'tell me about the blog article',
    expected: ['get_content'],
    expectedAnswerFacts: ['on-device', 'WebGPU'],
    bannedFacts: [],
  },
]

/**
 * Site-wide banned facts for runtime traces (contracts/traces.md): claims the
 * recorded answer of ANY trace must never contain. Michael works for KIES, not
 * MUCGPT, and lives in Munich.
 */
export const BANNED_TRACE_FACTS = ['works for MUCGPT', 'lives in Berlin']