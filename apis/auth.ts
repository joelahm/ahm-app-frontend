import axios from "axios";

export type UserRole = "ADMIN" | "TEAM_MEMBER";

export interface AuthUser {
  email: string;
  id: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
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
  login: (payload: LoginRequest) =>
    request<LoginResponse>({
      data: payload,
      method: "POST",
      url: "/api/v1/auth/login",
    }),
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
  refresh: (payload: RefreshRequest) =>
    request<RefreshResponse>({
      data: payload,
      method: "POST",
      url: "/api/v1/auth/refresh",
    }),
};
