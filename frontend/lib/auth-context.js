"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, clearToken, getToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api("/auth/me", { auth: true });
      setUser(me);
    } catch (e) {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const data = await api("/auth/login", { method: "POST", body: { email, password } });
    setToken(data.access_token);
    await refresh();
  };

  const signup = async (name, email, password, locality) => {
    const data = await api("/auth/signup", {
      method: "POST",
      body: { name, email, password, locality },
    });
    setToken(data.access_token);
    await refresh();
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
