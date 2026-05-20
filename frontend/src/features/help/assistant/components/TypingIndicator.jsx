export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 self-start">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.7s' }}
        />
      ))}
    </div>
  );
}
