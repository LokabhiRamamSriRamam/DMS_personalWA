import { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDrSmilo } from './useDrSmilo.js';
import SmiloAvatar from './components/SmiloAvatar.jsx';
import ChatBubble from './components/ChatBubble.jsx';
import QuickReplies from './components/QuickReplies.jsx';
import WalkthroughCard from './components/WalkthroughCard.jsx';
import TypingIndicator from './components/TypingIndicator.jsx';
import ConfettiBurst from './components/ConfettiBurst.jsx';

const DRAG_THRESHOLD = 5; // px before a pointer-down is treated as a drag

export default function DrSmilo() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const smilo     = useDrSmilo(navigate);
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [hasOpened, setHasOpened]   = useState(false);

  // FAB position — stored as { right, bottom } from viewport edges
  const [fabPos, setFabPos] = useState({ right: 24, bottom: 24 });
  const dragState = useRef(null); // { startX, startY, startRight, startBottom, moved }

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

  // Allow other parts of the app to deep-link into Dr. Smilo
  useEffect(() => {
    function onOpenNode(e) {
      setHasOpened(true);
      smilo.openToNode(e.detail.nodeId);
    }
    window.addEventListener('smilo:open-node', onOpenNode);
    return () => window.removeEventListener('smilo:open-node', onOpenNode);
  }, [smilo.openToNode]);

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

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    // Only primary button / touch
    if (e.button !== undefined && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      startX:      e.clientX,
      startY:      e.clientY,
      startRight:  fabPos.right,
      startBottom: fabPos.bottom,
      moved:       false,
    };
  }, [fabPos]);

  const onPointerMove = useCallback((e) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (!dragState.current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragState.current.moved = true;

    // right decreases when dragging right, increases when dragging left
    const newRight  = Math.max(0, Math.min(window.innerWidth  - 60, dragState.current.startRight  - dx));
    // bottom decreases when dragging down, increases when dragging up
    const newBottom = Math.max(0, Math.min(window.innerHeight - 60, dragState.current.startBottom - dy));

    setFabPos({ right: newRight, bottom: newBottom });
  }, []);

  const onPointerUp = useCallback((e) => {
    if (!dragState.current) return;
    const wasDrag = dragState.current.moved;
    dragState.current = null;

    if (!wasDrag) {
      // Treat as click
      if (smilo.isOpen) smilo.close();
      else handleOpen();
    }
  }, [smilo.isOpen, smilo.close, handleOpen]);

  // ── Chat panel position: derived from FAB, clamped to viewport ─────────────
  const panelWidth  = Math.min(380, window.innerWidth - 32);
  const panelHeight = Math.min(560, window.innerHeight - 96);
  // Position panel to the left/above FAB; clamp so it stays in viewport
  const panelRight  = Math.max(8, Math.min(fabPos.right, window.innerWidth  - panelWidth  - 8));
  const panelBottom = Math.max(8, Math.min(fabPos.bottom + 68, window.innerHeight - panelHeight - 8));

  // Latest message's quickReplies determine what chips to show
  const lastSmiloMsg = [...smilo.messages].reverse().find(m => m.sender === 'smilo');
  const activeChips  = lastSmiloMsg?.quickReplies ?? null;
  const isInWalkthrough = smilo.walkthrough !== null;

  return (
    <>
      {/* ── Floating launcher button ── */}
      <div
        style={{
          position:   'fixed',
          right:      fabPos.right,
          bottom:     fabPos.bottom,
          zIndex:     500,
          touchAction: 'none',
          cursor:     'grab',
          userSelect: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className={`flex items-center gap-2.5 shadow-lg transition-all duration-300 ${
            smilo.isOpen
              ? 'bg-white border border-slate-200 rounded-full px-3 py-2 text-slate-600 hover:bg-slate-50'
              : 'bg-white border-2 border-[#137fec] rounded-2xl px-3 py-2 hover:shadow-xl hover:scale-105'
          }`}
          title={smilo.isOpen ? 'Close Dr. Smilo' : 'Ask Dr. Smilo'}
        >
          <SmiloAvatar state={smilo.isOpen ? 'idle' : (hasOpened ? 'happy' : 'idle')} size={28} />
          {!smilo.isOpen && (
            <span className="hidden sm:inline text-sm font-semibold text-[#137fec] pr-1">Ask Dr. Smilo</span>
          )}
          {smilo.isOpen && (
            <span className="material-symbols-outlined text-[18px]">close</span>
          )}
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div
        style={{
          position: 'fixed',
          right:    panelRight,
          bottom:   panelBottom,
          width:    panelWidth,
          height:   panelHeight,
          zIndex:   501,
        }}
        className={`transition-all duration-300 ease-in-out ${
          smilo.isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }
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
