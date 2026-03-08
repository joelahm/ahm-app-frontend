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
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
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

const AUTH_STORAGE_KEY = "ahm-auth-session";

const isSessionExpired = (session: AuthSession) =>
  Date.now() >= session.accessTokenExpiresAt;

const saveSession = (session: AuthSession | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);

    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const readSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setSession(null);
    saveSession(null);
  }, []);

  const bootstrapSession = useCallback(async () => {
    const cachedSession = readSession();

    if (!cachedSession) {
      setIsLoading(false);

      return;
    }

    if (!isSessionExpired(cachedSession)) {
      setSession(cachedSession);
      setIsLoading(false);

      return;
    }

    try {
      const refreshed = await authApi.refresh({
        refreshToken: cachedSession.refreshToken,
      });
      const user = await authApi.me(refreshed.accessToken);
      const nextSession: AuthSession = {
        accessToken: refreshed.accessToken,
        accessTokenExpiresAt:
          Date.now() + refreshed.accessTokenExpiresIn * 1000,
        refreshToken: refreshed.refreshToken ?? cachedSession.refreshToken,
        user,
      };

      setSession(nextSession);
      saveSession(nextSession);
    } catch {
      clearSession();
    }

    setIsLoading(false);
  }, [clearSession]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  const login = useCallback(async (payload: LoginRequest) => {
    setError(null);
    const result = await authApi.login(payload);

    const nextSession: AuthSession = {
      accessToken: result.accessToken,
      accessTokenExpiresAt: Date.now() + result.accessTokenExpiresIn * 1000,
      refreshToken: result.refreshToken,
      user: result.user,
    };

    setSession(nextSession);
    saveSession(nextSession);
  }, []);

  const logout = useCallback(async () => {
    setError(null);

    try {
      if (session?.refreshToken) {
        await authApi.logout(session.refreshToken);
      }
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : "Logout failed.",
      );
    } finally {
      clearSession();
    }
  }, [clearSession, session?.refreshToken]);

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
