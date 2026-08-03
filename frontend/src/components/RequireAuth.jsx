import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

/**
 * Wrap any route element that needs a logged-in user:
 *   <Route path="jobs/new" element={<RequireAuth><PostJob /></RequireAuth>} />
 *
 * Pass `role` to also restrict by role, e.g. only clients can post jobs:
 *   <RequireAuth role="client"><PostJob /></RequireAuth>
 */
export default function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    // Still checking localStorage/session on first load — avoid a flash
    // redirect to /login before we even know if the user is logged in.
    return <div className="text-center py-16 text-slate-400">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        This page is only available to {role} accounts.
      </div>
    );
  }

  return children;
}
