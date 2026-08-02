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
