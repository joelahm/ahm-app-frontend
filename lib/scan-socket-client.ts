"use client";

import { io, type Socket } from "socket.io-client";

export interface ScanSocketSubscribePayload {
  runId: number;
  scanId: number;
}

export interface ScanRunStartedEvent {
  runId: number;
  scanId: number;
  totalRequests: number;
}

export interface ScanRunProgressEvent {
  completedRequests: number;
  failedRequests: number;
  processedRequests: number;
  runId: number;
  scanId: number;
  totalRequests: number;
}

export interface ScanRunCompletedEvent {
  run: {
    completedRequests: number;
    failedRequests: number;
    id: number;
    results?: unknown[];
    scanId: number;
    status: string;
    summary?: {
      coordinates?: number;
      failedChecks?: number;
      keywords?: number;
      successfulChecks?: number;
    };
    totalRequests: number;
  };
  scanId: number;
}

export interface ScanRunFailedEvent {
  error: {
    code: string;
    message: string;
  };
  runId: number;
  scanId: number;
}

interface ServerToClientEvents {
  "scan:run-completed": (payload: ScanRunCompletedEvent) => void;
  "scan:run-failed": (payload: ScanRunFailedEvent) => void;
  "scan:run-progress": (payload: ScanRunProgressEvent) => void;
  "scan:run-started": (payload: ScanRunStartedEvent) => void;
}

interface ClientToServerEvents {
  "scan:subscribe": (payload: ScanSocketSubscribePayload) => void;
  "scan:unsubscribe": (payload: ScanSocketSubscribePayload) => void;
}

export type ScanSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "";

let scanSocket: ScanSocket | null = null;
const SOCKET_TRANSPORT_MODE =
  process.env.NEXT_PUBLIC_SOCKET_TRANSPORT_MODE?.toLowerCase() ?? "polling";
const SOCKET_TRANSPORTS =
  SOCKET_TRANSPORT_MODE === "websocket"
    ? (["websocket", "polling"] as const)
    : (["polling"] as const);
const SOCKET_UPGRADE_ENABLED = SOCKET_TRANSPORT_MODE === "websocket";

export const getScanSocketClient = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!SOCKET_BACKEND_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_BACKEND_URL or NEXT_PUBLIC_API_BASE_URL for scan socket.",
    );
  }

  if (!scanSocket) {
    scanSocket = io(SOCKET_BACKEND_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      transports: [...SOCKET_TRANSPORTS],
      upgrade: SOCKET_UPGRADE_ENABLED,
      withCredentials: true,
    });
  }

  return scanSocket;
};
