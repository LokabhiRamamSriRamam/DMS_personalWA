import { useSearchParams, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { loadAllEntries, groupByJourney, JOURNEY_ORDER } from '../lib/loadContent.js';
import HelpSidebar from './HelpSidebar.jsx';
import MarkdownView from './MarkdownView.jsx';
import VideoEmbed from './VideoEmbed.jsx';

const JOURNEY_ICONS = {
  'Patient Management': 'person',
  'Clinical': 'stethoscope',
  'Billing': 'receipt_long',
  'Operations': 'inventory',
  'Communication': 'chat',
  'Management': 'dashboard',
  'FAQs': 'quiz',
  'Tips': 'tips_and_updates',
};

const JOURNEY_COLORS = {
  'Patient Management': 'bg-blue-50 text-blue-700 border-blue-100',
  'Clinical': 'bg-green-50 text-green-700 border-green-100',
  'Billing': 'bg-purple-50 text-purple-700 border-purple-100',
  'Operations': 'bg-orange-50 text-orange-700 border-orange-100',
  'Communication': 'bg-teal-50 text-teal-700 border-teal-100',
  'Management': 'bg-indigo-50 text-indigo-700 border-indigo-100',
  'FAQs': 'bg-slate-50 text-slate-700 border-slate-200',
  'Tips': 'bg-amber-50 text-amber-700 border-amber-100',
};

function WelcomeScreen({ entries }) {
  const [, setSearchParams] = useSearchParams();
  const groups = groupByJourney(entries);
  const orderedJourneys = JOURNEY_ORDER.filter(j => groups[j]);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Help Center</h1>
        <p className="text-slate-500 text-sm">
          Step-by-step guides for every feature of the Molaris DMS. Browse by topic or use the search above.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {orderedJourneys.map(journey => {
          const journeyEntries = groups[journey];
          const colorClass = JOURNEY_COLORS[journey] || 'bg-slate-50 text-slate-700 border-slate-200';
          return (
            <button
              key={journey}
              onClick={() => setSearchParams({ topic: journeyEntries[0].slug })}
              className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-[#137fec]/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`size-9 rounded-lg flex items-center justify-center border ${colorClass}`}>
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {JOURNEY_ICONS[journey] || 'folder'}
                  </span>
                </div>
                <span className="font-semibold text-slate-800 text-sm group-hover:text-[#137fec] transition-colors">{journey}</span>
              </div>
              <ul className="space-y-1">
                {journeyEntries.slice(0, 3).map(entry => (
                  <li key={entry.slug} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                    {entry.title}
                  </li>
                ))}
                {journeyEntries.length > 3 && (
                  <li className="text-xs text-[#137fec] font-medium">+{journeyEntries.length - 3} more</li>
                )}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopicView({ entry }) {
  const colorClass = JOURNEY_COLORS[entry.journey] || 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <div className="max-w-3xl">
      {/* Journey badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${colorClass}`}>
          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {JOURNEY_ICONS[entry.journey] || 'folder'}
          </span>
          {entry.journey}
        </span>
      </div>

      {/* Video (if present) */}
      <VideoEmbed url={entry.video} />

      {/* Markdown body */}
      <MarkdownView body={entry.body} />
    </div>
  );
}

export default function HelpPage() {
  const [searchParams] = useSearchParams();
  const activeTopic = searchParams.get('topic');

  const entries = useMemo(() => loadAllEntries(), []);
  const activeEntry = activeTopic ? entries.find(e => e.slug === activeTopic) : null;

  // Mobile select: all entries as options
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="flex flex-col h-screen bg-[#f6f7f8]">

      {/* Top bar */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg overflow-hidden flex-shrink-0">
            <img src="/MolarisCubicLogoSmall.png" alt="Molaris" className="size-8 object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">Help Center</p>
            <p className="text-[10px] text-slate-400 leading-tight hidden sm:block">Molaris DMS</p>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#137fec] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span className="hidden sm:inline">Back to app</span>
        </Link>
      </header>

      {/* Mobile topic picker */}
      <div className="md:hidden flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2">
        <select
          value={activeTopic || ''}
          onChange={e => {
            if (e.target.value) setSearchParams({ topic: e.target.value });
            else setSearchParams({});
          }}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#137fec]/30"
        >
          <option value="">— Choose a topic —</option>
          {JOURNEY_ORDER.map(journey => {
            const journeyEntries = entries.filter(e => e.journey === journey);
            if (!journeyEntries.length) return null;
            return (
              <optgroup key={journey} label={journey}>
                {journeyEntries.map(entry => (
                  <option key={entry.slug} value={entry.slug}>{entry.title}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <HelpSidebar entries={entries} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 lg:p-10">
            {activeEntry ? (
              <TopicView entry={activeEntry} />
            ) : (
              <WelcomeScreen entries={entries} />
            )}
          </div>
        </main>

      </div>
    </div>
  );
}
