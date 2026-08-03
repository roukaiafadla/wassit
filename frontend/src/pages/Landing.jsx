import { Link } from "react-router-dom";

import RadarPulse from "../components/RadarPulse";

const STEPS = [
  {
    n: "01",
    title: "Say what you need",
    body: "Plain language, no forms. \u201cKitchen sink is leaking, need someone tonight.\u201d",
  },
  {
    n: "02",
    title: "It goes out live",
    body: "Verified providers nearby get the alert the moment you post.",
  },
  {
    n: "03",
    title: "Offers race in",
    body: "Price and ETA offers land in real time, ranked as they arrive. Pick one.",
  },
];

export default function Landing() {
  return (
    <div>
      {/* Hero — paper and ink, the leaderboard doing the explaining */}
      <section className="relative -mx-4 -mt-8 overflow-hidden px-4 pt-16 pb-20">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-trust-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-[22rem] w-[22rem] rounded-full bg-signal-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-[0.2em] text-signal-600">
              Live · Hyperlocal · Verified
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.03] text-ink-950 sm:text-6xl">
              Post the job.
              <br />
              Watch offers <span className="text-signal-600">race in.</span>
            </h1>
            <p className="mt-3 max-w-md text-ink-600">
              A plumber, an electrician, a mover, a tutor — describe what you need and nearby
              verified providers respond live, competing on price and ETA.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-lg bg-signal-500 px-5 py-2.5 font-medium text-ink-950 shadow-sm transition-transform duration-150 hover:scale-[1.03] hover:bg-signal-400 active:scale-95"
              >
                Post a job
              </Link>
              <Link
                to="/signup?role=provider"
                className="rounded-lg border border-ink-950/15 px-5 py-2.5 font-medium text-ink-950 transition-colors hover:bg-paper-dim"
              >
                Become a provider
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-600">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-trust-500" />
                ID-verified pros
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-trust-500" />
                First offers in ~90s
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-trust-500" />
                No booking fees
              </span>
            </div>
          </div>

          <RadarPulse />
        </div>
      </section>

      <div className="border-t border-ink-950/10" />

      {/* How it works — one route, three markers along it */}
      <section className="py-16">
        <h2 className="font-display text-3xl font-semibold text-ink-950">How it works</h2>
        <div className="relative mt-12 grid gap-10 sm:grid-cols-3">
          <div className="absolute left-0 right-0 top-[13px] hidden h-px bg-ink-950/15 sm:block" />
          {STEPS.map((step) => (
            <div key={step.n} className="relative">
              <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-ink-950/20 bg-paper font-mono-data text-xs text-signal-600">
                {step.n}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-950">{step.title}</h3>
              <p className="mt-2 max-w-[30ch] text-sm text-ink-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
