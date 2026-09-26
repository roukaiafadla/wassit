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

  useEffect(() => {
    api
      .listMyJobs()
      .then(setJobs)
      .catch((err) => setError(err.response?.data?.error || "Couldn't load jobs"))
      .finally(() => setLoading(false));
  }, []);

  // Real-time job broadcast (spec section 5.1): a provider's own `user:<id>`
  // room gets `job:new` the moment a matching nearby job is posted, so new
  // work shows up here without a refresh — this is the literal "live job
  // broadcast" half of step 3 (the other half, live offers, lives on the
  // per-job page this list links out to).
  useEffect(() => {
    if (user?.role !== "provider") return;

    const socket = getSocket();

    function handleJobNew(payload) {
      setJobs((prev) => {
        if (prev.some((j) => j._id === payload.job._id)) return prev;
        return [payload.job, ...prev];
      });
      setJustArrivedIds((prev) => new Set(prev).add(payload.job._id));
      // Drop the "just arrived" highlight after a few seconds so it reads as
      // a moment, not a permanent tag.
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
    </div>
  );
}
