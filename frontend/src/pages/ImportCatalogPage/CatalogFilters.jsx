import React from 'react';
import { Search, X } from 'lucide-react';
import { DENTAL_CATEGORIES } from '../../data/dentalCatalog/index.js';

const TAG_OPTIONS = [
  { id: 'popular', label: 'Popular' },
  { id: 'common',  label: 'Common' },
  { id: 'cosmetic', label: 'Cosmetic' },
  { id: 'pediatric', label: 'Pediatric' },
];

export default function CatalogFilters({ search, onSearch, activeCategory, onCategory, activeTags, onTagToggle }) {
  return (
    <div className="space-y-3 mb-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search by name or description…"
          className="w-full pl-9 pr-8 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none"
        />
        {search && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategory('')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            activeCategory === ''
              ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-800'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          All
        </button>
        {DENTAL_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategory(activeCategory === cat.id ? '' : cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === cat.id
                ? 'bg-[#137fec] text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tag chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400 font-medium">Quick filters:</span>
        {TAG_OPTIONS.map(tag => (
          <button
            key={tag.id}
            onClick={() => onTagToggle(tag.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              activeTags.includes(tag.id)
                ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );
}
