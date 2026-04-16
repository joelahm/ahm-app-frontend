import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const usersApiClient = axios.create({
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

export interface InviteUsersRequestBody {
  requestedByUserId: number | string | null;
  members: Array<{
    email: string;
    role: "ADMIN" | "TEAM_MEMBER" | "GUEST";
  }>;
  locations: string[];
}

export interface InviteUsersResponse {
  locations: string[];
  results: Array<{
    email: string;
    role?: "ADMIN" | "TEAM_MEMBER" | "GUEST";
    status: string;
  }>;
  summary: {
    failed: number;
    invited: number;
    skipped: number;
  };
}

export interface PendingInvitationItem {
  createdAt: string;
  email: string;
  expiresAt: string;
  id: number;
  invitedBy: string | null;
  locations: string[];
  role: "ADMIN" | "TEAM_MEMBER" | "GUEST";
  sentAt: string | null;
  status: string;
  updatedAt: string;
}

interface PendingInvitationsResponse {
  invitations: PendingInvitationItem[];
}

export interface UserListItem {
  avatarUrl?: string | null;
  id: number;
  email: string;
  role: "ADMIN" | "TEAM_MEMBER" | "GUEST";
  status: string;
  isActive: boolean;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  phoneNumber: string | null;
  country: string | null;
  timezone: string | null;
  dateFormat: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUserProfile {
  avatarUrl: string | null;
  country: string | null;
  createdAt: string;
  dateFormat: string | null;
  email: string;
  firstName: string | null;
  id: number;
  isActive: boolean;
  lastName: string | null;
  phoneNumber: string | null;
  role: "ADMIN" | "TEAM_MEMBER" | "GUEST";
  status: string;
  timezone: string | null;
  title: string | null;
  updatedAt: string;
}

export interface UpdateCurrentUserRequestBody {
  country: string;
  dateFormat: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  timezone: string;
  title: string;
}

export interface UpdateUserByIdPasswordRequestBody {
  confirmPassword: string;
  currentPassword?: string;
  newPassword: string;
}

export interface PermissionRowSetting {
  adminEnabled: boolean;
  description: string;
  guestEnabled?: boolean;
  key: string;
  memberEnabled: boolean;
  title: string;
}

export interface PermissionSectionSetting {
  description: string;
  hasGuestColumn?: boolean;
  key: string;
  rows: PermissionRowSetting[];
  title: string;
}

export interface PermissionsSettingsResponse {
  sections: PermissionSectionSetting[];
}

export interface ActivityLogActor {
  email: string;
  firstName: string | null;
  id: number;
  lastName: string | null;
  name: string;
}

export interface ActivityLogItem {
  action: string;
  actor: ActivityLogActor | null;
  actorUserId: number | null;
  createdAt: string;
  id: number;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  requestId: string | null;
  resourceId: string | null;
  resourceType: string;
  userAgent: string | null;
}

export interface ActivityLogsResponse {
  activityLogs: ActivityLogItem[];
  pagination: {
    hasNext: boolean;
    hasPrev: boolean;
    limit: number;
    nextPage: number | null;
    page: number;
    prevPage: number | null;
    total: number;
    totalPages: number;
  };
}

interface GetUsersResponse {
  pagination?: {
    hasNext?: boolean;
    hasPrev?: boolean;
    limit?: number;
    nextPage?: number | null;
    page?: number;
    prevPage?: number | null;
    total?: number;
    totalPages?: number;
  };
  total?: number;
  users: UserListItem[];
}

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown) => (typeof value === "string" ? value : null);

const asNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const parseCurrentUserProfile = (value: unknown): CurrentUserProfile => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const user = asObject(payload.user);
  const source = Object.keys(user).length > 0 ? user : payload;

  const id = asNumber(source.id);
  const email = asString(source.email);
  const role = source.role;

  if (
    id === null ||
    !email ||
    (role !== "ADMIN" && role !== "TEAM_MEMBER" && role !== "GUEST")
  ) {
    throw new Error("Invalid profile response.");
  }

  return {
    avatarUrl: asString(source.avatarUrl),
    country: asString(source.country),
    createdAt: asString(source.createdAt) ?? "",
    dateFormat: asString(source.dateFormat),
    email,
    firstName: asString(source.firstName),
    id,
    isActive: Boolean(source.isActive),
    lastName: asString(source.lastName),
    phoneNumber: asString(source.phoneNumber),
    role,
    status: asString(source.status) ?? "",
    timezone: asString(source.timezone),
    title: asString(source.title),
    updatedAt: asString(source.updatedAt) ?? "",
  };
};

export const usersApi = {
  getPermissionsSettings: async (accessToken: string) => {
    try {
      const response = await usersApiClient.get<PermissionsSettingsResponse>(
        "/api/v1/users/permissions",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getCurrentUser: async (accessToken: string) => {
    try {
      const response = await usersApiClient.get<unknown>("/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return parseCurrentUserProfile(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteUser: async (accessToken: string, userId: string | number) => {
    try {
      const response = await usersApiClient.delete(`/api/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateUserRole: async (
    accessToken: string,
    userId: string | number,
    role: "ADMIN" | "TEAM_MEMBER" | "GUEST",
  ) => {
    try {
      const response = await usersApiClient.patch(
        `/api/v1/users/${userId}/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data as { success?: boolean };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getUsers: async (
    accessToken: string,
    options?: {
      limit?: number;
      page?: number;
    },
  ) => {
    try {
      const response = await usersApiClient.get<GetUsersResponse>(
        "/api/v1/users",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit: options?.limit,
            page: options?.page,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getPendingInvitations: async (accessToken: string) => {
    try {
      const response = await usersApiClient.get<PendingInvitationsResponse>(
        "/api/v1/users/pending-invitations",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getActivityLogs: async (
    accessToken: string,
    options?: {
      actorUserId?: number | string;
      limit?: number;
      page?: number;
    },
  ) => {
    try {
      const response = await usersApiClient.get<ActivityLogsResponse>(
        "/api/v1/users/activity-logs",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            actorUserId: options?.actorUserId,
            limit: options?.limit,
            page: options?.page,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateCurrentUser: async (
    accessToken: string,
    payload: FormData | UpdateCurrentUserRequestBody,
  ) => {
    try {
      const isFormData =
        typeof FormData !== "undefined" && payload instanceof FormData;
      const response = await usersApiClient.patch("/api/v1/users/me", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(isFormData ? { "Content-Type": "multipart/form-data" } : {}),
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getUserById: async (accessToken: string, userId: string | number) => {
    try {
      const response = await usersApiClient.get<unknown>(
        `/api/v1/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const root = asObject(response.data);
      const nestedData = asObject(root.data);
      const nestedUser = asObject(nestedData.user);
      const directUser = asObject(root.user);

      const source =
        Object.keys(nestedUser).length > 0
          ? nestedUser
          : Object.keys(directUser).length > 0
            ? directUser
            : Object.keys(nestedData).length > 0
              ? nestedData
              : root;

      const id = asNumber(source.id);
      const email = asString(source.email);
      const role = source.role;

      if (
        id === null ||
        !email ||
        (role !== "ADMIN" && role !== "TEAM_MEMBER" && role !== "GUEST")
      ) {
        throw new Error("Invalid user response.");
      }

      return {
        avatarUrl: asString(source.avatarUrl),
        country: asString(source.country),
        createdAt: asString(source.createdAt) ?? "",
        dateFormat: asString(source.dateFormat),
        email,
        firstName: asString(source.firstName),
        id,
        isActive: Boolean(source.isActive),
        lastName: asString(source.lastName),
        phoneNumber: asString(source.phoneNumber),
        role,
        status: asString(source.status) ?? "",
        timezone: asString(source.timezone),
        title: asString(source.title),
        updatedAt: asString(source.updatedAt) ?? "",
      } satisfies CurrentUserProfile;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateUserById: async (
    accessToken: string,
    userId: string | number,
    payload: FormData | UpdateCurrentUserRequestBody,
  ) => {
    try {
      const isFormData =
        typeof FormData !== "undefined" && payload instanceof FormData;
      const response = await usersApiClient.patch(
        `/api/v1/users/${userId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(isFormData ? { "Content-Type": "multipart/form-data" } : {}),
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateUserPasswordById: async (
    accessToken: string,
    userId: string | number,
    payload: UpdateUserByIdPasswordRequestBody,
  ) => {
    try {
      const response = await usersApiClient.patch(
        `/api/v1/users/${userId}/password`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  inviteUsers: async (
    payload: InviteUsersRequestBody,
    accessToken: string,
  ): Promise<InviteUsersResponse> => {
    try {
      const response = await usersApiClient.post<InviteUsersResponse>(
        "/api/v1/users/invite",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updatePermissionsSettings: async (
    accessToken: string,
    payload: PermissionsSettingsResponse,
  ) => {
    try {
      const response = await usersApiClient.patch(
        "/api/v1/users/permissions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data as {
        settings?: PermissionsSettingsResponse;
        success?: boolean;
      };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
