import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Square, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import API from '../../services/api';
import CatalogFilters from './CatalogFilters.jsx';
import CatalogRow from './CatalogRow.jsx';

const normalize = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

function useExistingItems(endpoint) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(endpoint)
      .then(r => setItems(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { items, loading, refresh: () => {
    setLoading(true);
    API.get(endpoint)
      .then(r => setItems(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }};
}

export default function CatalogImporter({ type, sourceData, endpoint, onImportDone }) {
  const { items: existingItems, loading: existingLoading, refresh } = useExistingItems(endpoint);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(null);
  const [edits, setEdits] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const existingNamesSet = useMemo(
    () => new Set(existingItems.map(e => normalize(e.name))),
    [existingItems]
  );

  const isExisting = entry => existingNamesSet.has(normalize(
    edits[entry.key]?.name ?? entry.name
  ));

  const filtered = useMemo(() => {
    return sourceData.filter(entry => {
      if (activeCategory && entry.category !== activeCategory) return false;
      if (activeTags.length > 0 && !activeTags.some(t => (entry.tags || []).includes(t))) return false;
      const term = search.toLowerCase();
      if (!term) return true;
      return (
        (entry.name || '').toLowerCase().includes(term) ||
        (entry.description || '').toLowerCase().includes(term)
      );
    });
  }, [sourceData, activeCategory, activeTags, search]);

  const availableFiltered = filtered.filter(e => !isExisting(e));
  const selectedInFiltered = availableFiltered.filter(e => selected.has(e.key));
  const allVisibleSelected = availableFiltered.length > 0 && selectedInFiltered.length === availableFiltered.length;

  const duplicatesInSelection = [...selected].filter(key => {
    const entry = sourceData.find(e => e.key === key);
    return entry && isExisting(entry);
  });

  function toggleSelectAll() {
    if (allVisibleSelected) {
      const toRemove = new Set(availableFiltered.map(e => e.key));
      setSelected(prev => new Set([...prev].filter(k => !toRemove.has(k))));
    } else {
      setSelected(prev => new Set([...prev, ...availableFiltered.map(e => e.key)]));
    }
  }

  function toggleSelect(key) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleEdit(key, field, value) {
    setEdits(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  }

  function handleTagToggle(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function handleImport() {
    const toImport = sourceData.filter(e => selected.has(e.key) && !isExisting(e));
    if (toImport.length === 0) return;

    setImporting(true);
    setImportResult(null);

    let succeeded = 0;
    const failed = [];

    for (const entry of toImport) {
      const override = edits[entry.key] || {};
      const payload = {
        name: override.name ?? entry.name,
        category: entry.category,
        description: override.description ?? entry.description ?? '',
        is_active: true,
        ...(type === 'treatments' && { cost: override.cost ?? entry.default_cost }),
        ...(type === 'diagnoses' && { code: override.code ?? entry.code ?? '' }),
      };
      try {
        await API.post(endpoint, payload);
        succeeded++;
      } catch (err) {
        failed.push({ name: payload.name, reason: err.response?.data?.error || err.message });
      }
    }

    setImportResult({ succeeded, failed, total: toImport.length });
    setSelected(new Set());
    setImporting(false);
    refresh();
    if (onImportDone) onImportDone();
  }

  const selectedCount = [...selected].filter(k => {
    const e = sourceData.find(x => x.key === k);
    return e && !isExisting(e);
  }).length;

  if (existingLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#137fec]" size={28} />
      </div>
    );
  }

  return (
    <div>
      <CatalogFilters
        search={search}
        onSearch={setSearch}
        activeCategory={activeCategory}
        onCategory={setActiveCategory}
        activeTags={activeTags}
        onTagToggle={handleTagToggle}
      />

      {/* Import result banner */}
      {importResult && (
        <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 text-sm ${
          importResult.failed.length === 0
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
        }`}>
          {importResult.failed.length === 0
            ? <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">
              Imported {importResult.succeeded} of {importResult.total} items.
            </p>
            {importResult.failed.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                {importResult.failed.map((f, i) => (
                  <li key={i}><span className="font-semibold">{f.name}</span> — {f.reason}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Select all bar */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#137fec] transition-colors"
        >
          {allVisibleSelected
            ? <CheckSquare size={16} className="text-[#137fec]" />
            : <Square size={16} />
          }
          {allVisibleSelected ? 'Deselect all visible' : `Select all visible (${availableFiltered.length})`}
        </button>
        <span className="text-xs text-slate-400">
          {filtered.length} items · {existingItems.length} already imported
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No items match your filters.</div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {filtered.map(entry => (
            <CatalogRow
              key={entry.key}
              entry={entry}
              type={type}
              isExisting={isExisting(entry)}
              isSelected={selected.has(entry.key)}
              isExpanded={expanded === entry.key}
              editValues={edits[entry.key]}
              onToggleSelect={() => toggleSelect(entry.key)}
              onToggleExpand={() => setExpanded(prev => prev === entry.key ? null : entry.key)}
              onEdit={(field, value) => handleEdit(entry.key, field, value)}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <ImportFooter
        selectedCount={selectedCount}
        duplicatesInSelection={duplicatesInSelection.length}
        importing={importing}
        onImport={handleImport}
      />
    </div>
  );
}

function ImportFooter({ selectedCount, duplicatesInSelection, importing, onImport }) {
  return (
    <div className="sticky bottom-0 mt-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pt-4 pb-2 flex items-center justify-between gap-4">
      <div className="text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedCount} selected</span>
        {duplicatesInSelection > 0 && (
          <span className="ml-2 text-amber-600 text-xs">({duplicatesInSelection} already exist – will be skipped)</span>
        )}
      </div>
      <button
        onClick={onImport}
        disabled={selectedCount === 0 || importing}
        className="flex items-center gap-2 px-6 py-2.5 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {importing
          ? <><Loader2 size={15} className="animate-spin" /> Importing…</>
          : `Import ${selectedCount > 0 ? selectedCount : ''} items`
        }
      </button>
    </div>
  );
}
