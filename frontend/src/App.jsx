import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PostJob from "./pages/client/PostJob";
import LiveJobFeed from "./pages/client/LiveJobFeed";
import Chat from "./pages/client/Chat";
import ProviderDashboard from "./pages/provider/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="jobs/new" element={<PostJob />} />
        <Route path="jobs/:jobId/offers" element={<LiveJobFeed />} />
        <Route path="jobs/:jobId/chat" element={<Chat />} />
        <Route path="provider/dashboard" element={<ProviderDashboard />} />
        <Route path="admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}
