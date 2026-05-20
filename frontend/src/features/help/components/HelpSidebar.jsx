import { useSearchParams } from 'react-router-dom';
import { groupByJourney, JOURNEY_ORDER } from '../lib/loadContent.js';

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

export default function HelpSidebar({ entries }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTopic = searchParams.get('topic');

  const groups = groupByJourney(entries);
  const orderedJourneys = JOURNEY_ORDER.filter(j => groups[j]);

  function navigate(slug) {
    setSearchParams({ topic: slug });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col gap-1 py-4">
      {/* Home link */}
      <button
        onClick={() => setSearchParams({})}
        className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm transition-colors ${
          !activeTopic
            ? 'bg-[#137fec]/10 text-[#137fec] font-semibold'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">home</span>
        <span>Overview</span>
      </button>

      <div className="my-2 border-t border-slate-100" />

      {orderedJourneys.map(journey => (
        <div key={journey} className="mb-1">
          {/* Journey group header */}
          <div className="flex items-center gap-2 px-4 py-1.5 mt-1">
            <span className="material-symbols-outlined text-[14px] text-slate-400">
              {JOURNEY_ICONS[journey] || 'folder'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {journey}
            </span>
          </div>

          {/* Topics under this journey */}
          {groups[journey].map(entry => (
            <button
              key={entry.slug}
              onClick={() => navigate(entry.slug)}
              className={`w-full flex items-center gap-2 pl-8 pr-4 py-2 rounded-lg text-sm text-left transition-colors ${
                activeTopic === entry.slug
                  ? 'bg-[#137fec]/10 text-[#137fec] font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {activeTopic === entry.slug && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#137fec] flex-shrink-0" />
              )}
              <span className={activeTopic === entry.slug ? '' : 'pl-3.5'}>{entry.title}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
