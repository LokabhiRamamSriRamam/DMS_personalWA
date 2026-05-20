export default function QuickReplies({ options, onSelect, disabled }) {
  if (!options?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => !disabled && onSelect(opt)}
          disabled={disabled}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
            opt.back
              ? 'border-slate-200 text-slate-500 hover:bg-slate-100'
              : opt.primary
              ? 'bg-[#137fec] text-white border-[#137fec] hover:bg-blue-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-[#137fec] hover:text-[#137fec]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {opt.emoji && <span>{opt.emoji}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
