import { parseFrontmatter } from './frontmatter.js';

const JOURNEY_ORDER = [
  'Patient Management',
  'Clinical',
  'Billing',
  'Operations',
  'Communication',
  'Management',
  'FAQs',
  'Tips',
];

const modules = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default', eager: true });

export function loadAllEntries() {
  return Object.entries(modules)
    .map(([path, raw]) => {
      const { meta, body } = parseFrontmatter(raw);
      const slug = path.split('/').pop().replace('.md', '');
      return {
        slug,
        title: meta.title || slug,
        journey: meta.journey || 'General',
        order: parseInt(meta.order, 10) || 99,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        keywords: meta.keywords || '',
        video: meta.video || '',
        body,
      };
    })
    .sort((a, b) => {
      const ai = JOURNEY_ORDER.indexOf(a.journey);
      const bi = JOURNEY_ORDER.indexOf(b.journey);
      const journeyDiff = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      if (journeyDiff !== 0) return journeyDiff;
      return a.order - b.order;
    });
}

export function groupByJourney(entries) {
  const groups = {};
  for (const entry of entries) {
    if (!groups[entry.journey]) groups[entry.journey] = [];
    groups[entry.journey].push(entry);
  }
  return groups;
}

export { JOURNEY_ORDER };
