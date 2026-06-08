"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "consultant";
}

interface AuthContextValue {
  user: AuthUser | null;
  authLoading: boolean;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextValue>({ user: null, authLoading: true, refreshAuth: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchMe = useCallback(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, authLoading, refreshAuth: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
