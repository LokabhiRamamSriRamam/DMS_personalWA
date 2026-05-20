import { useState, useMemo, useRef, useCallback } from 'react';
import { NODES } from './drSmiloTree.js';
import { getContextNode } from './contextOpenings.js';
import { SLUG_ACTIONS } from './slugActions.js';
import { extractSteps } from './walkthroughExtractor.js';
import { createGlobalFuse, interpretQuery } from './fuzzyIntent.js';
import { loadAllEntries } from '../lib/loadContent.js';

let _uid = 0;
const uid = () => `smilo-${Date.now()}-${_uid++}`;

function makeMsg(sender, type, content, extras = {}) {
  return { id: uid(), sender, type, content, streaming: sender === 'smilo', ...extras };
}

export function useDrSmilo(navigate) {
  const [isOpen, setIsOpen]                 = useState(false);
  const [messages, setMessages]             = useState([]);
  const [currentNodeId, setCurrentNodeId]   = useState('root');
  const [nodeStack, setNodeStack]           = useState([]);
  const [avatarState, setAvatarState]       = useState('idle');
  const [isTyping, setIsTyping]             = useState(false);
  const [walkthrough, setWalkthrough]       = useState(null); // {slug, steps, step}
  const [showConfetti, setShowConfetti]     = useState(false);
  const [inputMode, setInputMode]           = useState('chips');
  const [pendingSlug, setPendingSlug]       = useState(null);
  const mountedRef = useRef(true);

  const entries    = useMemo(() => loadAllEntries(), []);
  const globalFuse = useMemo(() => createGlobalFuse(entries), [entries]);

  const push = useCallback(msg => {
    if (mountedRef.current) setMessages(prev => [...prev, msg]);
  }, []);

  // Simulate typing delay, then deliver message
  async function smiloSay(content, extras = {}) {
    if (!mountedRef.current) return;
    setIsTyping(true);
    setAvatarState('thinking');
    const delay = Math.min(350 + content.length * 4, 900);
    await new Promise(r => setTimeout(r, delay));
    if (!mountedRef.current) return;
    setIsTyping(false);
    setAvatarState(extras.avatarState || 'idle');
    push(makeMsg('smilo', extras.type || 'text', content, extras));
  }

  function addUserMsg(text) {
    push(makeMsg('user', 'text', text));
  }

  function getNodeOptions(nodeId) {
    return NODES[nodeId]?.options || [];
  }

  // Navigate to a node, showing its question + chips
  async function goToNode(nodeId, pushCurrent = true) {
    const node = NODES[nodeId];
    if (!node) return;
    if (pushCurrent) setNodeStack(prev => [...prev, currentNodeId]);
    setCurrentNodeId(nodeId);
    setInputMode('chips');
    await smiloSay(node.smilo, {
      avatarState: node.avatarState || 'idle',
      quickReplies: node.options,
    });
  }

  // Show the guide-offer: walk me through it, or just open the guide
  async function offerGuide(option) {
    const { slug, hint } = option;
    setPendingSlug(slug);
    if (hint) {
      await smiloSay(hint, { avatarState: 'happy' });
    }
    const action = SLUG_ACTIONS[slug];
    const quickReplies = [
      { id: 'wt-yes',   label: '🚶 Walk me through it' },
      { id: 'wt-guide', label: '📖 Open the full guide' },
      ...(action?.route ? [{ id: 'wt-nav', label: `${action.label} →` }] : []),
      { id: 'wt-back',  label: '← Back' },
    ];
    await smiloSay(
      hint ? 'Want more detail?' : "Want me to walk you through it step by step?",
      { avatarState: 'idle', quickReplies }
    );
  }

  // Start the walkthrough
  async function startWalkthrough(slug) {
    const entry = entries.find(e => e.slug === slug);
    if (!entry) return;
    const steps = extractSteps(entry.body);
    if (!steps.length) {
      await smiloSay("I couldn't extract the steps for this one — let me open the guide.", { avatarState: 'concerned' });
      window.open(`/help?topic=${slug}`, '_blank');
      return;
    }
    setWalkthrough({ slug, steps, step: 0 });
    await smiloSay(`Great! Let's go — ${steps.length} steps total.`, { avatarState: 'happy' });
    deliverStep({ slug, steps, step: 0 });
  }

  function deliverStep(wt) {
    const { slug, steps, step } = wt;
    const action = SLUG_ACTIONS[slug];
    const stepActions = [
      { id: 'step-done',  label: '✓  Done', primary: true },
      ...(action?.route ? [{ id: 'step-nav', label: `${action.label} →`, route: action.route }] : []),
      { id: 'step-stuck', label: "I'm stuck" },
    ];
    push(makeMsg('smilo', 'step', steps[step], {
      streaming: false,
      stepInfo: { current: step + 1, total: steps.length },
      stepActions,
    }));
  }

  async function handleStepAction(actionId) {
    if (!walkthrough) return;
    const { slug, steps, step } = walkthrough;

    if (actionId === 'step-nav') {
      const route = SLUG_ACTIONS[slug]?.route;
      if (route) navigate(route);
      return; // don't advance — user needs to do the step
    }

    if (actionId === 'step-stuck') {
      addUserMsg("I'm stuck");
      setWalkthrough(null);
      await smiloSay("No worries! Let me open the full guide for you.", { avatarState: 'concerned' });
      window.open(`/help?topic=${slug}`, '_blank');
      await smiloSay("Anything else I can help with?", {
        avatarState: 'idle',
        quickReplies: NODES[currentNodeId]?.options || NODES.root.options,
      });
      return;
    }

    // step-done
    addUserMsg('Done ✓');
    const nextStep = step + 1;
    if (nextStep >= steps.length) {
      // Walkthrough complete
      setWalkthrough(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
      const action = SLUG_ACTIONS[slug];
      const endActions = [
        ...(action?.route ? [{ id: 'end-nav', label: `${action.label} →`, route: action.route }] : []),
        { id: 'end-more',  label: 'I have another question' },
        { id: 'end-done',  label: "That's all — thanks!" },
      ];
      await smiloSay("All done! 🎉 Great work.", {
        avatarState: 'happy',
        quickReplies: endActions,
      });
    } else {
      const updated = { slug, steps, step: nextStep };
      setWalkthrough(updated);
      deliverStep(updated);
    }
  }

  async function handleChipSelect(option) {
    if (option.id === 'end-done') {
      addUserMsg("That's all — thanks!");
      await smiloSay("Happy to help! Come back anytime. 😊", { avatarState: 'happy' });
      setTimeout(() => setIsOpen(false), 1500);
      return;
    }
    if (option.id === 'end-more' || option.id === 'other') {
      addUserMsg(option.label);
      setNodeStack([]);
      await goToNode('root', false);
      return;
    }
    if (option.id === 'end-nav' || option.id === 'step-nav') {
      const route = option.route || SLUG_ACTIONS[pendingSlug]?.route;
      if (route) navigate(route);
      return;
    }
    if (option.id === 'wt-yes') {
      addUserMsg('Walk me through it');
      await startWalkthrough(pendingSlug);
      return;
    }
    if (option.id === 'wt-guide') {
      addUserMsg('Show me the guide');
      window.open(`/help?topic=${pendingSlug}`, '_blank');
      await smiloSay("I've opened the guide in a new tab. Anything else?", {
        avatarState: 'happy',
        quickReplies: NODES[currentNodeId]?.options || NODES.root.options,
      });
      return;
    }
    if (option.id === 'wt-back') {
      addUserMsg('← Back');
      const prevId = nodeStack[nodeStack.length - 1] || 'root';
      setNodeStack(prev => prev.slice(0, -1));
      setPendingSlug(null);
      await goToNode(prevId, false);
      return;
    }
    if (option.id === 'wt-nav') {
      const route = SLUG_ACTIONS[pendingSlug]?.route;
      if (route) navigate(route);
      return;
    }
    if (option.back) {
      addUserMsg('← Back');
      const prevId = nodeStack[nodeStack.length - 1] || 'root';
      setNodeStack(prev => prev.slice(0, -1));
      await goToNode(prevId, false);
      return;
    }
    if (option.freeText) {
      addUserMsg(option.emoji ? `${option.emoji} ${option.label}` : option.label);
      setInputMode('freeText');
      await smiloSay("Sure — just type what you need help with:", { avatarState: 'idle', quickReplies: null });
      return;
    }
    if (option.next) {
      addUserMsg(option.emoji ? `${option.emoji} ${option.label}` : option.label);
      await goToNode(option.next);
      return;
    }
    if (option.slug) {
      addUserMsg(option.label);
      await offerGuide(option);
      return;
    }
  }

  async function handleTextSubmit(text) {
    if (!text.trim()) return;
    addUserMsg(text);
    setInputMode('chips');

    const currentOptions = getNodeOptions(currentNodeId);
    const result = interpretQuery(text, currentOptions, globalFuse);

    if (result.type === 'confident') {
      await smiloSay(`Got it — ${result.option.label.toLowerCase()}.`, { avatarState: 'happy' });
      await handleChipSelect(result.option);
      return;
    }
    if (result.type === 'confirm') {
      await smiloSay(`Do you mean "${result.option.label}"?`, {
        avatarState: 'idle',
        quickReplies: [
          { ...result.option, id: result.option.id },
          { id: 'free', label: 'No, something else', emoji: '🔍', freeText: true },
        ],
      });
      return;
    }
    if (result.type === 'global') {
      await smiloSay("Here are the closest matches I found:", {
        avatarState: 'idle',
        quickReplies: result.results.map(e => ({ id: `g-${e.slug}`, label: e.title, slug: e.slug })),
      });
      return;
    }
    // lost
    await smiloSay("Hmm, I'm not sure about that one. Try one of these, or rephrase?", {
      avatarState: 'concerned',
      quickReplies: NODES[currentNodeId]?.options || NODES.root.options,
    });
  }

  async function handleOpen(pathname) {
    mountedRef.current = true;
    const nodeId = getContextNode(pathname);
    setCurrentNodeId(nodeId);
    setNodeStack([]);
    setMessages([]);
    setWalkthrough(null);
    setInputMode('chips');
    setPendingSlug(null);
    setShowConfetti(false);
    setIsOpen(true);

    const node = NODES[nodeId];
    await smiloSay(node.smilo, {
      avatarState: node.avatarState || 'idle',
      quickReplies: node.options,
    });
  }

  function handleClose() {
    mountedRef.current = false;
    setIsOpen(false);
  }

  return {
    isOpen,
    messages,
    currentNodeId,
    avatarState,
    isTyping,
    walkthrough,
    showConfetti,
    inputMode,
    open:             handleOpen,
    close:            handleClose,
    selectChip:       handleChipSelect,
    submitText:       handleTextSubmit,
    stepAction:       handleStepAction,
    currentOptions:   getNodeOptions(currentNodeId),
  };
}
