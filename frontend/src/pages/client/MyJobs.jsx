import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import * as api from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../../context/AuthContext";

const STATUS_STYLES = {
  open: "bg-signal-50 text-signal-600 border-signal-500/30",
  matched: "bg-trust-50 text-trust-600 border-trust-500/30",
  completed: "bg-slate-100 text-slate-500 border-slate-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function MyJobs() {
  const { user } = useAuth();
  const routerLocation = useLocation();
  const justCreatedId = routerLocation.state?.justCreatedId;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [justArrivedIds, setJustArrivedIds] = useState(() => new Set());

  // --- NEW: Modal & Action State ---
  const [modalType, setModalType] = useState(null); // "review" | "dispute" | null
  const [selectedJob, setSelectedJob] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchJobs = () => {
    setLoading(true);
    api
      .listMyJobs()
      .then(setJobs)
      .catch((err) => setError(err.response?.data?.error || "Couldn't load jobs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (user?.role !== "provider") return;

    const socket = getSocket();

    function handleJobNew(payload) {
      setJobs((prev) => {
        if (prev.some((j) => j._id === payload.job._id)) return prev;
        return [payload.job, ...prev];
      });
      setJustArrivedIds((prev) => new Set(prev).add(payload.job._id));
      setTimeout(() => {
        setJustArrivedIds((prev) => {
          const next = new Set(prev);
          next.delete(payload.job._id);
          return next;
        });
      }, 5000);
    }

    socket.on("job:new", handleJobNew);
    return () => socket.off("job:new", handleJobNew);
  }, [user]);

  const heading = user?.role === "provider" ? "Open jobs near you" : "Your jobs";

  // --- NEW: Action Handlers ---
  const handleComplete = async (job) => {
    if (!window.confirm("Mark this job as completed? This will trigger a review request for both parties.")) return;
    try {
      setActionLoading(true);
      await api.completeJob(job._id);
      fetchJobs(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.error || "Failed to complete job");
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (job, type) => {
    setSelectedJob(job);
    setModalType(type);
    setRating(5);
    setComment("");
    setReason("");
    setActionError("");
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError("");
      await api.createReview({ jobId: selectedJob._id, rating: Number(rating), comment });
      setModalType(null);
      fetchJobs();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to submit review");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError("");
      await api.createDispute({ jobId: selectedJob._id, reason });
      setModalType(null);
      alert("Dispute raised successfully. The admin has been notified.");
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to raise dispute");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-950">{heading}</h1>
        {user?.role === "provider" && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-signal-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-signal-500" />
            </span>
            <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-signal-600">Live</span>
          </div>
        )}
      </div>

      {loading && <p className="mt-6 text-slate-400">Loading…</p>}
      {error && <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!loading && !error && jobs.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {user?.role === "provider"
            ? "No open jobs in your categories yet — new ones will appear here the moment they're posted."
            : "You haven't posted any jobs yet."}
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {jobs.map((job) => {
          const isHighlighted = job._id === justCreatedId || justArrivedIds.has(job._id);
          return (
            <li
              key={job._id}
              className={`lane-row rounded-lg border bg-white p-4 shadow-sm transition-shadow ${
                isHighlighted ? "border-signal-400 ring-1 ring-signal-200" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-ink-950">{job.description}</p>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 font-mono-data text-xs uppercase ${STATUS_STYLES[job.status]}`}
                >
                  {job.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex gap-3 font-mono-data text-xs text-slate-500 capitalize">
                  <span>{job.category}</span>
                  <span>·</span>
                  <span>{job.urgency} urgency</span>
                </div>
                {(job.status === "open" || job.status === "matched") && (
                  <Link
                    to={`/jobs/${job._id}/offers`}
                    className="shrink-0 font-mono-data text-xs font-medium text-signal-600 hover:text-signal-500"
                  >
                    {user?.role === "provider" ? "Send an offer →" : "View offers →"}
                  </Link>
                )}
              </div>
              
              {/* NEW: Action Buttons (Complete, Review, Dispute) */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {job.status === "matched" && (
                  <button
                    onClick={() => handleComplete(job)}
                    disabled={actionLoading}
                    className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark Completed
                  </button>
                )}
                
                {job.status === "completed" && (
                  <button
                    onClick={() => openModal(job, "review")}
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Leave Review
                  </button>
                )}

                {["matched", "completed"].includes(job.status) && (
                  <button
                    onClick={() => openModal(job, "dispute")}
                    className="rounded bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                  >
                    Raise Dispute
                  </button>
                )}
              </div>

              {job._id === justCreatedId && (
                <p className="mt-2 font-mono-data text-xs font-medium text-signal-600">Just posted</p>
              )}
              {justArrivedIds.has(job._id) && job._id !== justCreatedId && (
                <p className="mt-2 font-mono-data text-xs font-medium text-signal-600">Just arrived</p>
              )}
            </li>
          );
        })}
      </ul>

      {/* --- NEW: Review Modal --- */}
      {modalType === "review" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-ink-950">Leave a Review</h3>
            {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
            <form onSubmit={handleSubmitReview}>
              <label className="mb-1 block text-sm font-medium text-slate-700">Rating (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                required
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="mb-3 w-full rounded border border-slate-300 p-2 text-sm"
              />
              <label className="mb-1 block text-sm font-medium text-slate-700">Comment (Optional)</label>
              <textarea
                rows="3"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mb-4 w-full rounded border border-slate-300 p-2 text-sm"
                placeholder="How did it go?"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW: Dispute Modal --- */}
      {modalType === "dispute" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-red-600">Raise a Dispute</h3>
            <p className="mb-4 text-xs text-slate-500">This alerts the admin and pauses the job until resolved.</p>
            {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
            <form onSubmit={handleSubmitDispute}>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reason (min 10 chars)</label>
              <textarea
                required
                minLength={10}
                rows="4"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mb-4 w-full rounded border border-slate-300 p-2 text-sm"
                placeholder="Explain what went wrong..."
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  {actionLoading ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}