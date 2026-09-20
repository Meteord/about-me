/**
 * Retrieval eval fixtures. Each query lists the tool names that count as a
 * correct answer ("anyOf"): a retrieval counts as a hit if any expected tool
 * appears within the selected top-K context, and MRR uses the best rank among
 * the expected tools.
 */
export const FIXTURES = [
  { query: 'Tell me about MUCGPT', expected: ['get_content'] },
  { query: 'Switch the theme to red', expected: ['set_theme'] },
  { query: 'What education does Michael have?', expected: ['get_content'] },
  { query: 'surprise me', expected: ['list_contents'] },
  { query: 'where does Michael live?', expected: ['get_content'] },
  { query: 'make the page red', expected: ['set_theme'] },
  { query: 'what time is it?', expected: ['get_content'] },
  { query: 'show me some statistics', expected: ['list_contents'] },
  { query: 'Wie kann ich Michael kontaktieren?', expected: ['get_content'] },
  { query: 'show me a skills chart', expected: ['get_content'] },
  { query: 'where can I find his github?', expected: ['get_content'] },
  { query: 'how does this page work?', expected: ['get_content'] },
  { query: 'how fast is the chat model?', expected: ['get_content'] },
  { query: 'does he have hobbies?', expected: ['get_content'] },
  { query: 'change the color to amber', expected: ['set_theme'] },
  { query: 'which projects has he built?', expected: ['get_content'] },
  { query: 'switch to another color', expected: ['set_theme'] },
  { query: 'what is his tech stack?', expected: ['get_content'] },
  { query: 'show me the numbers', expected: ['list_contents'] },
  { query: 'tell me about his studies', expected: ['get_content'] },
  { query: 'give me an overview of the site', expected: ['list_contents'] },
  { query: 'which university did he attend?', expected: ['get_content'] },
  { query: 'paint the page orange', expected: ['set_theme'] },
  { query: 'what can you do?', expected: ['list_contents'] },
  { query: 'which content is available on this site?', expected: ['list_contents'] },
  { query: 'show me all blog articles', expected: ['list_contents'] },
  { query: 'tell me about the blog article', expected: ['get_content'] },
]