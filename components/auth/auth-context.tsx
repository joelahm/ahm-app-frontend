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
  refreshToken?: string;
  user: AuthUser;
}

interface AuthContextValue {
  error: string | null;
  getValidAccessToken: () => Promise<string>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  session: AuthSession | null;
  updateSessionUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = "ahm-auth-session";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isValidSession = (value: unknown): value is AuthSession => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Partial<AuthSession>;

  return (
    isNonEmptyString(session.accessToken) &&
    isNonEmptyString(session.refreshToken) &&
    typeof session.accessTokenExpiresAt === "number" &&
    !!session.user
  );
};

const isSessionExpired = (session: AuthSession) =>
  Date.now() >= session.accessTokenExpiresAt;

const isProfileHydrated = (session: AuthSession) =>
  !!(
    session.user?.firstName ||
    session.user?.lastName ||
    session.user?.name ||
    session.user?.avatarUrl
  );

const resolveExpiryAt = (value: {
  accessTokenExpiresAt?: number;
  accessTokenExpiresIn: number;
}) =>
  value.accessTokenExpiresAt
    ? value.accessTokenExpiresAt * 1000
    : Date.now() + value.accessTokenExpiresIn * 1000;

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
    const parsed = JSON.parse(rawValue) as unknown;

    if (!isValidSession(parsed)) {
      return null;
    }

    return parsed;
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

  const refreshSession = useCallback(async (currentSession: AuthSession) => {
    if (!currentSession.refreshToken) {
      throw new Error("Missing refresh token.");
    }

    const refreshed = await authApi.refresh({
      refreshToken: currentSession.refreshToken,
    });

    if (
      !isNonEmptyString(refreshed.accessToken) ||
      typeof refreshed.accessTokenExpiresIn !== "number"
    ) {
      throw new Error("Invalid refresh response.");
    }

    const user = await authApi.me(refreshed.accessToken);
    const nextSession: AuthSession = {
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: resolveExpiryAt(refreshed),
      refreshToken: refreshed.refreshToken ?? currentSession.refreshToken,
      user,
    };

    setSession(nextSession);
    saveSession(nextSession);

    return nextSession;
  }, []);

  const bootstrapSession = useCallback(async () => {
    const cachedSession = readSession();

    if (!cachedSession) {
      setIsLoading(false);

      return;
    }

    if (!isSessionExpired(cachedSession)) {
      try {
        const user = await authApi.me(cachedSession.accessToken);
        const nextSession: AuthSession = {
          ...cachedSession,
          user: isProfileHydrated(cachedSession) ? cachedSession.user : user,
        };

        setSession(nextSession);
        saveSession(nextSession);
        setIsLoading(false);

        return;
      } catch {
        // Cached access token might be revoked/invalid even if not expired.
        // Fall through to refresh flow before clearing session.
      }
    }

    try {
      await refreshSession(cachedSession);
    } catch {
      clearSession();
    }

    setIsLoading(false);
  }, [clearSession, refreshSession]);

  const getValidAccessToken = useCallback(async () => {
    if (!session) {
      throw new Error("You must be signed in.");
    }

    if (!isSessionExpired(session)) {
      return session.accessToken;
    }

    try {
      const refreshedSession = await refreshSession(session);

      return refreshedSession.accessToken;
    } catch {
      clearSession();
      throw new Error("Session expired. Please login again.");
    }
  }, [clearSession, refreshSession, session]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  const login = useCallback(async (payload: LoginRequest) => {
    setError(null);
    const result = await authApi.login(payload);
    const user = await authApi.me(result.accessToken);

    const nextSession: AuthSession = {
      accessToken: result.accessToken,
      accessTokenExpiresAt: resolveExpiryAt(result),
      refreshToken: result.refreshToken,
      user,
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

  const updateSessionUser = useCallback((user: AuthUser) => {
    setSession((previousSession) => {
      if (!previousSession) {
        return previousSession;
      }

      const nextSession: AuthSession = {
        ...previousSession,
        user,
      };

      saveSession(nextSession);

      return nextSession;
    });
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      error,
      getValidAccessToken,
      isAuthenticated: !!session,
      isLoading,
      login,
      logout,
      session,
      updateSessionUser,
    }),
    [
      error,
      getValidAccessToken,
      isLoading,
      login,
      logout,
      session,
      updateSessionUser,
    ],
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
