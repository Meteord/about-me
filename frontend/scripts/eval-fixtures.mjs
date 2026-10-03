/**
 * Retrieval + chain eval fixtures. Each query lists the content-source / action
 * names that count as a correct answer ("anyOf"): a retrieval counts as a hit if
 * any expected name appears within the selected top-K context, and MRR uses the
 * best rank among the expected names.
 *
 * Answer-expectation metadata (chain eval):
 *   - expectAction: the query is a theme request — the heuristic action path
 *     must fire (never the chat model).
 *   - expectedArgs: the exact theme the action must apply (absent = any valid theme).
 *   - expectedAnswerFacts: atomic claims the final answer MUST contain, drawn
 *     from real site content (frontend/src/data/siteData.ts / public/llms/*.md).
 *   - bannedFacts: contradictory claims the answer MUST NOT contain (may be empty).
 *
 * Do NOT change `query`/`expected` — retrieval metrics stay comparable.
 */
export const FIXTURES = [
  {
    query: 'Tell me about MUCGPT',
    expected: ['projects'],
    expectedAnswerFacts: ['MUCGPT', 'Munich'],
    bannedFacts: [],
  },
  {
    query: 'Switch the theme to red',
    expected: ['set_theme'],
    expectAction: true,
    expectedArgs: { set_theme: { theme: 'red' } },
    expectedAnswerFacts: ['red'],
    bannedFacts: [],
  },
  {
    query: 'What education does Michael have?',
    expected: ['about_education'],
    expectedAnswerFacts: ['Hochschule München', 'TU München'],
    bannedFacts: ['M.Sc. from Hochschule München'],
  },
  {
    query: 'surprise me',
    expected: ['site_index'],
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'where does Michael live?',
    expected: ['about_bio'],
    expectedAnswerFacts: ['Munich'],
    bannedFacts: ['lives in Berlin'],
  },
  {
    query: 'make the page red',
    expected: ['set_theme'],
    expectAction: true,
    expectedArgs: { set_theme: { theme: 'red' } },
    expectedAnswerFacts: ['red'],
    bannedFacts: [],
  },
  {
    query: 'what time is it?',
    expected: [],
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'show me some statistics',
    expected: ['site_index'],
    expectedAnswerFacts: ['Blog'],
    bannedFacts: [],
  },
  {
    query: 'Wie kann ich Michael kontaktieren?',
    expected: ['contact'],
    expectedAnswerFacts: ['LinkedIn', 'GitHub'],
    bannedFacts: [],
  },
  {
    query: 'show me a skills chart',
    expected: ['about_skills'],
    expectedAnswerFacts: ['Pytorch', 'Typescript'],
    bannedFacts: [],
  },
  {
    query: 'where can I find his github?',
    expected: ['contact'],
    expectedAnswerFacts: ['GitHub'],
    bannedFacts: [],
  },
  {
    query: 'how does this page work?',
    expected: ['blog:chat-with-my-website'],
    expectedAnswerFacts: ['on-device', 'transformers.js'],
    bannedFacts: [],
  },
  {
    query: 'how fast is the chat model?',
    expected: ['blog:chat-with-my-website'],
    expectedAnswerFacts: ['LFM2.5-350M'],
    bannedFacts: [],
  },
  {
    query: 'does he have hobbies?',
    expected: ['about_hobbies'],
    expectedAnswerFacts: ['Running', 'Cycling'],
    bannedFacts: [],
  },
  {
    query: 'change the color to amber',
    expected: ['set_theme'],
    expectAction: true,
    expectedArgs: { set_theme: { theme: 'amber' } },
    expectedAnswerFacts: ['amber'],
    bannedFacts: [],
  },
  {
    query: 'which projects has he built?',
    expected: ['projects'],
    expectedAnswerFacts: ['MUCGPT'],
    bannedFacts: [],
  },
  {
    query: 'switch to another color',
    expected: ['set_theme'],
    expectAction: true,
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'what is his tech stack?',
    expected: ['about_skills'],
    expectedAnswerFacts: ['Pytorch', 'Typescript'],
    bannedFacts: [],
  },
  {
    query: 'show me the numbers',
    expected: ['site_index'],
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'tell me about his studies',
    expected: ['about_education'],
    expectedAnswerFacts: ['Hochschule München', 'TU München'],
    bannedFacts: [],
  },
  {
    query: 'give me an overview of the site',
    expected: ['site_index'],
    expectedAnswerFacts: ['About', 'Blog'],
    bannedFacts: [],
  },
  {
    query: 'which university did he attend?',
    expected: ['about_education'],
    expectedAnswerFacts: ['Hochschule München', 'TU München'],
    bannedFacts: ['studied in Berlin'],
  },
  {
    query: 'paint the page orange',
    expected: ['set_theme'],
    expectAction: true,
    expectedArgs: { set_theme: { theme: 'orange' } },
    expectedAnswerFacts: ['orange'],
    bannedFacts: [],
  },
  {
    query: 'what can you do?',
    expected: ['site_index'],
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'which content is available on this site?',
    expected: ['site_index'],
    expectedAnswerFacts: ['Blog'],
    bannedFacts: [],
  },
  {
    query: 'show me all blog articles',
    expected: ['blog'],
    expectedAnswerFacts: ['Chat with my website'],
    bannedFacts: [],
  },
  {
    query: 'tell me about the blog article',
    expected: ['blog:chat-with-my-website'],
    expectedAnswerFacts: ['on-device', 'WebGPU'],
    bannedFacts: [],
  },
  {
    query: 'Was macht Michael in seiner Freizeit?',
    expected: ['about_hobbies'],
    expectedAnswerFacts: ['Running', 'Cycling'],
    bannedFacts: [],
  },
  {
    query: 'Wo arbeitet Michael?',
    expected: ['about_bio'],
    expectedAnswerFacts: ['KIES'],
    bannedFacts: ['MUCGPT'],
  },
  {
    query: 'what are his hobbies and where does he live?',
    expected: ['about_hobbies', 'about_bio'],
    expectedAnswerFacts: ['Running', 'Munich'],
    bannedFacts: [],
  },
  {
    query: 'I wanna know what he does for fun',
    expected: ['about_hobbies'],
    expectedAnswerFacts: ['Running', 'Cycling'],
    bannedFacts: [],
  },
  {
    query: 'can you change the theme?',
    expected: ['set_theme'],
    expectAction: true,
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'tell me something random about Michael',
    expected: ['site_index'],
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'thanks, that\u2019s all',
    expected: [],
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'how are you?',
    expected: [],
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
]

/**
 * Site-wide banned facts for runtime traces (contracts/traces.md): claims the
 * recorded answer of ANY trace must never contain. Michael works for KIES, not
 * MUCGPT, and lives in Munich.
 */
export const BANNED_TRACE_FACTS = ['works for MUCGPT', 'lives in Berlin']