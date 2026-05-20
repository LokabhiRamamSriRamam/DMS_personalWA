import Fuse from 'fuse.js';

export function createGlobalFuse(entries) {
  return new Fuse(entries, {
    keys: [
      { name: 'title',    weight: 0.4 },
      { name: 'keywords', weight: 0.35 },
      { name: 'tags',     weight: 0.2 },
      { name: 'body',     weight: 0.05 },
    ],
    threshold: 0.5,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

export function interpretQuery(query, currentOptions, globalFuse) {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return { type: 'empty' };

  // 1. Match against current node's option labels (scoped intent)
  const searchable = currentOptions.filter(o => !o.back && !o.freeText && o.label);
  const localFuse = new Fuse(searchable, {
    keys: ['label'],
    threshold: 0.6,
    includeScore: true,
  });
  const localResults = localFuse.search(q);

  if (localResults.length) {
    const best = localResults[0];
    if (best.score < 0.3) return { type: 'confident', option: best.item };
    if (best.score < 0.5) return { type: 'confirm',   option: best.item };
  }

  // 2. Global search across all content
  const globalResults = globalFuse.search(q).slice(0, 3);
  if (globalResults.length && globalResults[0].score < 0.45) {
    return { type: 'global', results: globalResults.map(r => r.item) };
  }

  return { type: 'lost' };
}
