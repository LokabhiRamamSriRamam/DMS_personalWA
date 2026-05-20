import { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDrSmilo } from './useDrSmilo.js';
import SmiloAvatar from './components/SmiloAvatar.jsx';
import ChatBubble from './components/ChatBubble.jsx';
import QuickReplies from './components/QuickReplies.jsx';
import WalkthroughCard from './components/WalkthroughCard.jsx';
import TypingIndicator from './components/TypingIndicator.jsx';
import ConfettiBurst from './components/ConfettiBurst.jsx';

export default function DrSmilo() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const smilo     = useDrSmilo(navigate);
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [hasOpened, setHasOpened]   = useState(false);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [smilo.messages, smilo.isTyping]);

  // Focus input when switching to freeText mode
  useEffect(() => {
    if (smilo.inputMode === 'freeText' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [smilo.inputMode]);

  function handleOpen() {
    setHasOpened(true);
    smilo.open(location.pathname);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!inputValue.trim()) return;
    smilo.submitText(inputValue.trim());
    setInputValue('');
  }

  // Latest message's quickReplies determine what chips to show
  const lastSmiloMsg = [...smilo.messages].reverse().find(m => m.sender === 'smilo');
  const activeChips  = lastSmiloMsg?.quickReplies ?? null;
  const isInWalkthrough = smilo.walkthrough !== null;

  return (
    <>
      {/* ── Floating launcher button ── */}
      <button
        onClick={smilo.isOpen ? smilo.close : handleOpen}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 shadow-lg transition-all duration-300 ${
          smilo.isOpen
            ? 'bg-white border border-slate-200 rounded-full px-3 py-2 text-slate-600 hover:bg-slate-50'
            : 'bg-white border-2 border-[#137fec] rounded-2xl px-3 py-2 hover:shadow-xl hover:scale-105'
        }`}
        title={smilo.isOpen ? 'Close Dr. Smilo' : 'Ask Dr. Smilo'}
      >
        <SmiloAvatar state={smilo.isOpen ? 'idle' : (hasOpened ? 'happy' : 'idle')} size={28} />
        {!smilo.isOpen && (
          <span className="text-sm font-semibold text-[#137fec] pr-1">Ask Dr. Smilo</span>
        )}
        {smilo.isOpen && (
          <span className="material-symbols-outlined text-[18px]">close</span>
        )}
      </button>

      {/* ── Chat panel ── */}
      <div
        className={`fixed z-[60] transition-all duration-300 ease-in-out ${
          smilo.isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }
        bottom-20 right-6
        w-[380px] max-w-[calc(100vw-2rem)]
        md:bottom-6 md:right-[5.5rem]
        h-[560px] max-h-[calc(100vh-6rem)]
        bg-white rounded-2xl shadow-2xl border border-slate-200
        flex flex-col overflow-hidden`}
      >
        {/* Panel header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-[#137fec]/5 to-white flex-shrink-0">
          <div className="relative">
            <SmiloAvatar state={smilo.avatarState} size={38} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Dr. Smilo</p>
            <p className="text-xs text-slate-400">
              {smilo.isTyping ? 'Typing…' : 'Here to help 🦷'}
            </p>
          </div>
          <button
            onClick={smilo.close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Message thread */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5 scroll-smooth"
        >
          {smilo.messages.map(msg =>
            msg.type === 'step' ? (
              <WalkthroughCard key={msg.id} msg={msg} onAction={smilo.stepAction} />
            ) : (
              <ChatBubble key={msg.id} msg={msg} />
            )
          )}
          {smilo.isTyping && <TypingIndicator />}
        </div>

        {/* Quick reply chips (only shown when not in walkthrough + not typing) */}
        {!isInWalkthrough && !smilo.isTyping && activeChips && (
          <QuickReplies
            options={activeChips}
            onSelect={smilo.selectChip}
            disabled={smilo.isTyping}
          />
        )}

        {/* Text input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 flex-shrink-0"
        >
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={smilo.inputMode === 'freeText' ? 'Type your question…' : 'Or type to search…'}
            disabled={smilo.isTyping || isInWalkthrough}
            className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-full px-4 py-2 outline-none focus:border-[#137fec] focus:ring-2 focus:ring-[#137fec]/20 disabled:opacity-50 transition-all placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || smilo.isTyping || isInWalkthrough}
            className="w-8 h-8 rounded-full bg-[#137fec] text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
          </button>
        </form>

        {/* Restart link */}
        <div className="flex justify-center pb-2 flex-shrink-0">
          <button
            onClick={() => smilo.open(location.pathname)}
            className="text-[10px] text-slate-400 hover:text-[#137fec] transition-colors"
          >
            Start over
          </button>
        </div>
      </div>

      {/* Confetti */}
      {smilo.showConfetti && <ConfettiBurst />}
    </>
  );
}
