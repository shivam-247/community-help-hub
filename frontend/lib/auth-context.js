"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { api, clearToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const me = await api("/auth/me", { auth: true });
      setUser(me);
    } catch (e) {
      if (e.status === 401) {
        clearToken();
        setUser(null);
      } else setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearToken();
    refresh().catch(() => {});
    const expired = () => setUser(null);
    window.addEventListener("chh-auth-expired", expired);
    return () => window.removeEventListener("chh-auth-expired", expired);
  }, [refresh]);

  const login = async (email, password, totp_code) => {
    await api("/auth/login", {
      method: "POST",
      body: { email, password, totp_code: totp_code || null },
    });
    await refresh();
  };

  const signup = async (name, email, password, locality, consent) => {
    await api("/auth/signup", {
      method: "POST",
      body: { name, email, password, locality, ...consent },
    });
    await refresh();
  };

  const logout = async () => {
    await api("/auth/logout", { method: "POST", auth: true });
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, signup, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
