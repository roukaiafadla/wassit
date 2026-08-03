import { useState } from "react";
import { useNavigate } from "react-router-dom";

import * as api from "../../lib/api";

const CATEGORIES = ["plumbing", "electrical", "tutoring", "moving", "cleaning", "tech repair"];
const URGENCIES = ["low", "medium", "high"];

export default function PostJob() {
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [urgency, setUrgency] = useState("medium");
  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function requestLocation() {
    setLocationStatus("requesting");
    if (!navigator.geolocation) {
      setLocationStatus("manual");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationStatus("granted");
      },
      () => setLocationStatus("manual")
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const latitude = coords?.latitude ?? Number(manualLat);
    const longitude = coords?.longitude ?? Number(manualLng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Location is required — allow location access or enter coordinates manually");
      return;
    }
    if (description.trim().length < 5) {
      setError("Please describe the job in a bit more detail");
      return;
    }

    setSubmitting(true);
    try {
      const job = await api.createJob({ description, category, urgency, latitude, longitude });
      navigate("/jobs/mine", { state: { justCreatedId: job._id } });
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <p className="font-mono-data text-xs uppercase tracking-[0.15em] text-signal-600">Work order</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink-950">Post a job</h1>
      <p className="mt-1 text-sm text-slate-500">
        Describe what you need. Nearby verified providers will see it and send offers.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-ink-950">What do you need?</label>
          <textarea
            required
            rows={3}
            placeholder="e.g. My kitchen sink is leaking, need someone tonight"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-950">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 capitalize focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-950">Urgency</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 capitalize focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
            >
              {URGENCIES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-md border border-dashed border-slate-300 p-4">
          <p className="text-sm font-medium text-ink-950">Location</p>

          {locationStatus === "idle" && (
            <button
              type="button"
              onClick={requestLocation}
              className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:border-signal-500 hover:text-signal-600"
            >
              Use my current location
            </button>
          )}

          {locationStatus === "requesting" && <p className="mt-2 text-sm text-slate-500">Requesting location…</p>}

          {locationStatus === "granted" && coords && (
            <p className="mt-2 font-mono-data text-sm text-trust-600">
              {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
            </p>
          )}

          {locationStatus === "manual" && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500">Latitude</label>
                <input
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="36.75"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono-data"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Longitude</label>
                <input
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="3.06"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono-data"
                />
              </div>
              <p className="col-span-2 text-xs text-slate-400">
                Location access wasn't available — enter coordinates manually for now.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-signal-500 px-4 py-2 font-medium text-ink-950 hover:bg-signal-400 disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post job"}
        </button>
      </form>
    </div>
  );
}
