/**
 * The signature visual: a live offer leaderboard. This is the literal
 * mechanic Wassit runs on — a job goes out, providers respond, and the
 * best combination of speed and price rises to the top lane. The bars
 * fill in on mount like offers landing in real time; the leader is the
 * only one that gets the amber "in the lead" treatment.
 */
const LANES = [
  { rank: 1, name: "Yacine T.", verified: true, eta: "9 min", price: "1,700 DA", fill: 94, delay: "0.9s" },
  { rank: 2, name: "Ahmed K.", verified: true, eta: "12 min", price: "1,800 DA", fill: 74, delay: "0.2s" },
  { rank: 3, name: "Karim B.", verified: false, eta: "18 min", price: "2,100 DA", fill: 52, delay: "1.6s" },
];

function CheckMark() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" fill="none">
      <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.15" />
      <path
        d="M3.2 6.2l1.8 1.8 3.6-3.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RaceBoard() {
  return (
    <div className="relative mx-auto max-w-sm select-none overflow-hidden rounded-2xl border border-ink-950/10 bg-white shadow-[0_1px_2px_rgba(11,26,41,0.06),0_16px_32px_-16px_rgba(11,26,41,0.25)]">
      <style>{`
        @keyframes lane-fill-in {
          0%   { width: 0%; }
          100% { width: var(--fill); }
        }
        .lane-fill { animation: lane-fill-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes lane-row-in {
          0%   { opacity: 0; transform: translateX(-6px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .lane-row { animation: lane-row-in 0.5s ease-out both; }

        @keyframes live-ping {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .live-ping { animation: live-ping 1.6s ease-out infinite; }
      `}</style>

      {/* Top accent bar — a quiet "this is live" signal instead of a literal race motif */}
      <div className="h-1 w-full bg-gradient-to-r from-signal-400 via-signal-500 to-trust-500" />

      <div className="p-6">
        <div className="flex items-start justify-between">
          <p className="font-mono-data text-[11px] uppercase tracking-[0.2em] text-ink-400">Job posted</p>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-signal-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-signal-500" />
            </span>
            <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-signal-600">Live</span>
          </div>
        </div>

        <p className="mt-2 font-display text-xl font-semibold text-ink-950">Kitchen sink leaking</p>
        <p className="mt-0.5 font-mono-data text-[11px] text-ink-400">Plumbing · Bab Ezzouar · 2 min ago</p>

        <div className="mt-5 space-y-4">
          {LANES.map((lane) => (
            <div key={lane.name} className="lane-row" style={{ animationDelay: lane.delay }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`font-mono-data text-xs ${lane.rank === 1 ? "text-signal-600" : "text-ink-300"}`}>
                    #{lane.rank}
                  </span>
                  <span className="text-sm font-medium text-ink-950">{lane.name}</span>
                  {lane.verified && <span className="text-trust-600"><CheckMark /></span>}
                </div>
                <div className="flex items-baseline gap-2 font-mono-data text-xs">
                  <span className="text-ink-600">{lane.eta}</span>
                  <span className={lane.rank === 1 ? "font-semibold text-signal-600" : "text-ink-700"}>
                    {lane.price}
                  </span>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-paper-dim">
                <div
                  className={`lane-fill h-full rounded-full ${
                    lane.rank === 1 ? "bg-gradient-to-r from-signal-400 to-signal-600" : "bg-ink-300"
                  }`}
                  style={{ "--fill": `${lane.fill}%`, animationDelay: lane.delay }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
