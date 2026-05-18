"use client";

import { io, type Socket } from "socket.io-client";

export interface ClientKeywordTitleProgressEvent {
  keywordId: string;
  titleStatus: "GENERATING" | "COMPLETED" | "FAILED";
  generatedTitle: string;
  titleError: string;
}

interface ServerToClientEvents {
  "client-keyword:title-progress": (
    payload: ClientKeywordTitleProgressEvent,
  ) => void;
}

interface ClientToServerEvents {
  "client-keywords:subscribe": (payload: { clientId: number | string }) => void;
  "client-keywords:unsubscribe": (payload: {
    clientId: number | string;
  }) => void;
}

export type ClientKeywordsSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

const SOCKET_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "";

let clientKeywordsSocket: ClientKeywordsSocket | null = null;
const SOCKET_TRANSPORT_MODE =
  process.env.NEXT_PUBLIC_SOCKET_TRANSPORT_MODE?.toLowerCase() ?? "polling";
const SOCKET_TRANSPORTS =
  SOCKET_TRANSPORT_MODE === "websocket"
    ? (["websocket", "polling"] as const)
    : (["polling"] as const);
const SOCKET_UPGRADE_ENABLED = SOCKET_TRANSPORT_MODE === "websocket";

export const getClientKeywordsSocketClient = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!SOCKET_BACKEND_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_BACKEND_URL or NEXT_PUBLIC_API_BASE_URL for client keywords socket.",
    );
  }

  if (!clientKeywordsSocket) {
    clientKeywordsSocket = io(SOCKET_BACKEND_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      transports: [...SOCKET_TRANSPORTS],
      upgrade: SOCKET_UPGRADE_ENABLED,
      withCredentials: true,
    });
  }

  return clientKeywordsSocket;
};
