import { createContext, useContext, useEffect, useState } from "react";

import * as api from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";

const AuthContext = createContext(null);

const TOKEN_KEY = "wassit_token";

/**
 * Wraps the whole app (see main.jsx). Holds the logged-in user in memory and
 * exposes login/signup/logout. On first load, if a token is already saved in
 * localStorage (from a previous session), it calls /api/auth/me to restore
 * the user — this is what makes a page refresh keep you logged in instead of
 * bouncing you back to the login page every time.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for an existing session

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .fetchMe()
      .then((restoredUser) => {
        setUser(restoredUser);
        connectSocket(); // restored session — reconnect real-time too
      })
      .catch(() => {
        // Token expired or invalid — clear it so the app doesn't keep retrying.
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  async function doSignup(payload) {
    const { token, user: newUser } = await api.signup(payload);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(newUser);
    connectSocket();
    return newUser;
  }

  async function doLogin(email, password) {
    const { token, user: loggedInUser } = await api.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(loggedInUser);
    connectSocket();
    return loggedInUser;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    disconnectSocket();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login: doLogin, signup: doSignup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Usage: const { user, login, signup, logout, loading } = useAuth(); */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
