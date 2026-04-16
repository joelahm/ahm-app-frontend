"use client";

import type {
  ScanRunCompletedEvent,
  ScanRunFailedEvent,
  ScanRunProgressEvent,
  ScanRunStartedEvent,
} from "@/lib/scan-socket-client";

import { useEffect, useMemo, useRef, useState } from "react";

import { scansApi } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";

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

const POLL_INTERVAL_MS = 3000;

export const useScanRunSocket = ({ runId, scanId }: UseScanRunSocketArgs) => {
  const { getValidAccessToken, session } = useAuth();
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
  const hasStartedRef = useRef(false);

  useEffect(() => {
    hasStartedRef.current = false;
    setLatestProgress(null);
    setCompletedRun(null);
    setFailurePayload(null);
    setStartedPayload(null);

    if (!scanId || !runId || !session) {
      setConnectionStatus("idle");

      return;
    }

    let isActive = true;
    let intervalId: number | null = null;

    const stopPolling = () => {
      if (!intervalId) {
        return;
      }

      window.clearInterval(intervalId);
      intervalId = null;
    };

    const poll = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const run = await scansApi.getScanRunById(accessToken, scanId, runId);

        if (!isActive) {
          return;
        }

        setConnectionStatus("connected");

        if (!hasStartedRef.current) {
          setStartedPayload({
            runId,
            scanId,
            totalRequests: run.totalRequests ?? 0,
          });
          hasStartedRef.current = true;
        }

        const completedRequests = run.completedRequests ?? 0;
        const failedRequests = run.failedRequests ?? 0;
        const totalRequests = run.totalRequests ?? 0;

        setLatestProgress({
          completedRequests,
          failedRequests,
          processedRequests: completedRequests + failedRequests,
          runId,
          scanId,
          totalRequests,
        });

        const normalizedStatus = String(run.status || "").toUpperCase();

        if (normalizedStatus === "COMPLETED") {
          setCompletedRun({
            run: {
              completedRequests,
              failedRequests,
              id: run.id ?? runId,
              results: run.results,
              scanId: run.scanId ?? scanId,
              status: run.status ?? "COMPLETED",
              summary: run.summary,
              totalRequests,
            },
            scanId,
          });
          stopPolling();
        }

        if (normalizedStatus === "FAILED") {
          setFailurePayload({
            error: {
              code: "SCAN_RUN_FAILED",
              message: "Scan run failed.",
            },
            runId,
            scanId,
          });
          stopPolling();
        }
      } catch {
        if (!isActive) {
          return;
        }

        setConnectionStatus("error");
      }
    };

    setConnectionStatus("connecting");
    void poll();
    intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      stopPolling();
    };
  }, [getValidAccessToken, runId, scanId, session]);

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
