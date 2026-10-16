/**
 * Retrieval + chain eval fixtures. Each query lists the content-source / action
 * names that count as a correct answer ("anyOf"): a retrieval counts as a hit if
 * any expected name appears within the selected top-K context, and MRR uses the
 * best rank among the expected names.
 *
 * Split discipline (contracts/fixtures-schema.md): every fixture carries a
 * persisted, author-reviewed `split: 'train' | 'test'` field. The split is
 * NEVER derived at runtime — membership is decided here, one visible diff line
 * per fixture. New tuning questions → `train`; new evaluation questions →
 * `test` (hand-authored only, no machine-assisted generation), and every test
 * fixture MUST carry a `note` provenance marker (e.g.
 * 'held-out: authored 2026-10-16, post-freeze'). After the corpus freeze, test
 * queries are immutable — never reworded to chase metrics; post-freeze
 * improvements go through train-side levers only (FR-005, research R2/R8).
 *
 * Answer-expectation metadata (chain eval):
 *   - expectAction: the query is a theme request — the heuristic action path
 *     must fire (never the chat model).
 *   - expectedArgs: the exact theme the action must apply (absent = any valid theme).
 *   - expectedAnswerFacts: atomic claims the final answer MUST contain, drawn
 *     from real site content (frontend/src/data/siteData.ts / public/llms/*.md).
 *   - bannedFacts: contradictory claims the answer MUST NOT contain (may be empty).
 *
 * Do NOT change `query`/`expected` — retrieval metrics stay comparable (test
 * fixtures are immutable by contract, research R3 rule 5).
 */
