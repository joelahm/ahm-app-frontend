"use client";

import type { ReactNode } from "react";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authApi, type AuthUser, type LoginRequest } from "@/apis/auth";

interface AuthSession {
  user: AuthUser;
}

interface AuthContextValue {
  error: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  session: AuthSession | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setSession(null);
  }, []);

  const bootstrapSession = useCallback(async () => {
    try {
      const user = await authApi.me();

      setSession({ user });
    } catch {
      try {
        await authApi.refresh();
        const user = await authApi.me();

        setSession({ user });
      } catch {
        clearSession();
      }
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  const login = useCallback(async (payload: LoginRequest) => {
    setError(null);
    await authApi.login(payload);
    const user = await authApi.me();

    setSession({ user });
  }, []);

  const logout = useCallback(async () => {
    setError(null);

    try {
      await authApi.logout();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : "Logout failed.",
      );
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      error,
      isAuthenticated: !!session,
      isLoading,
      login,
      logout,
      session,
    }),
    [error, isLoading, login, logout, session],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
};
