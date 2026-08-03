import axios from "axios";

// In dev, VITE_API_URL is empty and requests to /api/* go through the Vite
// proxy (see vite.config.js) to localhost:5000. In production, set
// VITE_API_URL to the deployed backend's base URL (Render/Railway).
const baseURL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL,
});

// Attach the JWT (once auth exists) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wassit_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function checkHealth() {
  const { data } = await api.get("/api/health");
  return data;
}

// --- Auth ---
// Each mirrors a route we built and tested manually via PowerShell earlier;
// same request/response shape, just called from the browser now.

export async function signup(payload) {
  // payload: { name, email, password, role, categories?, coverageRadiusKm?, latitude?, longitude? }
  const { data } = await api.post("/api/auth/signup", payload);
  return data; // { token, user }
}

export async function login(email, password) {
  const { data } = await api.post("/api/auth/login", { email, password });
  return data; // { token, user }
}

export async function fetchMe() {
  const { data } = await api.get("/api/auth/me");
  return data.user;
}

// --- Jobs ---

export async function createJob(payload) {
  // payload: { description, category, urgency, suggestedPriceMin?, suggestedPriceMax?, latitude, longitude }
  const { data } = await api.post("/api/jobs", payload);
  return data.job;
}

export async function listMyJobs() {
  const { data } = await api.get("/api/jobs");
  return data.jobs;
}

