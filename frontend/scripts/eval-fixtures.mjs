/**
 * Retrieval eval fixtures. Each query lists the tool names that count as a
 * correct answer ("anyOf"): a retrieval counts as a hit if any expected tool
 * appears within the selected top-K context, and MRR uses the best rank among
 * the expected tools.
 */
export const FIXTURES = [
  { query: 'Tell me about MUCGPT', expected: ['retrieve'] },
  { query: 'Switch the theme to red', expected: ['set_theme'] },
  { query: 'What education does Michael have?', expected: ['retrieve'] },
  { query: 'surprise me', expected: ['retrieve'] },
  { query: 'where does Michael live?', expected: ['retrieve'] },
  { query: 'make the page red', expected: ['set_theme'] },
  { query: 'what time is it?', expected: ['retrieve'] },
  { query: 'show me some statistics', expected: ['retrieve'] },
  { query: 'Wie kann ich Michael kontaktieren?', expected: ['retrieve'] },
  { query: 'show me a skills chart', expected: ['retrieve'] },
  { query: 'where can I find his github?', expected: ['retrieve'] },
  { query: 'how does this page work?', expected: ['retrieve'] },
  { query: 'how fast is the chat model?', expected: ['retrieve'] },
  { query: 'does he have hobbies?', expected: ['retrieve'] },
  { query: 'change the color to amber', expected: ['set_theme'] },
  { query: 'which projects has he built?', expected: ['retrieve'] },
  { query: 'switch to another color', expected: ['set_theme'] },
  { query: 'what is his tech stack?', expected: ['retrieve'] },
  { query: 'show me the numbers', expected: ['retrieve'] },
  { query: 'tell me about his studies', expected: ['retrieve'] },
  { query: 'give me an overview of the site', expected: ['retrieve'] },
  { query: 'which university did he attend?', expected: ['retrieve'] },
  { query: 'paint the page orange', expected: ['set_theme'] },
]
