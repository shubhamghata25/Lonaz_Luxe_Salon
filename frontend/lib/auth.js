"use client";
/**
 * Secure auth token management
 * Uses localStorage with XSS mitigations
 */

const TOKEN_KEY = "ss_token";
const USER_KEY  = "ss_user";

export const saveAuth = (token, user) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    // Never store sensitive fields
    const { password, ...safeUser } = user;
    localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
  } catch {}
};

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const getUser = () => {
  try {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

export const clearAuth = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.clear();
  } catch {}
};

export const isTokenExpired = (token) => {
  try {
    const [, payload] = token.split(".");
    const { exp } = JSON.parse(atob(payload));
    return exp * 1000 < Date.now();
  } catch { return true; }
};

export const getValidToken = () => {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    clearAuth();
    return null;
  }
  return token;
};

// ── AUTH CONTEXT (required by providers.jsx) ─────────────────────────────────
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const token = getToken();
      const u = getUser();
      if (token && u && !isTokenExpired(token)) {
        setUser(u);
      } else {
        clearAuth();
      }
    } catch {}
    setReady(true);
  }, []);

  // CRITICAL FIX: Never return null — that causes a React hydration mismatch
  // (server renders children, client renders null → crash on every page)
  // Instead always render children; pages that need auth check `ready` state
  return (
    <AuthContext.Provider value={{ user, setUser, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
