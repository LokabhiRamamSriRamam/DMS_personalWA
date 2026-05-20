import { renderStepText } from '../walkthroughExtractor.js';

export default function WalkthroughCard({ msg, onAction }) {
  const { content, stepInfo, stepActions } = msg;

  return (
    <div className="self-start max-w-[92%] mb-3 ml-9">
      <div className="bg-white border border-[#137fec]/30 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
        {/* Step header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#137fec]/5 border-b border-[#137fec]/15">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#137fec]">
            Step {stepInfo.current} of {stepInfo.total}
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: stepInfo.total }).map((_, i) => (
              <div
                key={i}
                className={`h-1 w-4 rounded-full transition-colors ${
                  i < stepInfo.current ? 'bg-[#137fec]' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div
          className="px-4 py-3 text-sm text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderStepText(content) }}
        />

        {/* Step action buttons */}
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {stepActions.map(action => (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                action.primary
                  ? 'bg-[#137fec] text-white border-[#137fec] hover:bg-blue-700 shadow-sm'
                  : action.id === 'step-stuck'
                  ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  : 'border-[#137fec] text-[#137fec] hover:bg-[#137fec]/10'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
