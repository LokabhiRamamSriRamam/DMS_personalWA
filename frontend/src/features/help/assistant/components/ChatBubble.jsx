import { useState, useEffect } from 'react';
import SmiloAvatar from './SmiloAvatar.jsx';

function StreamingText({ text }) {
  const [revealed, setRevealed] = useState('');
  const done = revealed.length >= (text?.length || 0);

  useEffect(() => {
    if (!text) return;
    let i = 0;
    setRevealed('');
    const iv = setInterval(() => {
      i++;
      setRevealed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 8);
    return () => clearInterval(iv);
  }, [text]);

  return (
    <>
      <SmiloText text={revealed} />
      {!done && (
        <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 animate-pulse align-middle" />
      )}
    </>
  );
}

// Renders **bold** and \n line-breaks from tree node text.
function SmiloText({ text }) {
  return (
    <>
      {text.split('\n').map((line, li) => (
        <span key={li} className="block">
          {line.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={pi}>{part.slice(2, -2)}</strong>
              : part
          )}
        </span>
      ))}
    </>
  );
}

export default function ChatBubble({ msg }) {
  const isSmilo = msg.sender === 'smilo';

  if (isSmilo) {
    return (
      <div className="flex items-end gap-2 mb-3 self-start max-w-[88%]">
        <div className="flex-shrink-0 mb-0.5">
          <SmiloAvatar state="idle" size={28} />
        </div>
        <div className="bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm shadow-sm leading-relaxed">
          {msg.streaming ? <StreamingText text={msg.content} /> : <SmiloText text={msg.content} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end mb-3 max-w-[88%] self-end ml-auto">
      <div className="bg-[#137fec] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm shadow-sm leading-relaxed">
        {msg.content}
      </div>
    </div>
  );
}
