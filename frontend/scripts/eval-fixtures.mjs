/**
 * Retrieval eval fixtures. Each query lists the tool names that count as a
 * correct answer ("anyOf"): a retrieval counts as a hit if any expected tool
 * appears within the selected top-K context, and MRR uses the best rank among
 * the expected tools.
 */
export const FIXTURES = [
  { query: 'Move contact to the top', expected: ['move_section', 'translate_section'] },
  { query: 'Tell me about MUCGPT', expected: ['about_site', 'about_me'] },
  { query: 'Switch the theme to red', expected: ['set_theme'] },
  { query: 'Toggle the scanlines', expected: ['toggle_scanlines'] },
  { query: 'What education does Michael have?', expected: ['about_me', 'about_site'] },
  { query: 'surprise me', expected: ['random_fact'] },
  {
    query: 'where is the projects section?',
    expected: ['jump_to_section', 'flash_section', 'show_section'],
  },
  { query: 'make the text bigger', expected: ['set_zoom'] },
  { query: 'what time is it?', expected: ['now'] },
  { query: 'how many tools do you have?', expected: ['list_tools', 'site_stats'] },
  { query: 'remove the projects window', expected: ['hide_section'] },
  { query: 'go to the bottom of the page', expected: ['scroll_page'] },
  { query: 'rotate the sections', expected: ['rotate_sections'] },
  { query: 'open the tool selector', expected: ['toggle_tool_selector'] },
  { query: 'restore the default layout', expected: ['reset_layout'] },
  { query: 'change the background to grid', expected: ['set_background'] },
  { query: 'Wie kann ich Michael kontaktieren?', expected: ['about_me', 'about_site'] },
]
