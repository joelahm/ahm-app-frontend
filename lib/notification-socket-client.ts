"use client";

import type { AppNotification } from "@/apis/notifications";

import { io, type Socket } from "socket.io-client";

interface NotificationNewEvent {
  notification: AppNotification;
  unreadCount: number;
}

interface NotificationCountEvent {
  unreadCount: number;
}

interface ServerToClientEvents {
  "notification:count": (payload: NotificationCountEvent) => void;
  "notification:new": (payload: NotificationNewEvent) => void;
}

interface ClientToServerEvents {
  noop: () => void;
}

export type NotificationSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

const SOCKET_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "";

const SOCKET_TRANSPORT_MODE =
  process.env.NEXT_PUBLIC_SOCKET_TRANSPORT_MODE?.toLowerCase() ?? "polling";
const SOCKET_TRANSPORTS =
  SOCKET_TRANSPORT_MODE === "websocket"
    ? (["websocket", "polling"] as const)
    : (["polling"] as const);
const SOCKET_UPGRADE_ENABLED = SOCKET_TRANSPORT_MODE === "websocket";

export const createNotificationSocketClient = (accessToken: string) => {
  if (!SOCKET_BACKEND_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_BACKEND_URL or NEXT_PUBLIC_API_BASE_URL for notifications socket.",
    );
  }

  return io(SOCKET_BACKEND_URL, {
    auth: {
      token: accessToken,
    },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    transports: [...SOCKET_TRANSPORTS],
    upgrade: SOCKET_UPGRADE_ENABLED,
    withCredentials: true,
  }) as NotificationSocket;
};
