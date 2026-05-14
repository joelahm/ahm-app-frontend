import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const notificationsApiClient = axios.create({
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

export interface AppNotification {
  actor?: {
    avatarUrl?: string | null;
    email: string;
    id: number;
    name: string;
  } | null;
  actorUserId: number | null;
  body: string;
  category: "IMPORTANT" | "OTHER" | string;
  clearedAt: string | null;
  createdAt: string;
  data?: {
    url?: string | null;
    [key: string]: unknown;
  } | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  isRead: boolean;
  readAt: string | null;
  recipientUserId: number;
  severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;
  title: string;
  type: string;
  updatedAt: string;
}

export interface NotificationChannels {
  discord: {
    defaultChannelId: string;
    enabled: boolean;
    useClientChannel: boolean;
  };
  email: {
    enabled: boolean;
  };
  inApp: {
    enabled: boolean;
  };
}

export interface NotificationEventRow {
  description: string;
  discordEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  key: string;
  title: string;
}

export interface NotificationModule {
  description: string;
  key: string;
  rows: NotificationEventRow[];
  title: string;
}

export interface NotificationSettings {
  channels: NotificationChannels;
  modules: NotificationModule[];
}

const withAuth = (accessToken: string) => ({
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

export const notificationsApi = {
  clearNotification: async (accessToken: string, notificationId: string) => {
    try {
      const response = await notificationsApiClient.patch(
        `/api/v1/notifications/${notificationId}/clear`,
        {},
        withAuth(accessToken),
      );

      return response.data as { success: boolean; unreadCount: number };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getSettings: async (accessToken: string) => {
    try {
      const response = await notificationsApiClient.get<{
        settings: NotificationSettings;
      }>("/api/v1/notifications/settings", withAuth(accessToken));

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getUnreadCount: async (accessToken: string) => {
    try {
      const response = await notificationsApiClient.get<{
        unreadCount: number;
      }>("/api/v1/notifications/count", withAuth(accessToken));

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  listNotifications: async (
    accessToken: string,
    options?: {
      limit?: number;
      tab?: "active" | "cleared" | "important" | "other";
    },
  ) => {
    try {
      const response = await notificationsApiClient.get<{
        notifications: AppNotification[];
        total: number;
        unreadCount: number;
      }>("/api/v1/notifications", {
        ...withAuth(accessToken),
        params: {
          limit: options?.limit,
          tab: options?.tab,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  markAllRead: async (accessToken: string) => {
    try {
      const response = await notificationsApiClient.post(
        "/api/v1/notifications/read-all",
        {},
        withAuth(accessToken),
      );

      return response.data as { success: boolean; unreadCount: number };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  markNotificationRead: async (accessToken: string, notificationId: string) => {
    try {
      const response = await notificationsApiClient.patch(
        `/api/v1/notifications/${notificationId}/read`,
        {},
        withAuth(accessToken),
      );

      return response.data as { success: boolean; unreadCount: number };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateSettings: async (
    accessToken: string,
    settings: NotificationSettings,
  ) => {
    try {
      const response = await notificationsApiClient.patch<{
        settings: NotificationSettings;
      }>("/api/v1/notifications/settings", settings, withAuth(accessToken));

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
