import { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/");
  }

  const navLinks = user ? (
    <>
      {user.role === "client" && (
        <Link to="/jobs/new" onClick={() => setMenuOpen(false)} className="hover:text-signal-600">
          Post a job
        </Link>
      )}
      <Link to="/jobs/mine" onClick={() => setMenuOpen(false)} className="hover:text-signal-600">
        {user.role === "provider" ? "Open jobs" : "My jobs"}
      </Link>
      <span className="hidden text-ink-300 sm:inline">|</span>
      <span className="font-mono-data text-xs text-ink-600">{user.name}</span>
      <button onClick={handleLogout} className="text-left hover:text-signal-600">
        Log out
      </button>
    </>
  ) : (
    <>
      <Link to="/login" onClick={() => setMenuOpen(false)} className="hover:text-signal-600">
        Log in
      </Link>
      <Link
        to="/signup"
        onClick={() => setMenuOpen(false)}
        className="inline-block w-fit rounded-sm border-2 border-ink-950 bg-signal-500 px-4 py-1.5 font-medium text-ink-950 transition-colors hover:bg-signal-400"
      >
        Sign up
      </Link>
    </>
  );

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-ink-950/10 bg-paper">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-2xl font-bold uppercase text-ink-950">
            Wassit <span className="font-arabic text-lg font-normal normal-case text-ink-400">وسيط</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-5 text-sm text-ink-700 md:flex">{navLinks}</div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-ink-950/15 text-ink-950 md:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              {menuOpen ? (
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              ) : (
                <path
                  d="M3 5h14M3 10h14M3 15h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile nav panel */}
        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-ink-950/10 px-4 py-5 text-sm text-ink-700 md:hidden">
            {navLinks}
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-ink-950/10 py-6 text-center font-mono-data text-xs text-ink-400">
        © 2026 Wassit
      </footer>
    </div>
  );
}
