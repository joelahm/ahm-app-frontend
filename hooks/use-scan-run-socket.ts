"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getScanSocketClient,
  type ScanRunCompletedEvent,
  type ScanRunFailedEvent,
  type ScanRunProgressEvent,
  type ScanRunStartedEvent,
} from "@/lib/scan-socket-client";

export type ScanSocketConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseScanRunSocketArgs {
  runId?: number | null;
  scanId?: number | null;
}

const matchesRun = (
  payload:
    | { runId?: number; scanId: number }
    | { run: { id: number; scanId: number }; scanId: number },
  scanId: number,
  runId: number,
) => {
  if ("run" in payload) {
    return payload.scanId === scanId && payload.run.id === runId;
  }

  return payload.scanId === scanId && payload.runId === runId;
};

export const useScanRunSocket = ({ runId, scanId }: UseScanRunSocketArgs) => {
  const [connectionStatus, setConnectionStatus] =
    useState<ScanSocketConnectionStatus>("idle");
  const [latestProgress, setLatestProgress] =
    useState<ScanRunProgressEvent | null>(null);
  const [completedRun, setCompletedRun] =
    useState<ScanRunCompletedEvent | null>(null);
  const [failurePayload, setFailurePayload] =
    useState<ScanRunFailedEvent | null>(null);
  const [startedPayload, setStartedPayload] =
    useState<ScanRunStartedEvent | null>(null);

  useEffect(() => {
    setLatestProgress(null);
    setCompletedRun(null);
    setFailurePayload(null);
    setStartedPayload(null);

    if (!scanId || !runId) {
      setConnectionStatus("idle");

      return;
    }

    const socket = getScanSocketClient();

    if (!socket) {
      setConnectionStatus("idle");

      return;
    }

    const subscription = { runId, scanId };

    const subscribe = () => {
      socket.emit("scan:subscribe", subscription);
    };

    const unsubscribe = () => {
      socket.emit("scan:unsubscribe", subscription);
    };

    const handleConnect = () => {
      setConnectionStatus("connected");
      subscribe();
    };

    const handleDisconnect = () => {
      setConnectionStatus("disconnected");
    };

    const handleConnectError = () => {
      setConnectionStatus("error");
    };

    const handleStarted = (payload: ScanRunStartedEvent) => {
      if (!matchesRun(payload, scanId, runId)) {
        return;
      }

      setStartedPayload(payload);
      setLatestProgress({
        completedRequests: 0,
        failedRequests: 0,
        processedRequests: 0,
        runId: payload.runId,
        scanId: payload.scanId,
        totalRequests: payload.totalRequests,
      });
    };

    const handleProgress = (payload: ScanRunProgressEvent) => {
      if (!matchesRun(payload, scanId, runId)) {
        return;
      }

      setLatestProgress(payload);
    };

    const handleCompleted = (payload: ScanRunCompletedEvent) => {
      if (!matchesRun(payload, scanId, runId)) {
        return;
      }

      setCompletedRun(payload);
      setLatestProgress({
        completedRequests: payload.run.completedRequests,
        failedRequests: payload.run.failedRequests,
        processedRequests:
          payload.run.completedRequests + payload.run.failedRequests,
        runId: payload.run.id,
        scanId: payload.scanId,
        totalRequests: payload.run.totalRequests,
      });
    };

    const handleFailed = (payload: ScanRunFailedEvent) => {
      if (!matchesRun(payload, scanId, runId)) {
        return;
      }

      setFailurePayload(payload);
    };

    setConnectionStatus(socket.connected ? "connected" : "connecting");

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("scan:run-started", handleStarted);
    socket.on("scan:run-progress", handleProgress);
    socket.on("scan:run-completed", handleCompleted);
    socket.on("scan:run-failed", handleFailed);

    if (socket.connected) {
      subscribe();
    } else {
      socket.connect();
    }

    return () => {
      unsubscribe();
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("scan:run-started", handleStarted);
      socket.off("scan:run-progress", handleProgress);
      socket.off("scan:run-completed", handleCompleted);
      socket.off("scan:run-failed", handleFailed);
    };
  }, [runId, scanId]);

  const progressPercent = useMemo(() => {
    if (!latestProgress?.totalRequests) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (latestProgress.processedRequests / latestProgress.totalRequests) * 100,
      ),
    );
  }, [latestProgress]);

  return {
    completedRun,
    connectionStatus,
    failurePayload,
    latestProgress,
    progressPercent,
    startedPayload,
  };
};
