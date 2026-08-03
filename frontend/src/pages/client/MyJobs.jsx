import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import * as api from "../../lib/api";
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

  useEffect(() => {
    api
      .listMyJobs()
      .then(setJobs)
      .catch((err) => setError(err.response?.data?.error || "Couldn't load jobs"))
      .finally(() => setLoading(false));
  }, []);

  const heading = user?.role === "provider" ? "Open jobs near you" : "Your jobs";

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="font-display text-2xl font-semibold text-ink-950">{heading}</h1>

      {loading && <p className="mt-6 text-slate-400">Loading…</p>}
      {error && <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!loading && !error && jobs.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {user?.role === "provider" ? "No open jobs in your categories yet." : "You haven't posted any jobs yet."}
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {jobs.map((job) => (
          <li
            key={job._id}
            className={`rounded-lg border bg-white p-4 shadow-sm transition-shadow ${
              job._id === justCreatedId ? "border-signal-400 ring-1 ring-signal-200" : "border-slate-200"
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
            <div className="mt-2 flex gap-3 font-mono-data text-xs text-slate-500 capitalize">
              <span>{job.category}</span>
              <span>·</span>
              <span>{job.urgency} urgency</span>
            </div>
            {job._id === justCreatedId && (
              <p className="mt-2 font-mono-data text-xs font-medium text-signal-600">Just posted</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
