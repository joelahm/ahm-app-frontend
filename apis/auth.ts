import axios from "axios";

export type UserRole = "ADMIN" | "TEAM_MEMBER";

export interface AuthUser {
  email: string;
  id: string | number;
  name?: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAt?: number;
  accessTokenExpiresIn: number;
  refreshToken?: string;
  user?: AuthUser;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  accessTokenExpiresAt?: number;
  accessTokenExpiresIn: number;
  refreshToken?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const parseError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message;

    return message || "Something went wrong.";
  }

  return "Something went wrong.";
};

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const asUserRole = (value: unknown): UserRole | undefined =>
  value === "ADMIN" || value === "TEAM_MEMBER" ? value : undefined;

const resolvePayload = (value: unknown) => {
  const root = asObject(value);
  const nested = asObject(root.data);

  return Object.keys(nested).length > 0 ? nested : root;
};

const parseUser = (value: unknown): AuthUser | undefined => {
  const user = asObject(value);
  const id = user.id;
  const email = asString(user.email);
  const role = asUserRole(user.role);

  if ((typeof id !== "string" && typeof id !== "number") || !email || !role) {
    return undefined;
  }

  return {
    email,
    id,
    name: asString(user.name),
    role,
  };
};

const normalizeLoginResponse = (value: unknown): LoginResponse => {
  const payload = resolvePayload(value);
  const tokens = asObject(payload.tokens);
  const user = parseUser(payload.user) ?? parseUser(payload);
  const accessToken =
    asString(payload.accessToken) ??
    asString(payload.access_token) ??
    asString(tokens.accessToken) ??
    asString(tokens.access_token) ??
    asString(tokens.token) ??
    asString(payload.token);
  const refreshToken =
    asString(payload.refreshToken) ??
    asString(payload.refresh_token) ??
    asString(tokens.refreshToken) ??
    asString(tokens.refresh_token);
  const accessTokenExpiresAt =
    asNumber(payload.accessTokenExpiresAt) ??
    asNumber(payload.access_token_expires_at) ??
    asNumber(tokens.accessTokenExpiresAt) ??
    asNumber(tokens.access_token_expires_at);
  const accessTokenExpiresIn =
    asNumber(payload.accessTokenExpiresIn) ??
    asNumber(payload.access_token_expires_in) ??
    asNumber(tokens.accessTokenExpiresIn) ??
    asNumber(tokens.access_token_expires_in) ??
    asNumber(tokens.expiresIn) ??
    asNumber(payload.expires_in) ??
    asNumber(payload.expiresIn);

  const resolvedAccessTokenExpiresIn =
    accessTokenExpiresIn ??
    (accessTokenExpiresAt
      ? Math.max(1, accessTokenExpiresAt - Math.floor(Date.now() / 1000))
      : undefined);

  if (!accessToken || !resolvedAccessTokenExpiresIn) {
    throw new Error(
      "Invalid login response: expected accessToken and accessTokenExpiresIn.",
    );
  }

  return {
    accessToken,
    accessTokenExpiresAt,
    accessTokenExpiresIn: resolvedAccessTokenExpiresIn,
    refreshToken,
    user,
  };
};

const normalizeRefreshResponse = (value: unknown): RefreshResponse => {
  const payload = resolvePayload(value);
  const tokens = asObject(payload.tokens);
  const accessToken =
    asString(payload.accessToken) ??
    asString(payload.access_token) ??
    asString(tokens.accessToken) ??
    asString(tokens.access_token) ??
    asString(tokens.token) ??
    asString(payload.token);
  const refreshToken =
    asString(payload.refreshToken) ??
    asString(payload.refresh_token) ??
    asString(tokens.refreshToken) ??
    asString(tokens.refresh_token);
  const accessTokenExpiresAt =
    asNumber(payload.accessTokenExpiresAt) ??
    asNumber(payload.access_token_expires_at) ??
    asNumber(tokens.accessTokenExpiresAt) ??
    asNumber(tokens.access_token_expires_at);
  const accessTokenExpiresIn =
    asNumber(payload.accessTokenExpiresIn) ??
    asNumber(payload.access_token_expires_in) ??
    asNumber(tokens.accessTokenExpiresIn) ??
    asNumber(tokens.access_token_expires_in) ??
    asNumber(tokens.expiresIn) ??
    asNumber(payload.expires_in) ??
    asNumber(payload.expiresIn);

  const resolvedAccessTokenExpiresIn =
    accessTokenExpiresIn ??
    (accessTokenExpiresAt
      ? Math.max(1, accessTokenExpiresAt - Math.floor(Date.now() / 1000))
      : undefined);

  if (!accessToken || !resolvedAccessTokenExpiresIn) {
    throw new Error(
      "Invalid refresh response: expected accessToken and accessTokenExpiresIn.",
    );
  }

  return {
    accessToken,
    accessTokenExpiresAt,
    accessTokenExpiresIn: resolvedAccessTokenExpiresIn,
    refreshToken,
  };
};

const request = async <T>(config: {
  data?: unknown;
  headers?: Record<string, string>;
  method: "GET" | "POST";
  url: string;
}) => {
  try {
    const response = await apiClient.request<T>(config);

    return response.data;
  } catch (error) {
    throw new Error(parseError(error));
  }
};

export const authApi = {
  login: async (payload: LoginRequest) =>
    normalizeLoginResponse(
      await request<unknown>({
        data: payload,
        method: "POST",
        url: "/api/v1/auth/login",
      }),
    ),
  logout: (refreshToken: string) =>
    request<unknown>({
      data: { refreshToken },
      method: "POST",
      url: "/api/v1/auth/logout",
    }),
  me: (accessToken: string) =>
    request<AuthUser>({
      headers: { Authorization: `Bearer ${accessToken}` },
      method: "GET",
      url: "/api/v1/auth/me",
    }),
  refresh: async (payload: RefreshRequest) =>
    normalizeRefreshResponse(
      await request<unknown>({
        data: payload,
        method: "POST",
        url: "/api/v1/auth/refresh",
      }),
    ),
};
