import { useEffect, useState } from 'react';

const COLORS = ['#137fec', '#fbbf24', '#34d399', '#f87171', '#a78bfa', '#fb923c'];
const COUNT = 28;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default function ConfettiBurst() {
  const [particles] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      left: randomBetween(20, 80),
      size: randomBetween(6, 11),
      duration: randomBetween(1.8, 3.2),
      delay: randomBetween(0, 0.4),
      drift: randomBetween(-80, 80),
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute bottom-24 rounded-sm opacity-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confettiFly ${p.duration}s ${p.delay}s ease-out forwards`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFly {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-420px) translateX(var(--drift)) rotate(480deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
