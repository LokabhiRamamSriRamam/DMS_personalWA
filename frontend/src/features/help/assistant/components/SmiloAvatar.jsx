const EXPRESSIONS = {
  idle: {
    leftEye:  <circle cx="15" cy="22" r="2.2" fill="#1e3a8a" />,
    rightEye: <circle cx="25" cy="22" r="2.2" fill="#1e3a8a" />,
    mouth:    <path d="M 15 28 Q 20 32 25 28" stroke="#1e3a8a" strokeWidth="1.5" fill="none" strokeLinecap="round" />,
  },
  thinking: {
    leftEye:  <ellipse cx="15" cy="22" rx="2.2" ry="1.3" fill="#1e3a8a" />,
    rightEye: <ellipse cx="25" cy="22" rx="2.2" ry="1.3" fill="#1e3a8a" />,
    mouth:    <line x1="16" y1="29" x2="24" y2="29" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" />,
  },
  happy: {
    leftEye:  <path d="M 12.5 22 Q 15 19.5 17.5 22" stroke="#1e3a8a" strokeWidth="1.8" fill="none" strokeLinecap="round" />,
    rightEye: <path d="M 22.5 22 Q 25 19.5 27.5 22" stroke="#1e3a8a" strokeWidth="1.8" fill="none" strokeLinecap="round" />,
    mouth:    <path d="M 13 27 Q 20 34 27 27" stroke="#1e3a8a" strokeWidth="2" fill="none" strokeLinecap="round" />,
  },
  concerned: {
    leftEye:  <circle cx="15" cy="22" r="2.2" fill="#1e3a8a" />,
    rightEye: <circle cx="25" cy="22" r="2.2" fill="#1e3a8a" />,
    mouth:    <path d="M 15 30 Q 20 27 25 30" stroke="#1e3a8a" strokeWidth="1.5" fill="none" strokeLinecap="round" />,
  },
};

export default function SmiloAvatar({ state = 'idle', size = 40 }) {
  const expr = EXPRESSIONS[state] || EXPRESSIONS.idle;

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tooth crown shape on top */}
      <path
        d="M 13 10 C 13 5 16 3 20 3 C 24 3 27 5 27 10 L 26 15 L 22.5 12.5 L 20 15 L 17.5 12.5 L 14 15 Z"
        fill="white"
        stroke="#137fec"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Face circle */}
      <circle cx="20" cy="26" r="12" fill="white" stroke="#137fec" strokeWidth="1.5" />
      {/* Cheeks */}
      <circle cx="10.5" cy="28" r="2.5" fill="#fda4af" opacity="0.45" />
      <circle cx="29.5" cy="28" r="2.5" fill="#fda4af" opacity="0.45" />
      {/* Expression */}
      {expr.leftEye}
      {expr.rightEye}
      {expr.mouth}
    </svg>
  );
}
