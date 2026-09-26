/**
 * The real, data-driven version of RaceBoard's mock: offers rank by price
 * (cheapest first, ETA as tie-break), the leader gets the amber "in the
 * lead" treatment, and each lane's fill bar reflects how competitive that
 * price actually is relative to the current field — not a fixed number.
 * New offers animate in via the shared `.lane-row` / `.lane-fill` classes
 * (see index.css) so an offer that lands while the client is watching
 * visibly slots into the board instead of just appearing.
 */
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

function rankOffers(offers) {
  return [...offers].sort((a, b) => a.price - b.price || a.etaMinutes - b.etaMinutes);
}

// Cheapest offer gets a full bar; the field spreads out from there relative
// to how much more expensive each offer is. Floor of 20% so even the priciest
// live offer still reads as present, not empty.
function fillFor(price, minPrice, maxPrice) {
  if (maxPrice === minPrice) return 100;
  const ratio = (maxPrice - price) / (maxPrice - minPrice);
  return Math.round(20 + ratio * 80);
}

export default function LiveOfferBoard({ offers, onAccept, accepting, jobOpen }) {
  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-950/15 bg-white p-8 text-center">
        <span className="relative mx-auto flex h-2.5 w-2.5">
          <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-signal-500" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal-500" />
        </span>
        <p className="mt-3 font-mono-data text-xs uppercase tracking-[0.2em] text-ink-400">Waiting for offers</p>
        <p className="mt-2 text-sm text-ink-600">
          Nearby verified providers were just notified — offers will appear here the moment they respond.
        </p>
      </div>
    );
  }

  const ranked = rankOffers(offers);
  const prices = ranked.map((o) => o.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-950/10 bg-white shadow-[0_1px_2px_rgba(11,26,41,0.06),0_16px_32px_-16px_rgba(11,26,41,0.25)]">
      <div className="h-1 w-full bg-gradient-to-r from-signal-400 via-signal-500 to-trust-500" />

      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className="font-mono-data text-[11px] uppercase tracking-[0.2em] text-ink-400">
            {ranked.length} {ranked.length === 1 ? "offer" : "offers"}
          </p>
          {jobOpen && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-signal-500" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-signal-500" />
              </span>
              <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-signal-600">Live</span>
            </div>
          )}
        </div>

        <div className="mt-5 space-y-5">
          {ranked.map((offer, i) => {
            const isLeader = i === 0;
            const isAccepted = offer.status === "accepted";
            const isRejected = offer.status === "rejected";
            const fill = fillFor(offer.price, minPrice, maxPrice);

            return (
              <div key={offer._id} className={`lane-row ${isRejected ? "opacity-40" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`font-mono-data text-xs ${isLeader ? "text-signal-600" : "text-ink-300"}`}>
                      #{i + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-ink-950">{offer.provider?.name || "Provider"}</span>
                    <span className="text-trust-600">
                      <CheckMark />
                    </span>
                    {offer.provider?.ratingCount > 0 && (
                      <span className="shrink-0 font-mono-data text-[11px] text-ink-400">
                        {offer.provider.ratingAvg.toFixed(1)}★
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-baseline gap-2 font-mono-data text-xs">
                    <span className="text-ink-600">{offer.etaMinutes} min</span>
                    <span className={isLeader ? "font-semibold text-signal-600" : "text-ink-700"}>
                      {offer.price.toLocaleString()} DA
                    </span>
                  </div>
                </div>

                <div className="mt-1.5 h-1.5 rounded-full bg-paper-dim">
                  <div
                    className={`lane-fill h-full rounded-full ${
                      isLeader ? "bg-gradient-to-r from-signal-400 to-signal-600" : "bg-ink-300"
                    }`}
                    style={{ "--fill": `${fill}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between">
                  {isAccepted && (
                    <span className="rounded-full border border-trust-500/30 bg-trust-50 px-2 py-0.5 font-mono-data text-[10px] uppercase tracking-wide text-trust-600">
                      Accepted
                    </span>
                  )}
                  {isRejected && (
                    <span className="font-mono-data text-[10px] uppercase tracking-wide text-ink-300">Not selected</span>
                  )}
                  {jobOpen && offer.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => onAccept(offer._id)}
                      disabled={accepting !== null}
                      className="ml-auto rounded-md border-2 border-ink-950 bg-signal-500 px-3 py-1 text-xs font-medium text-ink-950 transition-colors hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {accepting === offer._id ? "Accepting…" : "Accept"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