export const FIXTURES = [
  {
    query: 'Tell me about MUCGPT',
    expected: ['projects'],
    split: 'train',
    expectedAnswerFacts: ['MUCGPT', 'Munich'],
    bannedFacts: [],
  },
  {
    query: 'Switch the theme to red',
    expected: ['set_theme'],
    split: 'train',
    expectAction: true,
    expectedArgs: { set_theme: { theme: 'red' } },
    expectedAnswerFacts: ['red'],
    bannedFacts: [],
  },
  {
    query: 'What education does Michael have?',
    expected: ['about_education'],
    split: 'train',
    expectedAnswerFacts: ['Hochschule München', 'TU München'],
    bannedFacts: ['M.Sc. from Hochschule München'],
  },
  {
    query: 'surprise me',
    expected: ['site_index'],
    split: 'train',
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'where does Michael live?',
    expected: ['about_bio'],
    split: 'train',
    expectedAnswerFacts: ['Munich'],
    bannedFacts: ['lives in Berlin'],
  },
  {
    query: 'make the page red',
    expected: ['set_theme'],
    split: 'train',
    expectAction: true,
    expectedArgs: { set_theme: { theme: 'red' } },
    expectedAnswerFacts: ['red'],
    bannedFacts: [],
  },
  {
    query: 'what time is it?',
    expected: [],
    split: 'train',
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'show me some statistics',
    expected: ['site_index'],
    split: 'train',
    expectedAnswerFacts: ['Blog'],
    bannedFacts: [],
  },
  {
    query: 'Wie kann ich Michael kontaktieren?',
    expected: ['contact'],
    split: 'train',
    expectedAnswerFacts: ['LinkedIn', 'GitHub'],
    bannedFacts: [],
  },
  {
    query: 'show me a skills chart',
    expected: ['about_skills'],
    split: 'train',
    expectedAnswerFacts: ['Pytorch', 'Typescript'],
    bannedFacts: [],
  },
  {
    query: 'where can I find his github?',
    expected: ['contact'],
    split: 'train',
    expectedAnswerFacts: ['GitHub'],
    bannedFacts: [],
  },
  {
    query: 'how does this page work?',
    expected: ['blog:chat-with-my-website'],
    split: 'train',
    expectedAnswerFacts: ['on-device', 'transformers.js'],
    bannedFacts: [],
  },
  {
    query: 'how fast is the chat model?',
    expected: ['blog:chat-with-my-website'],
    split: 'train',
    expectedAnswerFacts: ['LFM2.5-350M'],
    bannedFacts: [],
  },
  {
    query: 'does he have hobbies?',
    expected: ['about_hobbies'],
    split: 'train',
    expectedAnswerFacts: ['Running', 'Cycling'],
    bannedFacts: [],
  },
  {
    query: 'change the color to amber',
    expected: ['set_theme'],
    split: 'train',
    expectAction: true,
    expectedArgs: { set_theme: { theme: 'amber' } },
    expectedAnswerFacts: ['amber'],
    bannedFacts: [],
  },
  {
    query: 'which projects has he built?',
    expected: ['projects'],
    split: 'train',
    expectedAnswerFacts: ['MUCGPT'],
    bannedFacts: [],
  },
  {
    query: 'switch to another color',
    expected: ['set_theme'],
    split: 'train',
    expectAction: true,
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'what is his tech stack?',
    expected: ['about_skills'],
    split: 'train',
    expectedAnswerFacts: ['Pytorch', 'Typescript'],
    bannedFacts: [],
  },
  {
    query: 'show me the numbers',
    expected: ['site_index'],
    split: 'train',
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'tell me about his studies',
    expected: ['about_education'],
    split: 'train',
    expectedAnswerFacts: ['Hochschule München', 'TU München'],
    bannedFacts: [],
  },
  {
    query: 'give me an overview of the site',
    expected: ['site_index'],
    split: 'train',
    expectedAnswerFacts: ['About', 'Blog'],
    bannedFacts: [],
  },
  {
    query: 'which university did he attend?',
    expected: ['about_education'],
    split: 'train',
    expectedAnswerFacts: ['Hochschule München', 'TU München'],
    bannedFacts: ['studied in Berlin'],
  },
  {
    query: 'paint the page orange',
    expected: ['set_theme'],
    split: 'train',
    expectAction: true,
    expectedArgs: { set_theme: { theme: 'orange' } },
    expectedAnswerFacts: ['orange'],
    bannedFacts: [],
  },
  {
    query: 'what can you do?',
    expected: ['site_index'],
    split: 'train',
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'which content is available on this site?',
    expected: ['site_index'],
    split: 'train',
    expectedAnswerFacts: ['Blog'],
    bannedFacts: [],
  },
  {
    query: 'show me all blog articles',
    expected: ['blog'],
    split: 'train',
    expectedAnswerFacts: ['Chat with my website'],
    bannedFacts: [],
  },
  {
    query: 'tell me about the blog article',
    expected: ['blog:chat-with-my-website'],
    split: 'train',
    expectedAnswerFacts: ['on-device', 'WebGPU'],
    bannedFacts: [],
  },
  {
    query: 'Was macht Michael in seiner Freizeit?',
    expected: ['about_hobbies'],
    split: 'train',
    expectedAnswerFacts: ['Running', 'Cycling'],
    bannedFacts: [],
  },
  {
    query: 'Wo arbeitet Michael?',
    expected: ['about_bio'],
    split: 'train',
    expectedAnswerFacts: ['KIES'],
    bannedFacts: ['MUCGPT'],
  },
  {
    query: 'what are his hobbies and where does he live?',
    expected: ['about_hobbies', 'about_bio'],
    split: 'train',
    expectedAnswerFacts: ['Running', 'Munich'],
    bannedFacts: [],
  },
  {
    query: 'I wanna know what he does for fun',
    expected: ['about_hobbies'],
    split: 'train',
    expectedAnswerFacts: ['Running', 'Cycling'],
    bannedFacts: [],
  },
  {
    query: 'can you change the theme?',
    expected: ['set_theme'],
    split: 'train',
    expectAction: true,
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'tell me something random about Michael',
    expected: ['site_index'],
    split: 'train',
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'thanks, that\u2019s all',
    expected: [],
    split: 'train',
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'how are you?',
    expected: [],
    split: 'train',
    expectedAnswerFacts: [],
    bannedFacts: [],
  },

  /* ------------------------------------------------------------------
   * Held-out test split — freshly hand-authored after the corpus freeze
   * (de-tuned stopwords + train-only aliases). Immutable from here on:
   * never reword a test query to chase metrics (FR-005, research R3 R8).
   * ------------------------------------------------------------------ */
  {
    query: 'Which employer does Michael work for?',
    expected: ['about_bio'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['KIES'],
    bannedFacts: ['MUCGPT'],
  },
  {
    query: 'Michael’s master thesis covered protein language models?',
    expected: ['about_education'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['Protein Language Models', 'TU München'],
    bannedFacts: ['VANET'],
  },
  {
    query: 'An welcher Hochschule machte Michael seinen Bachelor?',
    expected: ['about_education'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['Hochschule München'],
    bannedFacts: [],
  },
  {
    query: 'Langchain and Langgraph — under which skill category do they sit?',
    expected: ['about_skills'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['Langchain', 'Langgraph'],
    bannedFacts: [],
  },
  {
    query: 'Beherrscht Michael Sprachen wie Python und Java?',
    expected: ['about_skills'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['Python', 'Java'],
    bannedFacts: [],
  },
  {
    query: 'Running is Michael’s thing — does cycling or walking the dog round it out?',
    expected: ['about_hobbies'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['Cycling', 'dog'],
    bannedFacts: [],
  },
  {
    query: 'Womit verbringt Michael seine Freizeit?',
    expected: ['about_hobbies'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'Open-source chatbot for Munich citizens — what’s it called?',
    expected: ['projects'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['MUCGPT'],
    bannedFacts: [],
  },
  {
    query: 'Welche Projekte hat Michael auf GitHub?',
    expected: ['projects'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['MUCGPT'],
    bannedFacts: [],
  },
  {
    query: 'Which social network shows Michael’s professional profile — LinkedIn?',
    expected: ['contact'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['LinkedIn'],
    bannedFacts: [],
  },
  {
    query: 'Which articles has Michael published on this site?',
    expected: ['blog'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['Chat with my website'],
    bannedFacts: [],
  },
  {
    query: 'Gibt es Artikel von Michael auf der Seite?',
    expected: ['blog'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['Chat with my website'],
    bannedFacts: [],
  },
  {
    query: 'Runs Mini-Michi really without any server?',
    expected: ['blog:chat-with-my-website'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['browser', 'transformers.js'],
    bannedFacts: [],
  },
  {
    query: 'How fast does the on-device assistant answer over WebGPU?',
    expected: ['blog:chat-with-my-website'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['WebGPU', 'LFM2.5-350M'],
    bannedFacts: [],
  },
  {
    query: 'Looking for a random fact to explore — what’s available on this site?',
    expected: ['site_index'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectedAnswerFacts: ['About'],
    bannedFacts: [],
  },
  {
    query: 'Recolor everything to orange, please',
    expected: ['set_theme'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectAction: true,
    expectedArgs: { set_theme: { theme: 'orange' } },
    expectedAnswerFacts: ['orange'],
    bannedFacts: [],
  },
  {
    query: 'The colour palette feels boring — switch it?',
    expected: ['set_theme'],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
    expectAction: true,
    expectedAnswerFacts: [],
    bannedFacts: [],
  },
  {
    query: 'Awesome — that covers everything, goodbye!',
    expected: [],
    split: 'test',
    note: 'held-out: authored 2026-10-16, post-freeze',
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
