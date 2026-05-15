"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { scansApi } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import {
  getScanSocketClient,
  type ScanRunCompletedEvent,
  type ScanRunFailedEvent,
  type ScanRunProgressEvent,
  type ScanRunStartedEvent,
  type ScanRunStoppedEvent,
} from "@/lib/scan-socket-client";

export interface ScanProgressEntry {
  runId: number;
  scanId: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "STOPPED";
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  progressPercent: number;
  startedAt: number;
  keyword: string | null;
}

interface UseClientScanProgressOptions {
  clientId?: string | number | null;
}

const computeProgressPercent = (
  completed: number,
  failed: number,
  total: number,
) => {
  if (!total || total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round(((completed + failed) / total) * 100));
};

const computeWorkingPercent = (startedAt: number, realPercent: number) => {
  if (realPercent > 0) {
    return realPercent;
  }

  const elapsedSeconds = Math.max(0, (Date.now() - startedAt) / 1000);

  return Math.min(12, Math.max(1, Math.floor(elapsedSeconds / 2) + 1));
};

export const useClientScanProgress = ({
  clientId,
}: UseClientScanProgressOptions) => {
  const { getValidAccessToken, session } = useAuth();
  const [progressByScanId, setProgressByScanId] = useState<
    Map<number, ScanProgressEntry>
  >(() => new Map());
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const subscribedRunsRef = useRef<Set<number>>(new Set());

  const upsertEntry = useCallback((entry: ScanProgressEntry) => {
    setProgressByScanId((current) => {
      const next = new Map(current);

      next.set(entry.scanId, entry);

      return next;
    });
  }, []);

  const removeEntry = useCallback((scanId: number) => {
    setProgressByScanId((current) => {
      const next = new Map(current);

      next.delete(scanId);

      return next;
    });
  }, []);

  // Subscribe to a specific run via socket.io
  const subscribeToRun = useCallback((runId: number, scanId: number) => {
    if (subscribedRunsRef.current.has(runId)) {
      return;
    }

    subscribedRunsRef.current.add(runId);

    const socket = getScanSocketClient();

    if (!socket) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("scan:subscribe", { runId, scanId });
  }, []);

  const registerRun = useCallback(
    (runId: number, scanId: number, keyword?: string | null) => {
      upsertEntry({
        runId,
        scanId,
        status: "PENDING",
        totalRequests: 0,
        completedRequests: 0,
        failedRequests: 0,
        progressPercent: 0,
        startedAt: Date.now(),
        keyword: keyword ?? null,
      });
      setPollingEnabled(true);
      subscribeToRun(runId, scanId);
    },
    [subscribeToRun, upsertEntry],
  );

  const syncActiveRuns = useCallback(
    async (isActive: () => boolean) => {
      if (!clientId || !session) {
        return 0;
      }

      const accessToken = await getValidAccessToken();
      const runs = await scansApi.listActiveScanRunsForClient(
        accessToken,
        clientId,
      );

      if (!isActive()) {
        return runs.length;
      }

      const activeScanIds = new Set(runs.map((run) => run.scanId));

      setProgressByScanId((current) => {
        const next = new Map(current);

        current.forEach((entry, scanId) => {
          if (
            (entry.status === "PENDING" || entry.status === "RUNNING") &&
            !activeScanIds.has(scanId)
          ) {
            next.set(scanId, {
              ...entry,
              completedRequests:
                entry.totalRequests > 0
                  ? entry.totalRequests - entry.failedRequests
                  : entry.completedRequests,
              progressPercent: 100,
              status: "COMPLETED",
            });
          }
        });

        runs.forEach((run) => {
          const existing = next.get(run.scanId);
          const realProgressPercent = computeProgressPercent(
            run.completedRequests,
            run.failedRequests,
            run.totalRequests,
          );

          next.set(run.scanId, {
            runId: run.runId,
            scanId: run.scanId,
            status:
              run.status === "RUNNING" || run.status === "PENDING"
                ? (run.status as "RUNNING" | "PENDING")
                : "RUNNING",
            totalRequests: run.totalRequests,
            completedRequests: run.completedRequests,
            failedRequests: run.failedRequests,
            progressPercent:
              realProgressPercent > 0
                ? realProgressPercent
                : Math.max(existing?.progressPercent ?? 0, realProgressPercent),
            startedAt: existing?.startedAt ?? Date.now(),
            keyword: existing?.keyword ?? run.keyword,
          });
        });

        return next;
      });

      runs.forEach((run) => {
        subscribeToRun(run.runId, run.scanId);
      });

      return runs.length;
    },
    [clientId, getValidAccessToken, session, subscribeToRun],
  );

  // Bootstrap active runs and keep polling as a fallback if socket progress is missed.
  useEffect(() => {
    if (!clientId || !session || !pollingEnabled) {
      return;
    }

    let isActive = true;

    const pollActiveRuns = async () => {
      try {
        const activeRunCount = await syncActiveRuns(() => isActive);

        if (isActive && activeRunCount === 0) {
          setPollingEnabled(false);
        }
      } catch {
        // Silently swallow; UI shows static rows if bootstrap fails.
      }
    };

    void pollActiveRuns();
    const intervalId = window.setInterval(() => {
      void pollActiveRuns();
    }, 1500);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [clientId, pollingEnabled, session, syncActiveRuns]);

  // Set up socket listeners once
  useEffect(() => {
    const socket = getScanSocketClient();

    if (!socket) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleStarted = (payload: ScanRunStartedEvent) => {
      setProgressByScanId((current) => {
        const existing = current.get(payload.scanId);
        const next = new Map(current);

        next.set(payload.scanId, {
          runId: payload.runId,
          scanId: payload.scanId,
          status: "RUNNING",
          totalRequests: payload.totalRequests ?? 0,
          completedRequests: 0,
          failedRequests: 0,
          progressPercent: 0,
          startedAt: existing?.startedAt ?? Date.now(),
          keyword: existing?.keyword ?? null,
        });

        return next;
      });
    };

    const handleProgress = (payload: ScanRunProgressEvent) => {
      setProgressByScanId((current) => {
        const existing = current.get(payload.scanId);
        const next = new Map(current);

        next.set(payload.scanId, {
          runId: payload.runId,
          scanId: payload.scanId,
          status: "RUNNING",
          totalRequests: payload.totalRequests,
          completedRequests: payload.completedRequests,
          failedRequests: payload.failedRequests,
          progressPercent: computeProgressPercent(
            payload.completedRequests,
            payload.failedRequests,
            payload.totalRequests,
          ),
          startedAt: existing?.startedAt ?? Date.now(),
          keyword: existing?.keyword ?? null,
        });

        return next;
      });
    };

    const handleCompleted = (payload: ScanRunCompletedEvent) => {
      const scanId = payload.scanId ?? payload.run?.scanId;

      if (typeof scanId !== "number") {
        return;
      }

      // Briefly show 100% then drop from the map
      setProgressByScanId((current) => {
        const existing = current.get(scanId);
        const next = new Map(current);

        next.set(scanId, {
          runId: payload.run?.id ?? existing?.runId ?? 0,
          scanId,
          status: "COMPLETED",
          totalRequests: payload.run?.totalRequests ?? 0,
          completedRequests: payload.run?.completedRequests ?? 0,
          failedRequests: payload.run?.failedRequests ?? 0,
          progressPercent: 100,
          startedAt: existing?.startedAt ?? Date.now(),
          keyword: existing?.keyword ?? null,
        });

        return next;
      });

      window.setTimeout(() => removeEntry(scanId), 2000);
    };

    const handleFailed = (payload: ScanRunFailedEvent) => {
      const { scanId } = payload;

      if (typeof scanId !== "number") {
        return;
      }

      setProgressByScanId((current) => {
        const existing = current.get(scanId);
        const next = new Map(current);

        next.set(scanId, {
          runId: payload.runId,
          scanId,
          status: "FAILED",
          totalRequests: existing?.totalRequests ?? 0,
          completedRequests: existing?.completedRequests ?? 0,
          failedRequests: existing?.failedRequests ?? 0,
          progressPercent: existing?.progressPercent ?? 0,
          startedAt: existing?.startedAt ?? Date.now(),
          keyword: existing?.keyword ?? null,
        });

        return next;
      });

      window.setTimeout(() => removeEntry(scanId), 4000);
    };

    const handleStopped = (payload: ScanRunStoppedEvent) => {
      const { scanId } = payload;

      if (typeof scanId !== "number") {
        return;
      }

      setProgressByScanId((current) => {
        const existing = current.get(scanId);
        const next = new Map(current);

        next.set(scanId, {
          runId: payload.runId,
          scanId,
          status: "STOPPED",
          totalRequests:
            existing?.totalRequests ?? payload.run?.totalRequests ?? 0,
          completedRequests: 0,
          failedRequests: 0,
          progressPercent: 0,
          startedAt: existing?.startedAt ?? Date.now(),
          keyword: existing?.keyword ?? null,
        });

        return next;
      });

      window.setTimeout(() => removeEntry(scanId), 1000);
    };

    socket.on("scan:run-started", handleStarted);
    socket.on("scan:run-progress", handleProgress);
    socket.on("scan:run-completed", handleCompleted);
    socket.on("scan:run-failed", handleFailed);
    socket.on("scan:run-stopped", handleStopped);

    return () => {
      socket.off("scan:run-started", handleStarted);
      socket.off("scan:run-progress", handleProgress);
      socket.off("scan:run-completed", handleCompleted);
      socket.off("scan:run-failed", handleFailed);
      socket.off("scan:run-stopped", handleStopped);
    };
  }, [removeEntry, upsertEntry]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setProgressByScanId((current) => {
        let changed = false;
        const next = new Map(current);

        current.forEach((entry, scanId) => {
          if (entry.status !== "PENDING" && entry.status !== "RUNNING") {
            return;
          }

          const realPercent = computeProgressPercent(
            entry.completedRequests,
            entry.failedRequests,
            entry.totalRequests,
          );
          const workingPercent = computeWorkingPercent(
            entry.startedAt,
            realPercent,
          );

          if (workingPercent !== entry.progressPercent) {
            changed = true;
            next.set(scanId, {
              ...entry,
              progressPercent: workingPercent,
            });
          }
        });

        return changed ? next : current;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // Cleanup: unsubscribe + clear on unmount
  useEffect(() => {
    const subscribedRuns = subscribedRunsRef.current;

    return () => {
      const socket = getScanSocketClient();

      if (socket && socket.connected) {
        subscribedRuns.forEach((runId) => {
          const scanId = 0; // server only needs runId for unsubscribe room

          socket.emit("scan:unsubscribe", { runId, scanId });
        });
      }

      subscribedRuns.clear();
    };
  }, []);

  return {
    progressByScanId,
    registerRun,
  };
};
