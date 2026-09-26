import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import * as api from "../../lib/api";
import { getSocket, watchJob, unwatchJob } from "../../lib/socket";
import { useAuth } from "../../context/AuthContext";
import LiveOfferBoard from "../../components/LiveOfferBoard";

const URGENCY_STYLES = {
  low: "bg-ink-950/5 text-ink-600",
  medium: "bg-signal-50 text-signal-600",
  high: "bg-red-50 text-red-600",
};

export default function LiveJobFeed() {
  const { jobId } = useParams();
  const { user } = useAuth();

  const [job, setJob] = useState(null);
  const [offers, setOffers] = useState([]); // client only
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(null); // offer id currently being accepted

  // Provider-only offer form state
  const [price, setPrice] = useState("");
  const [etaMinutes, setEtaMinutes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myOffer, setMyOffer] = useState(null); // { status, price?, etaMinutes? } once known

  const isClient = user?.role === "client";
  const isProvider = user?.role === "provider";

  // --- Initial load ---
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        const jobData = await api.getJob(jobId);
        if (cancelled) return;
        setJob(jobData);

        if (isClient) {
          const offersData = await api.listOffersForJob(jobId);
          if (cancelled) return;
          setOffers(offersData.map(normalizeRestOffer));
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || "Couldn't load this job");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, isClient]);

  // --- Live updates ---
  useEffect(() => {
    if (!jobId || !user) return;

    const socket = getSocket();
    watchJob(jobId);

    function handleOfferNew(payload) {
      if (payload.offer.jobId !== jobId) return;
      setOffers((prev) => {
        if (prev.some((o) => o._id === payload.offer._id)) return prev;
        return [...prev, normalizeSocketOffer(payload)];
      });
    }

    function handleJobMatched(payload) {
      if (payload.job._id !== jobId) return;
      setJob(payload.job);
      setOffers((prev) =>
        prev.map((o) => {
          if (o._id === payload.acceptedOffer._id) return { ...o, status: "accepted" };
          if (o.status === "pending") return { ...o, status: "rejected" };
          return o;
        })
      );
    }

    function handleOfferAccepted(payload) {
      if (payload.job._id !== jobId) return;
      setJob(payload.job);
      setMyOffer({ status: "accepted", price: payload.offer.price, etaMinutes: payload.offer.etaMinutes });
    }

    function handleOfferRejected(payload) {
      if (payload.jobId !== jobId) return;
      setMyOffer((prev) => (prev ? { ...prev, status: "rejected" } : prev));
    }

    socket.on("offer:new", handleOfferNew);
    socket.on("job:matched", handleJobMatched);
    if (isProvider) {
      socket.on("offer:accepted", handleOfferAccepted);
      socket.on("offer:rejected", handleOfferRejected);
    }

    return () => {
      socket.off("offer:new", handleOfferNew);
      socket.off("job:matched", handleJobMatched);
      socket.off("offer:accepted", handleOfferAccepted);
      socket.off("offer:rejected", handleOfferRejected);
      unwatchJob(jobId);
    };
  }, [jobId, user, isProvider]);

  const acceptedOffer = useMemo(
    () => offers.find((o) => o._id === job?.acceptedOfferId) || offers.find((o) => o.status === "accepted"),
    [offers, job]
  );

  async function handleAccept(offerId) {
    setAccepting(offerId);
    setError("");
    try {
      const { job: updatedJob } = await api.acceptOffer(offerId);
      setJob(updatedJob);
      setOffers((prev) =>
        prev.map((o) => {
          if (o._id === offerId) return { ...o, status: "accepted" };
          if (o.status === "pending") return { ...o, status: "rejected" };
          return o;
        })
      );
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't accept that offer");
    } finally {
      setAccepting(null);
    }
  }

  async function handleSubmitOffer(e) {
    e.preventDefault();
    setFormError("");

    const priceNum = Number(price);
    const etaNum = Number(etaMinutes);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setFormError("Enter a valid price");
      return;
    }
    if (!Number.isFinite(etaNum) || etaNum <= 0) {
      setFormError("Enter a valid ETA in minutes");
      return;
    }

    setSubmitting(true);
    try {
      const offer = await api.createOffer({ jobId, price: priceNum, etaMinutes: etaNum });
      setMyOffer({ status: "pending", price: offer.price, etaMinutes: offer.etaMinutes });
    } catch (err) {
      const msg = err.response?.data?.error || "Couldn't send that offer";
      // Already-offered is a recoverable state, not a form error — reflect it
      // in the page state instead of leaving the form up with an error banner.
      if (msg.toLowerCase().includes("already sent")) {
        setMyOffer({ status: "pending" });
      } else {
        setFormError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="py-16 text-center text-ink-400">Loading…</p>;
  if (error && !job) {
    return <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }
  if (!job) return null;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Link to="/jobs/mine" className="font-mono-data text-xs uppercase tracking-wide text-ink-400 hover:text-signal-600">
        ← Back to jobs
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">{job.description}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono-data text-xs">
            <span className="rounded-full bg-ink-950/5 px-2 py-0.5 capitalize text-ink-600">{job.category}</span>
            <span className={`rounded-full px-2 py-0.5 capitalize ${URGENCY_STYLES[job.urgency]}`}>
              {job.urgency} urgency
            </span>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {job.status === "cancelled" && (
        <div className="mt-6 rounded-lg border border-dashed border-ink-950/15 bg-white p-6 text-sm text-ink-600">
          This job was cancelled.
        </div>
      )}

      {job.status === "completed" && (
        <div className="mt-6 rounded-lg border border-trust-500/30 bg-trust-50 p-6 text-sm text-trust-600">
          This job is complete.
        </div>
      )}

      {isClient && (job.status === "open" || job.status === "matched") && (
        <div className="mt-6">
          {job.status === "matched" && acceptedOffer && (
            <div className="mb-4 rounded-lg border border-trust-500/30 bg-trust-50 p-4 text-sm text-trust-600">
              You accepted <span className="font-medium">{acceptedOffer.provider?.name}</span>'s offer —{" "}
              {acceptedOffer.price.toLocaleString()} DA, {acceptedOffer.etaMinutes} min.{" "}
              <Link to={`/jobs/${jobId}/chat`} className="font-medium underline underline-offset-2">
                Open chat
              </Link>
            </div>
          )}
          <LiveOfferBoard offers={offers} onAccept={handleAccept} accepting={accepting} jobOpen={job.status === "open"} />
        </div>
      )}

      {isProvider && job.status === "open" && (
        <div className="mt-6">
          {!myOffer && (
            <form
              onSubmit={handleSubmitOffer}
              className="space-y-4 rounded-lg border border-ink-950/10 bg-white p-6 shadow-sm"
            >
              <p className="font-mono-data text-xs uppercase tracking-[0.15em] text-signal-600">Send an offer</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-950">Price (DA)</label>
                  <input
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1800"
                    className="mt-1 w-full rounded-md border border-ink-950/15 px-3 py-2 font-mono-data focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-950">ETA (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(e.target.value)}
                    placeholder="15"
                    className="mt-1 w-full rounded-md border border-ink-950/15 px-3 py-2 font-mono-data focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
                  />
                </div>
              </div>
              {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md border-2 border-ink-950 bg-signal-500 px-4 py-2 font-medium text-ink-950 hover:bg-signal-400 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send offer"}
              </button>
            </form>
          )}

          {myOffer?.status === "pending" && (
            <div className="rounded-lg border border-ink-950/10 bg-white p-6 text-center">
              <span className="relative mx-auto flex h-2.5 w-2.5">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-signal-500" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal-500" />
              </span>
              <p className="mt-3 text-sm text-ink-700">
                {myOffer.price
                  ? `Your offer — ${myOffer.price.toLocaleString()} DA, ${myOffer.etaMinutes} min — is in.`
                  : "Your offer is in."}{" "}
                Waiting for the client to respond.
              </p>
            </div>
          )}

          {myOffer?.status === "rejected" && (
            <div className="rounded-lg border border-ink-950/10 bg-white p-6 text-center text-sm text-ink-600">
              The client went with another provider this time.
            </div>
          )}
        </div>
      )}

      {isProvider && job.status === "matched" && myOffer?.status === "accepted" && (
        <div className="mt-6 rounded-lg border border-trust-500/30 bg-trust-50 p-6 text-center text-sm text-trust-600">
          🎉 The client picked your offer.{" "}
          <Link to={`/jobs/${jobId}/chat`} className="font-medium underline underline-offset-2">
            Open chat
          </Link>
        </div>
      )}

      {/* Fallback for a provider who reloaded or arrived after the match — we
          have no route to fetch "my offer on this job", so we can't say
          whether they won without having lived through the socket event. */}
      {isProvider && job.status === "matched" && myOffer?.status !== "accepted" && (
        <div className="mt-6 rounded-lg border border-dashed border-ink-950/15 bg-white p-6 text-center text-sm text-ink-600">
          This job has already been matched with a provider — offers here are closed.
        </div>
      )}
    </div>
  );
}

// listOffersForJob returns Offer docs with providerId populated to
// { _id, name, ratingAvg, ratingCount } — reshape to { ...offer, provider }
// so the board component has one consistent shape regardless of source.
function normalizeRestOffer(offer) {
  const { providerId, ...rest } = offer;
  return { ...rest, provider: providerId };
}

// offer:new's socket payload is { offer, provider } with offer.providerId
// still a raw id — reshape to match normalizeRestOffer's output.
function normalizeSocketOffer(payload) {
  return { ...payload.offer, provider: payload.provider };
}
