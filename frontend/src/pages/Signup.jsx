import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["plumbing", "electrical", "tutoring", "moving", "cleaning", "tech repair"];

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = searchParams.get("role") === "provider" ? "provider" : "client";

  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [categories, setCategories] = useState([]);
  const [coverageRadiusKm, setCoverageRadiusKm] = useState(10);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleCategory(cat) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (role === "provider" && categories.length === 0) {
      setError("Select at least one category you offer");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { name, email, password, role };
      if (role === "provider") {
        payload.categories = categories;
        payload.coverageRadiusKm = Number(coverageRadiusKm);
      }
      await signup(payload);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="font-display text-2xl font-semibold text-ink-950">Sign up</h1>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setRole("client")}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            role === "client"
              ? "border-signal-500 bg-signal-50 text-signal-600"
              : "border-slate-300 text-slate-500"
          }`}
        >
          I need something done
        </button>
        <button
          type="button"
          onClick={() => setRole("provider")}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            role === "provider"
              ? "border-signal-500 bg-signal-50 text-signal-600"
              : "border-slate-300 text-slate-500"
          }`}
        >
          I offer services
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-ink-950">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-950">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-950">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
          />
          <p className="mt-1 text-xs text-slate-400">At least 8 characters</p>
        </div>

        {role === "provider" && (
          <>
            <div>
              <label className="block text-sm font-medium text-ink-950">Services you offer</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full border px-3 py-1 font-mono-data text-xs capitalize transition-colors ${
                      categories.includes(cat)
                        ? "border-trust-500 bg-trust-50 text-trust-600"
                        : "border-slate-300 text-slate-500"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-950">Coverage radius (km)</label>
              <input
                type="number"
                min={1}
                value={coverageRadiusKm}
                onChange={(e) => setCoverageRadiusKm(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono-data focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                How far you're willing to travel. You can update your exact location later.
              </p>
            </div>
          </>
        )}

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-signal-500 px-4 py-2 font-medium text-ink-950 hover:bg-signal-400 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-signal-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
