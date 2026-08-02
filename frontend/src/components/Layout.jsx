import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-brand-700 text-lg">
            Wassit <span className="text-slate-400 font-normal">وسيط</span>
          </Link>
          <div className="flex gap-4 text-sm text-slate-600">
            <Link to="/login" className="hover:text-brand-600">Log in</Link>
            <Link to="/signup" className="hover:text-brand-600">Sign up</Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
  © Wassit
</footer>
    </div>
  );
}
