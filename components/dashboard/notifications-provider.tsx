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

import { notificationsApi, type AppNotification } from "@/apis/notifications";
import { useAuth } from "@/components/auth/auth-context";
import {
  NotificationToastHost,
  type NotificationToastItem,
} from "@/components/dashboard/notification-toast-host";
import { createNotificationSocketClient } from "@/lib/notification-socket-client";

const MAX_VISIBLE_TOASTS = 4;

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

interface NotificationsContextValue {
  clearNotification: (notificationId: string) => Promise<void>;
  isLoading: boolean;
  markAllRead: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  notifications: AppNotification[];
  realtimeError: string | null;
  realtimeStatus: RealtimeStatus;
  refreshNotifications: () => Promise<void>;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export const NotificationsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { getValidAccessToken, session } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("idle");
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<NotificationToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((notification: AppNotification) => {
    setToasts((current) => {
      const next: NotificationToastItem[] = [
        { id: notification.id, notification },
        ...current.filter((item) => item.id !== notification.id),
      ];

      return next.slice(0, MAX_VISIBLE_TOASTS);
    });
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!session?.accessToken) {
      setNotifications([]);
      setUnreadCount(0);

      return;
    }

    setIsLoading(true);
    try {
      const accessToken = await getValidAccessToken();
      const response = await notificationsApi.listNotifications(accessToken, {
        limit: 20,
      });

      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken, session?.accessToken]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!session?.accessToken) {
      setRealtimeStatus("idle");
      setRealtimeError(null);
      return;
    }

    let isActive = true;
    let socket: ReturnType<typeof createNotificationSocketClient> | null = null;

    const connect = async () => {
      try {
        const accessToken = await getValidAccessToken();

        if (!isActive) {
          return;
        }

        setRealtimeStatus("connecting");
        setRealtimeError(null);

        socket = createNotificationSocketClient(accessToken);
        socket.on("notification:new", (payload) => {
          setUnreadCount(payload.unreadCount);
          setNotifications((current) => [
            payload.notification,
            ...current.filter((item) => item.id !== payload.notification.id),
          ]);
          pushToast(payload.notification);
        });
        socket.on("notification:count", (payload) => {
          setUnreadCount(payload.unreadCount);
        });
        socket.on("connect", () => {
          setRealtimeStatus("connected");
          setRealtimeError(null);
        });
        socket.on("disconnect", (reason) => {
          setRealtimeStatus("disconnected");
          setRealtimeError(
            reason === "io client disconnect" ? null : `Connection lost (${reason}).`,
          );
        });
        socket.on("connect_error", (error) => {
          setRealtimeStatus("disconnected");
          setRealtimeError(
            error instanceof Error ? error.message : "Connection error.",
          );
        });
        socket.io.on("reconnect_failed", () => {
          setRealtimeStatus("disconnected");
          setRealtimeError(
            "Could not reconnect after several attempts. Refresh the page to retry.",
          );
        });
        socket.connect();
      } catch (error) {
        setRealtimeStatus("disconnected");
        setRealtimeError(
          error instanceof Error
            ? error.message
            : "Failed to start realtime notifications.",
        );
      }
    };

    void connect();

    return () => {
      isActive = false;
      socket?.disconnect();
    };
  }, [getValidAccessToken, pushToast, session?.accessToken]);

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      const accessToken = await getValidAccessToken();
      const response = await notificationsApi.markNotificationRead(
        accessToken,
        notificationId,
      );

      setUnreadCount(response.unreadCount);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
      );
    },
    [getValidAccessToken],
  );

  const clearNotification = useCallback(
    async (notificationId: string) => {
      const accessToken = await getValidAccessToken();
      const response = await notificationsApi.clearNotification(
        accessToken,
        notificationId,
      );

      setUnreadCount(response.unreadCount);
      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );
    },
    [getValidAccessToken],
  );

  const markAllRead = useCallback(async () => {
    const accessToken = await getValidAccessToken();
    const response = await notificationsApi.markAllRead(accessToken);

    setUnreadCount(response.unreadCount);
    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true })),
    );
  }, [getValidAccessToken]);

  const contextValue = useMemo<NotificationsContextValue>(
    () => ({
      clearNotification,
      isLoading,
      markAllRead,
      markNotificationRead,
      notifications,
      realtimeError,
      realtimeStatus,
      refreshNotifications,
      unreadCount,
    }),
    [
      clearNotification,
      isLoading,
      markAllRead,
      markNotificationRead,
      notifications,
      realtimeError,
      realtimeStatus,
      refreshNotifications,
      unreadCount,
    ],
  );

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
      <NotificationToastHost onDismiss={dismissToast} toasts={toasts} />
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationsProvider.",
    );
  }

  return context;
};
