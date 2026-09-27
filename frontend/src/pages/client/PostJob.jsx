import { useState } from "react";
import { useNavigate } from "react-router-dom";

import * as api from "../../lib/api";

// Keep in sync with backend/src/config/jobTaxonomy.js — no shared package
// between frontend/backend in this project, so this list is duplicated
// deliberately. If you add a category, add it in both places.
const CATEGORIES = [
  "plumbing",
  "electrical",
  "tutoring",
  "moving",
  "cleaning",
  "tech repair",
  "painting",
  "gardening",
  "appliance repair",
  "other",
];
const URGENCIES = ["low", "medium", "high"];

export default function PostJob() {
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [urgency, setUrgency] = useState("medium");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [suggestion, setSuggestion] = useState(null); // { category, urgency, priceMin, priceMax, source } | null
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSuggest() {
    setSuggestError("");
    if (description.trim().length < 5) {
      setSuggestError("Write a bit more detail first, then suggest");
      return;
    }
    setSuggesting(true);
    try {
      const result = await api.suggestJob(description);
      setSuggestion(result);
      setCategory(result.category);
      setUrgency(result.urgency);
      setPriceMin(String(result.priceMin));
      setPriceMax(String(result.priceMax));
    } catch (err) {
      setSuggestError(err.response?.data?.error || "Couldn't get a suggestion — you can still fill this in manually");
    } finally {
      setSuggesting(false);
    }
  }

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
      const job = await api.createJob({
        description,
        category,
        urgency,
        suggestedPriceMin: priceMin ? Number(priceMin) : undefined,
        suggestedPriceMax: priceMax ? Number(priceMax) : undefined,
        latitude,
        longitude,
      });
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

          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-signal-300 bg-signal-50 px-3 py-1.5 text-sm font-medium text-signal-700 hover:bg-signal-100 disabled:opacity-50"
          >
            {suggesting ? "Thinking…" : "✨ Suggest category & price with AI"}
          </button>

          {suggestError && <p className="mt-1 text-xs text-red-600">{suggestError}</p>}

          {suggestion && (
            <p className="mt-1 text-xs text-slate-500">
              {suggestion.source === "ai"
                ? "Suggested by AI — feel free to adjust anything below."
                : "AI was unavailable, so this is a rough estimate — feel free to adjust anything below."}
            </p>
          )}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-950">Min price (DA)</label>
            <input
              type="number"
              min="0"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="2000"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono-data focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-950">Max price (DA)</label>
            <input
              type="number"
              min="0"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="6000"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono-data focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
            />
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
