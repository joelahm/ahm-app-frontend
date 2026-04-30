"use client";

import type { ReactNode } from "react";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  notificationsApi,
  type AppNotification,
} from "@/apis/notifications";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";
import { createNotificationSocketClient } from "@/lib/notification-socket-client";

interface NotificationsContextValue {
  clearNotification: (notificationId: string) => Promise<void>;
  isLoading: boolean;
  markAllRead: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  notifications: AppNotification[];
  refreshNotifications: () => Promise<void>;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

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

        socket = createNotificationSocketClient(accessToken);
        socket.on("notification:new", (payload) => {
          setUnreadCount(payload.unreadCount);
          setNotifications((current) => [
            payload.notification,
            ...current.filter((item) => item.id !== payload.notification.id),
          ]);
          toastRef.current.info(payload.notification.title, {
            description: payload.notification.body,
            timeout: 5000,
          });
        });
        socket.on("notification:count", (payload) => {
          setUnreadCount(payload.unreadCount);
        });
        socket.connect();
      } catch {
        // Realtime notifications are optional; normal API refresh still works.
      }
    };

    void connect();

    return () => {
      isActive = false;
      socket?.disconnect();
    };
  }, [getValidAccessToken, session?.accessToken]);

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
      refreshNotifications,
      unreadCount,
    }),
    [
      clearNotification,
      isLoading,
      markAllRead,
      markNotificationRead,
      notifications,
      refreshNotifications,
      unreadCount,
    ],
  );

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used inside NotificationsProvider.");
  }

  return context;
};
