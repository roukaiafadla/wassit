import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-slate-900">
        Need something fixed, today?
      </h1>
      <p className="mt-4 text-lg text-slate-600 max-w-xl mx-auto">
        Post your job in plain language. Nearby verified providers see it live
        and send you offers in minutes.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/signup" className="rounded-md bg-brand-600 px-5 py-2.5 text-white font-medium hover:bg-brand-700">
          Post a job
        </Link>
        <Link to="/signup?role=provider" className="rounded-md border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-50">
          Become a provider
        </Link>
      </div>
    </div>
  );
}
