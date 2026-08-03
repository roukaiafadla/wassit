/**
 * The original signature visual, reskinned for the warm parchment palette:
 * a job pings out from a fixed point, coverage rings expand outward, and
 * provider "blips" appear along the way with their live offer price. Same
 * mechanic as RaceBoard (offers arriving live) but shown as a literal
 * broadcast instead of a leaderboard — sits directly on the hero background,
 * no card container needed.
 */
export default function RadarPulse() {
  const blips = [
    { x: 335, y: 130, delay: "0s", price: "1,800 DA", label: "Plumber" },
    { x: 145, y: 220, delay: "0.7s", price: "2,200 DA", label: "Plumber" },
    { x: 380, y: 275, delay: "1.4s", price: "1,650 DA", label: "Plumber" },
  ];

  return (
    <svg viewBox="0 0 480 360" className="w-full max-w-xl" aria-hidden="true">
      <style>{`
        @keyframes radar-ping {
          0%   { r: 8;   opacity: 0.5; }
          100% { r: 150; opacity: 0; }
        }
        @keyframes blip-in {
          0%   { opacity: 0; transform: scale(0.4); }
          8%   { opacity: 1; transform: scale(1.1); }
          14%  { opacity: 1; transform: scale(1); }
          88%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .radar-ring {
          animation: radar-ping 3.2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite;
          transform-origin: 230px 190px;
        }
        .radar-blip {
          animation: blip-in 4s ease-in-out infinite;
          transform-origin: center;
          filter: drop-shadow(0 6px 10px rgba(20, 23, 31, 0.16));
        }
      `}</style>

      {/* Expanding rings from the job's pin */}
      <circle className="radar-ring" cx="230" cy="190" r="8" fill="none" stroke="var(--color-signal-500)" strokeWidth="1.5" style={{ animationDelay: "0s" }} />
      <circle className="radar-ring" cx="230" cy="190" r="8" fill="none" stroke="var(--color-signal-500)" strokeWidth="1.5" style={{ animationDelay: "1.05s" }} />
      <circle className="radar-ring" cx="230" cy="190" r="8" fill="none" stroke="var(--color-signal-500)" strokeWidth="1.5" style={{ animationDelay: "2.1s" }} />

      {/* Faint static coverage circle for context — tightened so blips read as within range, not floating in empty space */}
      <circle cx="230" cy="190" r="115" fill="none" stroke="var(--color-ink-950)" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="4 6" />

      {/* The job's pin, center, with a label tying the animation to the headline */}
      <g style={{ filter: "drop-shadow(0 6px 10px rgba(20, 23, 31, 0.16))" }}>
        <circle cx="230" cy="190" r="7" fill="var(--color-signal-500)" />
        <circle cx="230" cy="190" r="7" fill="none" stroke="var(--color-paper)" strokeWidth="2.5" />
        <rect x="170" y="150" width="120" height="30" rx="8" fill="var(--color-ink-950)" />
        <text x="230" y="169" textAnchor="middle" fill="var(--color-paper)" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="600">
          Kitchen sink leaking
        </text>
      </g>

      {/* Provider blips responding with offers */}
      {blips.map((b, i) => (
        <g key={i} className="radar-blip" style={{ animationDelay: b.delay }}>
          <line x1="230" y1="190" x2={b.x} y2={b.y} stroke="var(--color-ink-950)" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 4" />
          <circle cx={b.x} cy={b.y} r="5" fill="var(--color-trust-500)" stroke="var(--color-paper)" strokeWidth="1.5" />
          <rect x={b.x + 10} y={b.y - 16} width="92" height="34" rx="8" fill="white" stroke="var(--color-ink-950)" strokeOpacity="0.08" />
          <text x={b.x + 19} y={b.y - 2} fill="var(--color-signal-600)" fontSize="12" fontFamily="IBM Plex Mono, monospace" fontWeight="600">
            {b.price}
          </text>
          <text x={b.x + 19} y={b.y + 12} fill="var(--color-ink-400)" fontSize="9" fontFamily="Inter, sans-serif">
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
